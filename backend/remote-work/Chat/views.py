from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from mongoengine.errors import DoesNotExist
from api.auth.models import User  # your MongoEngine User with validate_token
from api.projects.models import Project
from .models import GroupChat, GroupMessage, IndividualChat, IndividualMessage
from .serializers import group_chat_public, group_message_public

def _get_user_from_auth(request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, Response({"error": "Authorization header missing"}, status=401)
    token = auth.split(" ", 1)[1]
    user = User.validate_token(token)
    if not user:
        return None, Response({"error": "Invalid or expired token"}, status=401)
    return user, None

class ChatList(APIView):
    def get(self, request):
        user, err = _get_user_from_auth(request)
        if err: return err
        uid = str(user.id)
        chats = GroupChat.objects(participants__in=[uid]).order_by("-created_at")
        return Response([group_chat_public(c) for c in chats])

class ChatMessages(APIView):
    def get(self, request, chatroom_name):   
        user, err = _get_user_from_auth(request)
        if err: return err
        chat = GroupChat.objects(name=chatroom_name).first()
        if not chat: return Response({"error": "Not found"}, status=404)
        uid = str(user.id)
        if uid not in chat.participants:
            return Response({"error": "Forbidden"}, status=403)

        # batch fetch senders for username  
        msgs = GroupMessage.objects(chat=chat).order_by("timestamp")
        sender_ids = list({m.sender for m in msgs})
        users = {str(u.id): u for u in User.objects(id__in=sender_ids)}
        return Response([group_message_public(m, users) for m in msgs])

class CreateGroup(APIView):
    def post(self, request):
        # user, err = _get_user_from_auth(request)
        # if err: return err
        uid = request.data.get("admin")
        name = request.data.get("name", "").strip()
        team_members = request.data.get("participants", [])
        if not name: return Response({"error": "Name required"}, status=400)
        if GroupChat.objects(name=name).first():
            return Response({"error": "Group name already exists"}, status=400)
        chat = GroupChat(name=name, admin=uid, participants=[uid] + team_members)
        chat.save()
        return Response({"message": "created", "name": name}, status=201)

class DirectChat(APIView):
    def post(self, request, username):
        user, err = _get_user_from_auth(request)
        if err: return err
        if username == user.username:
            return Response({"error": "Cannot chat with yourself"}, status=400)
        other = User.objects(username=username).first()
        if not other: return Response({"error": "User not found"}, status=404)
        uid, oid = str(user.id), str(other.id)

        chat = IndividualChat.objects(participants_all=[uid, oid], participants_size=2).first()
        if not chat:
            chat = IndividualChat(participants=[uid, oid])
            chat.save()
        return Response({"chat_id": str(chat.id)})

class ProjectChatMessages(APIView):
    def get(self, request, project_id):
        """
        Get chat messages for a project by project ID.
        The chat name is the same as the project name.
        """
        print(f"[DEBUG] ProjectChatMessages.get() called with project_id={project_id}")
        user, err = _get_user_from_auth(request)
        if err: return err
        
        # Get project by ID
        try:
            project = Project.objects.get(id=project_id)
        except DoesNotExist:
            return Response({"error": "Project not found"}, status=404)
        
        # Check if user is part of the project (leader or member)
        uid = str(user.id)
        is_leader = str(project.team_leader.id) == uid
        # Team members are stored as {'user': user_id, 'accepted': bool}
        is_member = any(
            str(member.get('user')) == uid for member in (project.team_members or [])
        )
        
        print(f"[DEBUG] User check - uid: {uid}, is_leader: {is_leader}, is_member: {is_member}")
        print(f"[DEBUG] Team leader ID: {str(project.team_leader.id)}")
        print(f"[DEBUG] Team members: {project.team_members}")
        
        if not is_leader and not is_member:
            return Response({"error": "You are not a member of this project"}, status=403)
        
        # Get chat by project name
        chat = GroupChat.objects(name=project.name).first()
        if not chat:
            print(f"[DEBUG] Chat not found for project '{project.name}'. Returning empty messages.")
            # Return empty messages instead of 404 - chat will be created when first message is sent
            return Response({
                "project_id": str(project.id),
                "project_name": project.name,
                "chat_id": None,
                "messages": []
            }, status=200)
        
        # Verify user is in chat participants (add if not - for existing chats)
        if uid not in chat.participants:
            print(f"[DEBUG] User {uid} not in chat participants. Adding them.")
            chat.participants.append(uid)
            chat.save()
        
        # Fetch messages
        msgs = GroupMessage.objects(chat=chat).order_by("timestamp")
        sender_ids = list({m.sender for m in msgs})
        users = {str(u.id): u for u in User.objects(id__in=sender_ids)}
        
        return Response({
            "project_id": str(project.id),
            "project_name": project.name,
            "chat_id": str(chat.id),
            "messages": [group_message_public(m, users) for m in msgs]
        })

class SendProjectMessage(APIView):
    def post(self, request, project_id):
        """
        Send a message to a project's chat.
        """
        user, err = _get_user_from_auth(request)
        if err: return err
        
        content = request.data.get("content", "").strip()
        if not content:
            return Response({"error": "Message content is required"}, status=400)
        
        # Get project by ID
        try:
            project = Project.objects.get(id=project_id)
        except DoesNotExist:
            return Response({"error": "Project not found"}, status=404)
        
        # Check if user is part of the project
        uid = str(user.id)
        is_leader = str(project.team_leader.id) == uid
        # Team members are stored as {'user': user_id, 'accepted': bool}
        is_member = any(
            str(member.get('user')) == uid for member in (project.team_members or [])
        )
        
        if not is_leader and not is_member:
            return Response({"error": "You are not a member of this project"}, status=403)
        
        # Get chat by project name, create if it doesn't exist
        chat = GroupChat.objects(name=project.name).first()
        if not chat:
            print(f"[DEBUG] Chat not found for project '{project.name}'. Creating it now.")
            # Create chat with all project members
            participants = [str(project.team_leader.id)]
            if project.team_members:
                participants.extend([str(member.get('user_id')) for member in project.team_members if member.get('user_id')])
            chat = GroupChat(
                name=project.name,
                admin=str(project.team_leader.id),
                participants=participants
            )
            chat.save()
            print(f"[DEBUG] Created chat '{project.name}' with participants: {participants}")
        
        # Verify user is in chat participants (add if not)
        if uid not in chat.participants:
            print(f"[DEBUG] User {uid} not in chat participants. Adding them.")
            chat.participants.append(uid)
            chat.save()
        
        # Create and save message
        message = GroupMessage(
            chat=chat,
            sender=uid,
            content=content,
            timestamp=timezone.now()
        )
        message.save()
        
        # Return the created message
        users = {str(u.id): u for u in User.objects(id__in=[uid])}
        return Response(group_message_public(message, users), status=201)