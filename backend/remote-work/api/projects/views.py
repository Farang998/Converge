from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from ..auth.models import User
from django.contrib.auth.hashers import make_password
from django.contrib.auth import authenticate, login
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from mongoengine.errors import ValidationError as MongoValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from django.core.cache import cache
from django.core.mail import send_mail
from .models import Project, Task
import threading
from django.conf import settings

# Project Details
def send_invitation_email(email, project_name, project_id):
    subject = f"Invitation to join project {project_name}"
    message = f"You have been invited to join the project '{project_name}'. Please click the link to accept: {settings.FRONTEND_URL}/accept-invitation/{project_id}"
    try:
        send_mail(subject, message, settings.EMAIL_HOST_USER, [email], fail_silently=False)
        print(f"Email sent successfully to {email}")
    except Exception as e:
        print(f"Failed to send email to {email}: {e}")

def send_invitations_background(team_members_invited, project_name, project_id):
    for member_id in team_members_invited:
        try:
            user = User.objects.get(id=member_id)
            send_invitation_email(user.email, project_name, project_id)
        except User.DoesNotExist:
            pass

class ProjectCreate(APIView):
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
        
        team_leader = str(user.id)

        name = request.data.get('name')
        description = request.data.get('description', '')
        if not name:
            return Response({'error': 'Name is required'}, status=status.HTTP_400_BAD_REQUEST)
        project_type = request.data.get('project_type', 'development')

        team_members_invited = request.data.get('team_members', [])
        team_members = [{'user': member, 'accepted': False} for member in team_members_invited]

        if name == '':
            return Response({'error': 'Project name cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        if description == '':
            return Response({'error': 'Project description cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        project_obj = Project(name=name, description=description, team_leader=team_leader, project_type=project_type, team_members=team_members)
        project_obj.save()

        threading.Thread(target=send_invitations_background, args=(team_members_invited, name, str(project_obj.id))).start()

        return Response({'message': 'Project created successfully', 'project_id': str(project_obj.id)}, status=status.HTTP_201_CREATED)

class AcceptInvitation(APIView):
    def get(self, request, project_id):
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
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        user_id = str(user.id)
        for member in project.team_members:
            if member['user'] == user_id:
                member['accepted'] = True
                project.save()
                return Response({'message': 'Invitation accepted successfully'}, status=status.HTTP_200_OK)
        
        return Response({'error': 'You are not invited to this project'}, status=status.HTTP_403_FORBIDDEN)
    

# Task Details
class CreateTask(APIView):
    def post(self, request):
        # 1. Authenticate the user
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
        
        # 2. Get data from request body
        data = request.data
        name = data.get('name')
        project_id = data.get('project_id')
        description = data.get('description', '')
        assigned_to_id = data.get('assigned_to') 
        due_date = data.get('due_date')

        # 3. Validate required fields
        if not name or not project_id:
            return Response({'error': 'Name and project_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Verify the project exists
        try:
            project = Project.objects.get(id=project_id)
        except (Project.DoesNotExist, MongoValidationError):
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        # 5. Authorize: Check if the user is part of the project
        user_id = str(user.id)
        is_member = False
        if project.team_leader == user_id:
            is_member = True
        # else:
        #     for member in project.team_members:
        #         if member['user'] == user_id and member['accepted']:
        #             is_member = True
        #             break
        
        if not is_member:
            return Response({'error': 'You are not authorized to add tasks to this project'}, status=status.HTTP_403_FORBIDDEN)

        # 6. (Optional) Validate if the assigned user is also on the project
        if assigned_to_id:
            is_assignee_member = False
            if project.team_leader == assigned_to_id:
                is_assignee_member = True
            else:
                for member in project.team_members:
                    if member['user'] == assigned_to_id and member['accepted']:
                        is_assignee_member = True
                        break
            
            if not is_assignee_member:
                return Response({'error': 'Assigned user is not an accepted member of this project'}, status=status.HTTP_400_BAD_REQUEST)

        # 7. Create and save the new task
        try:
            new_task = Task(
                name=name,
                project_id=project_id,
                description=description,
                assigned_to=assigned_to_id,
                due_date=due_date 
            )
            new_task.save()
        except MongoValidationError as e:
            return Response({'error': f'Validation error: {e}'}, status=status.HTTP_400_BAD_REQUEST)

        # 8. Return a success response
        return Response({
            'message': 'Task created successfully',
            'task_id': str(new_task.id)
        }, status=status.HTTP_201_CREATED)
    
