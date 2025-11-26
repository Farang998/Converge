// src/pages/Dashboard/Charts/ProjectProgressChart.jsx
import React from "react";
import { RadialBarChart, RadialBar, Legend, ResponsiveContainer } from "recharts";

export default function ProjectProgressChart({ progress = 0 }) {
  const data = [{ name: "Complete", value: Math.max(0, Math.min(100, progress)), fill: "#4CAF50" }];

  return (
    <div className="chart-card progress-card">
      <div className="chart-title">Project Progress</div>
      <div style={{ width: "100%", height: 120 }}>
        <ResponsiveContainer>
          <RadialBarChart innerRadius="60%" outerRadius="90%" data={data} startAngle={90} endAngle={-270}>
            <RadialBar minAngle={15} background clockWise dataKey="value" />
            <Legend />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 8, fontSize: 18 }}>{progress}%</div>
    </div>
  );
}
