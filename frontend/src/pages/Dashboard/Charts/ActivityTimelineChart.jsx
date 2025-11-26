// src/pages/Dashboard/Charts/ActivityTimelineChart.jsx
import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export default function ActivityTimelineChart({ data = [] }) {
  // data: [ { date: "YYYY-MM-DD", created: n, due: m } ]
  const themeBlue = "#3b82f6";
  const secondary = "#64748b";

  // if no data, show small placeholder
  if (!data || !data.length) {
    return <div style={{ padding: 10 }}>No timeline data to display.</div>;
  }

  // Use margin.bottom to leave space for rotated labels
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="created" name="Created" stroke={themeBlue} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="due" name="Due" stroke={secondary} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
