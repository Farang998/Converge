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
from .models import GroupChat, GroupMessage, IndividualChat, IndividualMessage, Thread, ThreadMessage
from .serializers import group_chat_public, group_message_public, individual_message_public, thread_public, thread_message_public

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except Exception as e:
    genai = None
    GENAI_AVAILABLE = False
    print(f"[Chat] google.generativeai not available: {e}")

# Configure Gemini API if package available and API key present
model = None
if GENAI_AVAILABLE:
    try:
        gemini_key = os.getenv('GEMINI_API_KEY')
        if gemini_key:
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel('gemini-2.0-flash')
        else:
            print('[Chat] GEMINI_API_KEY not found in environment; Gemini summarizer disabled')
    except Exception as e:
        print(f"[Chat] Failed to configure Gemini API: {e}")
        model = None

def convert_to_utc_z(dt):
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

def authenticate_user(request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, Response({"error": "Authorization header missing"}, status=401)
    token = auth.split(" ", 1)[1]
    user = User.validate_token(token)
    if not user:
        return None, Response({"error": "Invalid or expired token"}, status=401)
    return user, None

def determine_file_type(filename):
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

def handle_file_upload(file, user_id):
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
        'file_type': determine_file_type(original_filename),
        'file_name': original_filename,
        'file_size': file.size
    }

class ChatList(APIView):
    def get(self, request):
        user, err = authenticate_user(request)
        if err: return err
        uid = str(user.id)
        chats = GroupChat.objects(participants__in=[uid]).order_by("-created_at")
        return Response([group_chat_public(c) for c in chats])

class ChatMessages(APIView):
    def get(self, request, chatroom_name):   
        user, err = authenticate_user(request)
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
        uid = request.data.get("admin")
        name = request.data.get("name", "").strip()
        team_members = request.data.get("participants", [])
        project_id = request.data.get("project_id")

        if not uid:
            return Response({"error": "Admin user ID required"}, status=400)

        if not name:
            return Response({"error": "Name required"}, status=400)

        # Check for duplicate chat names
        if GroupChat.objects(name=name).first():
            return Response({"error": "Group name already exists"}, status=400)

        project_obj = None
        if project_id:
            try:
                project_obj = Project.objects.get(id=project_id)
            except DoesNotExist:
                return Response({"error": "Project not found"}, status=404)

        if not isinstance(team_members, list):
            team_members = [team_members] if team_members else []

        participants = list(set([uid] + team_members))

        chat_kwargs = {
            "name": name,
            "admin": uid,
            "participants": participants
        }

        if project_obj:
            chat_kwargs["project_id"] = project_obj.id

        try:
            chat = GroupChat(**chat_kwargs)
            chat.save()
            return Response({
                "message": "created", 
                "name": name, 
                "chat_id": str(chat.id),
                "project_id": str(project_obj.id) if project_obj else None
            }, status=201)
        except Exception as e:
            return Response({"error": f"Failed to create chat: {str(e)}"}, status=500)

