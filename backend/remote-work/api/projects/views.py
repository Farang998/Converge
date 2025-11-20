# projects/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed

from botocore.exceptions import ClientError
from django.conf import settings

from ..auth.models import User
from .models import Project
from ..tasks.models import Task
from ..notifications.models import Notification
from ..calendar.models import GoogleCredentials
from ..calendar.google_service import create_event
from ..calendar.google_service import delete_calendar
from ..calendar.google_service import create_project_calendar
from django.utils import timezone
from ..file_sharing.models import File
from ..file_sharing.views import _get_s3_client

from mongoengine.errors import DoesNotExist, ValidationError as MongoValidationError
from mongoengine.queryset.visitor import Q

import requests
import io
import zipfile
import mimetypes
import os
import threading

from .utils import (
    prepare_invited_members,
    filter_valid_members_to_remove,
    send_invitation_notifications,
    send_invites_async,
    mark_project_invitations_as_read,
    serialize_basic_users,
    setup_project_calendar,
    send_invitations_background,
)
from ..utils import ERROR_AUTH_HEADER_MISSING, ERROR_INVALID_AUTH_HEADER, ERROR_INVALID_TOKEN
from ..utils import authenticate_user_from_request

PROJECT_NOT_FOUND_ERROR = "Project not found"


