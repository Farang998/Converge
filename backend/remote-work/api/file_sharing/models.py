from mongoengine import Document, StringField, ReferenceField, DateTimeField, IntField
from django.utils import timezone
from ..auth.models import User
from ..projects.models import Project


class File(Document):
    """
    Model to store file metadata.
    Files are stored in S3, and this model tracks:
    - Which user uploaded it
    - Which project it belongs to
    - S3 key/path for retrieval
    - File metadata (name, size, etc.)
    """
    name = StringField(required=True)  # Original filename
    s3_key = StringField(required=True)  # S3 object key/path
    file_size = IntField(required=True)  # Size in bytes
    content_type = StringField()  # MIME type
    uploaded_by = ReferenceField(User, required=True)
    project = ReferenceField(Project, required=True)
    uploaded_at = DateTimeField(default=timezone.now)
    
    meta = {'collection': 'files'}

