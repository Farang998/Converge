// src/components/ProjectWorkspace/ProjectHeader.jsx
import React from 'react';

export default function ProjectHeader({ project, progressPct, onOpenDetails}) {
  return (
    <header className="pw-header">
      <div className="pw-header-wrapper">
      <div className="pw-header-left">
        <h1 className="pw-title">{project.name}</h1>
        <div className="pw-owner">Owned by {project.owner.name}</div>
      </div>
      <div className="pw-header-center">
        {/* optional: search / breadcrumb */}
      </div>

      <div className="pw-header-right">
        <div className="pw-header-actions">
          <button className="btn ghost" onClick={onOpenDetails}>
            Update Details
          </button>
          <button className="btn primary">Settings</button>
        </div>
      </div>
      </div>
    </header>
  );
}
