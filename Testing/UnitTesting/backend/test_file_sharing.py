# tests.py
import io
import uuid
import json
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch, MagicMock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings

import os
import django

# Ensure Django settings are configured before importing DRF testing utilities
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from rest_framework import status

# Use correct Django module path for the app's views
import api.file_sharing.views as views


# --- Helper fakes used to patch into views ---
class FakeUser:
    def __init__(self, id='user-id-1', username='alice'):
        self.id = id
        self.username = username

    def __eq__(self, other):
        try:
            return str(self.id) == str(getattr(other, 'id', None))
        except Exception:
            return False

    # Mimic model DoesNotExist for try/except in views
    class DoesNotExist(Exception):
        pass

    @classmethod
    def validate_token(cls, token):
        # valid token is "validtoken"
        if token == "validtoken":
            return FakeUser()
        return None

    # For querying in project member lookup
    class ObjectsManager:
        def get(self, id):
            if id == 'user-id-1' or id == str(FakeUser().id):
                return FakeUser()
            raise FakeUser.DoesNotExist()

    # Provide a manager compatible with User.objects.get(...)
    objects = ObjectsManager()


class FakeProject:
    # simple container with class-level store for easy mocking
    def __init__(self, id='proj-1', name='Test Project', team_leader=None, team_members=None):
        self.id = id
        self.name = name
        self.team_leader = team_leader or FakeUser()
        self.team_members = team_members or []

    class objects:
        @staticmethod
        def get(id):
            if id == 'proj-1':
                # leader is FakeUser, and an accepted member exists (same user)
                member = {'user': str(FakeUser().id), 'accepted': True}
                return FakeProject(id='proj-1', team_leader=FakeUser(), team_members=[member])
            raise views.DoesNotExist("Project not found")


class FakeFileModel:
    """Mimic minimal behavior needed by views.File and File.objects"""
    _store = {}  # maps id -> instance

    def __init__(self, name, s3_key, file_size, content_type, uploaded_by, project):
        self.id = str(uuid.uuid4())
        self.name = name
        self.s3_key = s3_key
        self.file_size = file_size
        self.content_type = content_type
        self.uploaded_by = uploaded_by
        self.project = project
        self.uploaded_at = datetime.utcnow()

    def save(self):
        # default behavior: persist in-memory
        FakeFileModel._store[self.id] = self

    def delete(self):
        if self.id in FakeFileModel._store:
            del FakeFileModel._store[self.id]

    @classmethod
    def reset_store(cls):
        cls._store = {}

    class ObjectsManager:
        def get(self, id=None):
            if id in FakeFileModel._store:
                return FakeFileModel._store[id]
            raise views.DoesNotExist("File not found")

        def __call__(self, **kwargs):
            project = kwargs.get('project')
            name = kwargs.get('name')

            # If name is provided, mimic filter(...).first()
            if name is not None:
                class R:
                    def first(self):
                        for f in FakeFileModel._store.values():
                            if project is not None and getattr(f.project, 'id', None) != getattr(project, 'id', None):
                                continue
                            if f.name != name:
                                continue
                            return f
                        return None
                return R()

            # Otherwise, return a queryset-like object supporting order_by
            class Q:
                def __init__(self, project):
                    self._project = project

                def order_by(self, *_):
                    result = []
                    for f in FakeFileModel._store.values():
                        if getattr(f.project, 'id', None) == getattr(self._project, 'id', None):
                            result.append(f)
                    result.sort(key=lambda x: x.uploaded_at, reverse=True)
                    return result

            return Q(project)

        def filter(self, project=None, name=None):
            for f in FakeFileModel._store.values():
                if getattr(f.project, 'id', None) == getattr(project, 'id', None) and f.name == name:
                    class R:
                        def first(self):
                            return f
                    return R()
            class Empty:
                def first(self):
                    return None
            return Empty()

    objects = ObjectsManager()


