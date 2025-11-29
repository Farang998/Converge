import os
import pytest
from mongoengine import connect, disconnect
import mongomock

from django.contrib.auth.hashers import make_password
from unittest.mock import patch
from rest_framework.test import APIRequestFactory

# ==========================================================
# 1. MongoEngine initialized ONCE per test session
# ==========================================================
@pytest.fixture(scope="session", autouse=True)
def mongo_session():
    try:
        disconnect(alias="default")
    except Exception:
        pass

    connect(
        db="testdb",
        host="mongodb://localhost",
        alias="default",
        mongo_client_class=mongomock.MongoClient
    )
    yield


# ==========================================================
# 2. SUPER FAST DB CLEANUP BEFORE EACH TEST
# ==========================================================
@pytest.fixture(autouse=True)
def fast_clean_db():
    from mongoengine.connection import get_db
    db = get_db()
    for name in db.list_collection_names():
        db.drop_collection(name)


# ==========================================================
# 3. Disable password hashing (saves huge time)
# ==========================================================
@pytest.fixture(autouse=True)
def no_password_hashing(monkeypatch):
    monkeypatch.setattr(
        "django.contrib.auth.hashers.make_password",
        lambda raw_password: raw_password
    )


# ==========================================================
# 4. Remove slow email config logging
# ==========================================================
@pytest.fixture(autouse=True)
def disable_email_config(monkeypatch):
    monkeypatch.setenv("TESTING", "1")


# ==========================================================
# 5. Common fixtures
# ==========================================================
@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def viewset():
    """Reuse DRF viewset initialization (saves time)."""
    return TaskViewSet.as_view({
        "get": "list",
        "post": "create",
        "patch": "partial_update",
        "delete": "destroy"
    })


# Allow imports here (after mongo_session loads)
from api.auth.models import User
from api.projects.models import Project
from api.tasks.models import Task
from api.file_sharing.models import File
from api.tasks.views import TaskViewSet


# ==========================================================
# 6. User Fixtures
# ==========================================================
@pytest.fixture
def leader_user():
    return User.create_user(
        username="leader",
        email="leader@test.com",
        password="pass",
        firstName="Lead",
        lastName="Er"
    )


@pytest.fixture
def member_user():
    return User.create_user(
        username="member",
        email="member@test.com",
        password="pass",
        firstName="Mem",
        lastName="Ber"
    )


@pytest.fixture
def outsider_user():
    return User.create_user(
        username="outsider",
        email="out@test.com",
        password="pass",
        firstName="Out",
        lastName="Sider"
    )


# ==========================================================
# 7. Project fixture
# ==========================================================
@pytest.fixture
def project(leader_user, member_user):
    return Project.objects.create(
        name="ProjectX",
        team_leader=leader_user,
        team_members=[{"user": str(member_user.id), "accepted": True}],
        calendar_id="cal123"
    )


# ==========================================================
# 8. Auth fixtures
# ==========================================================
@pytest.fixture
def auth_leader(leader_user):
    with patch("api.tasks.views.authenticate_user_from_request", return_value=leader_user):
        yield


@pytest.fixture
def auth_member(member_user):
    with patch("api.tasks.views.authenticate_user_from_request", return_value=member_user):
        yield


@pytest.fixture
def auth_outsider(outsider_user):
    with patch("api.tasks.views.authenticate_user_from_request", return_value=outsider_user):
        yield


# ==========================================================
# 9. Calendar Patches
# ==========================================================
@pytest.fixture
def calendar_mocks():
    with patch("api.calendar.google_service.create_event", return_value="event1"):
        with patch("api.calendar.google_service.update_event", return_value=None):
            with patch("api.calendar.google_service.delete_event", return_value=None):
                yield
