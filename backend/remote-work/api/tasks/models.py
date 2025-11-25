from mongoengine import Document, StringField, DateTimeField, ReferenceField, ListField
from django.utils import timezone
from ..auth.models import User
from ..projects.models import Project

class Task(Document):
    name = StringField(required=True)
    description = StringField()
    project = ReferenceField(Project, required=True) 
    assigned_to = ListField(ReferenceField(User), default=[])
    status = StringField(default='pending', choices=['pending', 'in_progress', 'approval_pending', 'completed'])
    previous_status = StringField()
    due_date = DateTimeField(null=True)
    created_at = DateTimeField(default=timezone.now)
    calendar_event_id = StringField()
    dependencies = ListField(ReferenceField('Task'))
    related_files = ListField(ReferenceField('File'))

    meta = {'collection': 'tasks'}