class ProjectViewSet(viewsets.ViewSet):

    # ------------------------
    # LIST PROJECTS
    # ------------------------
    def list(self, request):
        try:
            user = authenticate_user_from_request(request)
        except AuthenticationFailed as e:
            return Response({"error": str(e)}, status=401)

        search = request.query_params.get("search") or request.query_params.get("q") or ""
        user_id = str(user.id)

        try:
            if search.strip():
                search = search.strip()
                leader_projects_qs = Project.objects(
                    Q(team_leader=user)
                    & (Q(name__icontains=search) | Q(description__icontains=search))
                )
                member_projects_qs = Project.objects(
                    Q(team_members__match={"user": user_id})
                    & (Q(name__icontains=search) | Q(description__icontains=search))
                )
            else:
                leader_projects_qs = Project.objects(team_leader=user)
                member_projects_qs = Project.objects(team_members__match={"user": user_id})

            leader_projects = list(leader_projects_qs)
            member_projects = list(member_projects_qs)

        except Exception:
            leader_projects = list(Project.objects(team_leader=user))
            member_projects = list(Project.objects(team_members__match={"user": user_id}))

        # merge unique
        combined = {str(p.id): p for p in leader_projects}
        for p in member_projects:
            combined.setdefault(str(p.id), p)

        projects = list(combined.values())

        # prefetch team member usernames
        ids = {m["user"] for p in projects for m in p.team_members}
        user_lookup = {}
        if ids:
            objs = User.objects(id__in=list(ids))
            user_lookup = serialize_basic_users(objs)

        serialized = []
        for project in projects:
            team_members = [
                {
                    "user_id": m["user"],
                    "username": user_lookup.get(m["user"]),
                    "accepted": bool(m.get("accepted"))
                }
                for m in project.team_members
            ]

            serialized.append({
                "id": str(project.id),
                "name": project.name,
                "description": project.description,
                "project_type": project.project_type,
                "team_leader": {
                    "user_id": str(project.team_leader.id),
                    "username": getattr(project.team_leader, "username", None),
                },
                "team_members": team_members,
                "created_at": project.created_at.isoformat()
                if project.created_at else None,
            })

        return Response(serialized, status=200)

    # ------------------------
    # CREATE PROJECT
    # ------------------------
    def create(self, request):
        try:
            user = authenticate_user_from_request(request)
        except AuthenticationFailed as e:
            return Response({"error": str(e)}, status=401)

        data = request.data
        name = data.get("name")
        if not name or not name.strip():
            return Response({"error": "Name is required"}, status=400)

        prep = prepare_invited_members(data.get("team_members", []), str(user.id))
        if "error" in prep:
            return Response({"error": prep["error"]}, status=400)

        team_members_db = prep["team_members_db"]
        invited_users = prep["invited_users"]

        try:
            project = Project(
                name=name,
                description=data.get("description", ""),
                team_leader=user,
                project_type=data.get("project_type", "development"),
                team_members=team_members_db,
            )
            project.save()

            project_id = str(project.id)

            # calendar
            creds = GoogleCredentials.objects(user=user).first()
            if creds:
                calendar_id = create_project_calendar(creds, name)
                project.calendar_id = calendar_id
                project.save()

            # notifications
            send_invitation_notifications(invited_users, name, project_id)

            # async email
            send_invites_async([str(u.id) for u in invited_users], name, project_id, send_invitations_background)

            # chat group creation
            try:
                requests.post(
                    "http://localhost:8000/api/chats/create/",
                    json={
                        "name": name,
                        "admin": str(user.id),
                        "participants": [str(u.id) for u in invited_users],
                    },
                )
            except Exception:
                pass

            return Response({"message": "Project created", "project_id": project_id}, status=201)

        except MongoValidationError as e:
            return Response({"error": str(e)}, status=400)

    # ------------------------
    # UPDATE PROJECT
    # ------------------------
    def partial_update(self, request, pk=None):
        try:
            user = authenticate_user_from_request(request)
        except AuthenticationFailed as e:
            return Response({"error": str(e)}, status=401)

        try:
            project = Project.objects.get(id=pk)
        except Exception:
            return Response({"error": PROJECT_NOT_FOUND_ERROR}, status=404)

        if project.team_leader != user:
            return Response({"error": "Only team leader can update"}, status=403)

        data = request.data
        changed = False
        if "name" in data:
            project.name = data["name"]
            changed = True
        if "description" in data:
            project.description = data["description"]
            changed = True

        if changed:
            project.save()
            return Response({"message": "Updated"}, status=200)

        return Response({"message": "Nothing changed"}, status=200)

    # ------------------------
    # ADD MEMBERS
    # ------------------------
    @action(detail=True, methods=["post"])
    def add_members(self, request, pk=None):
        try:
            user = authenticate_user_from_request(request)
        except AuthenticationFailed as e:
            return Response({"error": str(e)}, status=401)

        try:
            project = Project.objects.get(id=pk)
        except Exception:
            return Response({"error": PROJECT_NOT_FOUND_ERROR}, status=404)

        if project.team_leader != user:
            return Response({"error": "Only leader can add members"}, status=403)

        add_list = request.data.get("add_members")
        if not isinstance(add_list, list):
            return Response({"error": "'add_members' must be a list"}, status=400)

        existing = {m["user"] for m in project.team_members}
        to_add = [uid for uid in add_list if uid != str(project.team_leader.id) and uid not in existing]

        for uid in to_add:
            project.team_members.append({"user": uid, "accepted": False})

        project.save()

        invited_users = [User.objects.get(id=uid) for uid in to_add]
        send_invitation_notifications(invited_users, project.name, pk)
        send_invites_async(to_add, project.name, pk, send_invitations_background)

        return Response({"message": f"Invited {len(to_add)}"}, status=200)

    # ------------------------
    # REMOVE MEMBERS
    # ------------------------
    @action(detail=True, methods=["post"])
    def remove_members(self, request, pk=None):
        try:
            user = authenticate_user_from_request(request)
        except AuthenticationFailed as e:
            return Response({"error": str(e)}, status=401)

        try:
            project = Project.objects.get(id=pk)
        except Exception:
            return Response({"error": PROJECT_NOT_FOUND_ERROR}, status=404)

        if project.team_leader != user:
            return Response({"error": "Only leader can remove"}, status=403)

        remove_list = request.data.get("remove_members", [])
        if not isinstance(remove_list, list):
            return Response({"error": "'remove_members' must be list"}, status=400)

        existing = {m["user"] for m in project.team_members}
        valid = filter_valid_members_to_remove(remove_list, existing)

        project.team_members = [m for m in project.team_members if m["user"] not in valid]
        project.save()

        return Response({"message": f"Removed {len(valid)}"}, status=200)

    # ------------------------
    # CREATE CALENDAR
    # ------------------------
    @action(detail=True, methods=["post"])
    def create_calendar(self, request, pk=None):
        try:
            user = authenticate_user_from_request(request)
        except AuthenticationFailed as e:
            return Response({"error": str(e)}, status=401)

        try:
            project = Project.objects.get(id=pk)
        except Exception:
            return Response({"error": PROJECT_NOT_FOUND_ERROR}, status=404)

        if project.team_leader != user:
            return Response({"error": "Only leader can create calendar"}, status=403)

        if getattr(project, "calendar_id", None):
            return Response({
                "message": "Calendar already exists",
                "calendar_id": project.calendar_id
            }, status=200)

        calendar_id, error = setup_project_calendar(project, user)
        if error:
            return Response({"error": error}, status=400)

        return Response({
            "message": "Calendar created",
            "calendar_id": calendar_id
        }, status=201)
    
    # ------------------------
    # DELETE PROJECT
    # ------------------------
    def destroy(self, request, pk=None):
        try:
            user = authenticate_user_from_request(request)
        except AuthenticationFailed as e:
            return Response({"error": str(e)}, status=401)

        # Fetch project
        try:
            project = Project.objects.get(id=pk)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"}, status=404)

        # Only leader can delete
        if project.team_leader != user:
            return Response({"error": "Only team leader can delete this project"}, status=403)

        project_id = str(project.id)
        
    
    @action(detail=True, methods=["post"], url_path='import-github')
    def import_github(self, request, pk=None):
        
        try:
            user = authenticate_user_from_request(request)
        except AuthenticationFailed as e:
            return Response({"error": str(e)}, status=401)

        try:
            project = Project.objects.get(id=pk)
        except Exception:
            return Response({"error": PROJECT_NOT_FOUND_ERROR}, status=404)

        is_leader = project.team_leader == user
        is_member = any(m.get('user') == str(user.id) and m.get('accepted', False) for m in project.team_members)
        if not (is_leader or is_member):
            return Response({"error": "You do not have permission to import into this project"}, status=403)

        data = request.data
        repo_url = (data.get('repo_url') or data.get('repository') or '').strip()
        branch = (data.get('branch') or '').strip()
        token = (data.get('token') or '').strip()

        if not repo_url:
            return Response({"error": "repo_url is required"}, status=400)
        owner = None
        repo_name = None
        try:
            # strip .git suffix
            clean = repo_url.rstrip('/')
            if clean.endswith('.git'):
                clean = clean[:-4]

            if 'github.com' in clean:
                if clean.startswith('git@'):
                    # git@github.com:owner/repo
                    parts = clean.split(':', 1)[-1]
                else:
                    parts = clean.split('github.com')[-1].lstrip('/').split('/')
                    parts = '/'.join(parts[0:2])

                parts = parts.strip('/').split('/')
                if len(parts) >= 2:
                    owner, repo_name = parts[0], parts[1]
        except Exception:
            pass

        if not owner or not repo_name:
            # Fallback: try splitting by slashes
            try:
                parts = repo_url.strip('/').split('/')
                owner = parts[-2]
                repo_name = parts[-1].replace('.git', '')
            except Exception:
                return Response({"error": "Could not parse owner/repo from repo_url"}, status=400)

        archive_url = f"https://api.github.com/repos/{owner}/{repo_name}/zipball/{branch or 'HEAD'}"

        headers = {}
        if token:
            headers['Authorization'] = f'token {token}'

        try:
            resp = requests.get(archive_url, headers=headers, stream=True, timeout=60)
            if resp.status_code >= 400:
                return Response({"error": f"GitHub responded with {resp.status_code}: {resp.text}"}, status=400)

            content = io.BytesIO(resp.content)
            z = zipfile.ZipFile(content)
        except Exception as e:
            return Response({"error": f"Failed to download or open repository archive: {str(e)}"}, status=400)

        try:
            s3_client = _get_s3_client()
            bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
            if not bucket_name:
                return Response({"error": "AWS_STORAGE_BUCKET_NAME is not configured"}, status=500)
        except Exception as e:
            return Response({"error": f"S3 client initialization failed: {str(e)}"}, status=500)

        uploaded = []
        prefix_base = f"files/{str(project.id)}/github/{owner}_{repo_name}"

        for zi in z.infolist():
            if zi.is_dir():
                continue
            filename = zi.filename
            parts = filename.split('/', 1)
            inner_path = parts[1] if len(parts) > 1 else parts[0]
            if not inner_path or inner_path.endswith('/'):
                continue

            s3_key = f"{prefix_base}/{inner_path}"

            try:
                with z.open(zi) as fh:
                    name = os.path.basename(inner_path)
                    content_type = mimetypes.guess_type(name)[0] or 'application/octet-stream'

                    s3_client.upload_fileobj(fh, bucket_name, s3_key, ExtraArgs={'ContentType': content_type})

                    file_obj = File(
                        name=name,
                        s3_key=s3_key,
                        file_size=zi.file_size,
                        content_type=content_type,
                        uploaded_by=user,
                        project=project,
                    )
                    file_obj.save()

                    uploaded.append({
                        'file_name': name,
                        's3_key': s3_key,
                        's3_uri': f"s3://{bucket_name}/{s3_key}",
                        'size': zi.file_size,
                        'content_type': content_type,
                    })
            except Exception as e:
                print(f"Warning: failed to upload {filename}: {str(e)}")
                continue

        try:
            project.github_imported = True
            project.github_import_date = timezone.now()
            project.github_repo_name = f"{owner}/{repo_name}"
            project.github_repo_url = repo_url
            project.github_import_metadata = {'imported_count': len(uploaded)}
            project.save()
        except Exception:
            pass

        s3_uris = [u['s3_uri'] for u in uploaded]

        def _call_ingest(project_id, uris):
            try:
                requests.post('http://localhost:5000/ingest', json={'project_id': str(project_id), 's3_uris': uris}, timeout=30)
            except Exception as e:
                print(f"Warning: ingest call failed: {str(e)}")

        if s3_uris:
            try:
                t = threading.Thread(target=_call_ingest, args=(project.id, s3_uris))
                t.daemon = True
                t.start()
            except Exception as e:
                print(f"Warning: failed to start ingest thread: {str(e)}")

        return Response({"message": "Import completed", "files": uploaded, "ingest_started": bool(s3_uris)}, status=201)

        # ---------------------------------------------------------
        # 1. Notify all members (accepted + invited + leader)
        # ---------------------------------------------------------
        all_user_ids = {m["user"] for m in project.team_members}
        all_user_ids.add(str(project.team_leader.id))

        all_users = User.objects(id__in=list(all_user_ids))

        for u in all_users:
            Notification(
                user=u,
                message=f"The project '{project.name}' has been deleted by the team leader.",
                link_url=None
            ).save()

        # ---------------------------------------------------------
        # 2. Delete all tasks for this project
        # ---------------------------------------------------------
        try:
            Task.objects(project=project_id).delete()
        except Exception:
            pass

        # ---------------------------------------------------------
        # 3. Delete ALL FILES for this project (S3 + Mongo)
        # ---------------------------------------------------------
        try:
            # Fetch all files under this project
            files = File.objects(project=project)

            # Delete S3 objects
            s3_client = _get_s3_client()
            bucket = settings.AWS_STORAGE_BUCKET_NAME

            for f in files:
                try:
                    s3_client.delete_object(Bucket=bucket, Key=f.s3_key)
                except ClientError as e:
                    print(f"Warning: Failed to delete S3 file {f.s3_key}: {e}")

            # Delete MongoDB file metadata
            files.delete()

        except Exception as e:
            print(f"Warning: Error deleting files for project {project_id}: {e}")


        # ---------------------------------------------------------
        # 3. Delete Google Calendar for this project
        # ---------------------------------------------------------
        if getattr(project, "calendar_id", None):
            creds = GoogleCredentials.objects(user=user).first()
            if creds:
                try:
                    delete_calendar(creds, project.calendar_id)
                except Exception:
                    pass

        # ---------------------------------------------------------
        # 4. Delete Chat group for this project
        # ---------------------------------------------------------
        # We need to create this endpoint in chat service to handle deletion

        # ---------------------------------------------------------
        # 5. Delete project
        # ---------------------------------------------------------
        project.delete()

        return Response({"message": "Project deleted successfully"}, status=200)

