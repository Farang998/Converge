from mongoengine import Document, StringField, DateTimeField, ListField, ReferenceField, EmbeddedDocument, EmbeddedDocumentField, IntField
from django.utils import timezone


class AIChat(Document):
    title = StringField(required=True)
    user = StringField(required=True)  # user id as string
    project_id = StringField()  # optional project context
    created_at = DateTimeField(default=timezone.now)
    updated_at = DateTimeField(default=timezone.now)

    meta = {'collection': 'ai_chats', 'ordering': ['-created_at']}


class AIMessage(Document):
    chat_id = StringField(required=True)
    sender = StringField(required=True, choices=['user', 'ai'])
    content = StringField(required=True)
    context = ListField()  # optional list of source/context dicts
    created_at = DateTimeField(default=timezone.now)

    meta = {'collection': 'ai_messages', 'ordering': ['created_at']}
