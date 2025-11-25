// src/components/ProjectWorkspace/ProjectNav.jsx
import React, { useState } from 'react';
import { FaHome, FaTasks, FaFileAlt, FaClock, FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

function NavItem({ label, icon, active, onClick, collapsed }) {
  return (
    <button
      className={`nav-item ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="nav-icon">{icon}</span>
      {!collapsed && <span className="nav-label">{label}</span>}
    </button>
  );
}

export default function ProjectNav({ active, setActive, project }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav className={`pw-nav ${collapsed ? 'collapsed' : ''}`} aria-label="Project navigation">
      
      <button className="collapse-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
      </button>

      {!collapsed && <div className="nav-section">Project</div>}

      <NavItem
        label="Overview"
        icon={<FaHome />}
        active={active === 'overview'}
        onClick={() => setActive('overview')}
        collapsed={collapsed}
      />

      <NavItem
        label="Tasks"
        icon={<FaTasks />}
        active={active === 'tasks'}
        onClick={() => setActive('tasks')}
        collapsed={collapsed}
      />

      <NavItem
        label="Files"
        icon={<FaFileAlt />}
        active={active === 'files'}
        onClick={() => setActive('files')}
        collapsed={collapsed}
      />

      <NavItem
        label="Timeline"
        icon={<FaClock />}
        active={active === 'timeline'}
        onClick={() => setActive('timeline')}
        collapsed={collapsed}
      />

      <NavItem
        label="Calendar"
        icon={<FaCalendarAlt />}
        active={active === 'calendar'}
        onClick={() => setActive('calendar')}
        collapsed={collapsed}
      />

      {!collapsed && (
        <div className="nav-footer">
          Members: {project.members.length}
        </div>
      )}
    </nav>
  );
}
