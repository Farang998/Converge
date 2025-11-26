# api/calendar/urls.py
from django.urls import path
from .views import (
    GoogleAuthInitView,
    GoogleAuthCallbackView,
    ProjectCalendarEventsView,
    CredentialsStatusView,
    ProjectCalendarInfoView,
    CreateProjectCalendarView,
)

urlpatterns = [
    path("auth/init/", GoogleAuthInitView.as_view(), name="google_auth_init"),
    path("auth/callback/", GoogleAuthCallbackView.as_view(), name="google_auth_callback"),
    path("credentials/status/", CredentialsStatusView.as_view(), name="calendar_credentials_status"),

    # Fetch events from project's Google Calendar
    path("project/<str:project_id>/events/", ProjectCalendarEventsView.as_view(), name="project_calendar_events"),
    path("project/<str:project_id>/info/", ProjectCalendarInfoView.as_view(), name="project_calendar_info"),
    path("project/<str:project_id>/create/", CreateProjectCalendarView.as_view(), name="project_calendar_create"),
]
