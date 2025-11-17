from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
import datetime as _dt
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from mongoengine.errors import DoesNotExist
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import os
import uuid
from pathlib import Path
from api.auth.models import User  # your MongoEngine User with validate_token
from api.projects.models import Project
from .models import GroupChat, GroupMessage, IndividualChat, IndividualMessage
from .serializers import group_chat_public, group_message_public, individual_message_public

def _as_utc_z(dt):
    """Convert datetime to UTC ISO string with Z suffix"""
    if not dt:
        return None
    try:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=_dt.timezone.utc)
        return dt.astimezone(_dt.timezone.utc).isoformat().replace('+00:00', 'Z')
    except Exception:
        try:
            return dt.isoformat()
        except Exception:
            return None

def _get_user_from_auth(request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, Response({"error": "Authorization header missing"}, status=401)
    token = auth.split(" ", 1)[1]
    user = User.validate_token(token)
    if not user:
        return None, Response({"error": "Invalid or expired token"}, status=401)
    return user, None

def _get_file_type(filename):
    """Determine file type from extension"""
    ext = filename.lower().split('.')[-1] if '.' in filename else ''
    image_exts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
    video_exts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']
    audio_exts = ['mp3', 'wav', 'ogg', 'm4a', 'aac']
    
    if ext in image_exts:
        return 'image'
    elif ext in video_exts:
        return 'video'
    elif ext in audio_exts:
        return 'audio'
    else:
        return 'document'

def _save_uploaded_file(file, user_id):
    """Save uploaded file and return file URL and metadata"""
    # Validate file size (max 50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    if file.size > MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024*1024)}MB")
    
    # Get file extension
    original_filename = file.name
    ext = original_filename.split('.')[-1] if '.' in original_filename else ''
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}.{ext}" if ext else str(uuid.uuid4())
    
    # Create directory structure: media/chat_media/{user_id}/{year}/{month}/
    now = timezone.now()
    file_path = Path('chat_media') / str(user_id) / str(now.year) / f"{now.month:02d}" / unique_filename
    
    # Ensure directory exists
    full_path = settings.MEDIA_ROOT / file_path
    full_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save file
    with open(full_path, 'wb+') as destination:
        for chunk in file.chunks():
            destination.write(chunk)
    
    # Generate URL
    file_url = f"{settings.MEDIA_URL}{file_path.as_posix()}"
    
    return {
        'file_url': file_url,
        'file_type': _get_file_type(original_filename),
        'file_name': original_filename,
        'file_size': file.size
    }

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

        # Find or create individual chat
        # Check if chat exists with both participants
        existing_chats = IndividualChat.objects(participants__all=[uid, oid])
        chat = existing_chats.first()
        if not chat:
            chat = IndividualChat(participants=[uid, oid])
            chat.save()
        return Response({"chat_id": str(chat.id), "other_user": {"id": oid, "username": other.username}})

class ProjectTeamMembers(APIView):
    def get(self, request, project_id):
        """
        Get all team members of a project (leader + members).
        Excludes the current user.
        """
        user, err = _get_user_from_auth(request)
        if err: return err
        
        try:
            project = Project.objects.get(id=project_id)
        except DoesNotExist:
            return Response({"error": "Project not found"}, status=404)
        
        uid = str(user.id)
        
        # Check if user is part of the project
        is_leader = str(project.team_leader.id) == uid
        is_member = any(
            str(member.get('user')) == uid for member in (project.team_members or [])
        )
        
        if not is_leader and not is_member:
            return Response({"error": "You are not a member of this project"}, status=403)
        
        # Get team leader info
        leader_id = str(project.team_leader.id)
        leader_username = project.team_leader.username
        
        # Get team members info
        team_member_ids = []
        if project.team_members:
            team_member_ids = [str(member.get('user')) for member in project.team_members if member.get('user')]
        
        # Fetch all user objects
        all_user_ids = [leader_id] + team_member_ids
        users = {str(u.id): u for u in User.objects(id__in=all_user_ids)}
        
        # Build team members list (exclude current user)
        members = []
        
        # Add leader if not current user
        if leader_id != uid:
            members.append({
                "user_id": leader_id,
                "username": users.get(leader_id).username if users.get(leader_id) else "Unknown",
                "is_leader": True
            })
        
        # Add team members if not current user
        for member_id in team_member_ids:
            if member_id != uid:
                member_user = users.get(member_id)
                if member_user:
                    # Check if member is accepted
                    member_entry = next((m for m in (project.team_members or []) if str(m.get('user')) == member_id), None)
                    members.append({
                        "user_id": member_id,
                        "username": member_user.username,
                        "is_leader": False,
                        "accepted": bool(member_entry.get('accepted', False)) if member_entry else False
                    })
        
        return Response({
            "project_id": str(project.id),
            "project_name": project.name,
            "team_members": members
        }, status=200)

