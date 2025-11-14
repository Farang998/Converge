# api/calendar/urls.py
from django.urls import path
from .views import (
    GoogleAuthInitView,
    GoogleAuthCallbackView,
    ProjectCalendarEventsView,
)

urlpatterns = [
    path("auth/init/", GoogleAuthInitView.as_view(), name="google_auth_init"),
    path("auth/callback/", GoogleAuthCallbackView.as_view(), name="google_auth_callback"),

    # Fetch events from project's Google Calendar
    path("project/<str:project_id>/events/", ProjectCalendarEventsView.as_view(), name="project_calendar_events"),
]
