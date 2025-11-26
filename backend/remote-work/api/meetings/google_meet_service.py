import requests
from django.conf import settings
from datetime import datetime, timedelta, timezone
from ..calendar.google_service import get_valid_access_token, get_calendar_events
from ..calendar.models import GoogleCredentials
from .models import Meeting

GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"

def create_google_meeting(credentials, calendar_id, data):
    """
    Create a Google Calendar event with attendees + Google Meet link.
    """
    access_token = get_valid_access_token(credentials)
    url = f"{GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events?conferenceDataVersion=1"
    headers = {"Authorization": f"Bearer {access_token}"}

    event_body = {
        "summary": data["title"],
        "description": data.get("description", ""),
        "start": {"dateTime": data["start_time"], "timeZone": "UTC"},
        "end": {"dateTime": data["end_time"], "timeZone": "UTC"},
        "attendees": [{"email": email} for email in data.get("attendees", [])],
        "conferenceData": {
            "createRequest": {
                "requestId": f"meet_{datetime.now().timestamp()}"
            }
        }
    }

    resp = requests.post(url, json=event_body, headers=headers).json()
    return resp


def update_google_meeting(credentials, calendar_id, event_id, data):
    access_token = get_valid_access_token(credentials)
    url = f"{GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events/{event_id}?conferenceDataVersion=1"
    headers = {"Authorization": f"Bearer {access_token}"}

    event_body = {
        "summary": data["title"],
        "description": data.get("description", ""),
        "start": {"dateTime": data["start_time"], "timeZone": "UTC"},
        "end": {"dateTime": data["end_time"], "timeZone": "UTC"},
        "attendees": [{"email": email} for email in data.get("attendees", [])],
    }

    return requests.patch(url, json=event_body, headers=headers).json()


def delete_google_meeting(credentials, calendar_id, event_id):
    access_token = get_valid_access_token(credentials)
    url = f"{GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events/{event_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    requests.delete(url, headers=headers)

def _parse_google_datetime(value: str):
    """
    Parse Google Calendar date/dateTime strings into timezone-aware datetimes (UTC).
    - dateTime example: 2025-11-26T12:00:00Z or with offset
    - date example: 2025-11-26 (treated as all-day starting at 00:00 UTC)
    """
    if not value:
        return None
    try:
        if len(value) == 10 and value.count("-") == 2:  # YYYY-MM-DD
            # All-day event; interpret as midnight UTC
            dt = datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            return dt
        # Normalize 'Z' to '+00:00' for fromisoformat
        norm = value.replace("Z", "+00:00")
        return datetime.fromisoformat(norm)
    except Exception:
        return None


def sync_google_events_to_db(project, user):
    # get team leader’s OAuth credentials
    creds = GoogleCredentials.objects(user=project.team_leader).first()
    if not creds:
        return "Leader not connected to Google", None

    if not project.calendar_id:
        return "Project has no Google Calendar", None

    # fetch from google
    google_events = get_calendar_events(creds, project.calendar_id)

    saved_meetings = []
    for ev in google_events:
        google_id = ev.get("id")
        if not google_id:
            continue

        start_raw = ev.get("start", {}).get("dateTime") or ev.get("start", {}).get("date")
        end_raw = ev.get("end", {}).get("dateTime") or ev.get("end", {}).get("date")
        start_dt = _parse_google_datetime(start_raw)
        end_dt = _parse_google_datetime(end_raw)

        # check if already saved
        meeting = Meeting.objects(google_event_id=google_id).first()

        if not meeting:
            meeting = Meeting(
                project=project,
                title=ev.get("summary", "Untitled Event"),
                description=ev.get("description", ""),
                start_time=start_dt or datetime.now(timezone.utc),
                end_time=end_dt or ((start_dt or datetime.now(timezone.utc)) + timedelta(minutes=30)),
                attendees=[a.get("email") for a in ev.get("attendees", []) if a.get("email")],
                google_event_id=google_id,
                created_by=project.team_leader,
            )
        else:
            # update existing meeting
            meeting.title = ev.get("summary", "Untitled Event")
            meeting.description = ev.get("description", "")
            meeting.start_time = start_dt or meeting.start_time
            meeting.end_time = end_dt or meeting.end_time
            meeting.attendees = [a.get("email") for a in ev.get("attendees", []) if a.get("email")]

        meeting.save()
        saved_meetings.append(meeting)

    return None, saved_meetings