class GetOrCreateIndividualChat(APIView):
    def post(self, request, project_id):
        """
        Get or create an individual chat with another team member scoped to a specific project.
        Request body: {"other_user_id": "<user_id>"}
        """
        user, err = _get_user_from_auth(request)
        if err: return err
        
        other_user_id = request.data.get("other_user_id")
        if not other_user_id:
            return Response({"error": "other_user_id is required"}, status=400)
        
        uid = str(user.id)
        oid = str(other_user_id)
        
        if uid == oid:
            return Response({"error": "Cannot chat with yourself"}, status=400)
        
        # Verify both users are in the project
        try:
            project = Project.objects.get(id=project_id)
        except DoesNotExist:
            return Response({"error": "Project not found"}, status=404)
        
        is_leader = str(project.team_leader.id) == uid
        is_member = any(str(member.get('user')) == uid for member in (project.team_members or []))
        if not is_leader and not is_member:
            return Response({"error": "You are not a member of this project"}, status=403)
        
        # Check if other user is in project
        other_is_leader = str(project.team_leader.id) == oid
        other_is_member = any(str(member.get('user')) == oid for member in (project.team_members or []))
        if not other_is_leader and not other_is_member:
            return Response({"error": "Other user is not a member of this project"}, status=403)
        
        # Get other user info
        try:
            other_user = User.objects.get(id=oid)
        except DoesNotExist:
            return Response({"error": "Other user not found"}, status=404)
        
        # Find or create individual chat scoped to this project
        existing_chats = IndividualChat.objects(
            project_id=project_id,
            participants__all=[uid, oid]
        )
        chat = existing_chats.first()
        if not chat:
            chat = IndividualChat(
                project_id=project_id,
                participants=[uid, oid]
            )
            chat.save()
        
        return Response({
            "chat_id": str(chat.id),
            "other_user": {
                "id": oid,
                "username": other_user.username
            },
            "project_id": project_id
        }, status=200)

class IndividualChatMessages(APIView):
    def get(self, request, chat_id):
        """
        Get all messages in an individual chat.
        """
        user, err = _get_user_from_auth(request)
        if err: return err
        
        uid = str(user.id)
        
        try:
            chat = IndividualChat.objects.get(id=chat_id)
        except DoesNotExist:
            return Response({"error": "Chat not found"}, status=404)
        
        # Verify user is a participant
        if uid not in chat.participants:
            return Response({"error": "Forbidden"}, status=403)
        
        # Get other participant
        other_participant_id = next(p for p in chat.participants if p != uid)
        try:
            other_user = User.objects.get(id=other_participant_id)
        except DoesNotExist:
            other_user = None
        
        # Fetch messages
        msgs = IndividualMessage.objects(chat=chat).order_by("timestamp")
        sender_ids = list({m.sender for m in msgs})
        users = {str(u.id): u for u in User.objects(id__in=sender_ids)}
        
        # Serialize messages using the serializer
        messages = [individual_message_public(msg, users) for msg in msgs]
        
        return Response({
            "chat_id": str(chat.id),
            "other_user": {
                "id": other_participant_id,
                "username": other_user.username if other_user else "Unknown"
            },
            "messages": messages
        }, status=200)

