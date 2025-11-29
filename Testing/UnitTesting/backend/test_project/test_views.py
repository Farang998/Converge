import io
import zipfile
from unittest.mock import patch, MagicMock
from rest_framework.test import APITestCase
from rest_framework import status
from django.test import override_settings

from api.auth.models import User, Token
from api.projects.models import Project
from api.notifications.models import Notification
from api.calendar.models import GoogleCredentials

@override_settings(
    FRONTEND_URL="http://test",
    EMAIL_HOST_USER="test@email.com",
)
class ProjectViewTests(APITestCase):

    def setUp(self):
        self.leader = User(
            username="leader",
            email="leader@test.com",
            firstName="Lead",
            lastName="Er",
            password="x"
        ).save()

        self.member = User(
            username="member",
            email="member@test.com",
            firstName="Mem",
            lastName="Ber",
            password="x"
        ).save()

        self.token = User.generate_token(self.leader.id)
        self.auth = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

        self.project = Project(
            name="Proj",
            description="desc",
            team_leader=self.leader,
            team_members=[{"user": str(self.member.id), "accepted": False}]
        ).save()

    def tearDown(self):
        Project.drop_collection()
        Notification.drop_collection()
        GoogleCredentials.drop_collection()
        Token.drop_collection()
        User.drop_collection()

    def test_list_projects(self):
        response = self.client.get("/api/projects/", **self.auth)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_list_projects_with_search(self):
        response = self.client.get("/api/projects/?search=Proj", **self.auth)
        self.assertEqual(response.status_code, 200)

    @patch("api.projects.views.create_project_calendar")
    def test_create_project_with_calendar(self, mock_calendar):
        GoogleCredentials(
            user=self.leader,
            google_email=self.leader.email,
            access_token="x",
            refresh_token="x"
        ).save()

        mock_calendar.return_value = "calendar_id"

        response = self.client.post(
            "/api/projects/",
            {"name": "New Project"},
            **self.auth
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_project_empty_name(self):
        response = self.client.post("/api/projects/", {"name": ""}, **self.auth)
        self.assertEqual(response.status_code, 400)

    def test_partial_update_project(self):
        response = self.client.patch(
            f"/api/projects/{self.project.id}/",
            {"name": "Updated"},
            **self.auth
        )
        self.assertEqual(response.status_code, 200)

    def test_partial_update_no_changes(self):
        response = self.client.patch(
            f"/api/projects/{self.project.id}/",
            {},
            **self.auth
        )
        self.assertEqual(response.status_code, 200)

    def test_add_members(self):
        response = self.client.post(
            f"/api/projects/{self.project.id}/add_members/",
            {"add_members": [str(self.member.id)]},
            format="json",
            **self.auth
        )
        self.assertEqual(response.status_code, 200)

    def test_add_members_noop(self):
        response = self.client.post(
            f"/api/projects/{self.project.id}/add_members/",
            {"add_members": []},
            format="json",
            **self.auth
        )
        self.assertEqual(response.status_code, 200)

    def test_remove_members(self):
        response = self.client.post(
            f"/api/projects/{self.project.id}/remove_members/",
            {"remove_members": [str(self.member.id)]},
            format="json",
            **self.auth
        )
        self.assertEqual(response.status_code, 200)

    def test_remove_members_invalid_type(self):
        response = self.client.post(
            f"/api/projects/{self.project.id}/remove_members/",
            {"remove_members": "bad"},
            **self.auth
        )
        self.assertEqual(response.status_code, 400)

    def test_accept_invitation_success(self):
        token = User.generate_token(self.member.id)
        auth = {"HTTP_AUTHORIZATION": f"Bearer {token}"}

        response = self.client.get(
            f"/api/projects/accept-invitation/{self.project.id}/",
            **auth
        )
        self.assertEqual(response.status_code, 200)

    def test_accept_invitation_not_invited(self):
        user = User(
            username="x",
            email="x@x.com",
            firstName="X",
            lastName="X",
            password="x"
        ).save()

        token = User.generate_token(user.id)
        auth = {"HTTP_AUTHORIZATION": f"Bearer {token}"}

        response = self.client.get(
            f"/api/projects/accept-invitation/{self.project.id}/",
            **auth
        )
        self.assertEqual(response.status_code, 403)

    def test_user_search_success(self):
        response = self.client.post(
            "/api/projects/userSearch/",
            {"query": "lead"},
            **self.auth
        )
        self.assertEqual(response.status_code, 200)

    def test_user_search_empty_query(self):
        response = self.client.post(
            "/api/projects/userSearch/",
            {"query": ""},
            **self.auth
        )
        self.assertEqual(response.status_code, 200)

    @override_settings(AWS_STORAGE_BUCKET_NAME="test-bucket")
    @patch("api.projects.views.threading.Thread")
    @patch("api.projects.views._get_s3_client")
    @patch("api.projects.views.requests.get")
    @patch("api.projects.views.zipfile.ZipFile")
    def test_import_github_success_path(
        self,
        mock_zipfile,
        mock_requests_get,
        mock_get_s3_client,
        mock_thread
    ):

        # Fake Github response
        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.content = b"fake zip content"
        fake_response.text = "OK"
        mock_requests_get.return_value = fake_response

        # Fake ZIP with one valid file
        fake_zip = MagicMock()
        fake_info = MagicMock()
        fake_info.is_dir.return_value = False
        fake_info.filename = "repo/root/file.txt"
        fake_info.file_size = 123

        fake_zip.infolist.return_value = [fake_info]
        fake_zip.open.return_value = io.BytesIO(b"file content")
        mock_zipfile.return_value = fake_zip

        # Fake S3 client
        mock_s3 = MagicMock()
        mock_get_s3_client.return_value = mock_s3

        # Prevent actual thread start
        mock_thread.return_value.start = MagicMock()


        response = self.client.post(
            f"/api/projects/{self.project.id}/import-github/",
            {
                "repo_url": "https://github.com/testowner/testrepo",
                "branch": "main",
            },
            format="json",
            **self.auth
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("files", response.data)
        self.assertEqual(response.data["ingest_started"], True)
