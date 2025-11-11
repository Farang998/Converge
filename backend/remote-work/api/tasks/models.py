from mongoengine import Document, StringField, DateTimeField, ReferenceField
from django.utils import timezone
from ..auth.models import User
from ..projects.models import Project

class Task(Document):
    name = StringField(required=True)
    description = StringField()
    project = ReferenceField(Project, required=True) 
    assigned_to = ReferenceField(User, null=True)
    status = StringField(default='pending', choices=['pending', 'in_progress', 'completed'])
    due_date = DateTimeField(null=True)
    created_at = DateTimeField(default=timezone.now)

    meta = {'collection': 'tasks'}