import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../services/api';
import './Dashboard/project-create.css';

export default function ProjectCreate() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState('development');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    let active = true;

    async function loadUserAndDirectory() {
      try {
        const identity = await api.get('auth/identify-user/');
        if (!active) {
          return;
        }
        const id = identity?.data?.user?.id || '';
        setCurrentUserId(id);

        const { data } = await api.get('auth/users/', { params: { limit: 100 } });
        if (!active) {
          return;
        }
        setUsers(data?.users || []);
      } catch (err) {
        if (!active) {
          return;
        }
        if (err?.response?.status === 401) {
          navigate('/login');
          return;
        }
        toast.error(err?.response?.data?.error || 'Failed to load user directory.');
      } finally {
        if (active) {
          setLoadingUsers(false);
        }
      }
    }

    loadUserAndDirectory();
    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return users;
    }
    return users.filter((user) => {
      const fields = [
        user.username,
        user.email,
        user.first_name,
        user.last_name,
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      return fields.some((field) => field.includes(term));
    });
  }, [search, users]);

  const toggleMember = (userId) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const removeMember = (userId) => {
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        project_type: projectType,
        team_members: selectedUserIds,
      };
      const response = await api.post('projects/', payload);
      toast.success(response?.data?.message || 'Project created successfully.');
      navigate('/dashboard');
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to create project.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-wrapper">
      <div className="create-card">
        <button
          type="button"
          className="close-btn"
          onClick={() => navigate('/dashboard')}
          aria-label="Close project creator"
        >
          ×
        </button>

        <h2>Create New Project</h2>
        <p className="muted" style={{ textAlign: 'center', marginBottom: 12 }}>
          Launch a new initiative and invite teammates to collaborate.
        </p>

        {error && (
          <div className="error-popup" role="alert">
            {error}
          </div>
        )}

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-group full">
            <label htmlFor="project-name">Project Name *</label>
            <input
              id="project-name"
              type="text"
              className="input-field"
              placeholder="e.g. Website revamp"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="form-group full">
            <label htmlFor="project-type">Project Type</label>
            <select
              id="project-type"
              className="input-field"
              value={projectType}
              onChange={(event) => setProjectType(event.target.value)}
            >
              <option value="development">Development</option>
              <option value="design">Design</option>
              <option value="marketing">Marketing</option>
              <option value="research">Research</option>
              <option value="operations">Operations</option>
            </select>
          </div>

          <div className="form-group full">
            <label htmlFor="project-description">Description</label>
            <textarea
              id="project-description"
              className="input-field textarea"
              placeholder="Describe the project goals and expectations."
              value={description}
              rows={4}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="form-group full">
            <label htmlFor="member-search">Invite Members</label>
            <input
              id="member-search"
              type="search"
              className="member-search-input"
              placeholder="Search teammates by name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={loadingUsers}
            />
            <p className="muted" style={{ marginTop: 4 }}>
              Selected members will receive an invitation email and notification.
            </p>

            <div className="selected-tags" aria-live="polite">
              {selectedUserIds.length === 0 && (
                <span className="muted">No members selected yet.</span>
              )}
              {selectedUserIds.map((userId) => {
                const user = users.find((u) => u.id === userId);
                if (!user) {
                  return null;
                }
                return (
                  <span className="tag" key={userId}>
                    {user.username}
                    <button type="button" onClick={() => removeMember(userId)}>
                      ×
                    </button>
                  </span>
                );
              })}
            </div>

            <div className="member-listing">
              {loadingUsers && <p className="muted">Loading teammates...</p>}
              {!loadingUsers && filteredUsers.length === 0 && (
                <p className="muted">No teammates found.</p>
              )}
              {!loadingUsers &&
                filteredUsers.map((user) => (
                  <label className="member-item" key={user.id}>
                    <div className="member-info">
                      <span>{user.username}</span>
                      <span>{user.email}</span>
                    </div>
                    <input
                      type="checkbox"
                      onChange={() => toggleMember(user.id)}
                      checked={selectedUserIds.includes(user.id)}
                      disabled={user.id === currentUserId}
                    />
                  </label>
                ))}
            </div>
          </div>

          <div className="form-actions full">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate('/dashboard')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="create-btn" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
      <ToastContainer position="bottom-right" />
    </div>
  );
}

