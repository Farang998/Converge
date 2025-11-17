// src/components/ProjectWorkspace/RightPanel.jsx
import React from 'react';

export default function RightPanel({ project, members = [], selectedTask }) {
  return (
    <div className="right-panel">
      <div className="card">
        <h4>Members</h4>
        <ul className="members-list">
          {members.map(m => <li key={m.id}>{m.name}</li>)}
        </ul>
      </div>

      <div className="card mt">
        <h4>Selected task</h4>
        {selectedTask ? (
          <div>
            <div className="task-title">{selectedTask.title}</div>
            <div className="muted">Status: {selectedTask.status}</div>
          </div>
        ) : <div className="muted">No task selected</div>}
      </div>
    </div>
  );
}
