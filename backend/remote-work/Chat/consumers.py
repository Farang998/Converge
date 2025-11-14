# Chat/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone
from asgiref.sync import sync_to_async
from api.auth.models import User   # MongoEngine User
from api.projects.models import Project
from .models import GroupChat, GroupMessage  # use your Mongo MongoEngine models

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # room name from URL route
        self.room = self.scope["url_route"]["kwargs"]["room"]
        self.group_name = f"chat_{self.room}"

        # join channel group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # leave group
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """
        Called when WebSocket receives a message.
        Expected JSON from frontend:
        {
            "token": "<jwt token>",
            "text": "Hello world"
        }
        """
        data = json.loads(text_data)
        token = data.get("token")
        message_text = data.get("text")

        if not token or not message_text:
            return

        # Validate user
        user = await sync_to_async(User.validate_token)(token)
        if not user:
            return

        sender_id = str(user.id)

        # Find the chatroom
        chat = await sync_to_async(GroupChat.objects(name=self.room).first)()
        if not chat:
            return

        # Save message to MongoDB
        msg = GroupMessage(
            chat=chat,
            sender=sender_id,
            content=message_text,
            timestamp=timezone.now()
        )
        await sync_to_async(msg.save)()

        # Broadcast to group
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat_message",    # will trigger chat_message()
                "sender_id": sender_id,
                "sender_username": user.username,
                "content": message_text,
                "timestamp": msg.timestamp.isoformat(),
                "message_id": str(msg.id)
            }
        )

    async def chat_message(self, event):
        """
        Receives broadcast and sends to WebSocket client.
        """
        await self.send(text_data=json.dumps({
            "type": "chat_message",
            "id": event["message_id"],
            "sender": {
                "id": event["sender_id"],
                "username": event["sender_username"]
            },
            "content": event["content"],
            "timestamp": event["timestamp"]
        }))


class ProjectChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for project-specific chats.
    Route: ws/chat/project/<project_id>/
    """
    
    async def connect(self):
        self.project_id = self.scope["url_route"]["kwargs"]["project_id"]
        self.user = self.scope.get("user")
        
        # Validate user from middleware
        if not self.user or not hasattr(self.user, 'id'):
            await self.close()
            return
        
        # Get project and validate membership
        project = await sync_to_async(self._get_project)()
        if not project:
            await self.close()
            return
        
        # Check if user is member or leader
        is_authorized = await sync_to_async(self._check_membership)(project)
        if not is_authorized:
            await self.close()
            return
        
        # Get or create chat for this project
        chat = await sync_to_async(self._get_or_create_chat)(project)
        if not chat:
            await self.close()
            return
        
        # Set group name based on project name (chat name)
        self.group_name = f"project_chat_{project.name}"
        self.chat = chat
        
        # Join channel group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "message": f"Connected to project chat: {project.name}",
            "project_id": str(project.id),
            "project_name": project.name
        }))
    
    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
    
    async def receive(self, text_data):
        """
        Handle incoming WebSocket messages.
        Expected JSON: {"content": "message text"}
        """
        try:
            data = json.loads(text_data)
            content = data.get("content", "").strip()
            
            if not content:
                return
            
            # User is already validated in connect()
            sender_id = str(self.user.id)
            
            # Save message to MongoDB
            msg = GroupMessage(
                chat=self.chat,
                sender=sender_id,
                content=content,
                timestamp=timezone.now()
            )
            await sync_to_async(msg.save)()
            
            # Broadcast to all connected clients in this project chat
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "project_chat_message",
                    "message_id": str(msg.id),
                    "sender_id": sender_id,
                    "sender_username": self.user.username,
                    "content": content,
                    "timestamp": msg.timestamp.isoformat()
                }
            )
        except Exception as e:
            print(f"[ProjectChatConsumer] Error receiving message: {e}")
    
    async def project_chat_message(self, event):
        """
        Send message to WebSocket client when broadcast is received.
        """
        await self.send(text_data=json.dumps({
            "type": "chat_message",
            "id": event["message_id"],
            "sender": {
                "id": event["sender_id"],
                "username": event["sender_username"]
            },
            "content": event["content"],
            "timestamp": event["timestamp"],
            "created_at": event["timestamp"]  # Alias for frontend compatibility
        }))
    
    def _get_project(self):
        """Get project by ID (sync function)"""
        try:
            return Project.objects.get(id=self.project_id)
        except Exception as e:
            print(f"[ProjectChatConsumer] Project not found: {e}")
            return None
    
    def _check_membership(self, project):
        """Check if user is leader or member (sync function)"""
        uid = str(self.user.id)
        is_leader = str(project.team_leader.id) == uid
        is_member = any(
            str(member.get('user')) == uid for member in (project.team_members or [])
        )
        return is_leader or is_member
    
    def _get_or_create_chat(self, project):
        """Get or create GroupChat for project (sync function)"""
        chat = GroupChat.objects(name=project.name).first()
        if not chat:
            # Create chat with all project members
            participants = [str(project.team_leader.id)]
            if project.team_members:
                participants.extend([
                    str(member.get('user')) 
                    for member in project.team_members 
                    if member.get('user')
                ])
            chat = GroupChat(
                name=project.name,
                admin=str(project.team_leader.id),
                participants=participants
            )
            chat.save()
            print(f"[ProjectChatConsumer] Created chat for project: {project.name}")
        
        # Ensure current user is in participants
        uid = str(self.user.id)
        if uid not in chat.participants:
            chat.participants.append(uid)
            chat.save()
        
        return chat
