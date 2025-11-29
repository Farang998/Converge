from django.test import TestCase
from Chat.serializers import group_chat_public
from Chat.models import GroupChat, IndividualChat
from api.auth.models import User

def setUp(self):
    User.drop_collection()
    GroupChat.drop_collection()
    IndividualChat.drop_collection()

def tearDown(self):
    User.drop_collection()
    GroupChat.drop_collection()
    IndividualChat.drop_collection()

class SerializerTests(TestCase):

    def test_group_chat_public(self):
        chat = GroupChat(
            name="Group",
            admin="u1",
            participants=["u1", "u2"],
            project_id="507f1f77bcf86cd799439013"
        ).save()

        data = group_chat_public(chat)

        self.assertEqual(data["name"], "Group")
        self.assertEqual(len(data["participants"]), 2)
