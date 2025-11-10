# Chat/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from datetime import datetime
from api.auth.models import User   # MongoEngine User
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
        user = User.validate_token(token)
        if not user:
            return

        sender_id = str(user.id)

        # Find the chatroom
        chat = GroupChat.objects(name=self.room).first()
        if not chat:
            return

        # Save message to MongoDB
        msg = GroupMessage(
            chat=chat,
            sender=sender_id,
            content=message_text,
            timestamp=datetime.utcnow()
        )
        msg.save()

        # Broadcast to group
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat_message",    # will trigger chat_message()
                "sender": user.username,
                "content": message_text,
                "timestamp": msg.timestamp.isoformat()
            }
        )

    async def chat_message(self, event):
        """
        Receives broadcast and sends to WebSocket client.
        """
        await self.send(text_data=json.dumps({
            "sender": event["sender"],
            "content": event["content"],
            "timestamp": event["timestamp"]
        }))
