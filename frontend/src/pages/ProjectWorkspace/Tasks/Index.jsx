import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import DAGVisualization from './components/DAGVisualization';
import TaskForm from './components/TaskForm';
import EdgeForm from './components/EdgeForm';
import StatusLegend from './components/StatusLegend';
import ValidationNotification from './components/ValidationNotification';
import './tasks.css';

const Index = ({ projectId }) => {
  const { user: currentUser } = useAuth();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [pendingEdges, setPendingEdges] = useState([]);
  const [modal, setModal] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [notification, setNotification] = useState(null);

  // Debug: log modal state changes
  useEffect(() => {
    console.log('[TaskIndex] Modal state changed:', modal);
    if (modal) {
      const modalRoot = document.getElementById('modal-root');
      console.log('[TaskIndex] modal-root element:', modalRoot);
      console.log('[TaskIndex] modal-root children count:', modalRoot?.children?.length);
      if (modalRoot && modalRoot.children.length > 0) {
        console.log('[TaskIndex] modal-root first child:', modalRoot.children[0]);
        console.log('[TaskIndex] modal-root first child computed style:', window.getComputedStyle(modalRoot.children[0]));
      }
    }
  }, [modal]);

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
      // Fetch project data (for team members)
      const projectRes = await api.get(`/projects/`);
      const currentProject = projectRes.data.find(p => p.id === projectId);
      if (currentProject) {
        setProjectData(currentProject);
        console.log('[TaskIndex] Loaded project data with members:', currentProject.team_members);
      }

      // Fetch tasks
      const tasksRes = await api.get(`/tasks/?project_id=${projectId}`);
      const tasks = tasksRes.data;

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
    try {
      if (!taskData._id) {
        const newTaskData = { ...taskData };
        delete newTaskData._id;
        await api.post("/tasks/", {
          ...newTaskData,
          project_id: projectId,
        });
      } else {
        const taskId = taskData._id;
        const updateData = { ...taskData };
        delete updateData._id;
        await api.patch(`/tasks/${taskId}/`, updateData);
      }

      refreshTasks();
      closeModal();
    } catch (err) {
      console.error('Error saving task:', err.response?.data || err.message);
      alert(`Error saving task: ${err.response?.data?.error || err.message}`);
    }
  };

  // -----------------------------
  // Validation Functions
  // -----------------------------
  const hasCircularDependency = (fromId, toId, allEdges) => {
    // Check if adding an edge from 'fromId' to 'toId' creates a cycle
    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (nodeId) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const dependents = allEdges
        .filter(e => e.from === nodeId)
        .map(e => e.to);

      for (const dependent of dependents) {
        if (!visited.has(dependent)) {
          if (hasCycle(dependent)) return true;
        } else if (recursionStack.has(dependent)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Test if adding this edge would create a cycle
    const testEdges = [...allEdges, { from: fromId, to: toId }];
    visited.clear();
    recursionStack.clear();
    return hasCycle(toId);
  };

  const checkDueDateConflict = (fromTaskId, toTaskId) => {
    // fromTask is the dependency, toTask is the dependent
    // toTask's due date should be >= fromTask's due date
    const fromTask = nodes.find(n => n.id === fromTaskId);
    const toTask = nodes.find(n => n.id === toTaskId);

    if (!fromTask || !toTask) return null;
    if (!fromTask.due_date || !toTask.due_date) return null;

    const fromDate = new Date(fromTask.due_date);
    const toDate = new Date(toTask.due_date);

    if (toDate < fromDate) {
      return {
        fromTask: fromTask.name,
        toTask: toTask.name,
        fromDate: fromDate.toLocaleDateString(),
        toDate: toDate.toLocaleDateString(),
      };
    }

    return null;
  };

  // -----------------------------
  // Edge Handlers
  // -----------------------------
  const handleAddEdge = (edgeData) => {
    const edgeExists = pendingEdges.some(
      e => e.from === edgeData.from && e.to === edgeData.to
    );
    if (edgeExists) {
      setNotification({
        type: 'warning',
        title: 'Dependency Already Exists',
        message: 'This dependency has already been added to pending changes.',
      });
      return;
    }

    // Check for circular dependency
    const allCurrentEdges = [...edges, ...pendingEdges];
    if (hasCircularDependency(edgeData.from, edgeData.to, allCurrentEdges)) {
      setNotification({
        type: 'error',
        title: 'Circular Dependency Detected',
        message: 'This dependency would create a circular dependency loop. Please select different tasks.',
      });
      return;
    }

    // Check for due date conflict
    const dueDateConflict = checkDueDateConflict(edgeData.from, edgeData.to);
    if (dueDateConflict) {
      setNotification({
        type: 'warning',
        title: 'Due Date Conflict',
        message: `"${dueDateConflict.fromTask}" is due on ${dueDateConflict.fromDate}, but "${dueDateConflict.toTask}" (dependent task) is due on ${dueDateConflict.toDate}. The dependent task should be due after or on the same date as its dependency.`,
      });
      // Don't return - allow this warning but show notification
      setTimeout(() => {
        setPendingEdges([...pendingEdges, edgeData]);
      }, 100);
      return;
    }

    setPendingEdges([...pendingEdges, edgeData]);
  };

  const handleRemoveEdge = (edgeData) => {
    setPendingEdges(
      pendingEdges.filter(
        e => !(e.from === edgeData.from && e.to === edgeData.to)
      )
    );
  };

  const handleSaveAllDependencies = async () => {
    try {
      let savedCount = 0;
      const errors = [];

      for (const edge of pendingEdges) {
        try {
          await api.post(`/tasks/${edge.to}/add_dependency/`, {
            dependency_id: edge.from,
          });
          savedCount++;
        } catch (err) {
          const fromTask = nodes.find(n => n.id === edge.from)?.name || edge.from;
          const toTask = nodes.find(n => n.id === edge.to)?.name || edge.to;
          errors.push(`"${fromTask}" → "${toTask}": ${err.response?.data?.error || err.message}`);
        }
      }

      setPendingEdges([]);
      refreshTasks();

      if (savedCount > 0) {
        setNotification({
          type: 'success',
          title: `Dependencies Saved`,
          message: `Successfully saved ${savedCount} dependent${savedCount !== 1 ? 'ies' : 'y'}.${
            errors.length > 0 ? ` ${errors.length} failed: ${errors[0]}` : ''
          }`,
        });
      }

      if (errors.length > 0 && savedCount === 0) {
        setNotification({
          type: 'error',
          title: 'Failed to Save Dependencies',
          message: errors[0],
        });
      }
    } catch (err) {
      console.error('Error saving dependencies:', err);
      setNotification({
        type: 'error',
        title: 'Error Saving Dependencies',
        message: err.message,
      });
    }
  };

  const handleSaveEdge = async (edgeData) => {
    await api.post(`/tasks/${edgeData.to}/add_dependency/`, {
      dependency_id: edgeData.from,
    });

    refreshTasks();
    closeModal();
  };

  return (
    <div className="page-container">
      <StatusLegend />

      {/* Check if current user is team leader */}
      {(() => {
        const isTeamLeader = projectData && currentUser && 
          projectData.team_leader?.user_id === currentUser.id;
        
        return (
          <div className="controls-panel">
            {isTeamLeader && (
              <>
                <button
                  className="button"
                  onClick={() => {
                    console.log('[TaskIndex] Create Task clicked, setting modal');
                    setModal({ type: 'task', task: null });
                  }}
                >
                  + Create Task
                </button>

                <button
                  className="button"
                  onClick={() => {
                    console.log('[TaskIndex] Add Dependency clicked, setting modal');
                    setModal({ type: 'edge' });
                  }}
                >
                  + Add Dependency (Modal)
                </button>

                {pendingEdges.length > 0 && (
                  <button
                    className="button"
                    onClick={handleSaveAllDependencies}
                    style={{ backgroundColor: '#2fff00', color: '#000' }}
                  >
                    Save Dependencies ({pendingEdges.length})
                  </button>
                )}
              </>
            )}
          </div>
        );
      })()}

      {notification && (
        <ValidationNotification
          notification={notification}
          onClose={() => setNotification(null)}
        />
      )}

      <DAGVisualization
        nodes={nodes}
        edges={[...edges, ...pendingEdges]}
        onNodeEdit={handleNodeEdit}
        onNodeDelete={handleNodeDelete}
        onEdgesChange={setEdges}
        onAddEdge={handleAddEdge}
        onRemoveEdge={handleRemoveEdge}
        isTeamLeader={projectData && currentUser && projectData.team_leader?.user_id === currentUser.id}
        pendingEdges={pendingEdges}
        onNotification={setNotification}
      />

      {modal?.type === 'task' && (
        <>
          {console.log('[TaskIndex] Rendering TaskForm modal')}
          {createPortal(
            <TaskForm
              task={modal.task}
              projectMembers={projectData?.team_members?.filter(m => m.accepted) || []}
              onSave={handleSaveTask}
              onCancel={closeModal}
            />,
            document.getElementById('modal-root')
          )}
        </>
      )}

      {modal?.type === 'edge' && (
        <>
          {console.log('[TaskIndex] Rendering EdgeForm modal')}
          {createPortal(
            <EdgeForm
              nodes={nodes}
              onSave={handleSaveEdge}
              onCancel={closeModal}
            />,
            document.getElementById('modal-root')
          )}
        </>
      )}
    </div>
  );
};

export default Index;
