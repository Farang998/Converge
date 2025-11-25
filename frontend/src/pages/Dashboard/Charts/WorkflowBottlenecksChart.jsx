// src/pages/Dashboard/Charts/WorkflowBottlenecksChart.jsx
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

export default function WorkflowBottlenecksChart({ data = [] }) {
  // data: [{ id, name, stuck_days, status }]
  const chartData = (data || []).map((d) => ({
    name: d.name.length > 24 ? d.name.slice(0, 21) + "..." : d.name,
    stuck_days: d.stuck_days,
    status: d.status || "Unknown",
  }));

  const themeBlue = "#3b82f6";

  // --- Custom Tooltip ---
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload; // full row entry

      return (
        <div
          style={{
            background: "rgba(0,0,0,0.85)",
            padding: "10px 14px",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "13px",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <div><strong>{label}</strong></div>
          <div>Stuck Days: {item.stuck_days}</div>
          <div>Bottleneck: {item.status}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            angle={-20}
            textAnchor="end"
          />
          <YAxis allowDecimals={false} />

          <Tooltip content={<CustomTooltip />} />

          <Bar dataKey="stuck_days" fill={themeBlue} radius={[6, 6, 0, 0]}>
            <LabelList dataKey="stuck_days" position="top" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
