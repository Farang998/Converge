// src/components/ProjectWorkspace/ActivityView.jsx
import React from 'react';

export default function ActivityView({ activity = [] }) {
  if (!activity.length) return <div className="muted">No activity yet.</div>;
  return (
    <main className="view-grid">
      <div className="view-content"></div>
    <div className="view-card">
      <h3>Activity feed</h3>
      <ul className="activity-list">
        {activity.map(a => (
          <li key={a.id} className="activity-item">
            <div>{a.text}</div>
            <div className="muted" style={{ marginTop: 6 }}>{new Date(a.time).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
    </main>
  );
}
