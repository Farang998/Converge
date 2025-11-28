# api/calendar/models.py
from mongoengine import Document, ReferenceField, StringField, DateTimeField, CASCADE
from django.utils import timezone
from ..auth.models import User

class GoogleCredentials(Document):
    user = ReferenceField(User, required=True, reverse_delete_rule=CASCADE)
    google_email = StringField(required=True)
    access_token = StringField(required=True)
    refresh_token = StringField(required=True)
    token_expiry = DateTimeField(default=timezone.now)

    meta = {
        "collection": "google_credentials",
        "indexes": ["user"]
    }
