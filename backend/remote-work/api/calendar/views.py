# api/calendar/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from urllib.parse import urlencode
from .google_service import get_calendar_events
import dotenv
import os

dotenv.load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

class GoogleAuthInitView(APIView):
    def get(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return Response({"error": "Missing Authorization header"}, status=401)

        token = auth_header.split(" ")[1]
        print("REDIRECT:", GOOGLE_REDIRECT_URI)

        params = {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/calendar",
            "access_type": "offline",
            "prompt": "consent",
            "state": token,
        }

        url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
        print("AUTH_URL:", url)
        return Response({"auth_url": url})

import requests
from datetime import datetime, timedelta
from .models import GoogleCredentials
from ..auth.models import User

class GoogleAuthCallbackView(APIView):
    def get(self, request):
        from datetime import datetime, timedelta

        code = request.query_params.get("code")
        state = request.query_params.get("state")  # <-- THIS IS YOUR CONVERGE TOKEN!

        if not code:
            return Response({"error": "Missing code"}, status=400)

        if not state:
            return Response({"error": "Missing state token"}, status=400)

        # Identify Converge User
        user = User.validate_token(state)
        if not user:
            return Response({"error": "Invalid or expired Converge token"}, status=401)
        data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": GOOGLE_REDIRECT_URI,
        }

        token_info = requests.post("https://oauth2.googleapis.com/token", data=data).json()
        if "access_token" not in token_info:
            return Response({
                "error": "Unable to fetch tokens from Google",
                "details": token_info
            }, status=400)

        access_token = token_info.get("access_token")
        refresh_token = token_info.get("refresh_token")
        if not refresh_token:
            return Response({"error": "Google did not return a refresh_token. Try removing access and trying again."}, status=400)

        expires_in = token_info["expires_in"]
        GoogleCredentials.objects(user=user).delete()

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