class DirectChat(APIView):
    def post(self, request, username):
        user, err = authenticate_user(request)
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
        user, err = authenticate_user(request)
        if err: return err
        
        try:
            project = Project.objects.get(id=project_id)
        except DoesNotExist:
            return Response({"error": "Project not found"}, status=404)
        
        uid = str(user.id)
        
        # Check if user is part of the project
        is_leader = str(project.team_leader.id) == uid
        is_member = any(
            str(member.get('user')) == uid and bool(member.get('accepted', False))
            for member in (project.team_members or [])
        )
        
        if not is_leader and not is_member:
            return Response({"error": "Not a project member"}, status=403)
        
        leader_id = str(project.team_leader.id)
        leader_username = project.team_leader.username
        
        team_member_ids = []
        if project.team_members:
            team_member_ids = [str(member.get('user')) for member in project.team_members if member.get('user')]
        
        all_user_ids = [leader_id] + team_member_ids
        users = {str(u.id): u for u in User.objects(id__in=all_user_ids)}
        
        members = []
        
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
        user, err = authenticate_user(request)
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
        is_member = any(
            str(member.get('user')) == uid and bool(member.get('accepted', False))
            for member in (project.team_members or [])
        )
        if not is_leader and not is_member:
            return Response({"error": "Not a project member"}, status=403)
        
        other_is_leader = str(project.team_leader.id) == oid
        other_is_member = any(
            str(member.get('user')) == oid and bool(member.get('accepted', False))
            for member in (project.team_members or [])
        )
        if not other_is_leader and not other_is_member:
            return Response({"error": "Other user not in project"}, status=403)
        
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
        user, err = authenticate_user(request)
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
        user, err = authenticate_user(request)
        if err: return err
        
        content = request.data.get("content", "").strip()
        file = request.FILES.get('file')
        
        if not content and not file:
            return Response({"error": "Content or file required"}, status=400)
        
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
                file_data = handle_file_upload(file, uid)
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
        print(f"[DEBUG] ProjectChatMessages.get() called with project_id={project_id}")
        user, err = authenticate_user(request)
        if err: return err
        
        # Get project by ID
        try:
            project = Project.objects.get(id=project_id)
        except DoesNotExist:
            return Response({"error": "Project not found"}, status=404)
        
        # Check if user is part of the project (leader or accepted member)
        uid = str(user.id)
        is_leader = str(project.team_leader.id) == uid
        # Team members are stored as {'user': user_id, 'accepted': bool}
        is_member = any(
            str(member.get('user')) == uid and bool(member.get('accepted', False))
            for member in (project.team_members or [])
        )
        
        print(f"[DEBUG] User check - uid: {uid}, is_leader: {is_leader}, is_member: {is_member}")
        print(f"[DEBUG] Team leader ID: {str(project.team_leader.id)}")
        print(f"[DEBUG] Team members: {project.team_members}")
        
        if not is_leader and not is_member:
            return Response({"error": "Not a project member"}, status=403)
        
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
        user, err = authenticate_user(request)
        if err: return err
        
        content = request.data.get("content", "").strip()
        file = request.FILES.get('file')
        
        # At least content or file must be provided
        if not content and not file:
            return Response({"error": "Content or file required"}, status=400)
        
        # Get project by ID
        try:
            project = Project.objects.get(id=project_id)
        except DoesNotExist:
            return Response({"error": "Project not found"}, status=404)
        
        # Check if user is part of the project (accepted member or leader)
        uid = str(user.id)
        is_leader = str(project.team_leader.id) == uid
        # Team members are stored as {'user': user_id, 'accepted': bool}
        is_member = any(
            str(member.get('user')) == uid and bool(member.get('accepted', False))
            for member in (project.team_members or [])
        )
        
        if not is_leader and not is_member:
            return Response({"error": "Not a project member"}, status=403)
        
        # Get chat by project name, create if it doesn't exist
        chat = GroupChat.objects(name=project.name).first()
        if not chat:
            print(f"[DEBUG] Chat not found for project '{project.name}'. Creating it now.")
            # Create chat with all project members
            participants = [str(project.team_leader.id)]
            if project.team_members:
                # only add accepted members to the chat participants
                participants.extend([
                    str(member.get('user')) for member in project.team_members
                    if member.get('user') and member.get('accepted')
                ])
            chat = GroupChat(
                name=project.name,
                admin=str(project.team_leader.id),
                participants=participants,
                project_id=project.id
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
                file_data = handle_file_upload(file, uid)
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
        user, err = authenticate_user(request)
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
            return Response({"error": "Can only delete own messages"}, status=403)
        
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
        user, err = authenticate_user(request)
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
            str(member.get('user')) == uid and bool(member.get('accepted', False))
            for member in (project.team_members or [])
        )
        
        if not is_leader and not is_member:
            return Response({"error": "You are not a member of this project"}, status=403)
        
        # Get chat by project name
        chat = GroupChat.objects(project_id=project_id).first()
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
        user, err = authenticate_user(request)
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

