import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./analytics.css";
import "./charts.css";
import TaskStatusChart from "./Charts/TaskStatusChart";
import PriorityChart from "./Charts/PriorityChart";
import WorkloadChart from "./Charts/WorkloadChart";
import ProjectProgressChart from "./Charts/ProjectProgressChart";

export default function ProjectAnalytics() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`projects/dashboard/${projectId}/overview/`);
        setOverview(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h2 className="analytics-title">📊 Project Analytics</h2>

        <div className="analytics-actions">
          <button onClick={() => navigate(-1)}>← Back</button>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      </div>

      {loading && <p>Loading analytics...</p>}

      {!loading && overview && (
        <div className="analytics-grid">

          {/* LEFT SIDE */}
          <div>
            <div className="chart-card">
              <ProjectProgressChart progress={overview.project_progress} />
            </div>

            <div className="chart-card" style={{ marginTop: 16 }}>
              <div className="chart-title">Upcoming Deadlines</div>

              {overview.upcoming_deadlines?.length ? (
                <table className="upcoming-table">
                  <thead>
                    <tr><th>Task</th><th>Due</th></tr>
                  </thead>
                  <tbody>
                    {overview.upcoming_deadlines.map((t) => (
                      <tr key={t.id}>
                        <td>{t.name}</td>
                        <td>{t.due ? new Date(t.due).toLocaleDateString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No upcoming deadlines.</p>
              )}
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="charts-grid"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div className="chart-card">
              <div className="chart-title">Task Status</div>
              <TaskStatusChart data={overview.task_status_counts} />
            </div>

            <div className="chart-card">
              <div className="chart-title">Task Priority</div>
              <PriorityChart data={overview.priority_counts} />
            </div>

            <div className="chart-card">
              <div className="chart-title">Workload</div>
              <WorkloadChart data={overview.tasks_per_member} />
            </div>

            <div className="chart-card">
              <div className="chart-title">Totals</div>
              <p>Total tasks: <strong>{overview.total_tasks}</strong></p>
              <p>Completed: <strong>{overview.completed_tasks}</strong></p>
            </div>

            <div className="chart-card" style={{ gridColumn: "1 / span 2" }}>
              <div className="chart-title">Recent Activity</div>
              <div className="recent-activity">
                {overview.recent_activity?.length ? (
                  overview.recent_activity.map((act, i) => (
                    <div className="recent-item" key={i}>
                      <div>{act.message}</div>
                      <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                        {new Date(act.time).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No recent activity.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
