from django.db import models
from mongoengine import Document, StringField, DateTimeField, ListField, ReferenceField
from django.utils import timezone
from .auth.models import User

class Task(Document):
    name = StringField(required=True, max_length=100)
    description = StringField(required=True, max_length=1000)
    created_at = DateTimeField(default=timezone.now)
    updated_at = DateTimeField(default=timezone.now)
    assigned_to = ReferenceField(User)
    project = ReferenceField('Project')
    status = StringField(choices=['pending', 'in_progress', 'completed'], default='pending')
    priority = StringField(choices=['low', 'medium', 'high'], default='medium')
    due_date = DateTimeField()

class Project(Document):
    name = StringField(required=True, max_length=100)
    description = StringField(required=True, max_length=1000)
    created_at = DateTimeField(default=timezone.now)
    updated_at = DateTimeField(default=timezone.now)
    owner = ReferenceField(User, required=True)
    members = ListField(ReferenceField(User))
    tasks = ListField(ReferenceField(Task))
    start_date = DateTimeField(required=True)
    end_date = DateTimeField(required=True)

    
