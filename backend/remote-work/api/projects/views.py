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
from django.conf import settings

from .utils import send_invitations_background

ERROR_AUTH_HEADER_MISSING = 'Authorization header missing'
ERROR_INVALID_AUTH_HEADER = 'Invalid authorization header format'
ERROR_INVALID_TOKEN = 'Invalid or expired token'


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
            raise Exception(ERROR_AUTH_HEADER_MISSING, status.HTTP_401_UNAUTHORIZED)
        
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            raise Exception(ERROR_INVALID_AUTH_HEADER, status.HTTP_401_UNAUTHORIZED)
        
        user = User.validate_token(token)
        if not user:
            raise Exception(ERROR_INVALID_TOKEN, status.HTTP_401_UNAUTHORIZED)
        return user

    def create(self, request):
        """
        Creates a new Project.
        Maps to: POST /api/projects/
        """
        try:
            user = self._authenticate_user(request)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])
        
        data = request.data
        name = data.get('name')
        if not name or name.strip() == '':
            return Response({'error': 'Name is required and cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        
        team_members_invited = data.get('team_members', [])
        team_members_db = [{'user': member_id, 'accepted': False} for member_id in team_members_invited]

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

            try:
                for member_id in team_members_invited:
                    try:
                        invited_user = User.objects.get(id=member_id)
                        Notification(
                            user=invited_user,
                            message=f"You have been invited to join the project '{name}'.",
                            link_url=f"/projects/{project_id}"
                        ).save()
                    except User.DoesNotExist:
                        print(f"Warning: Could not create notification for non-existent user ID {member_id}")
            except Exception as e:
                print(f"Error creating notifications: {e}")

            threading.Thread(target=send_invitations_background, args=(team_members_invited, name, project_id)).start()
            
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
            project = Project.objects.get(id=pk)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
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
            project = Project.objects.get(id=pk)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

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
                        link_url=f"/projects/{pk}"
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
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        # Authorization
        if project.team_leader != user:
            return Response({'error': 'Only the team leader can remove members.'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        force_remove = data.get('force_remove', False)

        if 'remove_members' not in data or not isinstance(data['remove_members'], list):
            return Response({'error': "Expected 'remove_members' to be a list of user IDs."}, status=status.HTTP_400_BAD_REQUEST)

        ids_to_remove = set(data['remove_members'])
        
        # --- Confirmation Logic ---
        if not force_remove:
            conflicts_found = []
            for user_id in ids_to_remove:
                try:
                    # Find tasks using the direct model references
                    assigned_tasks = Task.objects(project=project, assigned_to=user_id, status__ne='completed')
                    completed_tasks = Task.objects(project=project, assigned_to=user_id, status='completed')

                    if assigned_tasks.count() > 0 or completed_tasks.count() > 0:
                        user_obj = User.objects.get(id=user_id)
                        profile = {
                            "user_id": user_id,
                            "username": user_obj.username,
                            "assigned_tasks": [f"{task.name} (Status: {task.status})" for task in assigned_tasks],
                            "completed_tasks_count": completed_tasks.count()
                        }
                        conflicts_found.append(profile)
                except User.DoesNotExist:
                    pass 

            if conflicts_found:
                return Response({
                    "error": "Confirmation required. Member(s) have assigned tasks.",
                    "confirmation_details": conflicts_found,
                    "message": "To proceed with removal, resend this request with 'force_remove': true."
                }, status=status.HTTP_409_CONFLICT)
        
        # --- Removal Logic ---
        original_members = project.team_members
        new_members_list = [m for m in original_members if m.get('user') not in ids_to_remove]
        
        if len(new_members_list) == len(original_members):
            return Response({'message': 'No members found to remove.'}, status=status.HTTP_200_OK)

        project.team_members = new_members_list
        project.save()
        
        # Consequence: Un-assign all tasks from the removed members
        for user_id in ids_to_remove:
            Task.objects(
                project=project, 
                assigned_to=user_id
            ).update(set__assigned_to=None) # Set assigned_to to null
            
        return Response({'message': 'Members removed successfully and their tasks have been unassigned.'}, status=status.HTTP_200_OK)


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
        member_found = False
        for member in project.team_members:
            if member['user'] == user_id_str:
                if member['accepted']:
                    return Response({'message': 'Invitation already accepted.'}, status=status.HTTP_200_OK)
                
                member['accepted'] = True
                project.save()
                member_found = True
                return Response({'message': 'Invitation accepted successfully'}, status=status.HTTP_200_OK)
        
        if not member_found:
            return Response({'error': 'You are not invited to this project'}, status=status.HTTP_403_FORBIDDEN)