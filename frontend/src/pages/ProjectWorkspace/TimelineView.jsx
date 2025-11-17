// src/components/ProjectWorkspace/TimelineView.jsx
// Creative vertical timeline with nodes and expandable cards.
// This file is lazy-loaded by the main component.
import React, { useState } from 'react';

function MilestoneNode({ m, onExpand }) {
  return (
    <div className={`milestone ${m.state}`} onClick={() => onExpand(m)}>
      <div className="milestone-dot">
        {m.state === 'complete' ? '✓' : m.state === 'in_progress' ? '●' : '○'}
      </div>
      <div className="milestone-body">
        <div className="milestone-title">{m.title}</div>
        <div className="muted">Due: {m.dueDate}</div>
      </div>
      <div className="milestone-pct">
        <div className="pct-bar" style={{ width: `${m.progress}%` }} />
        <div className="pct-label">{m.progress}%</div>
      </div>
    </div>
  );
}

export default function TimelineView({ milestones = [] }) {
  const [expanded, setExpanded] = useState(null);

  function handleExpand(m) {
    setExpanded(prev => (prev && prev.id === m.id ? null : m));
  }

  return (
    <main className="view-grid">
      <div className="view-content"></div>
    <div className="view-card timeline-wrap">
      <h3>Project Timeline</h3>

      <div className="timeline-ribbon">
        {/* simple segmented ribbon: visual of milestones */}
        {milestones.map((m, i) => (
          <div key={m.id} className={`ribbon-seg ${m.state}`} title={`${m.title} (${m.dueDate})`}>
            <div className="ribbon-dot" />
          </div>
        ))}
      </div>

      <div className="timeline-list">
        <div className="spine" aria-hidden />
        <div className="nodes">
          {milestones.map(m => (
            <div key={m.id}>
              <MilestoneNode m={m} onExpand={handleExpand} />
              {expanded && expanded.id === m.id && (
                <div className="milestone-expanded card">
                  <div><strong>{expanded.title}</strong></div>
                  <div className="muted">Due: {expanded.dueDate}</div>
                  <div style={{ marginTop: 8 }}>Description: This milestone covers the main MVP deliverables. (Sample text for UI)</div>
                  <div style={{ marginTop: 8 }}><button className="btn ghost">View tasks</button></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
    </main>
  );
}
