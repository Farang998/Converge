// src/components/ProjectWorkspace/OverviewView.jsx
import React from 'react';
import ActivityView from './ActivityView';

export default function OverviewView({ project, tasks, files, activity, onCreateTask }) {
  return (
    <main className="view-grid">
      <div className="view-content"></div>
    <div className="view-card">
      <section className="card">
        <h2>Project Summary</h2>
        <p className="muted">{project.description}</p>

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
      </section>

      <section className="card mt">
        <h3>Recent activity</h3>
        <ActivityView activity={activity.slice(0, 5)} />
      </section>
      
    </div>
  </main>
  );
}
