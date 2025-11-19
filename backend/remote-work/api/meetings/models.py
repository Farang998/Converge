from mongoengine import Document, StringField, ReferenceField, DateTimeField, ListField
from django.utils import timezone
from ..auth.models import User
from ..projects.models import Project

class Meeting(Document):
    project = ReferenceField(Project, required=True)
    title = StringField(required=True)
    description = StringField()
    start_time = DateTimeField(required=True)
    end_time = DateTimeField(required=True)
    created_by = ReferenceField(User, required=True)
    attendees = ListField(StringField())  # List of emails
    google_event_id = StringField()
    created_at = DateTimeField(default=timezone.now)

    meta = {"collection": "meetings"}
