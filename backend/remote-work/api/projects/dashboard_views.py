from datetime import datetime, timezone, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed
from ..file_sharing.models import File
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

class ProjectWorkflowView(APIView):
    """
    Returns analytics used by 'Task Workflow Management' section:
      - timeline of created/due tasks (last 30 days)
      - task delay heatmap (counts per due date)
      - workflow bottlenecks (stuck tasks by days since creation)
      - workflow health score (completed / total)
    """

    def get(self, request, project_id):
        # --- AUTH ---
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
        is_member = any(m.get("user") == user_id and m.get("accepted") for m in project.team_members)

        if not (is_leader or is_member):
            return Response({"error": "Not authorized"}, status=403)

        # --- TASKS ---
        tasks = list(Task.objects.filter(project=project))

        # 1) Timeline: created & due counts for last 30 days
        today = datetime.now(timezone.utc).date()
        days = 30
        timeline_dates = [(today - timedelta(days=i)) for i in range(days - 1, -1, -1)]
        created_counts = {d: 0 for d in timeline_dates}
        due_counts = {d: 0 for d in timeline_dates}

        for t in tasks:
            # created date
            if t.created_at:
                created_date = t.created_at.date() if t.created_at.tzinfo else t.created_at.replace(tzinfo=timezone.utc).date()
                if created_date in created_counts:
                    created_counts[created_date] += 1

            # due date
            if t.due_date:
                due_date = t.due_date.date() if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc).date()
                if due_date in due_counts:
                    due_counts[due_date] += 1

        timeline_created = [{"date": d.isoformat(), "count": created_counts[d]} for d in timeline_dates]
        timeline_due = [{"date": d.isoformat(), "count": due_counts[d]} for d in timeline_dates]

        # 2) Heatmap (overdue by due_date) - use last 90 days for heatmap range
        heatmap_days = 90
        heatmap_dates = [(today - timedelta(days=i)) for i in range(heatmap_days - 1, -1, -1)]
        heatmap = {d: 0 for d in heatmap_dates}

        for t in tasks:
            if t.due_date:
                due_date = t.due_date.date() if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc).date()
                # consider task overdue on its due date only if not completed
                if due_date in heatmap and getattr(t, "status", None) != "completed":
                    heatmap[due_date] += 1

        heatmap_list = [{"date": d.isoformat(), "count": heatmap[d]} for d in heatmap_dates]

        # 3) Bottlenecks - tasks not completed, sorted by days since created (descending)
        bottlenecks = []
        for t in tasks:
            if getattr(t, "status", None) != "completed":
                # compute stuck days (use timezone-aware created_at)
                created = t.created_at
                if created:
                    created_aware = created if created.tzinfo else created.replace(tzinfo=timezone.utc)
                    stuck_days = (datetime.now(timezone.utc) - created_aware).days
                else:
                    stuck_days = 0
                bottlenecks.append({
                    "id": str(t.id),
                    "name": t.name,
                    "status": t.status,
                    "stuck_days": stuck_days
                })

        bottlenecks = sorted(bottlenecks, key=lambda x: x["stuck_days"], reverse=True)[:30]

        # 4) Workflow health score
        total_tasks = len(tasks)
        completed = sum(1 for t in tasks if getattr(t, "status", None) == "completed")
        health_score = int((completed / total_tasks) * 100) if total_tasks else 100

        # FINAL RESPONSE
        return Response({
            "timeline_created": timeline_created,
            "timeline_due": timeline_due,
            "heatmap_overdue": heatmap_list,
            "bottlenecks": bottlenecks,
            "workflow_health_score": health_score,
            "total_tasks": total_tasks,
            "completed_tasks": completed,
        })
