// src/components/ProjectWorkspace/StatusStrip.jsx
import React from 'react';

export default function StatusStrip({ progress, nextMilestone, lastActivity }) {
  const milestoneTitle = nextMilestone ? `Next milestone: ${nextMilestone.title}` : 'No milestone set';
  const activityText = lastActivity ? `Last activity: ${lastActivity.time}` : 'No recent activity';
  return (
    <div className="pw-status-strip">
      
      <div className="progress-container">
        <span style={{color: 'var(--primary-700)', fontWeight: 600}}>Progress:</span>
        <div className="progress-bar-wrap">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }} 
            title={`${progress}% Complete`}
          ></div>
        </div>
        <div className="progress-label">{progress}%</div>
      </div>

      <div>Next milestone: <strong>{nextMilestone ? nextMilestone.title : '—'}</strong></div>
      <div>Last activity: <strong>{lastActivity ? new Date(lastActivity.time).toLocaleString() : '—'}</strong></div>
    </div>
  );
}
