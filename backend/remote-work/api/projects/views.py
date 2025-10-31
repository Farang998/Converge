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
from .models import Project
import threading


def send_invitation_email(email, project_name, project_id):
    subject = f"Invitation to join project {project_name}"
    message = f"You have been invited to join the project '{project_name}'. Please click the link to accept: http://localhost:5173/accept-invitation/{project_id}"
    try:
        send_mail(subject, message, 'vasanidevarsh@gmail.com', [email], fail_silently=False)
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