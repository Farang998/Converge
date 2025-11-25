// src/pages/Dashboard/Charts/WorkflowHealthGauge.jsx
import React from "react";
import "./gauge.css";

/**
 * Simple gauge: renders a circular SVG with filled arc proportional to score.
 * Keep styling soft to match theme.
 */

export default function WorkflowHealthGauge({ score = 100, totals = {} }) {
  const normalized = Math.max(0, Math.min(100, Number(score || 0)));
  const radius = 70;
  const stroke = 12;
  const center = radius + stroke;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (normalized / 100) * circ;
  const color = normalized >= 75 ? "#109c19ff" : normalized >= 45 ? "#ffa600ff" : "#e00707ff";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg width={center * 2} height={center * 2}>
        <g transform={`translate(${center},${center}) rotate(-90)`}>
          <circle r={radius} cx={0} cy={0} stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} fill="transparent" />
          <circle r={radius} cx={0} cy={0} stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="transparent" strokeDasharray={circ} strokeDashoffset={offset} />
        </g>
      </svg>

      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{normalized}%</div>
        <div style={{ color: "#475569", marginTop: 6 }}>
          {totals.completed || 0} / {totals.total || 0} completed
        </div>
      </div>
    </div>
  );
}
