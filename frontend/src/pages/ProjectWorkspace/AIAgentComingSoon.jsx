import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import './Tasks/tasks.css';
import './AIAgentComingSoon.css';

const AIAgentComingSoon = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId, taskId } = useParams();
  const { task: taskState, projectName: projectNameState } = location.state || {};
  const [task, setTask] = useState(taskState || null);
  const [projectName, setProjectName] = useState(projectNameState || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Must have params
    if (!projectId || !taskId) {
      setError('Missing project or task identifier.');
      return;
    }

    // If task already provided via state, no need to fetch
    if (task) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const tasksRes = await api.get(`/tasks/?project_id=${projectId}`);
        const found = tasksRes.data.find(t => String(t.id) === String(taskId));
        if (!found) {
          setError('Task not found for given project.');
        } else {
          setTask({
            name: found.name,
            description: found.description,
            status: found.status,
            due_date: found.due_date,
            assigned_to: (found.assigned_to || []).map(a => a.username),
            dependencies: found.dependencies || []
          });
        }

        if (!projectName) {
          const projectsRes = await api.get('/projects/');
            const proj = projectsRes.data.find(p => String(p.id) === String(projectId));
            if (proj) setProjectName(proj.name);
        }
      } catch (e) {
        setError(e.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId, taskId, task, projectName]);

  return (
    <div className="ai-agent-page">
      <aside className="ai-agent-sidepanel">
        <h2>Task Details</h2>
        {projectName && <p className="detail"><strong>Project:</strong> {projectName}</p>}
        {loading && <p className="detail">Loading task...</p>}
        {error && <p className="detail" style={{color:'crimson'}}>{error}</p>}
        {!loading && !error && task ? (
          <>
            <p className="detail"><strong>Name:</strong> {task.name}</p>
            {task.description && <p className="detail"><strong>Description:</strong> {task.description}</p>}
            {task.status && <p className="detail"><strong>Status:</strong> {task.status}</p>}
            {task.due_date && <p className="detail"><strong>Due:</strong> {new Date(task.due_date).toLocaleString()}</p>}
            {Array.isArray(task.assigned_to) && task.assigned_to.length > 0 && (
              <p className="detail"><strong>Assignees:</strong> {task.assigned_to.join(', ')}</p>
            )}
            {Array.isArray(task.dependencies) && task.dependencies.length > 0 && (
              <p className="detail"><strong>Dependencies:</strong> {task.dependencies.join(', ')}</p>
            )}
          </>
        ) : (
          !loading && !error && <p>No task data provided.</p>
        )}
        <button className="button" onClick={() => navigate(-1)} style={{marginTop:'1rem'}}>Back</button>
      </aside>
      <main className="ai-agent-main">
        <div className="coming-soon-box">
          <h1>AI Agent Feature</h1>
          <p>This intelligent assistant will soon help you:
            <ul>
              <li>Auto-generate task breakdowns</li>
              <li>Suggest optimal dependency ordering</li>
              <li>Predict risk & delays</li>
              <li>Summarize project progress</li>
            </ul>
          </p>
          <p style={{marginTop:'1rem'}}>Stay tuned! 🚀</p>
        </div>
      </main>
    </div>
  );
};

export default AIAgentComingSoon;
