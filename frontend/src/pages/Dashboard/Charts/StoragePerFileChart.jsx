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
} from "recharts";

export default function StoragePerFileChart({ data = [] }) {
  const chartData = (data || []).map((d) => ({
    name: d.name.length > 28 ? d.name.slice(0, 25) + "..." : d.name,
    size_mb: d.size_mb,
    full_name: d.name,
  }));

  const themeBlue = "#3b82f6";

  // Find the true maximum value in ALL the data
  const maxDataValue = chartData.reduce((max, item) =>
    Math.max(max, item.size_mb || 0), 0
  );

  // Calculate the Y-axis upper limit with padding (1.2 is 20% padding)
  const paddedMax = maxDataValue * 1.2;
  // Use a sensible ceiling for small decimal values to ensure clean axis ticks
  const yAxisMax = paddedMax < 1 ? Math.ceil(paddedMax * 4) / 4 : Math.ceil(paddedMax);

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
          <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" />
          <YAxis
            allowDecimals={true}
            domain={[0, yAxisMax]} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="size_mb" fill={themeBlue} radius={[6,6,0,0]}>
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}