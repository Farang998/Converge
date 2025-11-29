import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserCog, FaLock, FaPalette } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../../services/api';
import './settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const { data } = await api.get('auth/identify-user/');
        if (!active) {
          return;
        }
        const user = data?.user || {};
        setProfile({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          username: user.username || '',
        });
      } catch (err) {
        if (!active) {
          return;
        }
        if (err?.response?.status === 401) {
          navigate('/login');
          return;
        }
        toast.error(err?.response?.data?.error || 'Unable to load profile.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // notifications removed — keep future hooks here if needed

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch('auth/profile/', {
        first_name: profile.first_name,
        last_name: profile.last_name,
      });
      toast.success('Profile updated successfully.');
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate('/login');
        return;
      }
      toast.error(err?.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-card">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-card">
        <div className="settings-header">
          <FaUserCog className="settings-icon" />
          <h2>Account Settings</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="settings-section">
            <h3>Profile</h3>
            <div className="setting-row">
              <span>Username</span>
              <input type="text" value={profile.username} disabled />
            </div>
            <div className="settings-row-group">
              <div className="setting-row">
                <span>First Name</span>
                <input
                  name="first_name"
                  type="text"
                  value={profile.first_name}
                  onChange={handleChange}
                />
              </div>
              <div className="setting-row">
                <span>Last Name</span>
                <input
                  name="last_name"
                  type="text"
                  value={profile.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="setting-row">
              <span>Email</span>
              <input type="email" value={profile.email} disabled />
            </div>
            <p className="settings-hint">
              Need to update your email? Contact the workspace administrator.
            </p>
            <div className="settings-actions">
              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>

        <div className="settings-section">
          <h3>
            <FaLock /> Security
          </h3>
          <div className="setting-row">
            <span>Password</span>
            <button
              type="button"
              className="change-btn"
              onClick={() => setShowChangePassword(true)}
            >
              Change Password
            </button>
          </div>

          {showChangePassword && (
            <div className="settings-section" style={{ marginTop: 12 }}>
              <h4>Change Password</h4>
              <div className="setting-row-group">
                <div className="setting-row">
                  <span>Current Password</span>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="setting-row">
                  <span>New Password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="setting-row">
                  <span>Confirm New Password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
              <div className="settings-actions" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => {
                    setShowChangePassword(false);
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="save-btn"
                  onClick={async () => {
                    // Client-side validation similar to registration rules
                    if (typeof newPassword !== 'string' || typeof oldPassword !== 'string') {
                      toast.error('Invalid input');
                      return;
                    }
                    if (!oldPassword || !newPassword) {
                      toast.error('Both current and new passwords are required');
                      return;
                    }
                    if (newPassword.trim().length < 8) {
                      toast.error('New password must be at least 8 characters long');
                      return;
                    }
                    if (newPassword === oldPassword) {
                      toast.error('New password must be different from current password');
                      return;
                    }
                    // do not allow new password to equal username or email
                    if (profile.username && (newPassword === profile.username)) {
                      toast.error('New password cannot be the same as your username');
                      return;
                    }
                    if (profile.email && (newPassword === profile.email)) {
                      toast.error('New password cannot be the same as your email');
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      toast.error('New password and confirmation do not match');
                      return;
                    }

                    setChangingPassword(true);
                    try {
                      await api.post('auth/change-password/', {
                        old_password: oldPassword,
                        new_password: newPassword,
                      });
                      toast.success('Password changed successfully');
                      setShowChangePassword(false);
                      setOldPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    } catch (err) {
                      if (err?.response?.status === 401) {
                        navigate('/login');
                        return;
                      }
                      const msg = err?.response?.data?.error || 'Failed to change password.';
                      toast.error(msg);
                    } finally {
                      setChangingPassword(false);
                    }
                  }}
                  disabled={changingPassword}
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications section removed */}

        <div className="settings-section">
          <h3>
            <FaPalette /> Appearance
          </h3>
          <div className="setting-row toggle-row">
            <span>Dark Mode</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={() => setDarkMode((prev) => !prev)}
              />
              <span className="slider" />
            </label>
          </div>
        </div>

        <div className="settings-footer">
          <button type="button" className="back-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
      <ToastContainer position="bottom-right" />
    </div>
  );
}