class CreateThread(APIView):
    def post(self, request):
        user, err = authenticate_user(request)
        if err:
            return err
        
        data = request.data

        parent_id = data.get("parent_message_id")
        group_id = data.get("group_id")
        content = data.get("content")

        if not parent_id or not group_id or not content:
            return Response({"error": "parent_message_id, group_id, and content are required"}, status=400)
        
        parent_msg = GroupMessage.objects.filter(id=parent_id, group_id=group_id).first()
        if not parent_msg:
            return Response({"error": "Parent message not found"}, status=400)
        
        existing_thread = Thread.objects.filter(parent_message=parent_id).first()
        if existing_thread:
            return Response({"error": "Thread already exists", "thread_id": str(existing_thread.id)}, status=400)
        
        thread = Thread.objects.create(
            parent_message = parent_msg,
            # group_id = group_id,
            chat = parent_msg.chat
        )

        tmsg = ThreadMessage.objects.create(
            thread = thread,
            sender = str(user.id),
            content = content,
        )

        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                group_name = f"project_{parent_msg.project_id}_group_{group_id}"

                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        "type": "thread_created_broadcast",
                        "thread_id": str(thread.id),
                        "parent_message_id": parent_id,
                        "timestamp": tmsg.timestamp.isoformat(),
                        "message_preview": content,
                    }
                )
        except Exception as e:
            print(f"[CreateThread] Broadcast failed: {e}")

        return Response({
            "status": "thread_created",
            "thread_id": str(thread.id),
            "first_message_id": str(tmsg.id)
        }, status=201)

class ListProjectThreads(APIView):
    def get(self, request, project_id):
        print(f"[DEBUG] ListProjectThreads called with project_id={project_id}")
        user, err = authenticate_user(request)
        if err:
            return err
        
        # verifying if the project exists
        try:
            project = Project.objects.get(id=project_id)
            print(f"[DEBUG] Project found: {project.name}")
        except DoesNotExist:
            print(f"[DEBUG] Project not found for id={project_id}")
            return Response({"error": "Project not found"}, status=404)
        
        uid = str(user.id)
        is_leader = str(project.team_leader.id) == uid
        is_member = any(
            str(member.get('user')) == uid and bool(member.get('accepted', False))
            for member in (project.team_members or [])
        )
        if not is_leader and not is_member:
            print(f"[DEBUG] User {uid} not a member of project")
            return Response({"error": "You are not a member of this project"}, status=403)
        
        chat = GroupChat.objects(project_id=project.id).first()
        print(f"[DEBUG] Looking for chat with project_id={project.id}, found={chat is not None}")
        
        # Fallback: if no chat found by project_id, try by project name (for existing chats)
        if not chat:
            print(f"[DEBUG] Fallback: looking for chat by project name={project.name}")
            chat = GroupChat.objects(name=project.name).first()
            if chat:
                print(f"[DEBUG] Found chat by name, updating with project_id={project.id}")
                chat.project_id = project.id
                chat.save()
        
        if not chat: # corresponding group chat doesn't exist
            print(f"[DEBUG] No chat found for project_id={project.id}")
            return Response({"error": "Chat not found"}, status=404)
        
        threads = Thread.objects(chat=chat).order_by("-created_at")[:50]
        print(f"[DEBUG] Found {len(threads)} threads")
        return Response({
            "project_id": str(project.id),
            "project_name": project.name,
            "chat_id": str(chat.id),
            "threads": [thread_public(t) for t in threads]
        }, status=200)
    
