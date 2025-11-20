import { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import DAGVisualization from './components/DAGVisualization';
import TaskForm from './components/TaskForm';
import EdgeForm from './components/EdgeForm';
import StatusLegend from './components/StatusLegend';
import './tasks.css';

const Index = ({ projectId }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [modal, setModal] = useState(null);

  // -----------------------------
  // Close Modal
  // -----------------------------
  const closeModal = () => setModal(null);

  // -----------------------------
  // Fetch Tasks + Build Graph
  // -----------------------------
  const refreshTasks = useCallback(async () => {
    if (!projectId) {
      console.error("projectId is undefined. Cannot fetch tasks.");
      return;
    }

    try {
      const res = await api.get(`/tasks/?project_id=${projectId}`);
      const tasks = res.data;

      setNodes(
        tasks.map(t => ({
          id: t.id,
          name: t.name,
          status: t.status,
          due_date: t.due_date,
          assigned_to: t.assigned_to?.username || null,
        }))
      );

      setEdges(
        tasks.flatMap(t =>
          t.dependencies.map(depId => ({
            from: depId,
            to: t.id,
          }))
        )
      );
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  }, [projectId]);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  // -----------------------------
  // Task Handlers
  // -----------------------------
  const handleNodeEdit = useCallback((task) => {
    setModal({ type: 'task', task });
  }, []);

  const handleNodeDelete = async (taskId) => {
    await api.delete(`/tasks/${taskId}/`);
    refreshTasks();
  };

  const handleSaveTask = async (taskData) => {
    if (!taskData.id) {
      await api.post("/tasks/", {
        ...taskData,
        project_id: projectId,
      });
    } else {
      await api.patch(`/tasks/${taskData.id}/`, taskData);
    }

    refreshTasks();
    closeModal();
  };

  // -----------------------------
  // Edge Handlers
  // -----------------------------
  const handleSaveEdge = async (edgeData) => {
    await api.post(`/tasks/${edgeData.to}/add_dependency/`, {
      dependency_id: edgeData.from,
    });

    refreshTasks();
    closeModal();
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="page-container">
      <StatusLegend />

      <div className="controls-panel">
        <button
          className="button"
          onClick={() => setModal({ type: 'task', task: null })}
        >
          + Create Task
        </button>

        <button
          className="button"
          onClick={() => setModal({ type: 'edge' })}
        >
          + Add Dependency
        </button>
      </div>

      <DAGVisualization
        nodes={nodes}
        edges={edges}
        onNodeEdit={handleNodeEdit}
        onNodeDelete={handleNodeDelete}
        onEdgesChange={setEdges}
      />

      {modal?.type === 'task' && (
        <TaskForm
          task={modal.task}
          onSave={handleSaveTask}
          onCancel={closeModal}
        />
      )}

      {modal?.type === 'edge' && (
        <EdgeForm
          nodes={nodes}
          onSave={handleSaveEdge}
          onCancel={closeModal}
        />
      )}
    </div>
  );
};

export default Index;
