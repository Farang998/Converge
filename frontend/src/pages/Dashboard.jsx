import React from 'react';
import './dashboard.css';
import { logout } from '../services/api';

export default function Dashboard() {
  const username = typeof window !== 'undefined' ? (localStorage.getItem('username') || 'User') : 'User';

  function handleLogout() {
    logout();
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="logo">
          <img src="/logo.png" alt="Converge Logo" />
          <span>Converge</span>
        </div>

        <ul className="menu">
          <li>Dashboard</li>
          <li>Tasks</li>
          <li>Chat</li>
          <li>Files</li>
          <li>Calendar</li>
          <li>Analytics</li>
        </ul>

        <div className="sidebar-bottom">
          <div className="user-info">
            <div className="avatar" id="userAvatar">{username.charAt(0).toUpperCase()}</div>
            <div>
              <p className="username" id="displayUsername">{username}</p>
              <p className="role">member</p>
            </div>
          </div>

          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="main">
        <h1>Converge Dashboard</h1>
        <br />
        <div className="cards">
          <div className="card">Active Tasks <h2>0</h2></div>
          <div className="card">Completed <h2>0</h2></div>
          <div className="card">Team Members <h2>8</h2></div>
          <div className="card">Files Shared <h2>89</h2></div>
        </div>

        <div className="content">
          <div className="card">Recent Tasks<br />No tasks found. Create your first task to get started!</div>
          <div className="card">Project Progress<br />No projects found. Create your first project!</div>
          <div className="card">Recent Files<br />No files shared yet</div>
        </div>
      </div>
    </div>
  );
}
