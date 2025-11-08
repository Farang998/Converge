import React, { useState, useEffect } from "react";
import "./Settings.css";
import { FaUserCog, FaLock, FaBell, FaPalette } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return (
    <div className="settings-page">
      <div className="settings-card">
        <div className="settings-header">
          <FaUserCog className="settings-icon" />
          <h2>Account Settings</h2>
        </div>

        {/* Account Info */}
        <div className="settings-section">
          <h3>Profile</h3>
          <div className="setting-row">
            <span>Name:</span>
            <input type="text" defaultValue="User" />
          </div>
          <div className="setting-row">
            <span>Email:</span>
            <input type="email" defaultValue="you@company.com" />
          </div>
        </div>

        {/* Security */}
        <div className="settings-section">
          <h3>
            <FaLock /> Security
          </h3>
          <div className="setting-row">
            <span>Password:</span>
            <button className="change-btn">Change Password</button>
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-section">
          <h3>
            <FaBell /> Notifications
          </h3>
          <div className="setting-row toggle-row">
            <span>Enable Notifications</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={() => setNotificationsEnabled(!notificationsEnabled)}
              />
              <span className="slider"></span>
            </label>
          </div>
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
                onChange={() => setDarkMode(!darkMode)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        {/* Back Button */}
        <div className="settings-footer">
          <button className="back-btn" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
