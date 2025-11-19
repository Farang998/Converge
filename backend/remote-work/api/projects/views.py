# projects/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed

from ..auth.models import User
from .models import Project
from ..notifications.models import Notification
from mongoengine.errors import DoesNotExist, ValidationError as MongoValidationError
import threading
import requests
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from .utils import send_invitations_background
from rest_framework.exceptions import AuthenticationFailed, NotFound
from ..calendar.models import GoogleCredentials
from ..calendar.google_service import create_event
from mongoengine.errors import DoesNotExist, ValidationError as MongoValidationError
from mongoengine.queryset.visitor import Q
from ..calendar.google_service import create_project_calendar, create_event
from .github_importer import GitHubImporter, GitHubImporterError
from ..file_sharing.models import File

import requests

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
        auth_header = request.headers.get('Authorization')
class searchuser(APIView):
    def post(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return Response({'error': 'Authorization header missing'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            _ = authenticate_user_from_request(request)
        except AuthenticationFailed as e:
            return Response({"error": str(e)}, status=401)

        query = request.data.get("query", "")
        if not query:
            return Response({"results": {}}, status=200)

        matched_users = User.objects.filter(username__icontains=query)[:10]
        result = {}
        for user in matched_users:
            result[str(user.id)] = user.username
        return Response({'results': result}, status=status.HTTP_200_OK)


class GitHubImportView(APIView):
    """
    Import a GitHub repository into a project.
    POST /api/projects/<project_id>/import-github/
    """
    
    def post(self, request, project_id):
        # Authenticate user
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return Response({'error': ERROR_AUTH_HEADER_MISSING}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return Response({'error': ERROR_INVALID_AUTH_HEADER}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = User.validate_token(token)
        if not user:
            return Response({'error': ERROR_INVALID_TOKEN}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get project
        try:
            project = Project.objects.get(id=project_id)
        except (DoesNotExist, MongoValidationError):
            return Response({'error': PROJECT_NOT_FOUND_ERROR}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user has access (team leader or accepted member)
        user_id_str = str(user.id)
        has_access = project.team_leader == user
        if not has_access:
            for member in project.team_members:
                if member.get('user') == user_id_str and member.get('accepted', False):
                    has_access = True
                    break
        
        if not has_access:
            return Response({'error': 'You do not have access to this project'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get GitHub repo URL from request
        repo_url = request.data.get('repo_url')
        if not repo_url:
            return Response({'error': 'repo_url is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Optional: GitHub token for private repos
        github_token = request.data.get('github_token')
        branch = request.data.get('branch', 'main')
        
        # Initialize importer
        importer = GitHubImporter(github_token=github_token)
        
        try:
            # Import repository
            result = importer.import_repository(
                repo_url=repo_url,
                project_id=project_id,
                user_id=user_id_str,
                branch=branch
            )
            
            # Update project with GitHub info
            project.github_imported = True
            project.github_repo_url = result['repository']['url']
            project.github_repo_name = result['repository']['full_name']
            project.github_import_date = timezone.now()
            project.github_import_metadata = {
                'description': result['repository']['description'],
                'language': result['repository']['language'],
                'stars': result['repository']['stars'],
                'forks': result['repository']['forks'],
                'total_files_imported': result['total_files'],
                'imported_by': user_id_str,
                'branch': branch
            }
            project.save()
            
            # Create File records for tracking
            for file_info in result['files']:
                try:
                    file_record = File(
                        name=file_info['file_name'],
                        s3_key=file_info['s3_key'],
                        url=file_info['url'],
                        uploaded_by=user,
                        project=project,
                        size=file_info['size'],
                        file_type='github_import'
                    )
                    file_record.save()
                except Exception as e:
                    print(f"Error creating file record for {file_info['file_name']}: {e}")
            
            # Create notification for project members
            notification_message = f"{user.username} imported GitHub repository '{result['repository']['full_name']}' with {result['total_files']} files to project '{project.name}'"
            
            # Notify team leader if not the importer
            if project.team_leader != user:
                try:
                    Notification(
                        user=project.team_leader,
                        message=notification_message,
                        link_url=f"/project/{project_id}/files"
                    ).save()
                except Exception as e:
                    print(f"Error creating notification for team leader: {e}")
            
            # Notify accepted team members
            for member in project.team_members:
                if member.get('accepted', False) and member.get('user') != user_id_str:
                    try:
                        member_user = User.objects.get(id=member['user'])
                        Notification(
                            user=member_user,
                            message=notification_message,
                            link_url=f"/project/{project_id}/files"
                        ).save()
                    except Exception as e:
                        print(f"Error creating notification for member: {e}")
            
            return Response({
                'success': True,
                'message': result['message'],
                'repository': result['repository'],
                'total_files': result['total_files'],
                'files_sample': result['files'][:10]  # Return first 10 files as sample
            }, status=status.HTTP_200_OK)
            
        except GitHubImporterError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Unexpected error during GitHub import: {e}")
            return Response({'error': 'An unexpected error occurred during import'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        matched = User.objects.filter(username__icontains=query)[:10]
        return Response({"results": serialize_basic_users(matched)}, status=200)
