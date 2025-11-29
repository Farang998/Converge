// src/pages/Dashboard/Charts/TaskDelayHeatmap.jsx
import React, { useMemo } from "react";
import "./heatmap.css";

/**
 * data: [{ date: "YYYY-MM-DD", count: N }, ...]
 * Horizontal GitHub-style heatmap:
 * - 7 rows = Sun → Sat
 * - Columns = weeks (scroll horizontally)
 */

export default function TaskDelayHeatmap({ data = [] }) {
  // normalize to map by ISO date
  const map = useMemo(() => {
    const m = {};
    (data || []).forEach((d) => (m[d.date] = d.count));
    return m;
  }, [data]);

  const days = Object.keys(map);
  if (!days.length) return <div>No data for heatmap</div>;

  // sort dates chronologically
  const sorted = days.slice().sort();

  // --- Build 7 weekday rows (Sun to Sat) ---
  const weekdayRows = [...Array(7)].map(() => []);

  sorted.forEach((d) => {
    const dayIndex = new Date(d).getDay(); // 0 = Sunday
    weekdayRows[dayIndex].push({ date: d, count: map[d] || 0 });
  });

  // color scaling helper
  const max = Math.max(...sorted.map((d) => map[d] || 0), 1);
  const colorFor = (n) =>
    `rgba(59,130,246,${0.18 + (n / max) * 0.72})`; // blue scale

  return (
    <div style={{ width: "100%", overflowX: "auto", paddingBottom: 8 }}>
      <div className="heatmap-grid">
        {weekdayRows.map((row, i) => (
          <div key={i} className="heatmap-row" style={{ display: "flex" }}>
            {row.map((cell) => (
              <div
                key={cell.date}
                className="heatmap-cell"
                title={`${cell.date} — ${cell.count} overdue`}
                style={{
                  background: cell.count
                    ? colorFor(cell.count)
                    : "rgba(0,0,0,0.03)",
                  borderRadius: 6,
                  width: 26,
                  height: 26,
                  marginRight: 4,
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: cell.count ? "#fff" : "#6b7280",
                }}
              >
                {cell.count || ""}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
