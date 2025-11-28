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
  const [error, setError] = useState(null);

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
      console.error('Error accepting invitation:', error);
      
      let errorMessage = 'Failed to accept invitation';
      let shouldRedirect = false;
      let redirectPath = '/dashboard';
      
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.message || 'Failed to accept invitation';
        
        if (error.response.status === 401) {
          toast.error(errorMessage);
          shouldRedirect = true;
          redirectPath = '/login';
        } else if (error.response.status === 403) {
          toast.error(errorMessage, { autoClose: 5000 });
          setError(errorMessage);
          shouldRedirect = true;
        } else if (error.response.status === 404) {
          errorMessage = 'Project not found or has been deleted';
          toast.error(errorMessage);
          setError(errorMessage);
          shouldRedirect = true;
        } else {
          toast.error(errorMessage);
          setError(errorMessage);
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
        toast.error(errorMessage);
        setError(errorMessage);
      } else {
        errorMessage = 'An unexpected error occurred. Please try again.';
        toast.error(errorMessage);
        setError(errorMessage);
      }
      
      if (shouldRedirect) {
        setTimeout(() => navigate(redirectPath), 2000);
      }
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

          {error && (
            <div className="error-message" style={{
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              padding: '12px 16px',
              margin: '16px 0',
              color: '#c33',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FaTimes style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

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
              disabled={loading || error}
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