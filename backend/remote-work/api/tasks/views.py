from rest_framework import viewsets, status
from rest_framework.response import Response
from ..auth.models import User
from ..projects.models import Project
from .models import Task
from datetime import datetime
from mongoengine.errors import DoesNotExist, ValidationError as MongoValidationError
from mongoengine.queryset.visitor import Q

from ..calendar.models import GoogleCredentials
from ..calendar.google_service import delete_event

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from ..auth.models import User
from ..projects.models import Project
from .models import Task
from ..notifications.models import Notification
from datetime import datetime
from mongoengine.errors import DoesNotExist, ValidationError as MongoValidationError
from ..file_sharing.models import File

from ..utils import ERROR_AUTH_HEADER_MISSING, ERROR_INVALID_AUTH_HEADER, ERROR_INVALID_TOKEN
from ..utils import authenticate_user_from_request

class TaskViewSet(viewsets.ViewSet):

    def _get_user_permission(self, project, user):
        """
        Returns: 'leader', 'member', or None
        """
        if project.team_leader == user:
            return 'leader'

        user_id_str = str(user.id)
        for member in project.team_members:
            if member['user'] == user_id_str and member['accepted']:
                return 'member'

        return None

    def _serialize_task(self, task):
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
            "created_at": task.created_at.isoformat(),
            "dependencies": [str(dep.id) for dep in task.dependencies],
            "related_files": [str(f.id) for f in task.related_files],
        }
    
    def _notify_user(self, user, message, link_url=None):
        Notification(user=user, message=message, link_url=link_url).save()

    # -------------------------------------------------------------
    # LIST TASKS
    # -------------------------------------------------------------
    def list(self, request):
        try:
            user = authenticate_user_from_request(request)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])

        project_id = request.query_params.get('project_id')
        if not project_id:
            return Response({'error': 'A "project_id" query parameter is required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            project = Project.objects.get(id=project_id)
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)

        permission = self._get_user_permission(project, user)
        if not permission:
            return Response({'error': 'You are not a member of this project.'},
                            status=status.HTTP_403_FORBIDDEN)

        tasks = Task.objects(project=project)
        return Response([self._serialize_task(t) for t in tasks],
                        status=status.HTTP_200_OK)

    # -------------------------------------------------------------
    # RETRIEVE TASK
    # -------------------------------------------------------------
    def retrieve(self, request, pk=None):
        try:
            user = authenticate_user_from_request(request)
            task = Task.objects.get(id=pk)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        permission = self._get_user_permission(task.project, user)
        if not permission:
            return Response({'error': 'You are not authorized to view this task.'},
                            status=status.HTTP_403_FORBIDDEN)

        return Response(self._serialize_task(task), status=status.HTTP_200_OK)

    # -------------------------------------------------------------
    # CREATE TASK
    # -------------------------------------------------------------
    def create(self, request):
        try:
            user = authenticate_user_from_request(request)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])

        data = request.data
        project_id = data.get('project_id')
        name = data.get('name')

        if not project_id or not name:
            return Response({'error': 'project_id and name are required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            project = Project.objects.get(id=project_id)
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'Project not found.'},
                            status=status.HTTP_404_NOT_FOUND)

        permission = self._get_user_permission(project, user)
        if not permission:
            return Response({'error': 'You are not an accepted member of this project.'},
                            status=status.HTTP_403_FORBIDDEN)

        # Assignee validation
        assignee = None
        assigned_to_id = data.get('assigned_to')
        if assigned_to_id:
            try:
                assignee = User.objects.get(id=assigned_to_id)
                if not self._get_user_permission(project, assignee):
                    return Response({'error': 'Assigned user is not a member of this project.'},
                                    status=status.HTTP_400_BAD_REQUEST)
            except:
                return Response({'error': 'Assigned user not found.'},
                                status=status.HTTP_400_BAD_REQUEST)

        # Parse due date
        due_date_obj = None
        due_date_str = data.get('due_date')
        if due_date_str:
            try:
                due_date_obj = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
            except:
                return Response({'error': 'Invalid due_date format.'},
                                status=status.HTTP_400_BAD_REQUEST)
            
        file_ids = data.get("related_files", [])
        files = []
        for fid in file_ids:
            try:
                f = File.objects.get(id=fid)
                if f.project.id != project.id:
                    return Response({'error': 'File does not belong to project'}, status=400)
                files.append(f)
            except:
                return Response({'error': f'Invalid file id: {fid}'}, status=400)

        # Create task
        try:
            new_task = Task(
                name=name,
                project=project,
                description=data.get('description', ''),
                assigned_to=assignee,
                due_date=due_date_obj,
                status='pending'
            )
            new_task.related_files = files
            new_task.save()

            # ---------------------------------------------------------
            # GOOGLE CALENDAR → CREATE EVENT
            # ---------------------------------------------------------
            if due_date_obj and project.calendar_id:
                from ..calendar.models import GoogleCredentials
                from ..calendar.google_service import create_event

                credentials = GoogleCredentials.objects(user=project.team_leader).first()
                if credentials:
                    event_id = create_event(credentials, project.calendar_id, {
                        "summary": new_task.name,
                        "description": new_task.description,
                        "start": due_date_obj.isoformat(),
                        "end": due_date_obj.isoformat(),
                        "task_id": str(new_task.id)
                    })
                    new_task.calendar_event_id = event_id
                    new_task.save()

            return Response({'message': 'Task created successfully',
                             'task_id': str(new_task.id)},
                            status=status.HTTP_201_CREATED)

        except MongoValidationError as e:
            return Response({'error': f'Validation error: {e}'},
                            status=status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------
    # UPDATE TASK
    # -------------------------------------------------------------
    # Partial update : name, description, status, assigned_to, due_date
    def partial_update(self, request, pk=None):
        # ---------------------------------------------------------
        # AUTH + FETCH
        # ---------------------------------------------------------
        try:
            user = authenticate_user_from_request(request)
            task = Task.objects.get(id=pk)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])
        except:
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        permission = self._get_user_permission(task.project, user)
        is_assignee = (task.assigned_to == user)

        if permission != 'leader' and not is_assignee:
            return Response({'error': 'You are not authorized to update this task.'},
                            status=status.HTTP_403_FORBIDDEN)

        data = request.data
        updated = False

        # ------------------------------
        # UPDATE RELATED FILES (LEADER ONLY)
        # ------------------------------
        if "related_files" in data:
            file_ids = data.get("related_files", [])
            new_files = []

            for fid in file_ids:
                try:
                    f = File.objects.get(id=fid)

                    if str(f.project.id) != str(task.project.id):
                        return Response({
                            'error': 'File does not belong to this project',
                            'file_id': fid
                        }, status=400)

                    new_files.append(f)

                except:
                    return Response({
                        'error': f'Invalid file id: {fid}'
                    }, status=400)

            # Replace full list
            task.related_files = new_files
            updated = True
            
        # ---------------------------------------------------------
        # LEADER CAN UPDATE ANYTHING
        # ---------------------------------------------------------
        if permission == "leader":

            # Name
            if "name" in data:
                task.name = data["name"]
                updated = True

            # Description
            if "description" in data:
                task.description = data["description"]
                updated = True

            # Status
            if "status" in data:
                if data["status"] == "in_progress":
                    incomplete = [d for d in task.dependencies if d.status != "completed"]
                    if incomplete:
                        return Response({
                            "error": "Task cannot start until dependencies are completed.",
                            "blocked_by": [str(d.id) for d in incomplete]
                        }, status=400)

                task.status = data["status"]
                updated = True

            # Assigned user
            if "assigned_to" in data:
                new_assignee_id = data.get("assigned_to")

                if new_assignee_id:
                    try:
                        new_assignee = User.objects.get(id=new_assignee_id)
                        if not self._get_user_permission(task.project, new_assignee):
                            return Response({'error': 'User not in project.'}, status=400)
                        task.assigned_to = new_assignee
                    except:
                        return Response({'error': 'Invalid assignee.'}, status=400)
                else:
                    task.assigned_to = None

                updated = True

            # -----------------------------------------------------
            # DUE DATE UPDATE + VALIDATION (STRICT MODE)
            # -----------------------------------------------------
            if "due_date" in data:
                due_date_str = data["due_date"]

                if due_date_str:
                    try:
                        new_due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
                    except:
                        return Response({"error": "Invalid due_date format."}, status=400)

                    # 1) Check conflict against dependencies
                    for dep in task.dependencies:
                        if dep.due_date and new_due_date < dep.due_date:
                            return Response({
                                "error": "Due date conflict: cannot be earlier than dependency.",
                                "dependency": str(dep.id),
                                "dependency_due_date": dep.due_date.isoformat()
                            }, status=400)

                    # 2) Check conflict against reverse dependents
                    reverse_dependents = Task.objects(dependencies=task)
                    for dep_task in reverse_dependents:
                        if dep_task.due_date and new_due_date > dep_task.due_date:
                            return Response({
                                "error": "Due date conflict: exceeds dependent task’s deadline.",
                                "dependent_task": str(dep_task.id),
                                "dependent_due_date": dep_task.due_date.isoformat()
                            }, status=400)

                    # Passed strict validation
                    task.due_date = new_due_date

                else:
                    # Removing due date
                    task.due_date = None

                updated = True

        # ---------------------------------------------------------
        # ASSIGNEE CAN ONLY UPDATE STATUS
        # ---------------------------------------------------------
        elif is_assignee:
            if "status" in data:
                new_status = data["status"]

                # assignee is NOT allowed to complete the task
                if new_status == "completed":
                    return Response({
                        "error": "Only team leader can complete tasks. Request approval instead."
                    }, status=403)

                # assignee can request approval
                if new_status == "approval_pending":
                    # store previous status for later rollback if rejected
                    task._previous_status = task.status  
                    task.status = "approval_pending"
                    self._notify_user(
                        task.project.team_leader,
                        f"Task '{task.name}' is awaiting your approval.",
                        link_url=f"/projects/{task.project.id}/tasks/{task.id}"
                    )

                    updated = True

                # assignee can still move to in_progress
                if new_status in ["in_progress", "pending"]:
                    task.status = new_status
                    updated = True

                return Response({
                    "error": f"Invalid status for assignee: {new_status}"
                }, status=400)

        
        # ---------------------------------------------------------
        # NO UPDATE PROVIDED
        # ---------------------------------------------------------
        if not updated:
            return Response({"message": "No changes provided."}, status=200)
        task.save()

        # ---------------------------------------------------------
        # GOOGLE CALENDAR UPDATE
        # ---------------------------------------------------------
        if task.calendar_event_id and task.project.calendar_id:
            from ..calendar.models import GoogleCredentials
            from ..calendar.google_service import update_event

            credentials = GoogleCredentials.objects(user=task.project.team_leader).first()
            if credentials and task.due_date:
                update_event(credentials, task.project.calendar_id,
                            task.calendar_event_id, {
                                "summary": task.name,
                                "description": task.description,
                                "start": task.due_date.isoformat(),
                                "end": task.due_date.isoformat()
                            })

        return Response({
            "message": "Task updated successfully.",
            "task": self._serialize_task(task)
    }, status=200)


    # -------------------------------------------------------------
    # DELETE TASK
    # -------------------------------------------------------------
    def destroy(self, request, pk=None):
        try:
            user = authenticate_user_from_request(request)
            task = Task.objects.get(id=pk)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])
        except:
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        if task.project.team_leader != user:
            return Response({'error': 'Only the team leader can delete tasks.'},
                            status=status.HTTP_403_FORBIDDEN)
        
        # ---------------------------------------------------------
        # CHECK IF OTHER TASKS DEPEND ON THIS ONE
        # ---------------------------------------------------------
        reverse_dependents = Task.objects(dependencies=task)

        if reverse_dependents:
            return Response({
                "error": "Task cannot be deleted because other tasks depend on it. Remove dependencies first.",
                "dependent_tasks": [
                    {"id": str(t.id), "name": t.name} for t in reverse_dependents
                ]
            }, status=status.HTTP_400_BAD_REQUEST)

        # ---------------------------------------------------------
        # GOOGLE CALENDAR → DELETE EVENT
        # ---------------------------------------------------------
        if task.calendar_event_id and task.project.calendar_id:
            credentials = GoogleCredentials.objects(user=task.project.team_leader).first()
            if credentials:
                delete_event(credentials, task.project.calendar_id,
                             task.calendar_event_id)

        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    def _has_cycle(self, task, dependency):
        visited = set()

        def dfs(current):
            if current.id == task.id:
                return True  # loop detected
            visited.add(str(current.id))
            for dep in current.dependencies:
                if str(dep.id) not in visited:
                    if dfs(dep):
                        return True
            return False

        return dfs(dependency)
    


    @action(detail=True, methods=["post"])
    def add_dependency(self, request, pk=None):
        # Authenticate
        try:
            user = authenticate_user_from_request(request)
            task = Task.objects.get(id=pk)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])
        except:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

        # Leader-only
        permission = self._get_user_permission(task.project, user)
        if permission != "leader":
            return Response({'error': 'Only team leader can add dependencies'}, status=403)

        dep_id = request.data.get("dependency_id")
        if not dep_id:
            return Response({'error': 'dependency_id is required'}, status=400)

        try:
            dependency = Task.objects.get(id=dep_id)
        except:
            return Response({'error': 'Dependency task not found'}, status=404)

        # Same project check
        if dependency.project.id != task.project.id:
            return Response({'error': 'Both tasks must belong to same project'}, status=400)

        # Prevent self-dependency
        if task.id == dependency.id:
            return Response({'error': 'A task cannot depend on itself'}, status=400)

        # Cycle detection
        if self._has_cycle(task, dependency):
            return Response({'error': 'Circular dependency detected'}, status=400)
        
        if dependency.due_date and task.due_date:
            if task.due_date < dependency.due_date:
                return Response({
                    'error': 'Due date conflict: this task is due earlier than its dependency.',
                    'task_due_date': task.due_date.isoformat(),
                    'dependency_due_date': dependency.due_date.isoformat()
                }, status=400)

        # Add dependency
        task.dependencies.append(dependency)
        task.save()

        return Response({'message': 'Dependency added successfully'})

    @action(detail=True, methods=["post"])
    def remove_dependency(self, request, pk=None):
        # Authenticate
        try:
            user = authenticate_user_from_request(request)
            task = Task.objects.get(id=pk)
        except Exception as e:
            return Response({'error': str(e.args[0])}, status=e.args[1])
        except:
            return Response({'error': 'Task not found'}, status=404)

        permission = self._get_user_permission(task.project, user)
        if permission != "leader":
            return Response({'error': 'Only leader can remove dependencies'}, status=403)

        dep_id = request.data.get("dependency_id")
        if not dep_id:
            return Response({'error': 'dependency_id is required'}, status=400)

        # Filter out this dependency
        before = len(task.dependencies)
        task.dependencies = [d for d in task.dependencies if str(d.id) != dep_id]

        if len(task.dependencies) == before:
            return Response({'error': 'Dependency not found'}, status=404)

        task.save()

        return Response({'message': 'Dependency removed successfully'})
    
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        user = authenticate_user_from_request(request)
        task = Task.objects.get(id=pk)

        if self._get_user_permission(task.project, user) != "leader":
            return Response({"error": "Only leader can approve tasks"}, status=403)

        if task.status != "approval_pending":
            return Response({"error": "Task is not awaiting approval"}, status=400)

        task.status = "completed"
        self._notify_user(
            task.assigned_to,
            f"Your task '{task.name}' has been approved!",
            link_url=f"/projects/{task.project.id}/tasks/{task.id}"
        )
        task.save()

        return Response({"message": "Task approved"} , status=200)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        user = authenticate_user_from_request(request)
        task = Task.objects.get(id=pk)

        if self._get_user_permission(task.project, user) != "leader":
            return Response({"error": "Only leader can reject tasks"}, status=403)

        if task.status != "approval_pending":
            return Response({"error": "Task is not awaiting approval"}, status=400)

        # fallback if no stored previous status
        previous_status = getattr(task, "_previous_status", "in_progress")

        task.status = previous_status
        self._notify_user(
            task.assigned_to,
            f"Your task '{task.name}' was rejected. Please make changes.",
            link_url=f"/projects/{task.project.id}/tasks/{task.id}"
        )
        task.save()

        return Response({"message": "Task sent back for changes"} , status=200)
