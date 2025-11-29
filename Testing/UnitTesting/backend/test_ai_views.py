import uuid
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
from django.utils import timezone

from api.ai_models import AIChat, AIMessage
from api.auth.models import User, Token

class AITestBase(APITestCase):

    def setUp(self):
        self.user = User(
            username="test-user",
            email="test@example.com",
            firstName="Test",
            lastName="User",
            password="secret"
        ).save()

        self.token = User.generate_token(self.user.id)

        self.auth_headers = {
            "HTTP_AUTHORIZATION": f"Bearer {self.token}"
        }

    def test_ai_chats_unauthorized(self):
        url = "/api/ai/chats/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_ai_chat(self):
        url = "/api/ai/chats/"
        data = {"title": "Test Chat", "project_id": "p1"}

        response = self.client.post(url, data, **self.auth_headers)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Test Chat")

    def test_get_ai_chats(self):
        AIChat(
            title="Chat 1",
            user=str(self.user.id),
            project_id="p1",
            created_at=timezone.now(),
            updated_at=timezone.now()
        ).save()

        url = "/api/ai/chats/"
        response = self.client.get(url, **self.auth_headers)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["chats"]), 1)

    def test_get_ai_chats_by_project(self):
        AIChat(
            title="Chat 1",
            user=str(self.user.id),
            project_id="p123",
            created_at=timezone.now(),
            updated_at=timezone.now()
        ).save()

        url = "/api/ai/chats/" + "?project_id=p123"
        response = self.client.get(url, **self.auth_headers)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["chats"]), 1)

    def test_get_messages_chat_not_found(self):
        fake_chat_id = "507f1f77bcf86cd799439011"
        url = f"/api/ai/chats/{fake_chat_id}/messages/"
        response = self.client.get(url, **self.auth_headers)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_messages_forbidden(self):
        other_user = User(
            username="other",
            email="other@example.com",
            firstName="Other",
            lastName="User",
            password="secret"
        ).save()
        chat = AIChat(
            title="Secret",
            user=str(other_user.id),
            created_at=timezone.now(),
            updated_at=timezone.now()
        )
        chat.save()

        url = f"/api/ai/chats/{chat.id}/messages/"
        response = self.client.get(url, **self.auth_headers)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_chat_messages(self):
        chat = AIChat(
            title="Chat",
            user=str(self.user.id),
            created_at=timezone.now(),
            updated_at=timezone.now()
        )
        chat.save()

        AIMessage(
            chat_id=str(chat.id),
            sender="user",
            content="Hello",
            context=[],
            created_at=timezone.now()
        ).save()

        url = f"/api/ai/chats/{chat.id}/messages/"
        response = self.client.get(url, **self.auth_headers)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["messages"]), 1)

    def test_create_message_forbidden(self):
        other_user = User(
            username="other",
            email="other@example.com",
            firstName="Other",
            lastName="User",
            password="secret"
        ).save()
        chat = AIChat(
            title="Chat",
            user=str(other_user.id),
            created_at=timezone.now(),
            updated_at=timezone.now()
        ).save()

        url = f"/api/ai/chats/{chat.id}/messages/create/"
        response = self.client.post(url, {"content": "test"}, **self.auth_headers)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_message(self):
        chat = AIChat(
            title="Chat",
            user=str(self.user.id),
            created_at=timezone.now(),
            updated_at=timezone.now()
        )
        chat.save()

        url = f"/api/ai/chats/{chat.id}/messages/create/"
        data = {
            "sender": "user",
            "content": "Hello AI",
            "context": []
        }

        response = self.client.post(url, data, **self.auth_headers)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["content"], "Hello AI")

    def tearDown(self):
        AIMessage.drop_collection()
        AIChat.drop_collection()
        Token.drop_collection()
        User.drop_collection()