class GetThreadMessages(APIView):
    def get(self, request, project_id, thread_id):
        print(f"[DEBUG] GetThreadMessages called with project_id={project_id}, thread_id={thread_id}")
        user, err = authenticate_user(request)
        if err:
            return err
        try:
            project = Project.objects.get(id=project_id)
            print(f"[DEBUG] Project found: {project.name}")
        except DoesNotExist:
            print(f"[DEBUG] Project not found for id={project_id}")
            return Response({"error": "Project not found"}, status=404)
        
        uid = str(user.id)
        is_leader = str(project.team_leader.id) == uid
        is_member = any(
            str(m.get('user')) == uid and bool(m.get('accepted', False))
            for m in (project.team_members or [])
        )
        if not is_leader and not is_member:
            print(f"[DEBUG] User {uid} not a member of project")
            return Response({"error": "You are not a member of this project"}, status=403)

        chat = GroupChat.objects(project_id=project.id).first()
        print(f"[DEBUG] Looking for chat with project_id={project.id}, found={chat is not None}")
        
        # Fallback: if no chat found by project_id, try by project name (for existing chats)
        if not chat:
            print(f"[DEBUG] Fallback: looking for chat by project name={project.name}")
            chat = GroupChat.objects(name=project.name).first()
            if chat:
                print(f"[DEBUG] Found chat by name, updating with project_id={project.id}")
                chat.project_id = project.id
                chat.save()
        
        if not chat:
            print(f"[DEBUG] No chat found for project_id={project.id}")
            return Response({"error": "Chat not found"}, status=404)

        try:
            thread = Thread.objects.get(id=thread_id, chat=chat)
            print(f"[DEBUG] Thread found: {thread.id}")
        except DoesNotExist:
            print(f"[DEBUG] Thread not found for id={thread_id} in chat {chat.id}")
            return Response({"error": "Thread not found in this chat"}, status=404)

        parent = thread.parent_message
        if not parent:
            print(f"[DEBUG] No parent message for thread {thread.id}")
            return Response({"error": "Parent message not found"}, status=404)
        
        print(f"[DEBUG] GetThreadMessages returning successfully")
        replies = ThreadMessage.objects(thread=thread).order_by("timestamp")
        sender_ids = list({parent.sender} | {r.sender for r in replies})
        users = {str(u.id): u for u in User.objects(id__in=sender_ids)}
        return Response({
            "thread": thread_public(thread),
            "parent_message": group_message_public(parent, users),
            "replies": [thread_message_public(r, users) for r in replies]
        }, status=200)
    
