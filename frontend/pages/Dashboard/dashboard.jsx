import React, { useState, useEffect, useRef } from "react";
import "./dashboard.css";
import {
  FaBell,
  FaCog,
  FaUser,
  FaPlus,
  FaSearch,
  FaCalendarAlt,
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
    localStorage.removeItem("username");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const username = (localStorage.getItem("username") || "User").toString();

  return (
    <div className="dashboard-page enhanced">
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="navbar-left">
          <img src="/logo.png" alt="Converge Logo" className="nav-logo" />
          <div className="brand">
            <h2>Converge</h2>
            <span className="tagline">Collaborate • Deliver • Scale</span>
          </div>
        </div>

        <div className="navbar-center">
          <div className="search-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search projects, tasks..."
              className="search-bar"
            />
          </div>
        </div>

        <div className="navbar-right">
          <div className="icon" title="Settings">
            <FaCog />
          </div>

          <div className="icon notification" title="Notifications">
            <FaBell />
            <span className="notif-dot" />
          </div>

          <div className="profile-container" ref={profileRef}>
            <button
              className="profile-button"
              onClick={() => setShowProfileMenu((s) => !s)}
              title="Profile"
            >
              <div className="avatar">
                <FaUser />
              </div>
            </button>

            {showProfileMenu && (
              <div className="profile-menu">
                <div className="profile-head">
                  <div className="avatar large">
                    <FaUser />
                  </div>
                  <div className="meta">
                    <div className="name">{username}</div>
                    <div className="email">you@company.com</div>
                  </div>
                </div>

                <ul>
                  <li
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/profile");
                    }}
                  >
                    View Profile
                  </li>
                  <li
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/settings");
                    }}
                  >
                    Settings
                  </li>
                  <li
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/help");
                    }}
                  >
                    Help & Support
                  </li>
                  <hr />
                  <li onClick={handleLogout} className="logout">
                    Logout
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content container-grid">
        {/* Left Section: Projects */}
        <div className="projects-section">
          <div className="section-header">
            <div>
              <h2>Projects</h2>
              <p className="section-sub">Active projects and recent progress</p>
            </div>

            <button
              className="add-btn main-add"
              onClick={() => navigate("/create-project")}
            >
              <FaPlus /> New Project
            </button>
          </div>

          <div className="projects-grid">
            {projects.map((proj) => (
              <div className="project-card" key={proj.id}>
                <div className="card-head">
                  <div className="title">
                    <h3>{proj.name}</h3>
                    <div className="badges">
                      {proj.tags?.map((t) => (
                        <span className="tag" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="card-actions">
                    <div className="muted small">{proj.members} members</div>
                  </div>
                </div>

                <div className="progress-row">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                  <div className="percent">{proj.progress}%</div>
                </div>

                <div className="meta-row">
                  <div className="deadline">
                    <FaCalendarAlt /> <span>Due {proj.deadline}</span>
                  </div>
                  <div className="actions">
                    <button
                      className="details-btn outline"
                      onClick={() => toggleDetails(proj.id)}
                    >
                      {proj.showDetails ? "Hide" : "Details"}
                    </button>
                  </div>
                </div>

                {proj.showDetails && (
                  <div className="project-details">
                    <p className="desc">{proj.description}</p>
                    <div className="detail-meta">
                      <span>Team members: {proj.members}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Section: Tasks */}
        <aside className="tasks-section">
          <div className="section-header">
            <div>
              <h2>Tasks</h2>
              <p className="section-sub">Quick overview</p>
            </div>
            <button className="add-btn" onClick={() => navigate("/create-task")}>
              <FaPlus /> Create Task
            </button>
          </div>

          <div className="task-summary">
            <div className="task-box">
              <div className="muted">Open</div>
              <div className="big">8</div>
            </div>
            <div className="task-box completed">
              <div className="muted">Completed</div>
              <div className="big">12</div>
            </div>
            <div className="task-box overdue">
              <div className="muted">Overdue</div>
              <div className="big">1</div>
            </div>
          </div>

          <div className="task-list">
            <div className="task-card">
              <div className="task-header">
                <h4>Audit accessibility</h4>
                <div className="priority high">High</div>
              </div>
              <div className="due">Due: 2025-11-05</div>
            </div>

            <div className="task-card">
              <div className="task-header">
                <h4>Setup chatbot endpoints</h4>
                <div className="priority medium">Medium</div>
              </div>
              <div className="due">Due: 2025-11-15</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
