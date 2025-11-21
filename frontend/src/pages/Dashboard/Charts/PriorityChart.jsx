// src/pages/Dashboard/Charts/PriorityChart.jsx
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function PriorityChart({ data = {} }) {
  // data is object like { high: 2, medium: 5, low: 1 }
  const categories = ["high", "medium", "low"];
  const chartData = categories.map((k) => ({ priority: k, count: data[k] || 0 }));

  const hasData = chartData.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <div className="chart-card">
        <div className="chart-title">Task Priority</div>
        <div>No priority data</div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-title">Task Priority</div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData}>
          <XAxis dataKey="priority" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
