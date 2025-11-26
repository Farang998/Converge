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

    def get_assignee(self, task):
        """
        Safely extract the assignee name when assigned_to may be:
        - a single User object
        - a BaseList / list of users or ids
        - None
        """
        a = task.assigned_to

        if not a:
            return "Unassigned"

        # Case 1: Single user object (ReferenceField)
        if hasattr(a, "username") or hasattr(a, "name"):
            return getattr(a, "username", None) or getattr(a, "name", None) or "Unassigned"

        # Case 2: List of users/ids
        if isinstance(a, (list, tuple)):
            if len(a) == 0:
                return "Unassigned"

            first = a[0]

            # element is a User object
            if hasattr(first, "username") or hasattr(first, "name"):
                return getattr(first, "username", None) or getattr(first, "name", None) or "Unassigned"

            # element is id/string
            return str(first)

        # fallback
        return "Unassigned"

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
            assignee = self.get_assignee(t)
            tasks_per_member[assignee] = tasks_per_member.get(assignee, 0) + 1

        workload_data = [
            {"name": name, "value": count}
            for name, count in tasks_per_member.items()
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
    
class ProjectTeamActivityView(APIView):
    """
    Returns:
      - activity_timeline: [{ date, created, due }]
      - active_contributors: [{ name, value }]
      - task_touch_frequency: [{ name, value }]
    """

    def get(self, request, project_id):

        # --- AUTH ---
        try:
            user = authenticate_user_from_request(request)
        except AuthenticationFailed:
            return Response({"error": "Authentication failed"}, 401)

        # --- PROJECT ---
        try:
            project = Project.objects.get(id=project_id)
        except DoesNotExist:
            return Response({"error": "Project not found"}, 404)

        # --- CHECK MEMBERSHIP ---
        user_id = str(user.id)
        is_leader = (project.team_leader == user)
        is_member = any(m.get("user") == user_id and m.get("accepted") for m in project.team_members)

        if not (is_leader or is_member):
            return Response({"error": "Not authorized"}, 403)

        # --- FETCH TASKS ---
        tasks = list(Task.objects.filter(project=project))

        # ----------------------------------------------------------------------
        # 1) ACTIVITY TIMELINE (created + due per day)
        # ----------------------------------------------------------------------
        def day_key(dt):
            """Convert any datetime (naive or aware) into YYYY-MM-DD (UTC)."""
            if not dt:
                return None
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).date().isoformat()

        timeline_map = {}  # { "YYYY-MM-DD": {created: x, due: y} }

        for t in tasks:
            # created
            dk = day_key(getattr(t, "created_at", None))
            if dk:
                timeline_map.setdefault(dk, {"created": 0, "due": 0})
                timeline_map[dk]["created"] += 1

            # due
            dk = day_key(getattr(t, "due_date", None))
            if dk:
                timeline_map.setdefault(dk, {"created": 0, "due": 0})
                timeline_map[dk]["due"] += 1

        activity_timeline = [
            {
                "date": day,
                "created": timeline_map[day]["created"],
                "due": timeline_map[day]["due"]
            }
            for day in sorted(timeline_map.keys())
        ]

        # ----------------------------------------------------------------------
        # 2) ACTIVE CONTRIBUTORS
        # scoring rule:
        #   assigned_to => +1
        #   completed (assigned_to) => +1
        # ----------------------------------------------------------------------
        contrib_scores = {}

        for t in tasks:
            assigned = getattr(t, "assigned_to", None)

            if assigned:
                username = getattr(assigned, "username", None) or getattr(assigned, "name", None)
                if username:
                    contrib_scores[username] = contrib_scores.get(username, 0) + 1

            if t.status == "completed" and assigned:
                username = getattr(assigned, "username", None) or getattr(assigned, "name", None)
                if username:
                    contrib_scores[username] = contrib_scores.get(username, 0) + 1

        active_contributors = [
            {"name": name, "value": count}
            for name, count in sorted(contrib_scores.items(), key=lambda x: -x[1])
        ]

        if not active_contributors:
            active_contributors = [{"name": "No contributors", "value": 0}]

        # ----------------------------------------------------------------------
        # 3) TASK TOUCH FREQUENCY
        # count interactions by assigned_to + completion
        # ----------------------------------------------------------------------
        touch_map = {}

        for t in tasks:
            assigned = getattr(t, "assigned_to", None)

            if assigned:
                username = getattr(assigned, "username", None) or getattr(assigned, "name", None)
                if username:
                    touch_map[username] = touch_map.get(username, 0) + 1

            if t.status == "completed" and assigned:
                username = getattr(assigned, "username", None) or getattr(assigned, "name", None)
                if username:
                    touch_map[username] = touch_map.get(username, 0) + 1

        task_touch_frequency = [
            {"name": name, "value": count}
            for name, count in sorted(touch_map.items(), key=lambda x: -x[1])
        ]

        if not task_touch_frequency:
            task_touch_frequency = [{"name": "No activity", "value": 0}]

        # ----------------------------------------------------------------------
        # FINAL RESPONSE
        # ----------------------------------------------------------------------
        return Response({
            "activity_timeline": activity_timeline,
            "active_contributors": active_contributors,
            "task_touch_frequency": task_touch_frequency,
        })

