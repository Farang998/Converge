from rest_framework import viewsets, status
from rest_framework.response import Response
from datetime import datetime, timedelta

from ..auth.models import User
from ..projects.models import Project
from .models import Meeting
from ..calendar.models import GoogleCredentials
from .google_meet_service import create_google_meeting, update_google_meeting, delete_google_meeting

ERROR_AUTH_HEADER_MISSING = "Authorization header missing"
ERROR_INVALID_AUTH_HEADER = "Invalid authorization header format"
ERROR_INVALID_TOKEN = "Invalid or expired token"


class MeetingViewSet(viewsets.ViewSet):

    # ------------------------------------------
    # AUTH HELPERS
    # ------------------------------------------
    def _authenticate_user(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise Exception(ERROR_AUTH_HEADER_MISSING, status.HTTP_401_UNAUTHORIZED)

        try:
            token = auth_header.split(" ")[1]
        except:
            raise Exception(ERROR_INVALID_AUTH_HEADER, status.HTTP_401_UNAUTHORIZED)

        user = User.validate_token(token)
        if not user:
            raise Exception(ERROR_INVALID_TOKEN, status.HTTP_401_UNAUTHORIZED)

        return user

    def _get_user_permission(self, project, user):
        if project.team_leader == user:
            return "leader"
        user_id = str(user.id)
        for member in project.team_members:
            if member["user"] == user_id and member["accepted"]:
                return "member"
        return None

    def _serialize(self, meeting):
        return {
            "id": str(meeting.id),
            "project_id": str(meeting.project.id),
            "title": meeting.title,
            "description": meeting.description,
            "start_time": meeting.start_time.isoformat(),
            "end_time": meeting.end_time.isoformat(),
            "attendees": meeting.attendees,
            "google_event_id": meeting.google_event_id,
        }

    # ------------------------------------------
    # LIST MEETINGS
    # ------------------------------------------
    def list(self, request):
        try:
            user = self._authenticate_user(request)
        except Exception as e:
            return Response({"error": e.args[0]}, status=e.args[1])

        project_id = request.query_params.get("project_id")
        if not project_id:
            return Response({"error": "project_id is required"}, status=400)

        project = Project.objects(id=project_id).first()
        if not project:
            return Response({"error": "Project not found"}, status=404)

        if not self._get_user_permission(project, user):
            return Response({"error": "Unauthorized"}, status=403)

        meetings = Meeting.objects(project=project)
        return Response([self._serialize(m) for m in meetings], status=200)

    # ------------------------------------------
    # CREATE MEETING
    # ------------------------------------------
    def create(self, request):
        try:
            user = self._authenticate_user(request)
        except Exception as e:
            return Response({"error": e.args[0]}, status=e.args[1])

        data = request.data

        project_id = data.get("project_id")
        start_time = data.get("start_time")

        if not project_id or not start_time:
            return Response({"error": "project_id and start_time are required"}, status=400)

        project = Project.objects(id=project_id).first()
        if not project:
            return Response({"error": "Project not found"}, status=404)

        if not self._get_user_permission(project, user):
            return Response({"error": "Unauthorized"}, status=403)

        # --------------------------------------
        # TITLE HANDLING → auto-generate if absent
        # --------------------------------------
        title = data.get("title")
        if not title or title.strip() == "":
            title = f"{project.name} Meeting"

        # --------------------------------------
        # TIME HANDLING → end_time optional
        # --------------------------------------
        try:
            start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        except:
            return Response({"error": "Invalid start_time format"}, status=400)

        end_time = data.get("end_time")
        if end_time:
            try:
                end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
            except:
                return Response({"error": "Invalid end_time format"}, status=400)
        else:
            end_dt = start_dt + timedelta(minutes=30)  # default duration

        attendees = data.get("attendees", [])

        # --------------------------------------
        # SAVE MEETING
        # --------------------------------------
        meeting = Meeting(
            project=project,
            title=title,
            description=data.get("description", ""),
            start_time=start_dt,
            end_time=end_dt,
            attendees=attendees,
            created_by=user,
        )
        meeting.save()

        # --------------------------------------
        # GOOGLE CALENDAR SYNC
        # --------------------------------------
        credentials = GoogleCredentials.objects(user=project.team_leader).first()
        if credentials and project.calendar_id:
            payload = {
                "title": title,
                "description": meeting.description,
                "start_time": start_dt.isoformat(),
                "end_time": end_dt.isoformat(),
                "attendees": attendees,
            }
            resp = create_google_meeting(credentials, project.calendar_id, payload)
            meeting.google_event_id = resp.get("id")
            meeting.save()

        return Response({"message": "Meeting created", "meeting": self._serialize(meeting)}, status=201)

    # ------------------------------------------
    # UPDATE MEETING
    # ------------------------------------------
    def partial_update(self, request, pk=None):
        try:
            user = self._authenticate_user(request)
            meeting = Meeting.objects.get(id=pk)
        except:
            return Response({"error": "Meeting not found"}, status=404)

        project = meeting.project
        if not self._get_user_permission(project, user):
            return Response({"error": "Unauthorized"}, status=403)

        data = request.data

        if "title" in data:
            if data["title"].strip() == "":
                meeting.title = f"{project.name} Meeting"
            else:
                meeting.title = data["title"]

        if "description" in data:
            meeting.description = data["description"]

        if "start_time" in data:
            meeting.start_time = datetime.fromisoformat(data["start_time"].replace("Z", "+00:00"))

        if "end_time" in data:
            meeting.end_time = datetime.fromisoformat(data["end_time"].replace("Z", "+00:00"))

        if "attendees" in data:
            meeting.attendees = data["attendees"]

        meeting.save()

        # SYNC TO GOOGLE
        if meeting.google_event_id:
            credentials = GoogleCredentials.objects(user=project.team_leader).first()
            if credentials:
                update_google_meeting(credentials, project.calendar_id, meeting.google_event_id, {
                    "title": meeting.title,
                    "description": meeting.description,
                    "start_time": meeting.start_time.isoformat(),
                    "end_time": meeting.end_time.isoformat(),
                    "attendees": meeting.attendees,
                })

        return Response({"message": "Meeting updated", "meeting": self._serialize(meeting)})

    # ------------------------------------------
    # DELETE MEETING
    # ------------------------------------------
    def destroy(self, request, pk=None):
        try:
            user = self._authenticate_user(request)
            meeting = Meeting.objects.get(id=pk)
        except:
            return Response({"error": "Meeting not found"}, status=404)

        if meeting.project.team_leader != user:
            return Response({"error": "Only team leader can delete meetings"}, status=403)

        # Delete from Google Calendar
        if meeting.google_event_id:
            credentials = GoogleCredentials.objects(user=meeting.project.team_leader).first()
            delete_google_meeting(credentials, meeting.project.calendar_id, meeting.google_event_id)

        meeting.delete()
        return Response({"message": "Meeting deleted"}, status=200)
