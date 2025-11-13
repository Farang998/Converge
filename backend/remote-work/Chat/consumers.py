from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync
from django.shortcuts import get_object_or_404
import json
from .models import GroupChat, GroupMessage
from django.contrib.auth.models import User

class ChatroomConsumer(WebsocketConsumer):
    def connect(self):
        self.user = self.scope['user']
        self.chatroom_name = self.scope['url_route']['kwargs']['chatroom_name']
        self.chatroom = get_object_or_404(GroupChat, name=self.chatroom_name)

        async_to_sync(self.channel_layer.group_add)(
            self.chatroom_name, self.channel_name
        )

        # Add online user
        if self.user not in self.chatroom.participants.all():
            self.chatroom.participants.add(self.user)

        self.accept()

        # Optional: send message to user confirming connection
        self.send(text_data=json.dumps({
            "type": "connection_established",
            "message": f"Connected to chatroom {self.chatroom_name}"
        }))

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.chatroom_name, self.channel_name
        )

    def receive(self, text_data):
        data = json.loads(text_data)
        message_text = data.get('message', '')

        # Save message
        message = GroupMessage.objects.create(
            sender=self.user,
            content=message_text,
            chat=self.chatroom
        )

        event = {
            'type': 'message_handler',
            'message': {
                'id': message.id,
                'sender': self.user.username,
                'content': message.content,
                'timestamp': str(message.timestamp)
            }
        }

        async_to_sync(self.channel_layer.group_send)(
            self.chatroom_name, event
        )

    def message_handler(self, event):
        message = event['message']

        self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message
        }))
class OnlineStatusConsumer(WebsocketConsumer):
    def connect(self):
        self.user = self.scope['user']
        self.group_name = 'online-status'
        async_to_sync(self.channel_layer.group_add)(
            self.group_name, self.channel_name
        )
        self.accept()

        self.user.is_online = True
        self.online_status()

    def disconnect(self, close_code):
        self.user.is_online = False
        async_to_sync(self.channel_layer.group_discard)(
            self.group_name, self.channel_name
        )
        self.online_status()

    def online_status(self):
        event = {
            'type': 'online_status_handler',
        }
        async_to_sync(self.channel_layer.group_send)(
            self.group_name, event
        )

    def online_status_handler(self, event):
        # passing only two fields from user module to frontend : id, username
        online_users = list(User.objects.filter(is_active=True).values('id', 'username'))

        self.send(text_data=json.dumps({
            'type': 'online_status',
            'users': online_users
        }))
