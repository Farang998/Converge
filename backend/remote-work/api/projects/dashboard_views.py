from datetime import datetime, timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed

from ..utils import authenticate_user_from_request
from ..tasks.models import Task
from ..projects.models import Project
from mongoengine.errors import DoesNotExist


class ProjectDashboardView(APIView):

    def get(self, request, project_id):

        # --- AUTH FIX ---
        try:
            user = authenticate_user_from_request(request)
        except AuthenticationFailed:
            return Response({"error": "Authentication failed"}, status=401)

        # --- PROJECT ---
        try:
            project = Project.objects.get(id=project_id)
        except DoesNotExist:
            return Response({"error": "Project not found"}, status=404)

        # --- CHECK USER IS MEMBER OR LEADER ---
        user_id = str(user.id)
        is_leader = project.team_leader == user
        is_member = any(
            m.get("user") == user_id and m.get("accepted")
            for m in project.team_members
        )

        if not (is_leader or is_member):
            return Response({"error": "Not authorized"}, status=403)

        # --- TASKS ---
        tasks = list(Task.objects.filter(project=project))

        # --------------------
        # TASK STATUS COUNTS
        # --------------------
        status_counts = {
            "pending": 0,
            "in_progress": 0,
            "approval_pending": 0,
            "completed": 0,
        }

        for t in tasks:
            if t.status in status_counts:
                status_counts[t.status] += 1

        # --------------------
        # WORKLOAD PER MEMBER
        # --------------------
        tasks_per_member = {}

        for t in tasks:
            assignee = t.assigned_to.name if t.assigned_to else "Unassigned"
            tasks_per_member[assignee] = tasks_per_member.get(assignee, 0) + 1

        workload_data = [
            {"name": k, "value": v} for k, v in tasks_per_member.items()
        ]

        # --------------------
        # UPCOMING DEADLINES
        # --------------------
        now = datetime.now(timezone.utc)

        upcoming = []
        for t in tasks:
            if t.due_date:
                due = (
                    t.due_date.replace(tzinfo=timezone.utc)
                    if t.due_date.tzinfo is None
                    else t.due_date
                )

                upcoming.append({
                    "id": str(t.id),
                    "name": t.name,
                    "due": due.isoformat()
                })

        upcoming = sorted(upcoming, key=lambda x: x["due"])[:5]

        # --------------------
        # PRIORITY BY DEPENDENCIES
        # --------------------
        priority_by_dependencies = [
            {"name": t.name, "value": len(t.dependencies or [])}
            for t in tasks
        ]

        # --------------------
        # PRIORITY BY DUE DATE
        # --------------------
        priority_by_due_date = []
        now = datetime.now(timezone.utc)

        for t in tasks:
            if t.due_date:
                due = (
                    t.due_date.replace(tzinfo=timezone.utc)
                    if t.due_date.tzinfo is None
                    else t.due_date
                )
                days_left = (due - now).days
                priority_score = max(0, 30 - days_left)
            else:
                priority_score = 0

            priority_by_due_date.append({
                "name": t.name,
                "value": priority_score
            })

        # --------------------
        # RETURN FINAL JSON
        # --------------------
        return Response({
            "task_status_counts": status_counts,
            "tasks_per_member": workload_data,
            "upcoming_deadlines": upcoming,
            "priority_by_dependencies": priority_by_dependencies,
            "priority_by_due_date": priority_by_due_date,
        }, status=200)
