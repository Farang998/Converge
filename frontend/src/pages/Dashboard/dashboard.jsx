import React, { useEffect, useMemo, useState } from "react";
import "./dashboard.css";
import { FaBell, FaCog, FaUser, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState("");
  const [userRefreshKey, setUserRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const { data } = await api.get("auth/identify-user/");
        if (!active) {
          return;
        }
        if (data?.user) {
          setCurrentUser(data.user);
          setUserError("");
        } else {
          setUserError("Unable to load user profile.");
        }
      } catch (err) {
        if (!active) {
          return;
        }
        if (err?.response?.status === 401) {
          navigate("/login");
          return;
        }
        setUserError(err?.response?.data?.error || "Failed to load user profile.");
      } finally {
        if (active) {
          setLoadingUser(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [navigate, userRefreshKey]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (!currentUser) {
      setProjects([]);
      setSelectedProjectId(null);
      return;
    }

    let mounted = true;

    async function loadProjects() {
      setLoadingProjects(true);
      try {
        const params = debouncedSearch ? { search: debouncedSearch } : {};
        const { data } = await api.get("projects/", { params });
        if (!mounted) return;

        const formatted = (data || []).map((project) => {
          const members = Array.isArray(project?.team_members)
            ? project.team_members.map((member) => ({
                user_id: member.user_id,
                username: member.username || "Unknown",
                accepted: Boolean(member.accepted),
              }))
            : [];

          const acceptedMembersCount =
            members.filter((member) => member.accepted).length + 1; // include leader
          const totalMembers = members.length + 1;
          const isLeader = project?.team_leader?.user_id === currentUser.id;
          const membershipEntry = members.find((member) => member.user_id === currentUser.id);

          let membershipLabel = "Collaborator";
          let membershipDescription = "You have access to this project.";
          let membershipKey = "collaborator";

          if (isLeader) {
            membershipLabel = "Team Leader";
            membershipDescription = "You are leading this project.";
            membershipKey = "leader";
          } else if (membershipEntry) {
            membershipLabel = membershipEntry.accepted ? "Member" : "Invitation Pending";
            membershipDescription = membershipEntry.accepted
              ? "You are an accepted member of this project."
              : "Please accept your invitation to start collaborating.";
            membershipKey = membershipEntry.accepted ? "member" : "pending";
          }

          const createdAt = project?.created_at
            ? new Date(project.created_at).toLocaleDateString()
            : "Not available";

          const detailedMembers = [
            {
              user_id: project?.team_leader?.user_id || "leader",
              username: project?.team_leader?.username || "Leader",
              accepted: true,
              role: "Team Leader",
            },
            ...members.map((member) => ({
              ...member,
              role: member.accepted ? "Member" : "Invited",
            })),
          ];

          return {
            id: project.id,
            name: project.name,
            description: project.description || "No description provided.",
            projectType: project.project_type || "General",
            createdAt,
            acceptedMembers: acceptedMembersCount,
            totalMembers,
            membershipLabel,
            membershipDescription,
            membershipKey,
            teamMembers: detailedMembers,
            showDetails: false,
          };
        });

        setProjects(formatted);
        setSelectedProjectId(null);
      } catch (err) {
        console.error("[dashboard] Failed to load projects", err);
        if (err?.response?.status === 401) {
          navigate("/login");
          return;
        }
        setProjects([]);
        setSelectedProjectId(null);
      } finally {
        if (mounted) {
          setLoadingProjects(false);
        }
      }
    }

    loadProjects();
    return () => {
      mounted = false;
    };
  }, [currentUser, navigate, debouncedSearch]);

  useEffect(() => {
    let mounted = true;

    async function loadNotifications() {
      try {
        const { data } = await api.get('notifications/');
        if (mounted) {
          const unread = (data || []).filter(n => !n.read).length;
          setUnreadNotificationsCount(unread);
        }
      } catch (err) {
        if (mounted) {
          setUnreadNotificationsCount(0);
        }
      }
    }

    if (currentUser) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;

    if (!currentUser || !selectedProjectId) {
      setTasks([]);
      return;
    }

    async function loadTasks() {
      setLoadingTasks(true);
      try {
        const { data } = await api.get("tasks/", {
          params: { project_id: selectedProjectId },
        });
        if (!mounted) return;

        const formatted = (data || []).map((task) => {
          const dueDate = task?.due_date
            ? new Date(task.due_date).toLocaleDateString()
            : "No due date";
          const assignedTo = task?.assigned_to?.username || "Unassigned";
          const status = task?.status || "pending";

          return {
            id: task.id,
            name: task.name,
            due: dueDate,
            status,
            assignedTo,
          };
        });

        setTasks(formatted);
      } catch (err) {
        console.error("[dashboard] Failed to load tasks", err);
        if (err?.response?.status === 401) {
          navigate("/login");
          return;
        }
        if (mounted) {
          setTasks([]);
        }
      } finally {
        if (mounted) {
          setLoadingTasks(false);
        }
      }
    }

    loadTasks();
    return () => {
      mounted = false;
    };
  }, [currentUser, selectedProjectId, navigate]);

  const toggleDetails = (id) => {
    setProjects(
      projects.map((proj) =>
        proj.id === id ? { ...proj, showDetails: !proj.showDetails } : proj
      )
    );
    setSelectedProjectId(id);
  };

  const username = useMemo(() => {
    if (currentUser) {
      const first = currentUser.first_name?.trim();
      if (first) {
        return first;
      }
      return currentUser.username;
    }
    if (typeof window !== "undefined") {
      return localStorage.getItem("username") || "User";
    }
    return "User";
  }, [currentUser]);

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  if (loadingUser) {
    return (
      <div className="dashboard-page loading-state">
        <p>Loading your workspace...</p>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="dashboard-page loading-state">
        <p className="error-text">{userError}</p>
        <button
          className="retry-btn"
          type="button"
          onClick={() => {
            setLoadingUser(true);
            setUserError("");
            setCurrentUser(null);
            setUserRefreshKey((prev) => prev + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  const completedCount = tasks.filter(
    (task) => task.status?.toLowerCase() === "completed"
  ).length;

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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="navbar-right">
          <div className="icon" title="Settings" onClick={() => navigate('/settings')}>
            <FaCog />
          </div>
          <div className="icon notification-icon-container" title="Notifications" onClick={() => navigate('/notifications')}>
            <FaBell />
            {unreadNotificationsCount > 0 && (
              <span className="notification-badge">{unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}</span>
            )}
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
                    Help &amp; Support
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

      {/* Main content */}
      <div className="main-content">
        {/* Projects Section */}
        <div className="projects-section">
          <div className="section-header">
            <h2>Projects</h2>
            <button
              className="add-btn"
              type="button"
              onClick={() => navigate('/projects/create')}
            >
              <FaPlus /> New Project
            </button>
          </div>

          <div className="projects-list">
            {loadingProjects && (
              <div className="project-card info-card">Loading projects...</div>
            )}
            {!loadingProjects && projects.length === 0 && (
              <div className="project-card info-card">
                <p>You are not part of any projects yet.</p>
                <p className="muted">
                  Create a project or accept an invitation to see it here.
                </p>
              </div>
            )}
            {!loadingProjects &&
              projects.map((proj) => (
                <div
                  className={`project-card ${
                    selectedProjectId === proj.id ? "selected" : ""
                  }`}
                  key={proj.id}
                  onClick={() => setSelectedProjectId(proj.id)}
                >
                  <div className="project-card-top">
                    <div>
                      <h3
                        className="project-name"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${proj.id}`);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/projects/${proj.id}`);
                          }
                        }}
                      >
                        {proj.name}
                      </h3>
                      <p className="project-type">{proj.projectType}</p>
                    </div>
                    <span className={`role-chip ${proj.membershipKey}`}>
                      {proj.membershipLabel}
                    </span>
                  </div>

                  <div className="project-meta">
                    <span>
                      <strong>Created:</strong> {proj.createdAt}
                    </span>
                    <span>
                      <strong>Members:</strong> {proj.acceptedMembers} accepted /{" "}
                      {proj.totalMembers} total
                    </span>
                  </div>

                  <div className="project-footer">
                    <p className="members">
                      <strong>Status:</strong>{" "}
                      <span>{proj.membershipDescription}</span>
                    </p>
                    <div className="project-actions">
                      <button
                        className="details-btn"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleDetails(proj.id);
                        }}
                      >
                        {proj.showDetails ? "Hide Details" : "View Details"}
                      </button>
                      <button
                        className="chat-btn"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/chat/${proj.id}`);
                        }}
                        title="Open project chat"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        Chat
                      </button>
                    </div>
                  </div>

                  {proj.showDetails && (
                    <div className="project-details">
                      <p>{proj.description}</p>
                      <h4>Team</h4>
                      <ul className="member-list">
                        {proj.teamMembers.map((member) => (
                          <li key={`${member.user_id}-${member.role}`}>
                            <span>{member.username}</span>
                            <span
                              className={`badge ${member.accepted ? "accepted" : "pending"}`}
                            >
                              {member.role}
                            </span>
                          </li>
                        ))}
                      </ul>
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
          </div>

          <div className="task-summary">
            <div className="task-box">
              <h3>{tasks.length}</h3>
              <p>Active Tasks</p>
            </div>
            <div className="task-box completed">
              <h3>{completedCount}</h3>
              <p>Completed</p>
            </div>
          </div>

          <div className="tasks-list">
            {loadingTasks && <div className="task-card">Loading tasks...</div>}
            {!loadingTasks && tasks.length === 0 && (
              <div className="task-card">No tasks found for this project.</div>
            )}
            {!loadingTasks &&
              tasks.map((task) => {
                const normalizedStatus = task.status || "pending";
                const statusLabel = normalizedStatus
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (ch) => ch.toUpperCase());
                const statusClass = normalizedStatus
                  .toLowerCase()
                  .replace(/\s+/g, "-");
                return (
                  <div
                    className="task-card"
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/tasks/${task.id}`);
                      }
                    }}
                  >
                    <div className="task-header">
                      <h4>{task.name}</h4>
                      <span className={`priority ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="due">Due: {task.due}</p>
                    <p className="assigned">Assigned to: {task.assignedTo}</p>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
