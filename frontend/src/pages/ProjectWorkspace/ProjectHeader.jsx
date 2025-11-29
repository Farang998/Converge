// src/components/ProjectWorkspace/ProjectHeader.jsx
import React from 'react';
import { useNavigate } from "react-router-dom";

export default function ProjectHeader({ project, progressPct, onOpenDetails}) {
  const navigate = useNavigate();
  return (
    <header className="pw-header">
      <div className="pw-header-wrapper">
      <div className="pw-header-left">
        <img src="/logo.png" alt="Converge Logo" className="nav-logo" />
        <div className="pw-header-info">
        <h2 className="pw-title">{project.name}</h2>
        <div className="pw-owner">Managed by {project.owner?.name}</div>
      </div>
      </div>
      

      <div className="pw-header-right">
        <div className="pw-header-actions">
          <button className="btn ghost" onClick={onOpenDetails}>
            Update Details
          </button>
          <button onClick={() => navigate("/dashboard")} className="pw-back-btn">← Back</button>
        </div>
      </div>
      </div>
    </header>
  );
}
