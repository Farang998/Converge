import requests
from django.conf import settings
from datetime import datetime, timedelta
from ..calendar.google_service import get_valid_access_token

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
