from django.test import TestCase
from Chat.models import (
    GroupChat,
    IndividualChat,
    GroupMessage,
    IndividualMessage,
    Thread,
    ThreadMessage
)
from api.auth.models import User

def setUp(self):
    User.drop_collection()
    GroupChat.drop_collection()
    IndividualChat.drop_collection()

def tearDown(self):
    User.drop_collection()
    GroupChat.drop_collection()
    IndividualChat.drop_collection()

class ChatModelsTest(TestCase):

    def test_group_chat_creation(self):
        chat = GroupChat(
            name="Test Group",
            admin="user1",
            participants=["user1", "user2"],
            project_id="507f1f77bcf86cd799439011"
        ).save()

        self.assertEqual(chat.name, "Test Group")
        self.assertIn("user1", chat.participants)

    def test_individual_chat_creation(self):
        chat = IndividualChat(
            project_id="proj1",
            participants=["u1", "u2"]
        ).save()

        self.assertEqual(len(chat.participants), 2)

    def test_group_message_creation(self):
        chat = GroupChat(
            name="Group",
            admin="u1",
            participants=["u1"],
            project_id="507f1f77bcf86cd799439011"
        ).save()

        msg = GroupMessage(
            chat=chat,
            sender="u1",
            content="hello"
        ).save()

        self.assertEqual(msg.content, "hello")

    def test_thread_and_thread_message(self):
        chat = GroupChat(
            name="Group2",
            admin="u1",
            participants=["u1"],
            project_id="507f1f77bcf86cd799439012"
        ).save()

        msg = GroupMessage(
            chat=chat,
            sender="u1",
            content="root"
        ).save()

        thread = Thread(
            chat=chat,
            parent_message=msg,
            created_by="u1"
        ).save()

        reply = ThreadMessage(
            thread=thread,
            sender="u1",
            content="reply"
        ).save()

        self.assertEqual(reply.content, "reply")
