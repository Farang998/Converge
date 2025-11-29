from unittest.mock import patch
from api.projects.utils import (
    send_invitation_email,
    send_invitations_background,
)
from api.auth.models import User

@patch("api.projects.utils.send_mail")
def test_send_invitation_email_success(mock_mail):
    send_invitation_email("a@test.com", "Proj", "1")
    mock_mail.assert_called_once()

@patch("api.projects.utils.send_mail", side_effect=Exception())
def test_send_invitation_email_exception(_):
    send_invitation_email("a@test.com", "Proj", "1")

def test_send_invitations_background_user_not_found():
    send_invitations_background(["badid"], "Proj", "1")

def test_send_invitations_background_user_exists():
    user = User(
        username="u",
        email="u@u.com",
        firstName="U",
        lastName="U",
        password="x"
    ).save()

    send_invitations_background([str(user.id)], "Proj", "1")
    User.drop_collection()

def test_prepare_invited_members_success_and_skip():
    leader = User(
        username="leader_u",
        email="l@test.com",
        firstName="L",
        lastName="T",
        password="x"
    ).save()

    member = User(
        username="member_u",
        email="m@test.com",
        firstName="M",
        lastName="T",
        password="x"
    ).save()

    result = prepare_invited_members(
        usernames=["member_u", "unknown", "leader_u"],
        team_leader_id=str(leader.id),
    )

    assert "error" not in result
    assert len(result["team_members_db"]) == 1

def test_mark_project_invitations_as_read_handles_exceptions():
    user = User(
        username="notif",
        email="n@test.com",
        firstName="N",
        lastName="T",
        password="x"
    ).save()

    Notification(
        user=user,
        message="Project invite",
        link_url="/accept-invitation/1",
        read=False
    ).save()

    mark_project_invitations_as_read(user, "1", "Proj")

@patch("api.projects.utils.create_event")
@patch("api.projects.utils.create_project_calendar")
def test_setup_project_calendar_success(
    mock_create_calendar,
    mock_create_event
):
    user = User(
        username="cal",
        email="c@test.com",
        firstName="C",
        lastName="T",
        password="x"
    ).save()

    GoogleCredentials(
        user=user,
        google_email=user.email,
        access_token="x",
        refresh_token="x"
    ).save()

    project = Project(
        name="Calendar Proj",
        team_leader=user
    ).save()

    mock_create_calendar.return_value = "calendar123"

    cid, err = setup_project_calendar(project, user)

    assert cid == "calendar123"
    assert err is None
