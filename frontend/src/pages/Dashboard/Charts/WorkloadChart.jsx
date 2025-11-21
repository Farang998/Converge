// src/pages/Dashboard/Charts/WorkloadChart.jsx
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function WorkloadChart({ data = [] }) {
  // data is array of { username, count }
  const chartData = (data || []).map((d) => ({ name: d.username, tasks: d.count }));

  if (!chartData.length) {
    return (
      <div className="chart-card">
        <div className="chart-title">Workload per Member</div>
        <div>No assigned tasks</div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-title">Workload per Member</div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="tasks" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
