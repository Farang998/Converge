import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserCog, FaLock, FaBell, FaPalette } from 'react-icons/fa';
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    localStorage.getItem('notifications') !== 'off'
  );
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

  useEffect(() => {
    localStorage.setItem('notifications', notificationsEnabled ? 'on' : 'off');
  }, [notificationsEnabled]);

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
              onClick={() => navigate('/forgot-password')}
            >
              Change Password
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>
            <FaBell /> Notifications
          </h3>
          <div className="setting-row toggle-row">
            <span>Enable Email Notifications</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={() => setNotificationsEnabled((prev) => !prev)}
              />
              <span className="slider" />
            </label>
          </div>
          <p className="settings-hint">
            Notifications preferences sync with this browser only.
          </p>
        </div>

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