# -------------------------------------------------------
# ACCEPT INVITATION
# -------------------------------------------------------
class AcceptInvitation(APIView):
    def get(self, request, project_id):
        try:
            user = authenticate_user_from_request(request)
        except AuthenticationFailed as e:
            return Response({"error": str(e)}, status=401)

        try:
            project = Project.objects.get(id=project_id)
        except Exception:
            return Response({"error": PROJECT_NOT_FOUND_ERROR}, status=404)

        if project.team_leader == user:
            return Response({"message": "You are already the leader"}, status=200)

        uid = str(user.id)

        for member in project.team_members:
            if member["user"] == uid:
                if member.get("accepted"):
                    return Response({"message": "Already accepted"}, status=200)

                member["accepted"] = True
                project.save()

                mark_project_invitations_as_read(user, project_id, project.name)
                return Response({"message": "Invitation accepted"}, status=200)

        return Response({"error": "You are not invited"}, status=403)

# -------------------------------------------------------
# SEARCH USER
# -------------------------------------------------------
class searchuser(APIView):
    def post(self, request):
        try:
            _ = authenticate_user_from_request(request)
        except AuthenticationFailed as e:
            return Response({"error": str(e)}, status=401)

        query = request.data.get("query", "")
        if not query:
            return Response({"results": {}}, status=200)

        matched = User.objects.filter(username__icontains=query)[:10]
        return Response({"results": serialize_basic_users(matched)}, status=200)
