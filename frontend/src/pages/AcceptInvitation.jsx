import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';

const AcceptInvitation = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const response = await api.get(`projects/accept-invitation/${projectId}/`);
      toast.success(response.data.message);
      setAccepted(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Please login first');
      navigate('/login');
    }
  }, [navigate]);

  if (accepted) {
    return (
      <div className="accept-invitation">
        <h2>Invitation Accepted!</h2>
        <p>You have successfully joined the project. Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="accept-invitation">
      <h2>Project Invitation</h2>
      <p>You have been invited to join a project.</p>
      <button onClick={handleAccept} disabled={loading}>
        {loading ? 'Accepting...' : 'Accept Invitation'}
      </button>
    </div>
  );
};

export default AcceptInvitation;