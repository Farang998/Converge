// src/pages/Dashboard/Charts/TaskDelayHeatmap.jsx
import React, { useMemo } from "react";
import "./heatmap.css";

/**
 * data: [{ date: "YYYY-MM-DD", count: N }, ...]  (range expected: ~90 days)
 * This component renders a simple calendar-style grid of squares for the provided days.
 */

export default function TaskDelayHeatmap({ data = [] }) {
  // normalize to map by ISO date
  const map = useMemo(() => {
    const m = {};
    (data || []).forEach((d) => (m[d.date] = d.count));
    return m;
  }, [data]);

  // render order is as provided; simple grid of weeks
  const days = Object.keys(map);
  if (!days.length) return <div>No data for heatmap</div>;

  // Build display rows of 7 days per row (most recent at end)
  const sorted = days.slice().sort();
  const cells = sorted.map((d) => ({ date: d, count: map[d] || 0 }));

  // chunk into weeks (7)
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  // color scaling helper
  const max = Math.max(...cells.map((c) => c.count), 1);
  const colorFor = (n) => {
    // soft blue scale (lighter -> darker)
    const intensity = Math.round((n / max) * 220); // 0..220
    return `rgba(59,130,246,${0.18 + (n / max) * 0.72})`;
  };

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <div className="heatmap-grid">
        {rows.map((row, i) => (
          <div key={i} className="heatmap-row">
            {row.map((cell) => (
              <div
                key={cell.date}
                className="heatmap-cell"
                title={`${cell.date} — ${cell.count} overdue`}
                style={{
                  background: cell.count ? colorFor(cell.count) : "rgba(0,0,0,0.03)",
                  borderRadius: 6,
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: cell.count ? "#fff" : "#6b7280",
                }}
              >
                {cell.count ? cell.count : ""}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
