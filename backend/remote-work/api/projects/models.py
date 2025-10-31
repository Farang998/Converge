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