# Minimal fake S3 client
class FakeS3Client:
    def __init__(self, raise_on_upload=False, raise_on_presign=False, raise_on_delete=False):
        self.raise_on_upload = raise_on_upload
        self.raise_on_presign = raise_on_presign
        self.raise_on_delete = raise_on_delete
        self.deleted = []

    def upload_fileobj(self, fileobj, bucket, key, ExtraArgs=None):
        if self.raise_on_upload:
            # mimic botocore.exceptions.ClientError
            raise views.ClientError({"Error": {"Message": "upload failed"}}, "Upload")
        # pretend to read file to mimic processing
        fileobj.read()

    def generate_presigned_url(self, ClientMethod, Params, ExpiresIn):
        if self.raise_on_presign:
            raise views.ClientError({"Error": {"Message": "presign failed"}}, "Presign")
        return f"https://s3.fake/{Params['Bucket']}/{Params['Key']}?expires_in={ExpiresIn}"

    def delete_object(self, Bucket, Key):
        if self.raise_on_delete:
            raise views.ClientError({"Error": {"Message": "delete failed"}}, "Delete")
        self.deleted.append((Bucket, Key))


# --- Tests ---
class FileSharingViewsTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        FakeFileModel.reset_store()

        # patch settings inside views module
        self.settings_patcher = patch.object(views, 'settings', new=SimpleNamespace(
            AWS_ACCESS_KEY_ID='ak',
            AWS_SECRET_ACCESS_KEY='sk',
            AWS_STORAGE_BUCKET_NAME='bucket',
            AWS_S3_REGION_NAME='us-east-1'
        ))
        self.settings_patcher.start()

        # patch models
        self.user_patcher = patch.object(views, 'User', new=FakeUser)
        self.project_patcher = patch.object(views, 'Project', new=FakeProject)
        self.file_patcher = patch.object(views, 'File', new=FakeFileModel)
        self.user_patcher.start()
        self.project_patcher.start()
        self.file_patcher.start()

    def tearDown(self):
        self.settings_patcher.stop()
        self.user_patcher.stop()
        self.project_patcher.stop()
        self.file_patcher.stop()
        FakeFileModel.reset_store()

    def auth_header(self, token='validtoken'):
        return {'Authorization': f'Bearer {token}'}

    def test_auth_header_missing(self):
        view = views.FileUploadView.as_view()
        req = self.factory.post('/upload/', data={})
        resp = view(req)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Authorization header missing', resp.data.get('error', ''))

    def test_invalid_auth_header_format(self):
        view = views.FileUploadView.as_view()
        req = self.factory.post('/upload/', data={}, headers={'Authorization': 'BearerOnly'})
        resp = view(req)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Invalid authorization header format', resp.data.get('error', ''))

    def test_invalid_token(self):
        view = views.FileUploadView.as_view()
        req = self.factory.post('/upload/', data={}, headers=self.auth_header('badtoken'))
        resp = view(req)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Invalid or expired token', resp.data.get('error', ''))

    def test_missing_project_id(self):
        view = views.FileUploadView.as_view()
        req = self.factory.post('/upload/', data={}, headers=self.auth_header())
        resp = view(req)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('project_id is required', resp.data.get('error', ''))

    def test_no_file_provided(self):
        view = views.FileUploadView.as_view()
        data = {'project_id': 'proj-1'}
        req = self.factory.post('/upload/', data=data, headers=self.auth_header())
        # ensure no FILES
        resp = view(req)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('No file provided', resp.data.get('error', ''))

    def test_file_size_exceeds_limit(self):
        view = views.FileUploadView.as_view()
        # create a file > 5MB
        big = SimpleUploadedFile("big.bin", b"a" * (views.MAX_FILE_SIZE + 1), content_type="application/octet-stream")
        data = {'project_id': 'proj-1', 'file': big}
        req = self.factory.post('/upload/', data=data, format='multipart', headers=self.auth_header())
        resp = view(req)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('File size exceeds 5 MB', resp.data.get('error', ''))

    def test_project_not_found(self):
        view = views.FileUploadView.as_view()
        small = SimpleUploadedFile("f.txt", b"hello", content_type="text/plain")
        data = {'project_id': 'nonexistent', 'file': small}
        req = self.factory.post('/upload/', data=data, format='multipart', headers=self.auth_header())
        resp = view(req)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Project not found', resp.data.get('error', ''))

    def test_user_without_access_cannot_upload(self):
        # Patch Project.objects.get to return a project where user is not leader or accepted member
        class NoAccessProject(FakeProject):
            class objects:
                @staticmethod
                def get(id):
                    return FakeProject(id='proj-1', team_leader=FakeUser(id='other'), team_members=[{'user': 'other', 'accepted': True}])

        with patch.object(views, 'Project', new=NoAccessProject):
            view = views.FileUploadView.as_view()
            small = SimpleUploadedFile("f.txt", b"hi", content_type="text/plain")
            data = {'project_id': 'proj-1', 'file': small}
            req = self.factory.post('/upload/', data=data, format='multipart', headers=self.auth_header())
            resp = view(req)
            self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
            self.assertIn('You do not have access', resp.data.get('error', ''))

    def test_duplicate_file_name(self):
        # create an existing file in FakeFileModel store for project proj-1
        proj = FakeProject(id='proj-1')
        f = FakeFileModel(name="f.txt", s3_key="k", file_size=10, content_type="text/plain", uploaded_by=FakeUser(), project=proj)
        f.save()

        view = views.FileUploadView.as_view()
        small = SimpleUploadedFile("f.txt", b"hello", content_type="text/plain")
        data = {'project_id': 'proj-1', 'file': small}
        req = self.factory.post('/upload/', data=data, format='multipart', headers=self.auth_header())
        resp = view(req)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', resp.data.get('error', ''))

    def test_aws_configuration_error_get_s3_client(self):
        # If get_s3_client raises ValueError, upload should return 500 with AWS configuration message
        with patch.object(views, 'get_s3_client', side_effect=ValueError('missing aws')):
            view = views.FileUploadView.as_view()
            small = SimpleUploadedFile("g.txt", b"ok", content_type="text/plain")
            data = {'project_id': 'proj-1', 'file': small}
            req = self.factory.post('/upload/', data=data, format='multipart', headers=self.auth_header())
            resp = view(req)
            self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
            self.assertIn('AWS configuration error', resp.data.get('error', ''))

    def test_s3_upload_clienterror(self):
        fake_client = FakeS3Client(raise_on_upload=True)
        with patch.object(views, 'get_s3_client', return_value=fake_client):
            view = views.FileUploadView.as_view()
            small = SimpleUploadedFile("u.txt", b"ok", content_type="text/plain")
            data = {'project_id': 'proj-1', 'file': small}
            req = self.factory.post('/upload/', data=data, format='multipart', headers=self.auth_header())
            resp = view(req)
            self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
            self.assertIn('Failed to upload file to S3', resp.data.get('error', ''))

    def test_successful_upload_and_list(self):
        fake_client = FakeS3Client()
        with patch.object(views, 'get_s3_client', return_value=fake_client):
            view = views.FileUploadView.as_view()
            small = SimpleUploadedFile("nice.txt", b"content", content_type="text/plain")
            data = {'project_id': 'proj-1', 'file': small}
            req = self.factory.post('/upload/', data=data, format='multipart', headers=self.auth_header())
            resp = view(req)
            self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
            # verify returned fields
            self.assertIn('file_id', resp.data)
            file_id = resp.data['file_id']

            # Now test listing files for project
            list_view = views.FileListView.as_view()
            req2 = self.factory.get(f'/project/proj-1/', headers=self.auth_header())
            resp2 = list_view(req2, project_id='proj-1')
            self.assertEqual(resp2.status_code, status.HTTP_200_OK)
            self.assertEqual(resp2.data['project_id'], 'proj-1')
            self.assertGreaterEqual(resp2.data['total_files'], 1)

            # Download view should generate presigned url
            dl_view = views.FileDownloadView.as_view()
            req3 = self.factory.get(f'/download/{file_id}/', headers=self.auth_header())
            resp3 = dl_view(req3, file_id=file_id)
            self.assertEqual(resp3.status_code, status.HTTP_200_OK)
            self.assertIn('download_url', resp3.data)

    def test_save_metadata_failure_rolls_back_s3(self):
        # Make File.save raise exception, ensure delete_object called
        fake_client = FakeS3Client()
        with patch.object(views, 'get_s3_client', return_value=fake_client):
            # patch File class to raise on save
            class BadSaveFile(FakeFileModel):
                def save(self):
                    raise Exception("db save failed")

            with patch.object(views, 'File', new=BadSaveFile):
                view = views.FileUploadView.as_view()
                small = SimpleUploadedFile("x.txt", b"ok", content_type="text/plain")
                data = {'project_id': 'proj-1', 'file': small}
                req = self.factory.post('/upload/', data=data, format='multipart', headers=self.auth_header())
                resp = view(req)
                self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
                # ensure s3 delete_object called (FakeS3Client.delete_object appends to deleted)
                # Because views calls s3_client.delete_object inside except, fake_client.deleted should contain an entry
                self.assertTrue(len(fake_client.deleted) >= 1)

    def test_file_download_generate_presign_client_error(self):
        # Create file then make presign fail
        fake_client = FakeS3Client(raise_on_presign=True)
        # create fake file
        proj = FakeProject(id='proj-1')
        f = FakeFileModel(name="p.txt", s3_key="files/proj-1/p.txt", file_size=10, content_type="text/plain", uploaded_by=FakeUser(), project=proj)
        f.save()
        with patch.object(views, 'get_s3_client', return_value=fake_client):
            dl_view = views.FileDownloadView.as_view()
            req = self.factory.get(f'/download/{f.id}/', headers=self.auth_header())
            resp = dl_view(req, file_id=f.id)
            self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
            self.assertIn('Failed to generate download URL', resp.data.get('error', ''))

    def test_file_delete_not_uploader_forbidden(self):
        # create file uploaded_by someone else
        proj = FakeProject(id='proj-1')
        other_user = FakeUser(id='other', username='bob')
        f = FakeFileModel(name="del.txt", s3_key="k", file_size=10, content_type="text/plain", uploaded_by=other_user, project=proj)
        f.save()

        del_view = views.FileDeleteView.as_view()
        req = self.factory.delete(f'/delete/{f.id}/', headers=self.auth_header())  # auth user is FakeUser (alice), not uploader
        resp = del_view(req, file_id=f.id)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('You can only delete files that you uploaded', resp.data.get('error', ''))

    def test_file_delete_success_with_s3_error_logged_but_db_deleted(self):
        # file uploaded by auth user
        proj = FakeProject(id='proj-1')
        f = FakeFileModel(name="delme.txt", s3_key="k", file_size=10, content_type="text/plain", uploaded_by=FakeUser(), project=proj)
        f.save()
        # S3 delete to raise error, but database deletion should still happen
        fake_client = FakeS3Client(raise_on_delete=True)
        with patch.object(views, 'get_s3_client', return_value=fake_client):
            del_view = views.FileDeleteView.as_view()
            req = self.factory.delete(f'/delete/{f.id}/', headers=self.auth_header())
            resp = del_view(req, file_id=f.id)
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertIn('deleted successfully', resp.data.get('message', ''))
            # ensure DB entry is removed
            self.assertNotIn(f.id, FakeFileModel._store)

    # --- Additional coverage for untested branches ---
    def test_list_unauthorized_missing_header(self):
        list_view = views.FileListView.as_view()
        req = self.factory.get('/project/proj-1/')
        resp = list_view(req, project_id='proj-1')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Authorization header missing', resp.data.get('error', ''))

    def test_list_project_not_found(self):
        list_view = views.FileListView.as_view()
        req = self.factory.get('/project/nonexistent/', headers=self.auth_header())
        resp = list_view(req, project_id='nonexistent')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Project not found', resp.data.get('error', ''))

    def test_list_forbidden_no_access(self):
        class NoAccessProject(FakeProject):
            class objects:
                @staticmethod
                def get(id):
                    return FakeProject(id='proj-1', team_leader=FakeUser(id='other'), team_members=[{'user': 'other', 'accepted': True}])

        with patch.object(views, 'Project', new=NoAccessProject):
            list_view = views.FileListView.as_view()
            req = self.factory.get('/project/proj-1/', headers=self.auth_header())
            resp = list_view(req, project_id='proj-1')
            self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
            self.assertIn('You do not have access', resp.data.get('error', ''))

    def test_download_unauthorized_missing_header(self):
        # Create a file
        proj = FakeProject(id='proj-1')
        f = FakeFileModel(name='d.txt', s3_key='k', file_size=1, content_type='text/plain', uploaded_by=FakeUser(), project=proj)
        f.save()
        dl_view = views.FileDownloadView.as_view()
        req = self.factory.get(f'/download/{f.id}/')
        resp = dl_view(req, file_id=f.id)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Authorization header missing', resp.data.get('error', ''))

    def test_download_file_not_found(self):
        dl_view = views.FileDownloadView.as_view()
        req = self.factory.get('/download/unknown/', headers=self.auth_header())
        resp = dl_view(req, file_id='unknown')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('File not found', resp.data.get('error', ''))

    def test_download_forbidden_no_access(self):
        proj = FakeProject(id='proj-1', team_leader=FakeUser(id='other'), team_members=[{'user': 'other', 'accepted': True}])
        f = FakeFileModel(name='d2.txt', s3_key='k2', file_size=1, content_type='text/plain', uploaded_by=FakeUser(id='other'), project=proj)
        f.save()
        dl_view = views.FileDownloadView.as_view()
        req = self.factory.get(f'/download/{f.id}/', headers=self.auth_header())
        resp = dl_view(req, file_id=f.id)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('access', resp.data.get('error', ''))

    def test_download_aws_configuration_error_from_get_client(self):
        proj = FakeProject(id='proj-1')
        f = FakeFileModel(name='p2.txt', s3_key='files/proj-1/p2.txt', file_size=10, content_type='text/plain', uploaded_by=FakeUser(), project=proj)
        f.save()
        with patch.object(views, 'get_s3_client', side_effect=ValueError('missing aws')):
            dl_view = views.FileDownloadView.as_view()
            req = self.factory.get(f'/download/{f.id}/', headers=self.auth_header())
            resp = dl_view(req, file_id=f.id)
            self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
            self.assertIn('AWS configuration error', resp.data.get('error', ''))

    def test_download_unexpected_exception_during_presign(self):
        class BoomClient:
            def generate_presigned_url(self, *args, **kwargs):
                raise RuntimeError('boom')
        proj = FakeProject(id='proj-1')
        f = FakeFileModel(name='p3.txt', s3_key='files/proj-1/p3.txt', file_size=10, content_type='text/plain', uploaded_by=FakeUser(), project=proj)
        f.save()
        with patch.object(views, 'get_s3_client', return_value=BoomClient()):
            dl_view = views.FileDownloadView.as_view()
            req = self.factory.get(f'/download/{f.id}/', headers=self.auth_header())
            resp = dl_view(req, file_id=f.id)
            self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
            self.assertIn('Unexpected error generating download URL', resp.data.get('error', ''))

    def test_upload_unexpected_exception_during_upload(self):
        class BoomClient:
            def upload_fileobj(self, *args, **kwargs):
                raise RuntimeError('boom')
        with patch.object(views, 'get_s3_client', return_value=BoomClient()):
            view = views.FileUploadView.as_view()
            small = SimpleUploadedFile("x2.txt", b"ok", content_type="text/plain")
            data = {'project_id': 'proj-1', 'file': small}
            req = self.factory.post('/upload/', data=data, format='multipart', headers=self.auth_header())
            resp = view(req)
            self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
            self.assertIn('Unexpected error during file upload', resp.data.get('error', ''))

    def test_upload_bucket_missing(self):
        # Patch settings to remove bucket and ensure 500 response
        no_bucket_settings = SimpleNamespace(
            AWS_ACCESS_KEY_ID='ak',
            AWS_SECRET_ACCESS_KEY='sk',
            AWS_STORAGE_BUCKET_NAME='',
            AWS_S3_REGION_NAME='us-east-1'
        )
        with patch.object(views, 'settings', new=no_bucket_settings):
            with patch.object(views, 'get_s3_client', return_value=FakeS3Client()):
                view = views.FileUploadView.as_view()
                small = SimpleUploadedFile("nb.txt", b"ok", content_type="text/plain")
                data = {'project_id': 'proj-1', 'file': small}
                req = self.factory.post('/upload/', data=data, format='multipart', headers=self.auth_header())
                resp = view(req)
                self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
                self.assertIn('AWS S3 bucket is not configured', resp.data.get('error', ''))

    def test_download_bucket_missing(self):
        # Prepare file
        proj = FakeProject(id='proj-1')
        f = FakeFileModel(name='nb2.txt', s3_key='files/proj-1/nb2.txt', file_size=10, content_type='text/plain', uploaded_by=FakeUser(), project=proj)
        f.save()
        # Patch settings to remove bucket
        no_bucket_settings = SimpleNamespace(
            AWS_ACCESS_KEY_ID='ak',
            AWS_SECRET_ACCESS_KEY='sk',
            AWS_STORAGE_BUCKET_NAME='',
            AWS_S3_REGION_NAME='us-east-1'
        )
        with patch.object(views, 'settings', new=no_bucket_settings):
            with patch.object(views, 'get_s3_client', return_value=FakeS3Client()):
                dl_view = views.FileDownloadView.as_view()
                req = self.factory.get(f'/download/{f.id}/', headers=self.auth_header())
                resp = dl_view(req, file_id=f.id)
                self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
                self.assertIn('AWS S3 bucket is not configured', resp.data.get('error', ''))

    # --- Cover remaining gaps in views.py ---
    def test_auth_header_indexerror_path(self):
        # Craft headers.get to return an object with split -> list-like that lies about length
        class WeirdParts:
            def __len__(self):
                return 2
            def __getitem__(self, idx):
                # Force IndexError at token extraction
                raise IndexError()
        class StrangeAuth:
            def split(self, sep):
                return WeirdParts()
        class FakeHeaders:
            def get(self, key):
                return StrangeAuth()

        view = views.FileUploadView.as_view()
        small = SimpleUploadedFile("ix.txt", b"ok", content_type="text/plain")
        data = {'project_id': 'proj-1', 'file': small}
        req = self.factory.post('/upload/', data=data, format='multipart')
        # Replace headers with our fake
        req.headers = FakeHeaders()
        resp = view(req)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Invalid authorization header format', resp.data.get('error', ''))

    def test_get_s3_client_success(self):
        # With valid patched settings from setUp, get_s3_client should return a boto3 client
        client = views.get_s3_client()
        self.assertTrue(hasattr(client, 'generate_presigned_url'))

    def test_get_s3_client_missing_access_key(self):
        bad = SimpleNamespace(
            AWS_ACCESS_KEY_ID='',
            AWS_SECRET_ACCESS_KEY='sk',
            AWS_STORAGE_BUCKET_NAME='bucket',
            AWS_S3_REGION_NAME='us-east-1'
        )
        with patch.object(views, 'settings', new=bad):
            with self.assertRaises(ValueError):
                views.get_s3_client()

    def test_get_s3_client_missing_secret(self):
        bad = SimpleNamespace(
            AWS_ACCESS_KEY_ID='ak',
            AWS_SECRET_ACCESS_KEY='',
            AWS_STORAGE_BUCKET_NAME='bucket',
            AWS_S3_REGION_NAME='us-east-1'
        )
        with patch.object(views, 'settings', new=bad):
            with self.assertRaises(ValueError):
                views.get_s3_client()

    def test_get_s3_client_missing_bucket(self):
        bad = SimpleNamespace(
            AWS_ACCESS_KEY_ID='ak',
            AWS_SECRET_ACCESS_KEY='sk',
            AWS_STORAGE_BUCKET_NAME='',
            AWS_S3_REGION_NAME='us-east-1'
        )
        with patch.object(views, 'settings', new=bad):
            with self.assertRaises(ValueError):
                views.get_s3_client()

    def test_get_s3_client_default_region_fallback(self):
        # Region empty -> should fallback to 'us-east-1' and still create client
        good = SimpleNamespace(
            AWS_ACCESS_KEY_ID='ak',
            AWS_SECRET_ACCESS_KEY='sk',
            AWS_STORAGE_BUCKET_NAME='bucket',
            AWS_S3_REGION_NAME=''
        )
        with patch.object(views, 'settings', new=good):
            client = views.get_s3_client()
            self.assertTrue(hasattr(client, 'generate_presigned_url'))

    def test_save_metadata_failure_delete_s3_raises_swallowed(self):
        fake_client = FakeS3Client(raise_on_delete=True)
        with patch.object(views, 'get_s3_client', return_value=fake_client):
            class BadSaveFile(FakeFileModel):
                def save(self):
                    raise Exception("db save failed")
            with patch.object(views, 'File', new=BadSaveFile):
                view = views.FileUploadView.as_view()
                small = SimpleUploadedFile("y.txt", b"ok", content_type="text/plain")
                data = {'project_id': 'proj-1', 'file': small}
                req = self.factory.post('/upload/', data=data, format='multipart', headers=self.auth_header())
                resp = view(req)
                self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    def test_upload_participants_missing_member_ignored(self):
        # Project with an accepted member whose user id is unknown
        class ProjectWithMissingMember(FakeProject):
            class objects:
                @staticmethod
                def get(id):
                    # Accepted member id that FakeUser.objects.get will not find
                    mm = {'user': 'missing-id', 'accepted': True}
                    return FakeProject(id='proj-1', team_leader=FakeUser(), team_members=[mm])
        with patch.object(views, 'Project', new=ProjectWithMissingMember):
            with patch.object(views, 'get_s3_client', return_value=FakeS3Client()):
                view = views.FileUploadView.as_view()
                small = SimpleUploadedFile("z.txt", b"ok", content_type="text/plain")
                data = {'project_id': 'proj-1', 'file': small}
                req = self.factory.post('/upload/', data=data, format='multipart', headers=self.auth_header())
                resp = view(req)
                self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_delete_aws_value_error_still_deletes(self):
        proj = FakeProject(id='proj-1')
        f = FakeFileModel(name='d3.txt', s3_key='k3', file_size=1, content_type='text/plain', uploaded_by=FakeUser(), project=proj)
        f.save()
        with patch.object(views, 'get_s3_client', side_effect=ValueError('missing aws')):
            del_view = views.FileDeleteView.as_view()
            req = self.factory.delete(f'/delete/{f.id}/', headers=self.auth_header())
            resp = del_view(req, file_id=f.id)
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertNotIn(f.id, FakeFileModel._store)

    def test_delete_aws_general_exception_still_deletes(self):
        proj = FakeProject(id='proj-1')
        f = FakeFileModel(name='d4.txt', s3_key='k4', file_size=1, content_type='text/plain', uploaded_by=FakeUser(), project=proj)
        f.save()
        with patch.object(views, 'get_s3_client', side_effect=RuntimeError('boom')):
            del_view = views.FileDeleteView.as_view()
            req = self.factory.delete(f'/delete/{f.id}/', headers=self.auth_header())
            resp = del_view(req, file_id=f.id)
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertNotIn(f.id, FakeFileModel._store)

    # Cover leader path in check_project_access (line 55)
    def test_check_project_access_team_leader_true(self):
        u = FakeUser()
        proj = FakeProject(id='proj-1', team_leader=u, team_members=[])
        self.assertTrue(views.check_project_access(u, proj))

    # Cover FileDeleteView auth and 404 branches (lines 342-343, 348-349)
    def test_delete_unauthorized_missing_header(self):
        proj = FakeProject(id='proj-1')
        f = FakeFileModel(name='dx.txt', s3_key='kx', file_size=1, content_type='text/plain', uploaded_by=FakeUser(), project=proj)
        f.save()
        del_view = views.FileDeleteView.as_view()
        req = self.factory.delete(f'/delete/{f.id}/')
        resp = del_view(req, file_id=f.id)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Authorization header missing', resp.data.get('error', ''))

    def test_delete_file_not_found(self):
        del_view = views.FileDeleteView.as_view()
        req = self.factory.delete('/delete/unknown/', headers=self.auth_header())
        resp = del_view(req, file_id='unknown')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('File not found', resp.data.get('error', ''))

    def test_list_access_when_leader_without_members(self):
        class LeaderOnlyProject(FakeProject):
            class objects:
                @staticmethod
                def get(id):
                    # Return a project where leader is the auth user and no members
                    return FakeProject(id='proj-1', team_leader=FakeUser(), team_members=[])

        with patch.object(views, 'Project', new=LeaderOnlyProject):
            list_view = views.FileListView.as_view()
            req = self.factory.get('/project/proj-1/', headers=self.auth_header())
            resp = list_view(req, project_id='proj-1')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_list_access_when_member_accepted(self):
        class MemberAccessProject(FakeProject):
            class objects:
                @staticmethod
                def get(id):
                    # User is accepted member, leader is someone else
                    return FakeProject(id='proj-1', team_leader=FakeUser(id='other'), team_members=[{'user': str(FakeUser().id), 'accepted': True}])

        with patch.object(views, 'Project', new=MemberAccessProject):
            list_view = views.FileListView.as_view()
            req = self.factory.get('/project/proj-1/', headers=self.auth_header())
            resp = list_view(req, project_id='proj-1')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
