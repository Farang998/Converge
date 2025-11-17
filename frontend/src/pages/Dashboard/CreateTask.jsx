import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './createTask.css';
import './createProject.css';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiUsers } from 'react-icons/fi';

export default function CreateTask() {
  const navigate = useNavigate();

  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    dueLocal: '', // datetime-local value
  });

  const [assigneeInput, setAssigneeInput] = useState('');
  const [assignee, setAssignee] = useState(null); // { id, username }
  const [projectInput, setProjectInput] = useState('');
  const [project, setProject] = useState(null); // { id, name }

  const [checkingAssignee, setCheckingAssignee] = useState(false);
  const [checkingProject, setCheckingProject] = useState(false);

  const [error, setError] = useState('');
  const [assigneeError, setAssigneeError] = useState('');
  const [projectError, setProjectError] = useState('');

  const isValidShortName = (s) => {
    if (!s) return false;
    return /^[A-Za-z0-9._-]{3,60}$/.test(s.trim());
  };

  const fetchUserByUsername = async (username) => {
    if (!username) return null;
    const endpoints = [
      `/api/users/by-username?username=${encodeURIComponent(username)}`,
      `/api/users?username=${encodeURIComponent(username)}`,
      `/api/users/exists?username=${encodeURIComponent(username)}`
    ];
    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json().catch(() => null);
        if (!data) continue;
        if (data.user && (data.user._id || data.user.id)) {
          return { id: data.user._id || data.user.id, username: data.user.username || data.user.name || username };
        }
        if (data._id || data.id) {
          return { id: data._id || data.id, username: data.username || data.name || username };
        }
        if (typeof data === 'boolean' && data === true) {
          return { id: null, username };
        }
        if (data.exists === true) {
          return { id: data._id || data.id || null, username };
        }
        if (data.username) {
          return { id: data._id || data.id || null, username: data.username };
        }
      } catch (err) {
        console.error('fetchUserByUsername error', err);
        continue;
      }
    }
    return null;
  };

  const fetchProjectByName = async (name) => {
    if (!name) return null;
    const endpoints = [
      `/api/projects/by-name?name=${encodeURIComponent(name)}`,
      `/api/projects?name=${encodeURIComponent(name)}`,
      `/api/projects/exists?name=${encodeURIComponent(name)}`
    ];
    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json().catch(() => null);
        if (!data) continue;
        if (data.project && (data.project._id || data.project.id)) {
          return { id: data.project._id || data.project.id, name: data.project.name || name };
        }
        if (data._id || data.id) {
          return { id: data._id || data.id, name: data.name || name };
        }
        if (typeof data === 'boolean' && data === true) {
          return { id: null, name };
        }
        if (data.exists === true) {
          return { id: data._id || data.id || null, name };
        }
        if (data.name) {
          return { id: data._id || data.id || null, name: data.name };
        }
      } catch (err) {
        console.error('fetchProjectByName error', err);
        continue;
      }
    }
    return null;
  };

  const handleSetAssignee = async (e) => {
    e?.preventDefault();
    setAssigneeError('');
    if (!assigneeInput.trim()) {
      setAssigneeError('Type a username to add.');
      return;
    }
    if (!isValidShortName(assigneeInput)) {
      setAssigneeError('Invalid username (3-60 chars, letters/numbers/._-).');
      return;
    }
    if (assignee && assignee.username.toLowerCase() === assigneeInput.trim().toLowerCase()) {
      return;
    }
    setCheckingAssignee(true);
    const user = await fetchUserByUsername(assigneeInput.trim());
    setCheckingAssignee(false);
    if (!user) {
      setAssigneeError('User not found in database.');
      return;
    }
    setAssignee({ id: user.id || null, username: user.username || assigneeInput.trim() });
    setAssigneeInput('');
  };

  const handleSetProject = async (e) => {
    e?.preventDefault();
    setProjectError('');
    if (!projectInput.trim()) {
      setProjectError('Type project name to set.');
      return;
    }
    if (!isValidShortName(projectInput)) {
      setProjectError('Invalid project name (3-60 chars).');
      return;
    }
    setCheckingProject(true);
    const p = await fetchProjectByName(projectInput.trim());
    setCheckingProject(false);
    if (!p) {
      setProjectError('Project not found in database.');
      return;
    }
    setProject({ id: p.id || null, name: p.name || projectInput.trim() });
    setProjectInput('');
  };

  const removeAssignee = () => setAssignee(null);
  const removeProject = () => setProject(null);

  const toISOZ = (localDateTime) => {
    if (!localDateTime) return null;
    // localDateTime expected from <input type="datetime-local">
    const d = new Date(localDateTime);
    if (isNaN(d)) return null;
    return d.toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!taskData.title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!taskData.dueLocal) {
      setError('Due date & time required.');
      return;
    }
    if (!project) {
      setError('Project must be set (must exist in DB).');
      return;
    }
    if (!assignee) {
      setError('Assignee must be set (must exist in DB).');
      return;
    }

    const payload = {
      name: taskData.title.trim(),
      description: taskData.description.trim(),
      project_id: project.id || project.name,
      assigned_to: assignee.username || assignee.id,
      due_date: toISOZ(taskData.dueLocal)
    };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        navigate('/dashboard');
      } else {
        const resp = await res.json().catch(() => ({}));
        setError(resp.message || 'Failed to create task.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error while creating task.');
    }
  };

  return (
    <div className="create-wrapper">
      <div className="create-card wide" role="dialog" aria-labelledby="create-title">
        <button className="close-btn" type="button" aria-label="Close" onClick={() => navigate('/dashboard')}>
          <FiX size={20} />
        </button>

        <button className="back-button small" onClick={() => navigate('/dashboard')}>
          <FaArrowLeft /> Back
        </button>

        <h2 id="create-title">Create New Task</h2>

        {error && <div className="error-popup" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="form-grid" noValidate>
          <div className="form-group full">
            <label htmlFor="title">Task Title<span className="required">*</span></label>
            <input
              id="title"
              name="title"
              type="text"
              className="input-field"
              placeholder="Enter task title"
              value={taskData.title}
              onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group full">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              className="input-field textarea"
              placeholder="Enter task description"
              rows={4}
              value={taskData.description}
              onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dueLocal">Due Date & Time<span className="required">*</span></label>
              <input
                id="dueLocal"
                name="dueLocal"
                type="datetime-local"
                className="input-field"
                value={taskData.dueLocal}
                onChange={(e) => setTaskData({ ...taskData, dueLocal: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                name="priority"
                className="input-field"
                onChange={() => {}}
                defaultValue="medium"
                disabled
                title="Priority stored in tasks model elsewhere (disabled here)"
              >
                <option value="low">Low</option>
                <option value="medium">Medium (default)</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="form-group full">
            <label><FiUsers className="icon" /> Assignee</label>

            {!assignee ? (
              <div className="member-input-row">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Type username and press Set"
                  value={assigneeInput}
                  onChange={(e) => { setAssigneeInput(e.target.value); setAssigneeError(''); }}
                />
                <button
                  type="button"
                  className="add-member-btn"
                  onClick={handleSetAssignee}
                  disabled={checkingAssignee}
                >
                  {checkingAssignee ? 'Checking…' : 'Set'}
                </button>
              </div>
            ) : (
              <div className="member-list" style={{ marginTop: 8 }}>
                <div className="member-tag professional-chip">
                  <div className="chip-avatar">{(assignee.username || '').slice(0,2).toUpperCase()}</div>
                  <div className="chip-name">{assignee.username}</div>
                  <button type="button" className="remove-member" onClick={removeAssignee} aria-label="Remove assignee"><FiX size={14} /></button>
                </div>
              </div>
            )}

            {assigneeError && <div className="field-error">{assigneeError}</div>}
          </div>

          <div className="form-group full">
            <label>Project</label>

            {!project ? (
              <div className="member-input-row">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Type project name and press Set"
                  value={projectInput}
                  onChange={(e) => { setProjectInput(e.target.value); setProjectError(''); }}
                />
                <button
                  type="button"
                  className="add-member-btn"
                  onClick={handleSetProject}
                  disabled={checkingProject}
                >
                  {checkingProject ? 'Checking…' : 'Set'}
                </button>
              </div>
            ) : (
              <div className="member-list" style={{ marginTop: 8 }}>
                <div className="member-tag professional-chip">
                  <div className="chip-avatar">{(project.name || '').slice(0,2).toUpperCase()}</div>
                  <div className="chip-name">{project.name}</div>
                  <button type="button" className="remove-member" onClick={removeProject} aria-label="Remove project"><FiX size={14} /></button>
                </div>
              </div>
            )}

            {projectError && <div className="field-error">{projectError}</div>}
          </div>

          <div className="form-actions full">
            <button type="button" className="cancel-btn" onClick={() => navigate('/dashboard')}>Cancel</button>
            <button type="submit" className="create-btn">Create Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}