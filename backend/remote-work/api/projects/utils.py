# api/projects/utils.py
import logging
from django.core.mail import send_mail
from django.conf import settings
from ..auth.models import User

logger = logging.getLogger(__name__)


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
            try:
                send_invitation_email(user.email, project_name, project_id)
            except Exception as e:
                # Avoid crashing the background thread — log and continue
                logger.exception("[projects.utils] Error sending invitation to %s: %s", user.email, str(e))
        except User.DoesNotExist:
            logger.warning("[projects.utils] Could not find invited user id %s", member_id)