import React, { useState, useEffect } from 'react';
import './createProject.css';
import { FiUsers, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const CreateProject = ({ onClose, isModal = false }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teamMembers: []
  });
  const [newMember, setNewMember] = useState('');
  const [error, setError] = useState('');
  const [memberError, setMemberError] = useState('');
  const [checkingMember, setCheckingMember] = useState(false);

  const isValidUsername = (name) => {
    if (!name) return false;
    const trimmed = name.trim();
    return /^[A-Za-z0-9._-]{3,30}$/.test(trimmed);
  };

  const fetchUserByUsername = async (username) => {
    if (!username) return null;
    const baseUrl = 'http://localhost:8000/api';
    const endpoints = [
      `${baseUrl}/auth/users/by-username?username=${encodeURIComponent(username)}`,
      `${baseUrl}/users?username=${encodeURIComponent(username)}`,
      `${baseUrl}/users/exists?username=${encodeURIComponent(username)}`
    ];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { 
          method: url.includes('/api/projects/') ? 'GET' : 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        if (!res.ok) {
          continue;
        }
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
        console.error('fetchUserByUsername error for', url, err);
        continue;
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.description.trim()) {
      setError('Please fill required fields: Project Name and Description.');
      return;
    }
    for (const m of formData.teamMembers) {
      if (!m || !m.username) {
        setError('One or more team members are invalid.');
        return;
      }
    }

    const membersForPayload = formData.teamMembers.map((m) => m.username);

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      team_members: membersForPayload
    };

    try {
      const res = await fetch('http://localhost:8000/api/projects/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        if (isModal && onClose) {
          onClose();
        } else {
          navigate('/');
        }
      } else {
        const resp = await res.json().catch(() => ({}));
        setError(resp.error || resp.message || `Failed to create project. (status ${res.status})`);
        console.debug('Create project failed:', res.status, resp);
      }
    } catch (err) {
      console.error(err);
      setError('Network error while creating project.');
    }
  };

  const addTeamMember = async (e) => {
    if (e && e.type === 'keydown') {
      if (!(e.key === 'Enter' || e.key === 'Tab')) return;
      e.preventDefault();
    }

    setMemberError('');
    const candidate = newMember.trim();
    if (!candidate) {
      setMemberError('Please type a username to add.');
      return;
    }

    if (!isValidUsername(candidate)) {
      setMemberError('Username invalid — use 3-30 chars: letters, numbers, ., _, -');
      return;
    }

    if (currentUser && (currentUser.username?.toLowerCase() === candidate.toLowerCase() || currentUser.id === candidate)) {
      setMemberError('You cannot add yourself as a team member. You are already the team leader.');
      return;
    }

    const existsLocal = formData.teamMembers.some(
      (m) => (m.username || '').toLowerCase() === candidate.toLowerCase()
    );
    if (existsLocal) {
      setMemberError('This user is already added to the team.');
      return;
    }

    setCheckingMember(true);
    const user = await fetchUserByUsername(candidate);
    setCheckingMember(false);

    if (user === null) {
      setMemberError('User not found in database. Please verify the username.');
      return;
    }

    if (currentUser && user.id && currentUser.id === user.id) {
      setMemberError('You cannot add yourself as a team member. You are already the team leader.');
      return;
    }

    const memberObj = {
      id: user.id || null,
      username: user.username || candidate
    };

    setFormData((prev) => ({
      ...prev,
      teamMembers: [...prev.teamMembers, memberObj]
    }));
    setNewMember('');
    setMemberError('');
  };

  const removeTeamMember = (member) => {
    setFormData({
      ...formData,
      teamMembers: formData.teamMembers.filter((m) => (m.id || m.username) !== (member.id || member.username))
    });
  };

  const closeModal = () => {
    if (isModal && onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    if (!isModal) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isModal && onClose) {
          onClose();
        } else {
          navigate(-1);
        }
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModal, onClose, navigate]);

  const initialsFromUsername = (usernameOrObj) => {
    if (!usernameOrObj) return '';
    const username = typeof usernameOrObj === 'string' ? usernameOrObj : (usernameOrObj.username || '');
    const chars = username.replace(/[\._-]/g, '');
    return chars.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`create-wrapper ${isModal ? 'modal-overlay' : ''}`} onClick={isModal ? (e) => e.target === e.currentTarget && closeModal() : undefined}>
      <div className="create-card wide" role="dialog" aria-labelledby="create-title" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" type="button" aria-label="Close" onClick={closeModal}>
          <FiX size={20} />
        </button>
        <h2 id="create-title">Create New Project</h2>

        {error && <div className="error-popup" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="form-grid" noValidate>
          <div className="form-group full">
            <label htmlFor="name">Project Name<span className="required">*</span></label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
              className="input-field"
              required
            />
          </div>

          <div className="form-group full">
            <label htmlFor="description">Description<span className="required">*</span></label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your project objectives, goals and scope"
              className="input-field textarea"
              rows={4}
              required
            />
          </div>
          <div className="form-group full">
            <label htmlFor="member"><FiUsers className="icon" /> Team Members</label>

            <div className="member-input-row">
              <input
                id="member"
                type="text"
                value={newMember}
                onChange={(e) => { setNewMember(e.target.value); setMemberError(''); }}
                onKeyDown={addTeamMember}
                placeholder="Type username (e.g. naitik2103) and press Enter"
                className="input-field"
                aria-describedby="member-help"
              />
              <button
                type="button"
                className="add-member-btn"
                onClick={addTeamMember}
                disabled={checkingMember}
                aria-label="Add team member"
              >
                {checkingMember ? 'Checking…' : 'Add'}
              </button>
            </div>

            {memberError && (
              <div style={{ color: 'var(--danger)', marginTop: 8, fontWeight: 600 }}>
                {memberError}
              </div>
            )}

            <div className="member-list" style={{ marginTop: 12 }}>
              {formData.teamMembers.map((member, index) => (
                <div key={index} className="member-tag professional-chip" title={member.username}>
                  <div className="chip-avatar">{initialsFromUsername(member)}</div>
                  <div className="chip-name">{member.username}</div>
                  <button
                    type="button"
                    onClick={() => removeTeamMember(member)}
                    className="remove-member"
                    aria-label={`Remove ${member.username}`}
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions full">
            <button type="submit" className="create-btn">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProject;