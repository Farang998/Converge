from mongoengine import Document, StringField, ListField, DictField, DateTimeField
from django.utils import timezone

class Project(Document):
    name = StringField(required=True)
    description = StringField()
    team_leader = StringField(required=True)
    project_type = StringField(default='development')
    team_members = ListField(DictField())  # list of {'user': str, 'accepted': bool}
    created_at = DateTimeField(default=timezone.now)

    meta = {'collection': 'projects'}

class Task(Document):
    name = StringField(required=True)
    description = StringField()
    project_id = StringField(required=True)
    assigned_to = StringField()
    status = StringField(default='pending')  # pending, in_progress, completed
    due_date = DateTimeField()
    created_at = DateTimeField(default=timezone.now)

    meta = {'collection': 'tasks'}