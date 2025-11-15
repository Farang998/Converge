import React, { useState, useEffect, useRef } from "react";
import "./dashboard.css";
import {
  FaBell, FaCog, FaUser, FaPlus, FaSearch, 
  FaCalendarAlt, FaChartBar, FaUsers, FaTasks
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {

    const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  const [projects, setProjects] = useState([
    {
      id: 1,
      name: "UI Revamp",
      progress: 70,
      deadline: "2025-11-01",
      description: "Redesigning the main application interface.",
      members: 5,
      showDetails: false,
      tags: ["Design", "Frontend"],
    },
    {
      id: 2,
      name: "AI Chatbot Integration",
      progress: 40,
      deadline: "2025-12-10",
      description: "Integrating chatbot for automated user assistance.",
      members: 3,
      showDetails: false,
      tags: ["AI", "Backend"],
    },
  ]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDetails = (id) => {
    setProjects((prev) =>
      prev.map((proj) =>
        proj.id === id ? { ...proj, showDetails: !proj.showDetails } : proj
      )
    );
  };

  const handleLogout = () => {
     localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Redirect to login page
  navigate('/');
  };

  const username = (localStorage.getItem("username") || "User").toString();


  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-container">
          <div className="brand-section">
            <img src="/logo.png" alt="Converge Logo" className="brand-logo" />
            <div className="brand-text">
              <h1>Converge</h1>
              <span>Collaborate • Deliver • Scale</span>
            </div>
          </div>

          <div className="search-section">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search projects, tasks, members..." 
              className="search-input"
            />
          </div>

          <div className="header-actions">
            <button className="action-btn" title="Settings">
              <FaCog />
            </button>
            <button className="action-btn notification" title="Notifications">
              <FaBell />
              <span className="notification-badge"></span>
            </button>

            <div className="profile-dropdown" ref={profileRef}>
              <button 
                className="profile-trigger"
                onClick={() => setShowProfileMenu(s => !s)}
              >
                <div className="avatar">{username[0].toUpperCase()}</div>
                <span className="username">{username}</span>
              </button>

              {showProfileMenu && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <div className="avatar-large">{username[0].toUpperCase()}</div>
                    <div>
                      <div className="user-name">{username}</div>
                      <div className="user-email">you@company.com</div>
                    </div>
                  </div>
                  
                  <div className="dropdown-content">
                    <button onClick={() => navigate("/profile")}>
                      <FaUser /> Profile
                    </button>
                    <button onClick={() => navigate("/settings")}>
                      <FaCog /> Settings
                    </button>
                    <button onClick={handleLogout} className="logout-btn">
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon project">
              <FaChartBar />
            </div>
            <div className="stat-details">
              <div className="stat-value">15</div>
              <div className="stat-label">Active Projects</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon team">
              <FaUsers />
            </div>
            <div className="stat-details">
              <div className="stat-value">24</div>
              <div className="stat-label">Team Members</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon tasks">
              <FaTasks />
            </div>
            <div className="stat-details">
              <div className="stat-numbers">
                <span className="open">8 Open</span>
                <span className="completed">12 Done</span>
                <span className="overdue">1 Due</span>
              </div>
              <div className="stat-label">Task Status</div>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <section className="projects-section">
            <div className="section-header">
              <div>
                <h2>Projects</h2>
                <p>Active projects and recent progress</p>
              </div>
              <button className="create-button" onClick={() => navigate("/create-project")}>
                <FaPlus /> New Project
              </button>
            </div>

            <div className="projects-grid">
              {projects.map(proj => (
                <article className="project-card" key={proj.id}>
                  <div className="card-header">
                    <h3>{proj.name}</h3>
                    <div className="tags">
                      {proj.tags?.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>

                  <p className="project-description">{proj.description}</p>

                  <div className="project-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{width: `${proj.progress}%`}}
                      ></div>
                    </div>
                    <span className="progress-text">{proj.progress}%</span>
                  </div>

                  <div className="card-footer">
                    <div className="meta-info">
                      <span className="members">
                        <FaUsers /> {proj.members}
                      </span>
                      <span className="deadline">
                        <FaCalendarAlt /> {proj.deadline}
                      </span>
                    </div>
                    <button 
                      className="details-button"
                      onClick={() => toggleDetails(proj.id)}
                    >
                      {proj.showDetails ? 'Hide' : 'Details'}
                    </button>
                  </div>

                  {proj.showDetails && (
                    <div className="details-panel">
                      <p>{proj.description}</p>
                      <div className="detail-meta">
                        <span>Team size: {proj.members}</span>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <aside className="tasks-section">
            <div className="section-header">
              <div>
                <h2>Tasks</h2>
                <p>Quick overview</p>
              </div>
              <button className="create-button compact" onClick={() => navigate("/create-task")}>
                <FaPlus /> Task
              </button>
            </div>

            <div className="task-list">
              <div className="task-item priority-high">
                <div className="task-content">
                  <h4>Audit accessibility</h4>
                  <span className="due-date">Due: 2025-11-05</span>
                </div>
                <span className="priority-badge">High</span>
              </div>

              <div className="task-item priority-medium">
                <div className="task-content">
                  <h4>Setup chatbot endpoints</h4>
                  <span className="due-date">Due: 2025-11-15</span>
                </div>
                <span className="priority-badge">Medium</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}