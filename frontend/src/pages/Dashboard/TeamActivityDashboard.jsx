// src/pages/Dashboard/TeamActivityDashboard.jsx
import React, { useEffect, useState } from "react";
import api from "../../services/api";
import ActivityTimelineChart from "./Charts/ActivityTimelineChart";
import ActiveContributorsChart from "./Charts/ActiveContributorsChart";
import TaskTouchFrequencyChart from "./Charts/TaskTouchFrequencyChart";
import "./analytics.css";

export default function TeamActivityDashboard({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const resp = await api.get(`projects/dashboard/${projectId}/team-activity/`);
        setData(resp.data);
      } catch (err) {
        console.error("Failed to load team activity", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  if (loading) return <div className="chart-card"><div className="chart-title">Loading team activity...</div></div>;
  if (!data) return <div className="chart-card"><div className="chart-title">No team activity data</div></div>;

  return (
  <div className="analytics-grid" style={{ gap: 18 }}>

    {/* Row 1: Full width timeline */}
    <div className="chart-card" style={{ width: "100%" }}>
      <div className="chart-title">Activity Timeline</div>
      <ActivityTimelineChart data={data.activity_timeline} />
    </div>

    {/* Row 2: Task Touch Frequency | Active Contributors */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, width: "100%" }}>
      <div className="chart-card">
        <div className="chart-title">Task Touch Frequency</div>
        <TaskTouchFrequencyChart data={data.task_touch_frequency} />
      </div>

      <div className="chart-card">
        <div className="chart-title">Active Contributors</div>
        <ActiveContributorsChart data={data.active_contributors} />
      </div>
    </div>

  </div>
    );
}
