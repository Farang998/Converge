// src/pages/Dashboard/Charts/WorkflowTimelineChart.jsx
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export default function WorkflowTimelineChart({ createdSeries = [], dueSeries = [] }) {
  // merge by date
  const map = {};
  createdSeries.forEach((d) => (map[d.date] = { date: d.date, created: d.count || 0, due: 0 }));
  dueSeries.forEach((d) => {
    map[d.date] = map[d.date] || { date: d.date, created: 0, due: 0 };
    map[d.date].due = d.count || 0;
  });
  const chartData = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));

  const themeBlue = "#3b82f6";
  const secondary = "#64748b";

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend wrapperStyle={{ marginBottom: -15 }} />
          <Line type="monotone" dataKey="created" name="Created" stroke={themeBlue} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="due" name="Due" stroke={secondary} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
