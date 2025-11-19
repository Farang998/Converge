from mongoengine import Document, StringField, ListField, DictField, DateTimeField, ReferenceField, BooleanField
from django.utils import timezone
from ..auth.models import User

class Project(Document):
    name = StringField(required=True)
    description = StringField()
    team_leader = ReferenceField(User, required=True)
    # project_type = StringField(default='development')
    team_members = ListField(DictField())
    github_imported = BooleanField(default=False)
    github_import_date = DateTimeField()
    github_repo_name = StringField()
    github_repo_url = StringField()
    github_import_metadata = DictField()
    created_at = DateTimeField(default=timezone.now)
    calendar_id = StringField()
    
    # GitHub import fields
    github_imported = BooleanField(default=False)
    github_repo_url = StringField()
    github_repo_name = StringField()
    github_import_date = DateTimeField()
    github_import_metadata = DictField()  # Store repo info, file count, etc.

    meta = {
        'collection': 'projects',
        # Allow loading documents that contain fields not defined on the model
        # (some older documents may still have `project_type` or other legacy keys).
        'strict': False,
    }