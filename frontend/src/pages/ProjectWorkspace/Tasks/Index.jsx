import { useState, useCallback } from 'react';
import DAGVisualization from './components/DAGVisualization';
import TaskForm from './components/TaskForm';
import EdgeForm from './components/EdgeForm';
import StatusLegend from './components/StatusLegend';
// import './Tasks.css';
import './Tasks.css';

// Sample data
const initialNodes = [
  {
    id: 't1',
    name: 'Design API',
    status: 'completed',
    due_date: '2025-11-20T10:00:00.000Z',
    assigned_to: 'Alice',
  },
  {
    id: 't2',
    name: 'Implement API Endpoints',
    status: 'in_progress',
    due_date: '2025-11-25T17:00:00.000Z',
    assigned_to: 'Bob',
  },
  {
    id: 't3',
    name: 'Write API Documentation',
    status: 'pending',
    due_date: '2025-11-28T17:00:00.000Z',
    assigned_to: null,
  },
  {
    id: 't4',
    name: 'Frontend Implementation',
    status: 'pending',
    due_date: '2025-12-01T17:00:00.000Z',
    assigned_to: 'Alice',
  },
];

const initialEdges = [
  { from: 't1', to: 't2' },
  { from: 't1', to: 't3' },
  { from: 't2', to: 't4' },
];

const Index = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [modal, setModal] = useState(null);

  const closeModal = () => setModal(null);

  // Task handlers
  const handleNodeEdit = useCallback((task) => {
    setModal({ type: 'task', task });
  }, []);

  const handleNodeDelete = useCallback((taskId) => {
    setNodes((current) => current.filter((n) => n.id !== taskId));
    setEdges((current) =>
      current.filter((e) => e.from !== taskId && e.to !== taskId)
    );
  }, []);

  const handleSaveTask = (taskData) => {
    setNodes((current) => {
      const exists = current.some((n) => n.id === taskData.id);
      if (exists) {
        return current.map((n) =>
          n.id === taskData.id ? { ...n, ...taskData } : n
        );
      }
      return [...current, taskData];
    });

    closeModal();
  };

  // Edge handlers
  const handleSaveEdge = (edgeData) => {
    setEdges((current) => {
      const exists = current.some(
        (e) => e.from === edgeData.from && e.to === edgeData.to
      );
      return exists ? current : [...current, edgeData];
    });
    closeModal();
  };

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
