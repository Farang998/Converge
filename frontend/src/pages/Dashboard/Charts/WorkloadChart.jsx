import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts";

export default function WorkloadChart({ data = [] }) {
  // Convert backend format → recharts format
  const chartData = (data || []).map((d) => ({
    name: d.name || "Unassigned",
    value: d.value || 0,
  }));

  const themeBlue = "#3b82f6";

  const maxValue = chartData.reduce(
    (max, item) => Math.max(max, item.value || 0),
    0
  );
  const yAxisDomain = [0, maxValue === 0 ? 5 : maxValue * 1.1];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "rgba(0,0,0,0.85)",
            padding: "8px 12px",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "13px",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <div><strong>{label}</strong></div>
          <div>tasks: {payload[0].value}</div>
        </div>
      );
    }
    return null;
  };
  
  if (!chartData || chartData.length === 0) {
      return <div style={{ padding: 10 }}>No workload data available.</div>;
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 20, right: 25, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />

          <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={20} textAnchor="front" />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} domain={yAxisDomain} />

          <Tooltip content={<CustomTooltip />} />

          <Bar dataKey="value" fill={themeBlue} radius={[6, 6, 0, 0]}>
            {/* bar labels on top */}
            <LabelList dataKey="value" position="top" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}