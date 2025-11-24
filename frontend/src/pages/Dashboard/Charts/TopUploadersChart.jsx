// src/pages/Dashboard/Charts/TopUploadersChart.jsx
import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";

export default function TopUploadersChart({ data = [] }) {
  // data: [{ username, uploads }]
  const chartData = (data || []).map((d) => ({ name: d.username, uploads: d.uploads }));

  const themeBlue = "#3b82f6";

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "rgba(0,0,0,0.85)", padding: 8, borderRadius: 6, color: "#fff", fontSize: 13 }}>
          <div style={{ fontWeight: 600 }}>{payload[0].payload.name}</div>
          <div>Uploads: {payload[0].value}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="uploads" fill={themeBlue} radius={[6,6,0,0]}>
            <LabelList dataKey="uploads" position="top" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
