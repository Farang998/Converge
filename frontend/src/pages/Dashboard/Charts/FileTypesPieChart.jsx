// src/pages/Dashboard/Charts/FileTypesPieChart.jsx
import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

// const COLORS = ["#1a9647ff",  "#059669", "#7bc98aff", "#4ADE80", "#09b87dff", "#63e0b2ff","#64a46bff",  "#CCF3D6"];
const COLORS = [ "#00ab3fff", "#ffcc00ff", "#e66700ff", "#004cc6ff", "#d72121ff", "#8b11d6ff", "#0cc5b0ff", "#dc197bff", "#ff2c4fff", "#afcf0fff" ];
export default function FileTypesPieChart({ data = [] }) {
  // data: [{ type, count }]
  const chartData = (data || []).map((d) => ({ name: d.type, value: d.count }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      return (
        <div style={{ background: "rgba(0,0,0,0.85)", padding: 8, borderRadius: 6, color: "#fff", fontSize: 13 }}>
          <div style={{ fontWeight: 600 }}>{p.payload.name}</div>
          <div>Files: {p.payload.value}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            outerRadius={90}
            innerRadius={40}
            label={(entry) => `${entry.name} (${entry.value})`}
          >
            {chartData.map((_, i) => (
              <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
