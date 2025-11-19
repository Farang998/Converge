# api/projects/utils.py
from django.core.mail import send_mail
from django.conf import settings
from ..auth.models import User
import threading
from mongoengine.queryset.visitor import Q
from rest_framework.exceptions import AuthenticationFailed
from ..notifications.models import Notification
from ..calendar.google_service import create_project_calendar, create_event
from ..calendar.models import GoogleCredentials

def send_invitation_email(email, project_name, project_id):
    """
    Sends a single project invitation email.
    """
    subject = f"Invitation to join project {project_name}"
    message = f"You have been invited to join the project '{project_name}'. Please click the link to accept: {settings.FRONTEND_URL}/accept-invitation/{project_id}"
    try:
        send_mail(subject, message, settings.EMAIL_HOST_USER, [email], fail_silently=False)
        print(f"Email sent successfully to {email}")
    except Exception as e:
        print(f"Failed to send email to {email}: {e}")

def send_invitations_background(team_members_invited, project_name, project_id):
    """
    Sends emails to a list of new members in a background thread.
    """
    for member_id in team_members_invited:
        try:
            user = User.objects.get(id=member_id)
            send_invitation_email(user.email, project_name, project_id)
        except User.DoesNotExist:
            pass

# -------------------------------------------------------
# Member Utilities
# -------------------------------------------------------
def prepare_invited_members(usernames, team_leader_id):
    team_members_db = []
    invited_users = []

    for username in usernames:
        try:
            invited_user = User.objects.get(username=username)
            invited_user_id_str = str(invited_user.id)

            if invited_user_id_str == team_leader_id:
                return {
                    "error": "Cannot add yourself as a team member. You are already the team leader."
                }

            if not any(m["user"] == invited_user_id_str for m in team_members_db):
                team_members_db.append({"user": invited_user_id_str, "accepted": False})
                invited_users.append(invited_user)

        except User.DoesNotExist:
            continue

    return {
        "team_members_db": team_members_db,
        "invited_users": invited_users
    }


def filter_valid_members_to_remove(requested_ids, existing_ids):
    return [uid for uid in requested_ids if uid in existing_ids]


# -------------------------------------------------------
# Notification Helpers
# -------------------------------------------------------
def send_invitation_notifications(users, project_name, project_id):
    for invited_user in users:
        Notification(
            user=invited_user,
            message=f"You have been invited to join the project '{project_name}'.",
            link_url=f"/accept-invitation/{project_id}"
        ).save()


def send_invites_async(user_ids, project_name, project_id, send_invitations_background):
    threading.Thread(
        target=send_invitations_background,
        args=(user_ids, project_name, project_id)
    ).start()


def mark_project_invitations_as_read(user, project_id, project_name):
    try:
        Notification.objects(
            (Q(user=user) & Q(link_url__icontains=str(project_id)))
            | (Q(user=user) & Q(message__icontains=project_name))
        ).update(set__read=True)
    except Exception:
        try:
            Notification.objects(user=user, message__icontains=project_name).update(set__read=True)
        except Exception:
            pass


# -------------------------------------------------------
# Calendar Helpers
# -------------------------------------------------------
def setup_project_calendar(project, user):
    credentials = GoogleCredentials.objects(user=user).first()
    if not credentials:
        return None, "Google Calendar not connected"

    calendar_id = create_project_calendar(credentials, project.name)
    if not calendar_id:
        return None, "Failed to create Google Calendar"

    project.calendar_id = calendar_id
    project.save()

    # create initial event
    try:
        start = project.created_at.isoformat()
        end = (project.created_at + project.created_at.__class__.fromisoformat("1970-01-01T00:30:00")).isoformat()

        create_event(credentials, calendar_id, {
            "summary": f"Project Created: {project.name}",
            "description": project.description or "",
            "start": start,
            "end": end,
            "task_id": None
        })
    except Exception:
        pass

    return calendar_id, None

# -------------------------------------------------------
# User Serializer for Search
# -------------------------------------------------------
def serialize_basic_users(users):
    return {str(u.id): u.username for u in users}