class SendIndividualMessage(APIView):
    def post(self, request, chat_id):
        """
        Send a message in an individual chat.
        Supports both text and file uploads.
        Request: multipart/form-data with 'content' (optional) and 'file' (optional)
        """
        user, err = _get_user_from_auth(request)
        if err: return err
        
        content = request.data.get("content", "").strip()
        file = request.FILES.get('file')
        
        # At least content or file must be provided
        if not content and not file:
            return Response({"error": "Either message content or file is required"}, status=400)
        
        uid = str(user.id)
        
        try:
            chat = IndividualChat.objects.get(id=chat_id)
        except DoesNotExist:
            return Response({"error": "Chat not found"}, status=404)
        
        # Verify user is a participant
        if uid not in chat.participants:
            return Response({"error": "Forbidden"}, status=403)
        
        # Handle file upload if present
        file_data = None
        if file:
            try:
                file_data = _save_uploaded_file(file, uid)
            except ValueError as e:
                return Response({"error": str(e)}, status=400)
            except Exception as e:
                print(f"[ERROR] File upload failed: {e}")
                return Response({"error": "Failed to upload file"}, status=500)
        
        # Create and save message
        message = IndividualMessage(
            chat=chat,
            sender=uid,
            content=content,
            timestamp=timezone.now()
        )
        
        # Add file data if present
        if file_data:
            message.file_url = file_data['file_url']
            message.file_type = file_data['file_type']
            message.file_name = file_data['file_name']
            message.file_size = file_data['file_size']
        
        message.save()
        
        # Broadcast message via WebSocket (for real-time updates)
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                group_name = f"individual_chat_{chat_id}"
                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        "type": "individual_chat_message",
                        "message_id": str(message.id),
                        "sender_id": uid,
                        "sender_username": user.username,
                        "content": content,
                        "timestamp": message.timestamp.isoformat(),
                        "file_url": message.file_url if message.file_url else None,
                        "file_type": message.file_type if message.file_type else None,
                        "file_name": message.file_name if message.file_name else None,
                        "file_size": message.file_size if message.file_size else None,
                    }
                )
        except Exception as e:
            print(f"[SendIndividualMessage] Error broadcasting message: {e}")
        
        # Serialize and return message
        users = {str(u.id): u for u in User.objects(id__in=[uid])}
        return Response(individual_message_public(message, users), status=201)

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
        Supports both text and file uploads.
        Request: multipart/form-data with 'content' (optional) and 'file' (optional)
        """
        user, err = _get_user_from_auth(request)
        if err: return err
        
        content = request.data.get("content", "").strip()
        file = request.FILES.get('file')
        
        # At least content or file must be provided
        if not content and not file:
            return Response({"error": "Either message content or file is required"}, status=400)
        
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
                participants.extend([str(member.get('user')) for member in project.team_members if member.get('user')])
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
        
        # Handle file upload if present
        file_data = None
        if file:
            try:
                file_data = _save_uploaded_file(file, uid)
            except ValueError as e:
                return Response({"error": str(e)}, status=400)
            except Exception as e:
                print(f"[ERROR] File upload failed: {e}")
                return Response({"error": "Failed to upload file"}, status=500)
        
        # Create and save message
        message = GroupMessage(
            chat=chat,
            sender=uid,
            content=content,
            timestamp=timezone.now()
        )
        
        # Add file data if present
        if file_data:
            message.file_url = file_data['file_url']
            message.file_type = file_data['file_type']
            message.file_name = file_data['file_name']
            message.file_size = file_data['file_size']
        
        message.save()
        
        # Broadcast message via WebSocket (for real-time updates)
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                chat_name = chat.name
                group_name = f"project_chat_{chat_name}"
                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        "type": "project_chat_message",
                        "message_id": str(message.id),
                        "sender_id": uid,
                        "sender_username": user.username,
                        "content": content,
                        "timestamp": message.timestamp.isoformat(),
                        "file_url": message.file_url if message.file_url else None,
                        "file_type": message.file_type if message.file_type else None,
                        "file_name": message.file_name if message.file_name else None,
                        "file_size": message.file_size if message.file_size else None,
                    }
                )
        except Exception as e:
            print(f"[SendProjectMessage] Error broadcasting message: {e}")
        
        # Return the created message
        users = {str(u.id): u for u in User.objects(id__in=[uid])}
        return Response(group_message_public(message, users), status=201)

class DeleteMessage(APIView):
    def delete(self, request, message_id):
        """
        Delete a chat message (group or individual).
        Only the sender of the message can delete it.
        """
        user, err = _get_user_from_auth(request)
        if err: 
            return err
        
        uid = str(user.id)
        
        # Try to get message as GroupMessage first
        message = None
        is_group_message = False
        try:
            message = GroupMessage.objects.get(id=message_id)
            is_group_message = True
        except DoesNotExist:
            # Try IndividualMessage
            try:
                message = IndividualMessage.objects.get(id=message_id)
                is_group_message = False
            except DoesNotExist:
                return Response({"error": "Message not found"}, status=404)
        
        # Verify user is the sender
        if message.sender != uid:
            return Response({"error": "You can only delete your own messages"}, status=403)
        
        # Verify user has access to the chat
        chat = message.chat
        if uid not in chat.participants:
            return Response({"error": "Forbidden"}, status=403)
        
        # Store chat info before deletion for WebSocket broadcast
        chat_id = str(chat.id)
        
        # Delete the message
        message.delete()
        
        # Broadcast delete event via WebSocket
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                if is_group_message:
                    # Group chat broadcast
                    chat_name = chat.name
                    group_name = f"project_chat_{chat_name}"
                    async_to_sync(channel_layer.group_send)(
                        group_name,
                        {
                            "type": "project_chat_delete",
                            "message_id": message_id
                        }
                    )
                else:
                    # Individual chat broadcast
                    group_name = f"individual_chat_{chat_id}"
                    async_to_sync(channel_layer.group_send)(
                        group_name,
                        {
                            "type": "individual_chat_delete",
                            "message_id": message_id
                        }
                    )
        except Exception as e:
            print(f"[DeleteMessage] Error broadcasting delete event: {e}")
        
        # Return success response
        return Response({
            "message": "Message deleted successfully",
            "message_id": message_id,
            "chat_id": chat_id,
            "message_type": "group" if is_group_message else "individual"
        }, status=200)

class SearchGroupChatMessages(APIView):
    def get(self, request, project_id):
        """
        Search messages in a project's group chat.
        Query parameter: ?q=<search_term>
        """
        user, err = _get_user_from_auth(request)
        if err: return err
        
        search_term = request.query_params.get('q', '').strip()
        if not search_term:
            return Response({"error": "Search term is required"}, status=400)
        
        try:
            project = Project.objects.get(id=project_id)
        except DoesNotExist:
            return Response({"error": "Project not found"}, status=404)
        
        uid = str(user.id)
        is_leader = str(project.team_leader.id) == uid
        is_member = any(
            str(member.get('user')) == uid for member in (project.team_members or [])
        )
        
        if not is_leader and not is_member:
            return Response({"error": "You are not a member of this project"}, status=403)
        
        # Get chat by project name
        chat = GroupChat.objects(name=project.name).first()
        if not chat:
            return Response({
                "project_id": str(project.id),
                "project_name": project.name,
                "search_term": search_term,
                "messages": []
            }, status=200)
        
        # Search messages (case-insensitive)
        from mongoengine import Q
        msgs = GroupMessage.objects(
            chat=chat,
            content__icontains=search_term
        ).order_by("timestamp")
        
        sender_ids = list({m.sender for m in msgs})
        users = {str(u.id): u for u in User.objects(id__in=sender_ids)}
        
        messages = []
        for msg in msgs:
            sender = users.get(msg.sender)
            messages.append({
                "id": str(msg.id),
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat() if msg.timestamp else None,
                "created_at": msg.timestamp.isoformat() if msg.timestamp else None,
                "sender": {
                    "id": msg.sender,
                    "username": sender.username if sender else "Unknown"
                }
            })
        
        return Response({
            "project_id": str(project.id),
            "project_name": project.name,
            "search_term": search_term,
            "total_results": len(messages),
            "messages": messages
        }, status=200)

class SearchIndividualChatMessages(APIView):
    def get(self, request, chat_id):
        """
        Search messages in an individual chat.
        Query parameter: ?q=<search_term>
        """
        user, err = _get_user_from_auth(request)
        if err: return err
        
        search_term = request.query_params.get('q', '').strip()
        if not search_term:
            return Response({"error": "Search term is required"}, status=400)
        
        uid = str(user.id)
        
        try:
            chat = IndividualChat.objects.get(id=chat_id)
        except DoesNotExist:
            return Response({"error": "Chat not found"}, status=404)
        
        # Verify user is a participant
        if uid not in chat.participants:
            return Response({"error": "Forbidden"}, status=403)
        
        # Get other participant
        other_participant_id = next(p for p in chat.participants if p != uid)
        try:
            other_user = User.objects.get(id=other_participant_id)
        except DoesNotExist:
            other_user = None
        
        # Search messages (case-insensitive)
        from mongoengine import Q
        msgs = IndividualMessage.objects(
            chat=chat,
            content__icontains=search_term
        ).order_by("timestamp")
        
        sender_ids = list({m.sender for m in msgs})
        users = {str(u.id): u for u in User.objects(id__in=sender_ids)}
        
        messages = []
        for msg in msgs:
            sender = users.get(msg.sender)
            messages.append({
                "id": str(msg.id),
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat() if msg.timestamp else None,
                "created_at": msg.timestamp.isoformat() if msg.timestamp else None,
                "sender": {
                    "id": msg.sender,
                    "username": sender.username if sender else "Unknown"
                }
            })
        
        return Response({
            "chat_id": str(chat.id),
            "other_user": {
                "id": other_participant_id,
                "username": other_user.username if other_user else "Unknown"
            },
            "search_term": search_term,
            "total_results": len(messages),
            "messages": messages
        }, status=200)