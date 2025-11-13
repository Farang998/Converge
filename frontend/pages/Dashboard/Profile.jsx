import React from "react";
import "./ProfilePage.css";
import { FaUser, FaEnvelope, FaCalendarAlt, FaEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "User";

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div className="avatar-large">
            <FaUser />
          </div>
          <div className="profile-info">
            <h2>{username}</h2>
            <p className="email">you@company.com</p>
          </div>
          <button className="edit-btn">
            <FaEdit /> Edit
          </button>
        </div>

        <div className="profile-body">
          <h3>Account Details</h3>
          <div className="detail-row">
            <FaEnvelope className="icon" />
            <div>
              <strong>Email:</strong>
              <p>you@company.com</p>
            </div>
          </div>

          <div className="detail-row">
            <FaCalendarAlt className="icon" />
            <div>
              <strong>Member Since:</strong>
              <p>March 2024</p>
            </div>
          </div>

          <div className="detail-row">
            <FaUser className="icon" />
            <div>
              <strong>Role:</strong>
              <p>Project Manager</p>
            </div>
          </div>
        </div>

        <div className="profile-footer">
          <button className="back-btn" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
