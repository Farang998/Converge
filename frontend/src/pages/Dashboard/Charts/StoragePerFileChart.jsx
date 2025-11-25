// src/pages/Dashboard/Charts/StoragePerFileChart.jsx
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

export default function StoragePerFileChart({ data = [] }) {
  // data: [{ name, size_mb }]
  const chartData = (data || []).map((d) => ({
    name: d.name.length > 28 ? d.name.slice(0, 25) + "..." : d.name,
    size_mb: d.size_mb,
    full_name: d.name,
  }));

  const themeBlue = "#3b82f6";

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      return (
        <div style={{ background: "rgba(0,0,0,0.85)", padding: 10, borderRadius: 6, color: "#fff", fontSize: 13 }}>
          <div style={{ fontWeight: 600 }}>{p.payload.full_name}</div>
          <div>Size: {p.value} MB</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-25} textAnchor="end" />
          <YAxis allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="size_mb" fill={themeBlue} radius={[6,6,0,0]}>
            <LabelList dataKey="size_mb" position="top" formatter={(v) => `${v}MB`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
