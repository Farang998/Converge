# api/calendar/google_service.py
import requests
from django.conf import settings
from datetime import datetime, timedelta
from .models import GoogleCredentials

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"

def refresh_access_token(credentials: GoogleCredentials):
    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "refresh_token": credentials.refresh_token,
        "grant_type": "refresh_token",
    }

    response = requests.post(GOOGLE_TOKEN_URL, data=data).json()

    access_token = response.get("access_token")
    expires_in = response.get("expires_in", 3600)

    credentials.access_token = access_token
    credentials.token_expiry = datetime.now() + timedelta(seconds=expires_in)
    credentials.save()

    return access_token

def get_valid_access_token(credentials: GoogleCredentials):
    if datetime.now() >= credentials.token_expiry:
        return refresh_access_token(credentials)
    return credentials.access_token

def create_project_calendar(credentials, project_name):
    access_token = get_valid_access_token(credentials)

    url = f"{GOOGLE_CALENDAR_API}/calendars"
    headers = {"Authorization": f"Bearer {access_token}"}

    body = {"summary": f"Converge – {project_name}"}

    resp = requests.post(url, json=body, headers=headers)
    calendar_id = resp.json().get("id")

    return calendar_id

def get_calendar_events(credentials, calendar_id):
    access_token = get_valid_access_token(credentials)
    url = f"{GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events"
    headers = {"Authorization": f"Bearer {access_token}"}

    resp = requests.get(url, headers=headers)
    return resp.json().get("items", [])

def create_event(credentials, calendar_id, data):
    access_token = get_valid_access_token(credentials)
    url = f"{GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events"
    headers = {"Authorization": f"Bearer {access_token}"}

    event_body = {
        "summary": data.get("summary"),
        "description": data.get("description"),
        "start": {"dateTime": data.get("start"), "timeZone": "UTC"},
        "end": {"dateTime": data.get("end"), "timeZone": "UTC"},
        "extendedProperties": {
            "private": {
                "task_id": data.get("task_id")
            }
        }
    }

    resp = requests.post(url, json=event_body, headers=headers).json()
    return resp.get("id")

def update_event(credentials, calendar_id, event_id, data):
    access_token = get_valid_access_token(credentials)
    url = f"{GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events/{event_id}"
    headers = {"Authorization": f"Bearer {access_token}"}

    event_body = {
        "summary": data.get("summary"),
        "description": data.get("description"),
        "start": {"dateTime": data.get("start"), "timeZone": "UTC"},
        "end": {"dateTime": data.get("end"), "timeZone": "UTC"},
    }

    return requests.patch(url, json=event_body, headers=headers).json()

def delete_event(credentials, calendar_id, event_id):
    access_token = get_valid_access_token(credentials)
    url = f"{GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events/{event_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    requests.delete(url, headers=headers)
