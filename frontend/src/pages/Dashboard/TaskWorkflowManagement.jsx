// src/pages/Dashboard/TaskWorkflowManagement.jsx
import React, { useEffect, useState } from "react";
import api from "../../services/api";
import WorkflowTimelineChart from "./Charts/WorkflowTimelineChart";
import TaskDelayHeatmap from "./Charts/TaskDelayHeatmap";
import WorkflowBottlenecksChart from "./Charts/WorkflowBottlenecksChart";
import WorkflowHealthGauge from "./Charts/WorkflowHealthGauge";
import "./analytics.css"; // reuse existing theme

export default function TaskWorkflowManagement({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(
          `projects/dashboard/${projectId}/workflow/`
        );
        setData(data);
      } catch (err) {
        console.error("Failed to load workflow data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  if (loading)
    return (
      <div className="chart-card">
        <div className="chart-title">Loading Workflow...</div>
      </div>
    );

  if (!data)
    return (
      <div className="chart-card">
        <div className="chart-title">No data available</div>
      </div>
    );

  return (
    <div className="analytics-grid" style={{ marginTop: 12 }}>
      {/* ======================================================
          ROW 1 — Timeline (2x width) + Gauge (1x width)
      ======================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 40,
          width: "100%",
        }}
      >
        {/* TIMELINE */}
        <div className="chart-card">
          <div className="chart-title">Workflow Timeline</div>
          <WorkflowTimelineChart
            createdSeries={data.timeline_created}
            dueSeries={data.timeline_due}
          />
        </div>

        {/* HEALTH SCORE */}
        <div className="chart-card">
          <div className="chart-title">Workflow Health Score</div>
          <WorkflowHealthGauge
            score={data.workflow_health_score}
            totals={{
              total: data.total_tasks,
              completed: data.completed_tasks,
            }}
          />
        </div>
      </div>

      {/* ======================================================
          ROW 2 — Heatmap | Bottlenecks
      ======================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          width: "100%",
        }}
      >
        <div className="chart-card">
          <div className="chart-title">Task Delay Heatmap</div>
          <TaskDelayHeatmap data={data.heatmap_overdue} />
        </div>

        <div className="chart-card">
          <div className="chart-title">Workflow Bottlenecks</div>
          <WorkflowBottlenecksChart data={data.bottlenecks} />
        </div>
      </div>
    </div>
  );
}
