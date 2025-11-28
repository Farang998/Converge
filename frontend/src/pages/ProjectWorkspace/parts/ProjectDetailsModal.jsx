import React, { useEffect, useState } from 'react';
import './ProjectDetailsModal.css';
import api from '../../../services/api'; // adjust if your services path differs

const getInitials = (name) => (name ? name.trim().charAt(0).toUpperCase() : '?');

export default function ProjectDetailsModal({
  isOpen,
  onClose,
  project = {},
  members = [],
  onSave,    // existing parent callback: (updatedProject, invitations)
  onRefresh, // optional: parent refresh handler that accepts backend project object
}) {
  const [name, setName] = useState(project.name || '');
  const [description, setDescription] = useState(project.description || '');
  const [inviteInput, setInviteInput] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  // sync with parent project prop whenever it changes
  useEffect(() => {
    setName(project?.name || '');
    setDescription(project?.description || '');
  }, [project]);

  if (!isOpen) return null;

  if (!project || !project.id) {
    return (
      <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Update Project Details</h2>
            <button className="modal-close-btn" onClick={onClose}>&times;</button>
          </div>
          <div style={{ padding: 20 }}>Loading project...</div>
        </div>
      </div>
    );
  }

  const refreshProject = async () => {
    try {
      const resp = await api.get(`projects/${project.id}/`);
      const data = resp.data;
      if (typeof onRefresh === 'function') {
        await onRefresh(data);
      } else if (typeof onSave === 'function') {
        // keep backward compatibility: parent may normalize data inside onSave
        await onSave(data, []);
      }
    } catch (err) {
      console.warn('Failed to refresh project:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setGlobalError(null);
    setSaving(true);
    try {
      const payload = { name: (name || '').trim(), description: (description || '').trim() };
      await api.patch(`projects/${project.id}/`, payload);
      await refreshProject();
      onClose();
    } catch (err) {
      console.error('Save failed', err);
      if (err?.response?.status === 401) {
        setGlobalError('Not authenticated. Please login again.');
      } else {
        setGlobalError(err?.response?.data?.detail || err?.message || 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    setInviteError(null);
    const candidate = (inviteInput || '').trim();
    if (!candidate) {
      setInviteError('Please enter username or email');
      return;
    }
    setInviteLoading(true);
    try {
      // Use add_members endpoint (your backend had this route)
      await api.post(`projects/${project.id}/add_members/`, { user: candidate });
      setInviteInput('');
      await refreshProject();
    } catch (err) {
      console.error('Invite failed', err);
      if (err?.response?.status === 404) setInviteError('User not found');
      else setInviteError(err?.response?.data?.detail || err?.message || 'Invite failed');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Update Project Details</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        {globalError && <div className="error">{String(globalError)}</div>}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="projectName">Project Name</label>
            <input
              id="projectName"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="projectDesc">Description</label>
            <textarea
              id="projectDesc"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="invite-section">
            <label>Invite New Members</label>
            <div className="invite-controls">
              <input
                className="input"
                placeholder="Username or Email"
                value={inviteInput}
                onChange={(e) => { setInviteInput(e.target.value); setInviteError(null); }}
                disabled={inviteLoading || saving}
                aria-describedby="invite-error"
              />
              <button
                type="button"
                className="btn"
                onClick={handleInvite}
                disabled={inviteLoading || saving}
              >
                {inviteLoading ? 'Inviting...' : 'Invite'}
              </button>
            </div>

            {inviteError && (
              <div id="invite-error" className="invite-error">
                {inviteError}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>Current Members ({members.length})</label>
              <ul className="invite-list">
                {members.map((member) => (
                  <li key={member.id || member._id || member.user} className="member-row">
                    <div className="circle-avatar" title={member.name}>
                      {getInitials(member.name || member.username)}
                    </div>
                    <div className="member-name">{member.name || member.username}</div>
                    <span className="member-role">{member.id === project.owner?.id ? 'Owner' : 'Member'}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ marginTop: 20, textAlign: 'right' }}>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Update Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
