from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.decorators import action
from ..auth.models import User
from .models import Project
from ..tasks.models import Task # We need this for the 'remove_members' check
from ..notifications.models import Notification
from mongoengine.errors import DoesNotExist, ValidationError as MongoValidationError
import threading
import requests
from django.conf import settings

from .utils import send_invitations_background
from rest_framework.exceptions import AuthenticationFailed, NotFound
from ..calendar.models import GoogleCredentials
from mongoengine.queryset.visitor import Q
from ..calendar.google_service import create_project_calendar

ERROR_AUTH_HEADER_MISSING = 'Authorization header missing'
ERROR_INVALID_AUTH_HEADER = 'Invalid authorization header format'
ERROR_INVALID_TOKEN = 'Invalid or expired token'
PROJECT_NOT_FOUND_ERROR = 'Project not found'

class ProjectViewSet(viewsets.ViewSet):
    """
    A ViewSet for creating, updating, and managing Projects and their members.
    
    Handles:
    - POST /api/projects/ (create)
    - PATCH /api/projects/<id>/ (partial_update for name/description)
    - POST /api/projects/<id>/add_members/ (custom action)
    - POST /api/projects/<id>/remove_members/ (custom action)
    """

    def _authenticate_user(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            raise AuthenticationFailed(ERROR_AUTH_HEADER_MISSING)
        
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            raise AuthenticationFailed(ERROR_INVALID_AUTH_HEADER)
        
        user = User.validate_token(token)
        if not user:
            raise AuthenticationFailed(ERROR_INVALID_TOKEN)
        return user


    def list(self, request):
        """
        Lists projects where the authenticated user is the leader or an accepted member.
        Maps to: GET /api/projects/
        """
        try:
            user = self._authenticate_user(request)
        except AuthenticationFailed as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        # Optional search parameter to filter projects by name or description
        search = request.query_params.get('search') or request.query_params.get('q') or ''
        user_id = str(user.id)
        try:
            if search and str(search).strip() != "":
                search = str(search).strip()
                leader_projects_qs = Project.objects(
                    Q(team_leader=user) & (Q(name__icontains=search) | Q(description__icontains=search))
                )
                member_projects_qs = Project.objects(
                    Q(team_members__match={'user': user_id}) & (Q(name__icontains=search) | Q(description__icontains=search))
                )
            else:
                leader_projects_qs = Project.objects(team_leader=user)
                member_projects_qs = Project.objects(team_members__match={'user': user_id})

            leader_projects = list(leader_projects_qs)
            member_projects = list(member_projects_qs)
        except Exception:
            # Fallback to previous behavior if query construction fails
            leader_projects = list(Project.objects(team_leader=user))
            member_projects = list(Project.objects(
                team_members__match={'user': user_id}
            ))

        # Merge and remove duplicates while preserving order (leader projects first)
        project_map = {str(project.id): project for project in leader_projects}
        for project in member_projects:
            project_map.setdefault(str(project.id), project)

        projects = list(project_map.values())

        # Build user lookup for team members to enrich response
        team_member_ids = set()
        for project in projects:
            for member in project.team_members:
                member_id = member.get('user')
                if member_id:
                    team_member_ids.add(member_id)

        users_lookup = {}
        if team_member_ids:
            users_lookup = {
                str(user_obj.id): user_obj.username
                for user_obj in User.objects(id__in=list(team_member_ids))
            }

        serialized = []
        for project in projects:
            team_members = []
            for member in project.team_members:
                member_id = member.get('user')
                team_members.append({
                    'user_id': member_id,
                    'username': users_lookup.get(member_id),
                    'accepted': bool(member.get('accepted', False))
                })

            serialized.append({
                'id': str(project.id),
                'name': project.name,
                'description': project.description,
                'project_type': project.project_type,
                'team_leader': {
                    'user_id': str(project.team_leader.id),
                    'username': getattr(project.team_leader, 'username', None)
                },
                'team_members': team_members,
                'created_at': project.created_at.isoformat() if project.created_at else None,
            })

        return Response(serialized, status=status.HTTP_200_OK)

    def create(self, request):
        """
        Creates a new Project.
        Maps to: POST /api/projects/
        """
        try:
            user = self._authenticate_user(request)
        except AuthenticationFailed as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        
        data = request.data
        name = data.get('name')
        if not name or name.strip() == '':
            return Response({'error': 'Name is required and cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        
        team_members_invited = data.get('team_members', [])
        team_members_db = []
        invited_users = []
        user_id_str = str(user.id)

        for username in team_members_invited:
            try:
                invited_user = User.objects.get(username=username)
                invited_user_id_str = str(invited_user.id)
                
                # Prevent team leader from adding themselves
                if invited_user_id_str == user_id_str:
                    return Response(
                        {'error': f'Cannot add yourself as a team member. You are already the team leader.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Prevent duplicates
                if not any(m['user'] == invited_user_id_str for m in team_members_db):
                    team_members_db.append({'user': invited_user_id_str, 'accepted': False})
                    invited_users.append(invited_user)
            except User.DoesNotExist:
                # Skip invalid usernames
                continue
                
        try:
            project = Project(
                name=name,
                description=data.get('description', ''),
                team_leader=user,
                project_type=data.get('project_type', 'development'),
                team_members=team_members_db
            )
            project.save()
            project_id = str(project.id)

            credentials = GoogleCredentials.objects(user=user).first()
            if credentials:
                calendar_id = create_project_calendar(credentials, name)
                project.calendar_id = calendar_id
                project.save()


            try:
                for invited_user in invited_users:
                    Notification(
                        user=invited_user,
                        message=f"You have been invited to join the project '{name}'.",
                        link_url=f"/accept-invitation/{project_id}"
                    ).save()
            except Exception as e:
                print(f"Error creating notifications: {e}")

            # Send email invitations in the background
            threading.Thread(target=send_invitations_background, args=([str(u.id) for u in invited_users], name, project_id)).start()

            chat_api_url = "http://localhost:8000/api/chats/create/"
            chat_payload = {
                "name" : name,
                "admin" : str(user.id),
                "participants" : [str(u.id) for u in invited_users]
            }

            try:
                chat_response = requests.post(chat_api_url, json=chat_payload)
                if chat_response.status_code != 201:
                    print(f"Failed to create chat for project {name}: {chat_response.text}")
            except Exception as e:
                print(f"Error while creating chat for project {name}: {e}")
            return Response({'message': 'Project created successfully', 'project_id': project_id}, status=status.HTTP_201_CREATED)
        except MongoValidationError as e:
            return Response({'error': f'Validation error: {e}'}, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, pk=None):
        """
        Updates a Project's simple fields (name, description).
        Maps to: PATCH /api/projects/<project_id>/
        """
        try:
            user = self._authenticate_user(request)
        except AuthenticationFailed as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            project = Project.objects.get(id=pk)
        except (DoesNotExist, MongoValidationError):
            return Response({'error': PROJECT_NOT_FOUND_ERROR}, status=status.HTTP_404_NOT_FOUND)
        
        # Authorization
        if project.team_leader != user:
            return Response({'error': 'Only the team leader can update this project.'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        updated = False
        if 'name' in data:
            project.name = data['name']
            updated = True
        if 'description' in data:
            project.description = data['description']
            updated = True
        
        if not updated:
            return Response({'message': 'No changes provided for name or description.'}, status=status.HTTP_200_OK)
        
        project.save()
        return Response({'message': 'Project updated successfully.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def add_members(self, request, pk=None):
        """
        Adds new members to a project.
        Maps to: POST /api/projects/<project_id>/add_members/
        """
        try:
            user = self._authenticate_user(request)
        except AuthenticationFailed as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            project = Project.objects.get(id=pk)
        except (DoesNotExist, MongoValidationError):
            return Response({'error': PROJECT_NOT_FOUND_ERROR}, status=status.HTTP_404_NOT_FOUND)

        # Authorization
        if project.team_leader != user:
            return Response({'error': 'Only the team leader can add members.'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        if 'add_members' not in data or not isinstance(data['add_members'], list):
            return Response({'error': "Expected 'add_members' to be a list of user IDs."}, status=status.HTTP_400_BAD_REQUEST)
        
        new_member_ids = set(data['add_members'])
        existing_member_ids = {m['user'] for m in project.team_members}
        members_to_add = []
        
        for member_id in new_member_ids:
            if member_id != str(project.team_leader.id) and member_id not in existing_member_ids:
                project.team_members.append({'user': member_id, 'accepted': False})
                members_to_add.append(member_id)

        if not members_to_add:
            return Response({'message': 'No new members to add (or members are already in project).'}, status=status.HTTP_200_OK)

        # Save the new member list to the project
        project.save()

        # Send in-app notifications
        try:
            for member_id in members_to_add:
                try:
                    invited_user = User.objects.get(id=member_id)
                    Notification(
                        user=invited_user,
                        message=f"You have been invited to join the project '{project.name}'.",
                        link_url=f"/accept-invitation/{pk}"
                    ).save()
                except User.DoesNotExist:
                    print(f"Warning: Could not create notification for non-existent user ID {member_id}")
        except Exception as e:
            print(f"Error creating notifications: {e}")

        # Send email invitations
        threading.Thread(target=send_invitations_background, args=(members_to_add, project.name, pk)).start()
        
        return Response({'message': f'Successfully invited {len(members_to_add)} new member(s).'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def remove_members(self, request, pk=None):
        """
        Removes members from a project, with a confirmation step.
        Maps to: POST /api/projects/<project_id>/remove_members/
        """
        try:
            user = self._authenticate_user(request)
            project = Project.objects.get(id=pk)
        except AuthenticationFailed as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        except Project.DoesNotExist:
            return Response({'error': PROJECT_NOT_FOUND_ERROR}, status=status.HTTP_404_NOT_FOUND)

        # Authorization
        if project.team_leader != user:
            return Response({'error': 'Only the team leader can remove members.'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        members_to_remove = data.get('remove_members', [])
        if not isinstance(members_to_remove, list):
            return Response({'error': "Expected 'remove_members' to be a list of user IDs."}, status=status.HTTP_400_BAD_REQUEST)

        existing_member_ids = {m['user'] for m in project.team_members}
        members_to_remove = [m for m in members_to_remove if m in existing_member_ids]

        if not members_to_remove:
            return Response({'message': 'No valid members to remove.'}, status=status.HTTP_200_OK)

        project.team_members = [m for m in project.team_members if m['user'] not in members_to_remove]
        project.save()

        return Response({'message': f'Successfully removed {len(members_to_remove)} member(s).'}, status=status.HTTP_200_OK)

    from rest_framework.decorators import action
    from ..calendar.models import GoogleCredentials
    from ..calendar.google_service import create_project_calendar, create_event
    from datetime import timedelta

    @action(detail=True, methods=['post'])
    def create_calendar(self, request, pk=None):
        """
        Creates a Google Calendar for a project *after* asking user confirmation.
        URL: POST /api/projects/<project_id>/create_calendar/
        """
        # 1. Authenticate
        try:
            user = self._authenticate_user(request)
        except AuthenticationFailed as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        # 2. Fetch project
        try:
            project = Project.objects.get(id=pk)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        # 3. Only team leader can create calendar
        if project.team_leader != user:
            return Response(
                {'error': 'Only the team leader can create a calendar for this project.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # 4. Reject if project already has calendar
        if getattr(project, 'calendar_id', None):
            return Response({'message': 'Calendar already exists for this project.', 'calendar_id': project.calendar_id},
                            status=status.HTTP_200_OK)

        # 5. Retrieve the user's Google credentials
        credentials = GoogleCredentials.objects(user=user).first()
        if not credentials:
            return Response({'error': 'Google Calendar not connected'}, status=status.HTTP_400_BAD_REQUEST)

        # 6. Create Google Calendar
        calendar_id = create_project_calendar(credentials, project.name)
        if not calendar_id:
            return Response({'error': 'Failed to create Google Calendar.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        project.calendar_id = calendar_id
        project.save()
        
        try:
            created_start = project.created_at.isoformat()
            created_end = (project.created_at + timedelta(minutes=30)).isoformat()

            create_event(credentials, calendar_id, {
                "summary": f"Project Created: {project.name}",
                "description": project.description or "",
                "start": created_start,
                "end": created_end,
                "task_id": None
            })
        except Exception as e:
            print(f"Failed to create initial event: {e}")

        return Response({
            'message': 'Project calendar created successfully.',
            'calendar_id': calendar_id
        }, status=status.HTTP_201_CREATED)

class AcceptInvitation(APIView):
    """
    This view is separate as it's a unique action for an
    invited user, not part of the standard Project CRUD.
    Maps to: GET /api/projects/accept-invitation/<project_id>/
    """
    def get(self, request, project_id):
        # 1. Authenticate the user
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return Response({'error': ERROR_AUTH_HEADER_MISSING}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            token = auth_header.split(' ')[1]
            user = User.validate_token(token)
            if not user:
                return Response({'error': ERROR_INVALID_TOKEN}, status=status.HTTP_401_UNAUTHORIZED)
        except IndexError:
            return Response({'error': ERROR_INVALID_AUTH_HEADER}, status=status.HTTP_401_UNAUTHORIZED)
        
        # 2. Find the project
        try:
            project = Project.objects.get(id=project_id)
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # 3. Check if the user is the team leader
        if project.team_leader == user:
            return Response({'message': 'You are the team leader of this project and are already a member.'}, status=status.HTTP_200_OK)
       
        # 4. Find and update the user in the team_members list
        user_id_str = str(user.id)
        for member in project.team_members:
            if member['user'] == user_id_str:
                if member['accepted']:
                    return Response({'message': 'Invitation already accepted.'}, status=status.HTTP_200_OK)
                
                member['accepted'] = True
                project.save()
                
                # Delete or mark related invitation notifications (match by link or message)
                from api.notifications.models import Notification
                try:
                    # Match notifications that reference this project's accept link or mention the project name
                    Notification.objects((Q(user=user) & Q(link_url__icontains=str(project_id))) | (Q(user=user) & Q(message__icontains=project.name))).update(set__read=True)
                except Exception:
                    # Fallback: try a broader mark-as-read if query composition fails
                    try:
                        Notification.objects(user=user, message__icontains=project.name).update(set__read=True)
                    except Exception:
                        pass
                
                return Response({'message': 'Invitation accepted successfully'}, status=status.HTTP_200_OK)
        
        return Response({'error': 'You are not invited to this project'}, status=status.HTTP_403_FORBIDDEN)

class searchuser(APIView):
    def post(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return Response({'error': 'Authorization header missing'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return Response({'error': 'Invalid authorization header format'}, status=status.HTTP_401_UNAUTHORIZED)

        user = User.validate_token(token)
        if not user:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_401_UNAUTHORIZED)

        query = request.data.get('query', '')
        if not query:
            return Response({'':''}, status=status.HTTP_200_OK)

        matched_users = User.objects.filter(username__icontains=query)[:10]
        result = {}
        for user in matched_users:
            result[str(user.id)] = user.username
        return Response({'results': result}, status=status.HTTP_200_OK)
