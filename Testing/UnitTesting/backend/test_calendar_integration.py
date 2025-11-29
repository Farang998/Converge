# api/calendar/tests/test_calendar_integration.py
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import json
import mongomock
import mongoengine
import requests

from django.test import override_settings
from django.conf import settings
from rest_framework import status
from rest_framework.test import APITestCase

from api.auth.models import User, Token
from api.projects.models import Project
from api.calendar.models import GoogleCredentials
from types import SimpleNamespace

# Force mongomock for tests (if your settings use mongoengine.connect already, this is safe)
mongoengine.disconnect()
mongoengine.connect("test_db", host="mongodb://localhost", mongo_client_class=mongomock.MongoClient)


@override_settings(
    GOOGLE_CLIENT_ID="test-client",
    GOOGLE_CLIENT_SECRET="test-secret",
    GOOGLE_REDIRECT_URI="https://example.com/callback",
)
class CalendarIntegrationTests(APITestCase):
    def setUp(self):
        # create a test user (mongoengine document save returns self)
        self.user = User(
            username="calendar-user",
            email="calendar@example.com",
            firstName="Cal",
            lastName="Endar",
            password="secret",
        ).save()
        # generate token using your project's helper
        self.token = User.generate_token(self.user.id)
        self.auth_header = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def tearDown(self):
        GoogleCredentials.drop_collection()
        Project.drop_collection()
        Token.drop_collection()
        User.drop_collection()

    def test_google_auth_init_requires_auth_and_returns_url(self):
        url = "/api/calendar/auth/init/"

        # unauthenticated
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # authenticated
        response = self.client.get(url, **self.auth_header)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("auth_url", response.data)
        self.assertIn("accounts.google.com", response.data["auth_url"])
        self.assertIn("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar", response.data["auth_url"])

    @patch("api.calendar.views.requests.post")
    def test_google_auth_callback_saves_credentials_and_handles_missing_fields(self, mock_post):
        # Happy path: token exchange response
        mock_post.return_value.json.return_value = {
            "access_token": "ya29.access",
            "refresh_token": "refresh_token",
            "expires_in": 3600,
        }


        url = "/api/calendar/auth/callback/"

        # If state (token) is omitted => should likely return 400 or 401; test main happy path first
        response = self.client.get(url, {"code": "dummy", "state": self.token})
        # Expect 200 and creds saved
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        creds = GoogleCredentials.objects(user=self.user).first()
        self.assertIsNotNone(creds)
        data = response.data
        self.assertIn("message", data)
        self.assertIsNotNone(creds.refresh_token)

        # Now simulate missing code -> should return 400 (or non-200). We assert non-200 to be robust.
        response2 = self.client.get(url, {"state": self.token})
        self.assertNotEqual(response2.status_code, status.HTTP_200_OK)

    @patch("api.calendar.views.get_calendar_events")
    def test_project_calendar_events_returns_events_and_requires_auth(self, mock_get_events):
        mock_get_events.return_value = [{"id": "1", "summary": "Kickoff"}]

        project = Project(
            name="Calendar",
            description="",
            team_leader=self.user,
            calendar_id="cal_123",
        ).save()

        url = f"/api/calendar/project/{project.id}/events/"
        response_no_auth = self.client.get(url, HTTP_AUTHORIZATION="Bearer faketoken")
        self.assertEqual(response_no_auth.status_code, status.HTTP_401_UNAUTHORIZED)

        GoogleCredentials(
            user=self.user,
            google_email=self.user.email,
            access_token="token",
            refresh_token="refresh",
            token_expiry=datetime.now() + timedelta(hours=1),
        ).save()

        response = self.client.get(url, **self.auth_header)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("events"), [{"id": "1", "summary": "Kickoff"}])
        mock_get_events.assert_called_once()

    @patch("api.calendar.google_service.requests.get")
    def test_get_calendar_events_calls_google_and_parses_items(self, mock_requests_get):
        # Simulate calendar API returning events
        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.json.return_value = {
            "items": [
                {"id": "e1", "summary": "Event 1"},
                {"id": "e2", "summary": "Event 2"},
            ]
        }

        mock_requests_get.return_value = fake_response

        from api.calendar.google_service import get_calendar_events

        fake_credentials = SimpleNamespace(
            access_token="ya29.access",
            refresh_token="refresh",
            token_expiry=datetime.now() + timedelta(hours=1),
        )

        events = get_calendar_events(fake_credentials, "dummy")

        # Assertions
        assert isinstance(events, list)
        assert len(events) == 2
        assert events[0]["id"] == "e1"
        assert events[0]["summary"] == "Event 1"
        assert events[1]["summary"] == "Event 2"


    @patch("api.calendar.google_service.requests.get")
    def test_get_calendar_events_handles_empty(self, mock_requests_get):
        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.json.return_value = {"items": []}

        mock_requests_get.return_value = fake_response

        from api.calendar.google_service import get_calendar_events

        fake_credentials = SimpleNamespace(
            access_token="ya29.access",
            refresh_token="refresh",
            token_expiry=datetime.now() + timedelta(hours=1),
        )

        events = get_calendar_events(fake_credentials, "abc")

        self.assertEqual(events, [])