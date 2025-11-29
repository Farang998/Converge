from django.test import TestCase
from Chat.handler import (
    handle_user_removed_from_project,
    handle_user_account_deleted
)
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

class ChatHandlerTests(TestCase):

    def setUp(self):
        self.user = User(
            username="x",
            email="x@test.com",
            firstName="X",
            lastName="Y",
            password="x"
        ).save()

        self.group = GroupChat(
            name="G1",
            admin=str(self.user.id),
            participants=[str(self.user.id)],
            project_id="507f1f77bcf86cd799439011"
        ).save()

        self.direct = IndividualChat(
            project_id="proj1",
            participants=[str(self.user.id), "other"]
        ).save()

    def test_handle_user_removed_from_project(self):
        handle_user_removed_from_project(
            str(self.user.id),
            self.group.project_id
        )

    def test_handle_user_account_deleted(self):
        result = handle_user_account_deleted(str(self.user.id))
        self.assertTrue(result)
