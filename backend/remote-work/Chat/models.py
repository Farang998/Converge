from mongoengine import Document, StringField, ReferenceField, ListField, DateTimeField, IntField, ObjectIdField
from django.utils import timezone
from api.auth.models import User

class IndividualChat(Document):
    project_id = StringField()  
    participants = ListField(StringField(), required=True)  # ["<user_id>", "<user_id>"]
    created_at = DateTimeField(default=timezone.now)
    meta = {'collection': 'individual_chats'}

class GroupChat(Document):
    name = StringField(required=True, unique=True, max_length=100)
    admin = StringField(required=True)  # user id as string
    participants = ListField(StringField(), required=True)  # user ids
    created_at = DateTimeField(default=timezone.now)
    project_id = ObjectIdField(required=True)
    meta = {'collection': 'group_chats'}

class GroupMessage(Document):
    chat = ReferenceField(GroupChat, required=True, reverse_delete_rule=2)  # CASCADE
    sender = StringField(required=True)  # user id
    # sender_name = StringField() ;
    content = StringField(default='')
    timestamp = DateTimeField(default=timezone.now)
    # Media fields
    file_url = StringField()  
    file_type = StringField()  
    file_name = StringField()  
    file_size = IntField()  
    meta = {'collection': 'group_messages'}

class IndividualMessage(Document):
    chat = ReferenceField(IndividualChat, required=True, reverse_delete_rule=2)
    sender = StringField(required=True)  # user id
    content = StringField(default='')
    timestamp = DateTimeField(default=timezone.now)
    # Media fields
    file_url = StringField() 
    file_type = StringField()  
    file_name = StringField() 
    file_size = IntField()  
    meta = {'collection': 'individual_messages'}

class Thread(Document):
    chat = ReferenceField('GroupChat', required=True, reverse_delete_rule=2)
    parent_message = ReferenceField('GroupMessage', required=True, reverse_delete_rule=3)
    created_by = StringField(required=True)
    created_at = DateTimeField(default=timezone.now)
    meta = {'collection': 'threads'}

class ThreadMessage(Document):
    thread = ReferenceField('Thread', required=True, reverse_delete_rule=2)
    sender =StringField(required=True)
    content = StringField(default='')
    timestamp = DateTimeField(default=timezone.now)

    # media
    file_url = StringField()
    file_type = StringField()
    file_name = StringField()
    file_size = IntField()

    meta = {'collection': 'thread_messages'}