import React, { useEffect, useMemo, useState } from "react";
import { FaUser, FaEnvelope, FaCalendarAlt, FaIdBadge } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./profile.css";

const formatDate = (value) => {
  if (!value) {
    return "Unavailable";
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unavailable";
    }
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch (err) {
    return "Unavailable";
  }
};

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const { data } = await api.get("auth/identify-user/");
        if (!active) {
          return;
        }
        if (data?.user) {
          setUser(data.user);
          setError("");
        } else {
          setError("Unable to load profile information.");
        }
      } catch (err) {
        if (!active) {
          return;
        }
        if (err?.response?.status === 401) {
          navigate("/login");
          return;
        }
        setError(err?.response?.data?.error || "Failed to load profile.");
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

  const displayName = useMemo(() => {
    if (!user) {
      return "";
    }
    const first = user.first_name?.trim();
    const last = user.last_name?.trim();
    if (first || last) {
      return [first, last].filter(Boolean).join(" ");
    }
    return user.username;
  }, [user]);

  const membershipDate = formatDate(user?.date_joined);
  const email = user?.email || "Not provided";
  const username = user?.username || "Unknown user";
  const userId = user?.id || "Unavailable";

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <h2>Profile</h2>
          <p className="profile-error">{error}</p>
          <button className="back-btn" type="button" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div className="avatar-large">
            <FaUser />
          </div>
          <div className="profile-info">
            <h2>{displayName}</h2>
            <p className="email">{email}</p>
          </div>
          <button className="edit-btn" type="button" disabled>
            <FaIdBadge /> Manage
          </button>
        </div>

        <div className="profile-body">
          <h3>Account Details</h3>

          <div className="detail-row">
            <FaUser className="icon" />
            <div>
              <strong>Username</strong>
              <p>{username}</p>
            </div>
          </div>

          <div className="detail-row">
            <FaEnvelope className="icon" />
            <div>
              <strong>Email</strong>
              <p>{email}</p>
            </div>
          </div>

          <div className="detail-row">
            <FaCalendarAlt className="icon" />
            <div>
              <strong>Member Since</strong>
              <p>{membershipDate}</p>
            </div>
          </div>

          <div className="detail-row">
            <FaIdBadge className="icon" />
            <div>
              <strong>User ID</strong>
              <p>{userId}</p>
            </div>
          </div>
        </div>

        <div className="profile-footer">
          <button className="back-btn" type="button" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

