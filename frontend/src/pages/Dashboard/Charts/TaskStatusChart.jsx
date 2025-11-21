// src/pages/Dashboard/Charts/TaskStatusChart.jsx
import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#4CAF50", "#FF9800", "#2196F3", "#F44336", "#9E9E9E"];

export default function TaskStatusChart({ data = {} }) {
  // data is object like { pending: 3, in_progress: 4, completed: 2 }
  const entries = Object.entries(data || {});
  const chartData = entries.map(([key, value]) => ({ name: key, value }));

  if (!chartData.length) {
    return (
      <div className="chart-card">
        <div className="chart-title">Task Status</div>
        <div>No data</div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-title">Task Status</div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={60}
            label
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
