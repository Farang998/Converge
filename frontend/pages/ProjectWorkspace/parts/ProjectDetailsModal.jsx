import React, { useState } from 'react';
import './ProjectDetailsModal.css';

// Assumes utility functions exist in a separate file or are passed via props
const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?';

export default function ProjectDetailsModal({ isOpen, onClose, project, members, onSave }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [newMemberInput, setNewMemberInput] = useState('');
  
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // In a real app, you would perform API calls here
    const updatedProject = { ...project, name, description };
    const invitations = [{ usernameOrEmail: newMemberInput }]; // Example structure

    onSave(updatedProject, invitations);
    onClose();
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        
        <div className="modal-header">
          <h2>Update Project Details</h2>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* Project Name */}
          <div className="form-group">
            <label htmlFor="projectName">Project Name</label>
            <input 
              id="projectName"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Project Description */}
          <div className="form-group">
            <label htmlFor="projectDesc">Description</label>
            <textarea
              id="projectDesc"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Member Invitation */}
          <div className="invite-section">
            <label>Invite New Members</label>
            <div className="invite-controls">
            <input 
                className="input" 
                placeholder="Username or Email"
                value={newMemberInput}
                onChange={(e) => setNewMemberInput(e.target.value)}
            />
            <button 
                type="submit" 
                className="btn primary" 
                style={{ flexShrink: 0 }} // Keep this inline style or move to CSS if desired
            >
                Invite
            </button>
            </div>
            
            {/* Current Members Display */}
            <div style={{ marginTop: 20 }}>
                <label style={{display: 'block', marginBottom: 5}}>Current Members ({members.length})</label>
                <ul className="invite-list">
                    {members.map(member => (
                        <li key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                            <div className="user-avatar" style={{ background: 'var(--primary-700)' }}>
                                {getInitials(member.name)}
                            </div>
                            {member.name}
                            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
                                {member.id === project.owner.id ? 'Owner' : 'Member'}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
          </div>
          
          <div style={{ marginTop: 20, textAlign: 'right' }}>
            <button type="submit" className="btn primary">
              Update Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}