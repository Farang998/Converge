# api/calendar/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from urllib.parse import urlencode

class GoogleAuthInitView(APIView):
    def get(self, request):
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/calendar",
            "access_type": "offline",
            "prompt": "consent"
        }
        url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
        return Response({"auth_url": url})

import requests
from .models import GoogleCredentials
from ..auth.models import User

class GoogleAuthCallbackView(APIView):
    def get(self, request):
        code = request.query_params.get("code")

        if not code:
            return Response({"error": "Missing code"}, status=400)

        data = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        }

        token_info = requests.post("https://oauth2.googleapis.com/token", data=data).json()
        access_token = token_info["access_token"]
        refresh_token = token_info["refresh_token"]
        expires_in = token_info["expires_in"]

        # Identify the logged-in user using your existing auth system
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return Response({"error": "Missing auth header"}, status=401)

        token = auth_header.split(" ")[1]
        user = User.validate_token(token)

        if not user:
            return Response({"error": "Invalid token"}, status=401)

        GoogleCredentials.objects(user=user).delete()  # Keep 1 per user

        GoogleCredentials(
            user=user,
            google_email=user.email,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expiry=datetime.now() + timedelta(seconds=expires_in)
        ).save()

        return Response({"message": "Google Calendar connected successfully!"})

class ProjectCalendarEventsView(APIView):
    def get(self, request, project_id):
        # Identify user
        auth_header = request.headers.get("Authorization")
        token = auth_header.split(" ")[1]
        user = User.validate_token(token)
        if not user:
            return Response({"error": "Unauthorized"}, status=401)

        # Get project
        from ..projects.models import Project
        project = Project.objects(id=project_id).first()

        if not project or not project.calendar_id:
            return Response({"events": []})

        # Get credentials
        credentials = GoogleCredentials.objects(user=user).first()
        if not credentials:
            return Response({"error": "Google Calendar not connected"}, status=400)

        events = get_calendar_events(credentials, project.calendar_id)
        return Response({"events": events})
