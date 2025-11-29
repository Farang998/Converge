// src/components/ProjectWorkspace/OverviewView.jsx
import React from 'react';

export default function OverviewView({ project, tasks, files, activity, onCreateTask }) {
  return (
    <main className="view-grid">
      <div className="view-content"></div>
    <div className="view-card">
      <section className="card">
        <h2>Summary</h2>
        <div className="summary-body"> 
          <div className="summary-desc"> 
            <h3 style={{ marginBottom: '4px' }}>Description</h3>
            <p className="description-text">{project.description}</p>
          </div>
          <div className="kpi-row">
            <div className="kpi">
              <div className="kpi-title">Tasks</div>
              <div className="kpi-value">{tasks.length}</div>
            </div>
            <div className="kpi">
              <div className="kpi-title">Files</div>
              <div className="kpi-value">{files.length}</div>
            </div>
            <div className="kpi">
              <div className="kpi-title">Members</div>
              <div className="kpi-value">{project.members.length}</div>
            </div>
          </div>
        </div>
      </section>

      
    </div>
  </main>
  );
}