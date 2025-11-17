from mongoengine import Document, StringField, ReferenceField, ListField, DateTimeField, IntField
from django.utils import timezone
from api.auth.models import User

class IndividualChat(Document):
    # Link individual chat to a specific project (optional for backward compat with DirectChat)
    project_id = StringField()  # Project ID to scope chats per project; optional for general DMs
    # store user ids as strings for simplicity
    participants = ListField(StringField(), required=True)  # ["<user_id>", "<user_id>"]
    created_at = DateTimeField(default=timezone.now)
    meta = {'collection': 'individual_chats'}

class GroupChat(Document):
    name = StringField(required=True, unique=True, max_length=100)
    admin = StringField(required=True)  # user id as string
    participants = ListField(StringField(), required=True)  # user ids
    created_at = DateTimeField(default=timezone.now)
    meta = {'collection': 'group_chats'}

class GroupMessage(Document):
    chat = ReferenceField(GroupChat, required=True, reverse_delete_rule=2)  # CASCADE
    sender = StringField(required=True)  # user id
    content = StringField(default='')
    timestamp = DateTimeField(default=timezone.now)
    # Media fields
    file_url = StringField()  # URL/path to the file
    file_type = StringField()  # 'image', 'video', 'document', 'audio'
    file_name = StringField()  # Original filename
    file_size = IntField()  # File size in bytes
    meta = {'collection': 'group_messages'}

class IndividualMessage(Document):
    chat = ReferenceField(IndividualChat, required=True, reverse_delete_rule=2)
    sender = StringField(required=True)  # user id
    content = StringField(default='')
    timestamp = DateTimeField(default=timezone.now)
    # Media fields
    file_url = StringField()  # URL/path to the file
    file_type = StringField()  # 'image', 'video', 'document', 'audio'
    file_name = StringField()  # Original filename
    file_size = IntField()  # File size in bytes
    meta = {'collection': 'individual_messages'}
