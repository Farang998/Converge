// src/components/ProjectWorkspace/ProjectNav.jsx
import React from 'react';

function NavItem({ label, active, onClick }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

export default function ProjectNav({ active, setActive, project }) {
  return (
    <nav className="pw-nav" aria-label="Project navigation">
      <div className="nav-section">Project</div>
      <NavItem label="Overview" active={active === 'overview'} onClick={() => setActive('overview')} />
      <NavItem label="Tasks" active={active === 'tasks'} onClick={() => setActive('tasks')} />
      <NavItem label="Files" active={active === 'files'} onClick={() => setActive('files')} />
      <NavItem label="Timeline" active={active === 'timeline'} onClick={() => setActive('timeline')} />
      <NavItem label="Calendar" active={active === 'calendar'} onClick={() => setActive('calendar')} />
      <div className="nav-footer">Members: {project.members.length}</div>
    </nav>
  );
}
