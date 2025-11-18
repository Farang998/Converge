import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FaCheck, FaTimes, FaArrowLeft, FaUsers } from 'react-icons/fa';
import './AcceptInvitation.css';

const AcceptInvitation = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [projectInfo, setProjectInfo] = useState(null);
  const [loadingProject, setLoadingProject] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Please login first');
      navigate('/login');
      return;
    }

    // Fetch project info if available
    if (projectId) {
      fetchProjectInfo();
    }
  }, [projectId, navigate]);

  const fetchProjectInfo = async () => {
    try {
      setLoadingProject(true);
      const response = await api.get(`projects/${projectId}/`);
      setProjectInfo(response.data);
    } catch (error) {
      console.error('Error fetching project info:', error);
      // Don't show error, just continue without project info
    } finally {
      setLoadingProject(false);
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      const response = await api.get(`projects/accept-invitation/${projectId}/`);
      toast.success(response.data.message || 'Invitation accepted successfully!');
      setAccepted(true);
      // Mark any related notifications as read on the server (handle duplicates)
      try {
        await api.post('notifications/mark-by-link/', { link_url: `/accept-invitation/${projectId}` });
      } catch (e) {
        console.warn('Failed to mark notifications by link after accept:', e);
      }
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    // Mark any notifications that reference this accept link as read so they don't reappear
    (async () => {
      try {
        await api.post('notifications/mark-by-link/', { link_url: `/accept-invitation/${projectId}` });
      } catch (e) {
        console.warn('Failed to mark notifications by link on decline:', e);
      } finally {
        navigate('/dashboard');
      }
    })();
  };

  if (accepted) {
    return (
      <div className="accept-invitation-page">
        <div className="accept-invitation-card success">
          <div className="success-icon">
            <FaCheck />
          </div>
          <h2>Invitation Accepted!</h2>
          <p>You have successfully joined the project.</p>
          <p className="redirect-message">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="accept-invitation-page">
      <div className="accept-invitation-container">
        <button className="back-button" onClick={() => navigate('/dashboard')}>
          <FaArrowLeft /> Back to Dashboard
        </button>

        <div className="accept-invitation-card">
          <div className="invitation-header">
            <FaUsers className="invitation-icon" />
            <h1>Project Invitation</h1>
          </div>

          {loadingProject ? (
            <div className="loading-project">
              <p>Loading project information...</p>
            </div>
          ) : projectInfo ? (
            <div className="project-info">
              <h2>{projectInfo.name}</h2>
              {projectInfo.description && (
                <p className="project-description">{projectInfo.description}</p>
              )}
              {projectInfo.project_type && (
                <span className="project-type">{projectInfo.project_type}</span>
              )}
            </div>
          ) : (
            <p className="invitation-message">You have been invited to join a project.</p>
          )}

          <div className="invitation-actions">
            <button
              className="accept-btn"
              onClick={handleAccept}
              disabled={loading}
            >
              <FaCheck /> {loading ? 'Accepting...' : 'Accept Invitation'}
            </button>
            <button
              className="decline-btn"
              onClick={handleDecline}
              disabled={loading}
            >
              <FaTimes /> Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;