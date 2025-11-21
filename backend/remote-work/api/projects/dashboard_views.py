# backend/remote-work/projects/dashboard_views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from mongoengine.queryset.visitor import Q
from datetime import datetime

from ..utils import authenticate_user_from_request
from ..projects.models import Project
from ..tasks.models import Task
from ..auth.models import User
from ..file_sharing.models import File  # <-- Valid and correct import now


class ProjectDashboardView(APIView):
    """
    Dashboard API that returns aggregated project analytics.
    Used by: /projects/dashboard/<project_id>/overview/
    """

    def get(self, request, project_id):
        # Authenticate
        try:
            user = authenticate_user_from_request(request)
        except AuthenticationFailed as e:
            return Response({"error": str(e)}, status=401)

        # Fetch project
        try:
            project = Project.objects.get(id=project_id)
        except Exception:
            return Response({"error": "Project not found"}, status=404)

        # Permission: leader or accepted member
        user_id_str = str(user.id)
        is_leader = project.team_leader == user
        is_member = any(m.get("user") == user_id_str and m.get("accepted") for m in project.team_members)

        if not (is_leader or is_member):
            return Response({"error": "You are not a member of this project."}, status=403)

        # -----------------------
        # FETCH ALL TASKS
        # -----------------------
        try:
            tasks = list(Task.objects(project=project))
        except Exception:
            tasks = []

        # -----------------------
        # TASK STATUS COUNTS
        # -----------------------
        status_counts = {}
        for t in tasks:
            st = getattr(t, "status", "pending") or "pending"
            status_counts[st] = status_counts.get(st, 0) + 1

        # -----------------------
        # PRIORITY COUNTS (*your model has no priority, so return empty)
        # -----------------------
        priority_counts = {}  # future-ready if you add priority field

        # -----------------------
        # WORKLOAD PER MEMBER
        # -----------------------
        tasks_per_member = {}

        for t in tasks:
            assignee = getattr(t, "assigned_to", None)
            if assignee:
                username = getattr(assignee, "username", "Unknown")
            else:
                username = "Unassigned"

            tasks_per_member[username] = tasks_per_member.get(username, 0) + 1

        tasks_per_member_list = [
            {"username": u, "count": c} for u, c in tasks_per_member.items()
        ]

        # -----------------------
        # UPCOMING DEADLINES
        # -----------------------
        upcoming = []
        for t in tasks:
            dd = getattr(t, "due_date", None)
            if dd:
                upcoming.append({
                    "id": str(t.id),
                    "name": t.name,
                    "due": dd.isoformat()
                })

        upcoming = sorted(upcoming, key=lambda x: x["due"])[:10]

        # -----------------------
        # PROJECT PROGRESS
        # -----------------------
        total_tasks = len(tasks)
        completed = sum(1 for t in tasks if getattr(t, "status", "").lower() == "completed")
        progress = int((completed / total_tasks) * 100) if total_tasks > 0 else 0

        # -----------------------
        # RECENT ACTIVITY (TASKS + FILE UPLOADS)
        # -----------------------
        recent_activity = []

        # TASK activity
        try:
            recent_tasks = sorted(
                tasks,
                key=lambda x: getattr(x, "created_at", datetime.min),
                reverse=True
            )[:10]

            for t in recent_tasks:
                created_at = getattr(t, "created_at", None)
                recent_activity.append({
                    "type": "task",
                    "message": f"Task '{t.name}' created (status: {t.status})",
                    "time": created_at.isoformat() if created_at else None
                })
        except Exception:
            pass

        # FILE activity (now correct for your File model)
        try:
            recent_files = list(File.objects(project=project).order_by("-uploaded_at")[:10])

            for f in recent_files:
                uploader = getattr(f.uploaded_by, "username", "Someone")
                time = f.uploaded_at.isoformat() if f.uploaded_at else None
                recent_activity.append({
                    "type": "file",
                    "message": f"File '{f.name}' uploaded by {uploader}",
                    "time": time
                })
        except Exception:
            pass

        # Sort activity latest → oldest
        recent_activity = sorted(recent_activity, key=lambda x: x.get("time") or "", reverse=True)[:12]

        resp = {
            "task_status_counts": status_counts,
            "priority_counts": priority_counts,
            "tasks_per_member": tasks_per_member_list,
            "upcoming_deadlines": upcoming,
            "project_progress": progress,
            "recent_activity": recent_activity,
            "total_tasks": total_tasks,
            "completed_tasks": completed,
        }

        return Response(resp, status=200)
