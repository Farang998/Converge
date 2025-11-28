from mongoengine import Document, StringField, BooleanField, DateTimeField, ReferenceField, CASCADE
from django.utils import timezone
from ..auth.models import User  # Import the User model

class Notification(Document):
    """
    Represents a notification for a specific user.
    """
    user = ReferenceField(User, required=True, reverse_delete_rule=CASCADE) # Delete notifications when user is deleted
    message = StringField(required=True)
    read = BooleanField(default=False)
    link_url = StringField() # Optional: e.g., /projects/<project_id>
    created_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'notifications',
        'ordering': ['-created_at'] # Show newest notifications first
    }

    def to_json(self):
        """
        Serializes the document to a JSON-friendly dictionary.
        """
        return {
            "id": str(self.id),
            "user_id": str(self.user.id),
            "message": self.message,
            "read": self.read,
            "link_url": self.link_url,
            "created_at": self.created_at.isoformat()
        }