from rest_framework import viewsets, status
from rest_framework.response import Response
from ..auth.models import User
from ..projects.models import Project
from .models import Task
from datetime import datetime
from mongoengine.errors import DoesNotExist, ValidationError as MongoValidationError
from mongoengine.queryset.visitor import Q

ERROR_AUTH_HEADER_MISSING = 'Authorization header missing'
ERROR_INVALID_AUTH_HEADER = 'Invalid authorization header format'
ERROR_INVALID_TOKEN = 'Invalid or expired token'


class TaskViewSet(viewsets.ViewSet):
    """
    A ViewSet for creating, listing, retrieving, updating, and deleting Tasks.
    
    Routes:
    - POST /api/tasks/ (create)
    - GET /api/tasks/?project_id=<id> (list)
    - GET /api/tasks/<id>/ (retrieve)
    - PATCH /api/tasks/<id>/ (partial_update)
    - DELETE /api/tasks/<id>/ (destroy)
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

    def _get_user_permission(self, project, user):
        """
        Helper to check user's role in a project.
        Returns 'leader', 'member', or None.
        """
        if project.team_leader == user:
            return 'leader'
        
        user_id_str = str(user.id)
        for member in project.team_members:
            if member['user'] == user_id_str and member['accepted']:
                return 'member'
        
        return None

    def _serialize_task(self, task):
        """Helper to convert a Task object to a JSON-friendly dict."""
        return {
            "id": str(task.id),
            "name": task.name,
            "description": task.description,
            "project_id": str(task.project.id),
            "assigned_to": {
                "user_id": str(task.assigned_to.id),
                "username": task.assigned_to.username
            } if task.assigned_to else None,
            "status": task.status,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "created_at": task.created_at.isoformat()
        }

    def list(self, request):
        """
        Lists all tasks for a specific project.
        Maps to: GET /api/tasks/?project_id=<project_id>
        """
        try:
            user = self._authenticate_user(request)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])
        
        project_id = request.query_params.get('project_id')
        if not project_id:
            return Response({'error': 'A "project_id" query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            project = Project.objects.get(id=project_id)
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Authorization: User must be a member of the project to see its tasks
        permission = self._get_user_permission(project, user)
        if not permission:
            return Response({'error': 'You are not a member of this project.'}, status=status.HTTP_403_FORBIDDEN)
        
        tasks = Task.objects(project=project)
        data = [self._serialize_task(task) for task in tasks]
        
        return Response(data, status=status.HTTP_200_OK)

    def retrieve(self, request, pk=None):
        """
        Retrieves a single task by its ID.
        Maps to: GET /api/tasks/<task_id>/
        """
        try:
            user = self._authenticate_user(request)
            task = Task.objects.get(id=pk)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Authorization: User must be a member of the task's project
        permission = self._get_user_permission(task.project, user)
        if not permission:
            return Response({'error': 'You are not authorized to view this task.'}, status=status.HTTP_403_FORBIDDEN)
        
        data = self._serialize_task(task)
        return Response(data, status=status.HTTP_200_OK)

    def create(self, request):
        """
        Creates a new Task for a project.
        Maps to: POST /api/tasks/
        """
        try:
            user = self._authenticate_user(request)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])
        
        data = request.data
        project_id = data.get('project_id')
        name = data.get('name')
        
        if not project_id or not name:
            return Response({'error': 'project_id and name are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            project = Project.objects.get(id=project_id)
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Authorization: User must be a member of the project to create tasks
        permission = self._get_user_permission(project, user)
        if not permission:
            return Response({'error': 'You are not an accepted member of this project and cannot create tasks.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Validate Assignee (if provided)
        assignee = None
        assigned_to_id = data.get('assigned_to')
        if assigned_to_id:
            try:
                assignee = User.objects.get(id=assigned_to_id)
                # Check if the *assignee* is a member of the project
                if not self._get_user_permission(project, assignee):
                    return Response({'error': 'Assigned user is not an accepted member of this project.'}, status=status.HTTP_400_BAD_REQUEST)
            except (DoesNotExist, MongoValidationError):
                return Response({'error': 'Assigned user not found.'}, status=status.HTTP_400_BAD_REQUEST)

        # Parse due_date (if provided)
        due_date_obj = None
        due_date_str = data.get('due_date')
        if due_date_str:
            try:
                due_date_obj = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
            except (ValueError, TypeError):
                return Response({'error': 'Invalid due_date format. Please use ISO 8601.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create and save the new task
        try:
            new_task = Task(
                name=name,
                project=project,
                description=data.get('description', ''),
                assigned_to=assignee,
                due_date=due_date_obj,
                status='pending'
            )
            new_task.save()
            return Response({
                'message': 'Task created successfully',
                'task_id': str(new_task.id)
            }, status=status.HTTP_201_CREATED)
        except MongoValidationError as e:
            return Response({'error': f'Validation error: {e}'}, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, pk=None):
        """
        Updates a Task.
        - Team Leader: Can update any field.
        - Assignee: Can ONLY update the 'status' field.
        Maps to: PATCH /api/tasks/<task_id>/
        """
        try:
            user = self._authenticate_user(request)
            task = Task.objects.get(id=pk)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Authorization: Must be Team Leader or Assignee
        permission = self._get_user_permission(task.project, user)
        is_assignee = (task.assigned_to == user)

        if permission != 'leader' and not is_assignee:
            return Response({'error': 'You are not authorized to update this task.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        updated = False

        if permission == 'leader':
            # Team Leader can update anything
            if 'name' in data:
                task.name = data['name']
                updated = True
            if 'description' in data:
                task.description = data['description']
                updated = True
            if 'status' in data:
                task.status = data['status']
                updated = True
            
            if 'due_date' in data:
                due_date_str = data.get('due_date')
                if due_date_str:
                    try:
                        task.due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
                    except (ValueError, TypeError):
                        return Response({'error': 'Invalid due_date format.'}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    task.due_date = None # Allow clearing the date
                updated = True
            
            if 'assigned_to' in data:
                new_assignee_id = data.get('assigned_to')
                if new_assignee_id:
                    try:
                        new_assignee = User.objects.get(id=new_assignee_id)
                        # Validate new assignee
                        if not self._get_user_permission(task.project, new_assignee):
                            return Response({'error': 'New assigned user is not an accepted member of this project.'}, status=status.HTTP_400_BAD_REQUEST)
                        task.assigned_to = new_assignee
                    except (DoesNotExist, MongoValidationError):
                        return Response({'error': 'New assigned user not found.'}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    task.assigned_to = None # Allow un-assigning
                updated = True

        elif is_assignee:
            # Assignee (who is not leader) can ONLY update status
            if 'status' in data:
                task.status = data['status']
                updated = True
            
            # Check if they tried to change anything else
            disallowed_keys = ['name', 'description', 'due_date', 'assigned_to']
            if any(key in data for key in disallowed_keys):
                return Response({'error': 'Assignees can only update the task status.'}, status=status.HTTP_403_FORBIDDEN)

        if not updated:
            return Response({'message': 'No changes provided.'}, status=status.HTTP_200_OK)

        try:
            task.save()
            return Response({'message': 'Task updated successfully.', 'task': self._serialize_task(task)}, status=status.HTTP_200_OK)
        except MongoValidationError as e:
            return Response({'error': f'Validation error: {e}'}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        """
        Deletes a task. Only a Team Leader can do this.
        Maps to: DELETE /api/tasks/<task_id>/
        """
        try:
            user = self._authenticate_user(request)
            task = Task.objects.get(id=pk)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Authorization: Only the Team Leader can delete tasks
        if task.project.team_leader != user:
            return Response({'error': 'Only the project team leader can delete tasks.'}, status=status.HTTP_403_FORBIDDEN)
        
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)