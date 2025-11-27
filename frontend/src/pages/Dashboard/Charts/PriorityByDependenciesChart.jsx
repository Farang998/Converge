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

export default function PriorityByDependenciesChart({ data }) {
  const themeBlue = "#3b82f6"; // your UI blue shade

  // Ensure data is treated as an array to prevent errors
  const chartData = data || [];
  
  const maxValue = chartData.reduce(
    (max, item) => Math.max(max, item.value || 0),
    0
  );


  const yAxisDomain = [0, maxValue === 0 ? 4 : maxValue * 1.1];

  // === Custom Tooltip (only change requested) ===
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
          <div>Dependents: {payload[0].value}</div>
        </div>
      );
    }
    return null;
  };

  if (!chartData || chartData.length === 0) {
    return <div style={{ padding: 10 }}>No dependency data available.</div>;
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 20, right: 25, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={20} textAnchor="front" />
          
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} domain={yAxisDomain} />

          {/* Use custom tooltip */}
          <Tooltip content={<CustomTooltip />} />

          <Bar dataKey="value" fill={themeBlue} radius={[6, 6, 0, 0]}>
            <LabelList dataKey="value" position="top" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}