class ChatSummarizer(APIView):
    def post(self, request):
        user, err = authenticate_user(request)
        if err: return err
        
        chat_type = request.data.get('chat_type')  # 'project', 'individual', 'thread'
        chat_id = request.data.get('chat_id')  # project_id for project chats, chat_id for individual chats, thread_id for threads
        max_messages = request.data.get('max_messages', 50)  # Limit number of messages to summarize
        
        if not chat_type or not chat_id:
            return Response({"error": "chat_type and chat_id are required"}, status=400)
        
        uid = str(user.id)
        
        try:
            if chat_type == 'project':
                # Summarize project chat
                try:
                    project = Project.objects.get(id=chat_id)
                except DoesNotExist:
                    return Response({"error": "Project not found"}, status=404)
                
                # Check if user is part of the project
                is_leader = str(project.team_leader.id) == uid
                is_member = any(
                    str(member.get('user')) == uid and bool(member.get('accepted', False))
                    for member in (project.team_members or [])
                )
                if not is_leader and not is_member:
                    return Response({"error": "You are not a member of this project"}, status=403)
                
                # Get chat by project name
                chat = GroupChat.objects(name=project.name).first()
                if not chat:
                    return Response({"error": "Chat not found"}, status=404)
                
                # Get recent messages
                messages = GroupMessage.objects(chat=chat).order_by("-timestamp")[:max_messages]
                messages = list(reversed(messages))  # Reverse to chronological order
                
                # Get user info for messages
                sender_ids = list({m.sender for m in messages})
                users = {str(u.id): u for u in User.objects(id__in=sender_ids)}
                
                # Format messages for summarization
                chat_content = self._format_group_messages(messages, users)
                summary = self._generate_summary(chat_content, f"Project: {project.name}")
                
                return Response({
                    "chat_type": "project",
                    "project_id": str(project.id),
                    "project_name": project.name,
                    "message_count": len(messages),
                    "summary": summary
                })
                
            elif chat_type == 'individual':
                # Summarize individual chat
                try:
                    chat = IndividualChat.objects.get(id=chat_id)
                except DoesNotExist:
                    return Response({"error": "Chat not found"}, status=404)
                
                # Verify user is a participant
                if uid not in chat.participants:
                    return Response({"error": "Forbidden"}, status=403)
                
                # Get other participant info
                other_participant_id = next(p for p in chat.participants if p != uid)
                try:
                    other_user = User.objects.get(id=other_participant_id)
                except DoesNotExist:
                    other_user = None
                
                # Get recent messages
                messages = IndividualMessage.objects(chat=chat).order_by("-timestamp")[:max_messages]
                messages = list(reversed(messages))  # Reverse to chronological order
                
                # Get user info for messages
                sender_ids = list({m.sender for m in messages})
                users = {str(u.id): u for u in User.objects(id__in=sender_ids)}
                
                # Format messages for summarization
                chat_content = self._format_individual_messages(messages, users, uid)
                other_username = other_user.username if other_user else "Unknown"
                summary = self._generate_summary(chat_content, f"Chat with {other_username}")
                
                return Response({
                    "chat_type": "individual",
                    "chat_id": str(chat.id),
                    "other_user": {
                        "id": other_participant_id,
                        "username": other_username
                    },
                    "message_count": len(messages),
                    "summary": summary
                })
                
            elif chat_type == 'thread':
                # Summarize thread
                thread_id = chat_id
                try:
                    thread = Thread.objects.get(id=thread_id)
                except DoesNotExist:
                    return Response({"error": "Thread not found"}, status=404)
                
                # Verify user has access to the chat
                chat = thread.chat
                if uid not in chat.participants:
                    return Response({"error": "Forbidden"}, status=403)
                
                # Get parent message and replies
                parent = thread.parent_message
                replies = ThreadMessage.objects(thread=thread).order_by("timestamp")
                
                # Combine parent and replies
                all_messages = [parent] + list(replies)
                
                # Get user info
                sender_ids = list({m.sender for m in all_messages})
                users = {str(u.id): u for u in User.objects(id__in=sender_ids)}
                
                # Format messages for summarization
                chat_content = self._format_thread_messages(parent, replies, users)
                summary = self._generate_summary(chat_content, f"Thread: {parent.content[:50]}...")
                
                return Response({
                    "chat_type": "thread",
                    "thread_id": str(thread.id),
                    "parent_message_id": str(parent.id),
                    "message_count": len(all_messages),
                    "summary": summary
                })
            
            else:
                return Response({"error": "Invalid chat_type. Must be 'project', 'individual', or 'thread'"}, status=400)
                
        except Exception as e:
            print(f"[ChatSummarizer] Error: {e}")
            return Response({"error": "Failed to generate summary"}, status=500)
    
    def _format_group_messages(self, messages, users):
        """Format group chat messages for summarization"""
        formatted = []
        for msg in messages:
            sender = users.get(msg.sender)
            username = sender.username if sender else "Unknown"
            timestamp = msg.timestamp.strftime("%Y-%m-%d %H:%M") if msg.timestamp else "Unknown"
            content = msg.content or "[Media/File]"
            formatted.append(f"[{timestamp}] {username}: {content}")
        return "\n".join(formatted)
    
    def _format_individual_messages(self, messages, users, current_user_id):
        """Format individual chat messages for summarization"""
        formatted = []
        for msg in messages:
            sender = users.get(msg.sender)
            username = sender.username if sender else "Unknown"
            if msg.sender == current_user_id:
                username = "You"
            timestamp = msg.timestamp.strftime("%Y-%m-%d %H:%M") if msg.timestamp else "Unknown"
            content = msg.content or "[Media/File]"
            formatted.append(f"[{timestamp}] {username}: {content}")
        return "\n".join(formatted)
    
    def _format_thread_messages(self, parent, replies, users):
        """Format thread messages for summarization"""
        formatted = []
        
        # Parent message
        sender = users.get(parent.sender)
        username = sender.username if sender else "Unknown"
        timestamp = parent.timestamp.strftime("%Y-%m-%d %H:%M") if parent.timestamp else "Unknown"
        content = parent.content or "[Media/File]"
        formatted.append(f"[PARENT - {timestamp}] {username}: {content}")
        
        # Replies
        for reply in replies:
            sender = users.get(reply.sender)
            username = sender.username if sender else "Unknown"
            timestamp = reply.timestamp.strftime("%Y-%m-%d %H:%M") if reply.timestamp else "Unknown"
            content = reply.content or "[Media/File]"
            formatted.append(f"[{timestamp}] {username}: {content}")
        
        return "\n".join(formatted)
    
    def _generate_summary(self, chat_content, context):
        """Generate summary using Gemini API"""
        if not chat_content.strip():
            return "No messages to summarize."
        
        prompt = f"""
        Please provide a concise summary of the following chat conversation in the context of "{context}".
        
        Focus on:
        - Key topics discussed
        - Important decisions made
        - Action items or tasks mentioned
        - Any agreements or conclusions reached
        
        Keep the summary brief but comprehensive. Use bullet points if appropriate.
        
        Chat messages:
        {chat_content}
        """
        
        # If model isn't configured we gracefully fall back to a simple summary
        if model is None:
            # Provide a lightweight fallback summary (first N chars) so the endpoint remains useful
            try:
                brief = chat_content.strip().split('\n')[:5]
                fallback_summary = ' '.join(brief)
                return (f"AI summarizer unavailable. Basic extracted preview: {fallback_summary[:800]}")
            except Exception:
                return "AI summarizer is not configured or unavailable."

        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"[ChatSummarizer] Gemini API error: {e}")
            return "Unable to generate summary due to an error."
    
