import React, { useState } from "react";
import "./dashboard.css";
import { FaBell, FaCog, FaUser, FaPlus } from "react-icons/fa";
import { logout } from "../../services/api";

export default function Dashboard() {
  const [projects, setProjects] = useState([
    {
      id: 1,
      name: "UI Revamp",
      progress: 70,
      deadline: "2025-11-01",
      description: "Redesigning the main application interface.",
      members: 5,
      showDetails: false,
    },
    {
      id: 2,
      name: "AI Chatbot Integration",
      progress: 40,
      deadline: "2025-12-10",
      description: "Integrating chatbot for automated user assistance.",
      members: 3,
      showDetails: false,
    },
  ]);

  const [tasks, setTasks] = useState([
    { id: 1, name: "Fix Navbar", due: "2025-10-20", priority: "High" },
    { id: 2, name: "Add File Upload", due: "2025-10-25", priority: "Medium" },
    { id: 3, name: "Update Chat UI", due: "2025-10-28", priority: "High" },
  ]);

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const toggleDetails = (id) => {
    setProjects(
      projects.map((proj) =>
        proj.id === id ? { ...proj, showDetails: !proj.showDetails } : proj
      )
    );
  };

  const username =
    typeof window !== "undefined"
      ? localStorage.getItem("username") || "User"
      : "User";

  const handleLogout = async () => {
    // If logout() is defined and returns a promise, call it but don't block on it.
    try {
      if (typeof logout === "function") {
        // optionally wait for it: await logout();
        logout().catch(() => {
          /* ignore network errors */
        });
      }
    } catch (err) {
      // ignore if logout import missing / not a function
    }

    // Clear auth data
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("username");
    } catch (e) {
      // ignore in case localStorage is not available
    }

    // Redirect to login page
    window.location.href = "/login";
  };

  return (
    <div className="dashboard-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-left">
          <img src="/logo.png" alt="Converge Logo" className="nav-logo" />
          <h2>Converge</h2>
        </div>

        <div className="navbar-center">
          <input
            type="text"
            placeholder="Search projects, tasks..."
            className="search-bar"
          />
        </div>

        <div className="navbar-right">
          <div className="icon" title="Settings">
            <FaCog />
          </div>
          <div className="icon" title="Notifications">
            <FaBell />
          </div>

          <div className="profile-container">
            <div
              className="icon profile-icon"
              title="Profile"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <FaUser />
            </div>

            {showProfileMenu && (
              <div className="profile-menu">
                <p className="profile-name">{username}</p>
                <ul>
                  <li>View Profile</li>
                  <li>Settings</li>
                  <li>Help & Support</li>
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

      {/* Main content */}
      <div className="main-content">
        {/* Projects Section */}
        <div className="projects-section">
          <div className="section-header">
            <h2>Projects</h2>
            <button
              className="add-btn"
              onClick={() =>
                setProjects([
                  ...projects,
                  {
                    id: projects.length + 1,
                    name: "New Project",
                    progress: 0,
                    deadline: "2025-12-31",
                    description: "Newly created project.",
                    members: 1,
                    showDetails: false,
                  },
                ])
              }
            >
              <FaPlus /> New Project
            </button>
          </div>

          <div className="projects-list">
            {projects.map((proj) => (
              <div className="project-card" key={proj.id}>
                <h3>{proj.name}</h3>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${proj.progress}%` }}
                  ></div>
                </div>
                <div className="project-footer">
                  <p className="deadline">
                    Deadline: <span>{proj.deadline}</span>
                  </p>
                  <button
                    className="details-btn"
                    onClick={() => toggleDetails(proj.id)}
                  >
                    {proj.showDetails ? "Hide" : "Details"}
                  </button>
                </div>

                {proj.showDetails && (
                  <div className="project-details">
                    <p>{proj.description}</p>
                    <p>Team Members: {proj.members}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tasks Section */}
        <div className="tasks-section">
          <div className="section-header">
            <h2>Tasks</h2>
            <button
              className="add-btn"
              onClick={() =>
                setTasks([
                  ...tasks,
                  {
                    id: tasks.length + 1,
                    name: "New Task",
                    due: "2025-12-31",
                    priority: "Low",
                  },
                ])
              }
            >
              <FaPlus /> Create
            </button>
          </div>

          <div className="task-summary">
            <div className="task-box">
              <h3>{tasks.length}</h3>
              <p>Active Tasks</p>
            </div>
            <div className="task-box completed">
              <h3>1</h3>
              <p>Completed</p>
            </div>
          </div>

          <div className="tasks-list">
            {tasks.map((task) => (
              <div className="task-card" key={task.id}>
                <div className="task-header">
                  <h4>{task.name}</h4>
                  <span className={`priority ${task.priority.toLowerCase()}`}>
                    {task.priority}
                  </span>
                </div>
                <p className="due">Due: {task.due}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