class ProjectFileAnalyticsView(APIView):
    """
    Returns file analytics for a given project:
      - storage_per_file: [{ name, size_mb }]
      - top_uploaders: [{ username, uploads }]
      - file_types: [{ type, count }]
    """
    def get(self, request, project_id):
        # auth
        try:
            user = authenticate_user_from_request(request)
        except AuthenticationFailed:
            return Response({"error": "Authentication failed"}, status=401)

        # project exists?
        try:
            project = Project.objects.get(id=project_id)
        except DoesNotExist:
            return Response({"error": "Project not found"}, status=404)

        # authorization: only leader or accepted member
        user_id = str(user.id)
        is_leader = project.team_leader == user
        is_member = any(m.get("user") == user_id and m.get("accepted") for m in project.team_members)
        if not (is_leader or is_member):
            return Response({"error": "Not authorized"}, status=403)

        # fetch files for this project
        try:
            files = list(File.objects.filter(project=project))
        except Exception:
            files = []

        # storage per file => name + size in MB
        storage_per_file = []
        for f in files:
            # try multiple possible attributes
            fname = getattr(f, "name", None) or getattr(f, "filename", None) or getattr(f, "file_name", None) or getattr(f, "s3_key", None) or "unknown"
            # size attribute may be stored as 'size' or 'file_size'
            size_bytes = getattr(f, "size", None) or getattr(f, "file_size", None) or getattr(f, "size_bytes", None) or 0
            try:
                size_bytes = int(size_bytes or 0)
            except Exception:
                size_bytes = 0
            size_mb = round(size_bytes / (1024 * 1024), 2)
            storage_per_file.append({"name": fname, "size_mb": size_mb})

        # top uploaders => count by uploader
        uploader_counts = {}
        for f in files:
            uploader = None
            # possible uploader fields: uploaded_by, uploader, created_by
            uploader_obj = getattr(f, "uploaded_by", None) or getattr(f, "uploader", None) or getattr(f, "created_by", None)
            if uploader_obj:
                # if uploader is a ReferenceField to User:
                try:
                    uname = getattr(uploader_obj, "username", None) or getattr(uploader_obj, "name", None) or str(uploader_obj.id)
                except Exception:
                    # if uploader is just an id or string
                    uname = str(uploader_obj)
            else:
                uname = "Unknown"

            uploader_counts[uname] = uploader_counts.get(uname, 0) + 1

        top_uploaders = [{"username": k, "uploads": v} for k, v in uploader_counts.items()]
        # sort descending by uploads
        top_uploaders = sorted(top_uploaders, key=lambda x: x["uploads"], reverse=True)

        # file types => by extension count
        type_counts = {}
        for f in files:
            fname = getattr(f, "name", None) or getattr(f, "filename", None) or getattr(f, "file_name", None) or ""
            ext = "unknown"
            if "." in fname:
                ext = fname.rsplit(".", 1)[1].lower()
            else:
                # try to infer from s3_key
                s3k = getattr(f, "s3_key", None) or getattr(f, "key", None) or ""
                if "." in s3k:
                    ext = s3k.rsplit(".", 1)[1].lower()
            type_counts[ext] = type_counts.get(ext, 0) + 1

        file_types = [{"type": k, "count": v} for k, v in type_counts.items()]
        file_types = sorted(file_types, key=lambda x: x["count"], reverse=True)

        # optional: limit items returned to sane amounts (e.g. top 50 files)
        storage_per_file = sorted(storage_per_file, key=lambda x: x["size_mb"], reverse=True)[:100]
        top_uploaders = top_uploaders[:50]
        file_types = file_types[:50]

        return Response({
            "storage_per_file": storage_per_file,
            "top_uploaders": top_uploaders,
            "file_types": file_types
        })