class ReplyToThread(APIView):
    def post(self, request, project_id, thread_id):
        user, err = authenticate_user(request)
        if err:
            return err
        
        content = request.data.get("content", "").strip()
        file = request.FILES.get("file")
        if not content and not file:
            return Response({"error": "Either meassage content or file is required"}, status=400)
        
        try:
            project = Project.objects.get(id=project_id)
        except DoesNotExist:
            return Response({"error": "Project not found"}, status=404)
        
        uid = str(user.id)
        is_leader = str(project.team_leader.id) == uid
        is_member = any(
            str(m.get('user')) == uid and bool(m.get('accepted', False))
            for m in (project.team_members or [])
        )
        if not is_leader and not is_member:
            return Response({"error": "You are not a member of this project"}, status=403)

        chat = GroupChat.objects(name=project.name).first()
        if not chat:
            return Response({"error": "Chat not found"}, status=404)

        try:
            thread = Thread.objects.get(id=thread_id, chat=chat)
        except DoesNotExist:
            return Response({"error": "Thread not found"}, status=404)
        
        file_data = None
        if file:
            try:
                file_data = handle_file_upload(file, uid)
            except ValueError as e:
                return Response({"error": str(e)}, status=400)
            except Exception as e:
                print(f"[ReplyToThread] File upload failed: {e}")
                return Response({"error": "Failed to upload file"}, status=500)
            
            tmsg = ThreadMessage(
                thread = thread,
                sender = uid,
                content = content,
                timestamp = timezone.now()
            )
            if file_data:
                tmsg.file_url = file_data['file_url']
                tmsg.file_type = file_data['file_type']
                tmsg.file_name = file_data['file_name']
                tmsg.file_size = file_data['file_size']
            tmsg.save()

            try:
                channel_layer = get_channel_layer
                if channel_layer:
                    channels_group_name = f"project_{chat.project_id}_group_{chat.id}"
                    async_to_sync(channel_layer.group_send)(
                        channels_group_name,
                        {
                            "type": "thread_message_broadcast",
                            "thread_id": str(thread.id),
                            "message_id": str(tmsg.id),
                            "sender_id": uid,
                            "sender_username": user.username,
                            "content": content,
                            "timestamp": tmsg.timestamp.isoformat(),
                            "file_url": tmsg.file_url if tmsg.file_url else None,
                            "file_type": tmsg.file_type if tmsg.file_type else None,
                            "file_name": tmsg.file_name if tmsg.file_name else None,
                            "file_size": tmsg.file_size if tmsg.file_size else None,
                        }
                    )
            except Exception as e:
                print(f"[ReplyToThread] Error broadcasting: {e}")

            users = {str(u.id): u for u in User.objects(id__in=[uid])}
            return Response(thread_message_public(tmsg, users), status=201)
        
        message = GroupMessage(
            chat = chat,
            sender = uid,
            content = content,
            timestamp = timezone.now()
        )
        if file_data:
            message.file_url = file_data['file_url']
            message.file_type = file_data['file_type']
            message.file_name = file_data['file_name']
            message.file_size = file_data['file_size']
        message.save()
