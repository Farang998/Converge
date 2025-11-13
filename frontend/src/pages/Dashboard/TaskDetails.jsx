import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../../services/api';
import './task-details.css';

const formatDate = (value) => {
  if (!value) {
    return 'Not set';
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Not set';
    }
    return date.toLocaleString();
  } catch (error) {
    return 'Not set';
  }
};

export default function TaskDetails() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadTask() {
      setLoading(true);
      try {
        const { data } = await api.get(`tasks/${taskId}/`);
        if (!active) {
          return;
        }
        setTask(data);
        setError('');
      } catch (err) {
        if (!active) {
          return;
        }
        if (err?.response?.status === 401) {
          navigate('/login');
          return;
        }
        const message = err?.response?.data?.error || 'Unable to load task details.';
        setError(message);
        toast.error(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTask();
    return () => {
      active = false;
    };
  }, [taskId, navigate, refreshCounter]);

  const handleRefresh = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="task-details-page">
        <div className="task-details-card">
          <p>Loading task information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-details-page">
        <div className="task-details-card">
          <p className="task-error">{error}</p>
          <div className="task-actions">
            <button type="button" className="back-btn" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
            <button type="button" className="refresh-btn" onClick={handleRefresh}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const assignedTo = task?.assigned_to?.username || 'Unassigned';

  return (
    <div className="task-details-page">
      <div className="task-details-card">
        <h2>{task?.name}</h2>

        <div className="task-meta">
          <div className="meta-box">
            <span>Status</span>
            <strong>{(task?.status || 'pending').replace(/\b\w/g, (char) => char.toUpperCase())}</strong>
          </div>
          <div className="meta-box">
            <span>Assigned To</span>
            <strong>{assignedTo}</strong>
          </div>
          <div className="meta-box">
            <span>Due Date</span>
            <strong>{formatDate(task?.due_date)}</strong>
          </div>
          <div className="meta-box">
            <span>Created</span>
            <strong>{formatDate(task?.created_at)}</strong>
          </div>
        </div>

        <div className="task-body">
          {task?.description ? task.description : 'No description provided for this task.'}
        </div>

        <div className="task-actions">
          <button type="button" className="back-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
          <button type="button" className="refresh-btn" onClick={handleRefresh}>
            Refresh
          </button>
        </div>
      </div>
      <ToastContainer position="bottom-right" />
    </div>
  );
}

