from mongoengine import Document, StringField, ListField, DictField, DateTimeField, ReferenceField
from django.utils import timezone
from ..auth.models import User

class Project(Document):
    name = StringField(required=True)
    description = StringField()
    team_leader = ReferenceField(User, required=True)
    project_type = StringField(default='development')
    team_members = ListField(DictField())
    created_at = DateTimeField(default=timezone.now)

    meta = {'collection': 'projects'}