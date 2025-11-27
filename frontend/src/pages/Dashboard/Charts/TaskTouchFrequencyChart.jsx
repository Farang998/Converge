// src/pages/Dashboard/Charts/TaskTouchFrequencyChart.jsx
import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList } from "recharts";

export default function TaskTouchFrequencyChart({ data = [] }) {
  const themeBlue = "#3b82f6";

  const chartData = (data || []).map(d => ({
    name: d.name,
    value: d.value,
  }));

  const maxValue = chartData.reduce(
    (max, item) => Math.max(max, item.value || 0),
    0
  );
  const yAxisDomain = [0, maxValue === 0 ? 4 : maxValue * 1.1];


  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "#ffffff",
            padding: "6px 10px",
            border: "1px solid #ddd",
            borderRadius: 6,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
          <p style={{ margin: 0 }}>frequency: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  if (!chartData.length) {
    return <div style={{ padding: 10 }}>No touch frequency data.</div>;
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis allowDecimals={false} domain={yAxisDomain} />

          {/* Use Custom Tooltip */}
          <Tooltip content={<CustomTooltip />} />

          <Bar dataKey="value" fill={themeBlue} radius={[6, 6, 0, 0]}>
            <LabelList dataKey="value" position="top" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}