import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import '../tasks.css';

const statusLabels = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  approval_pending: 'Approval Pending',
};

const TaskDetailsModal = ({ task, tasksList = [], onClose }) => {
  if (!task) return null;

  const dueDate = task.due_date ? new Date(task.due_date).toLocaleString() : 'No due date';
  const createdDate = task.created_at ? new Date(task.created_at).toLocaleString() : null;

  // Map dependency ids to names using provided tasks list
  const dependencyNames = useMemo(() => {
    if (!Array.isArray(task.dependencies)) return [];
    const byId = new Map(tasksList.map(t => [t.id, t]));
    return task.dependencies.map(id => byId.get(id)?.name || id);
  }, [task.dependencies, tasksList]);

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('task-modal-backdrop')) {
      onClose();
    }
  };

  return createPortal(
    <div className="task-modal-backdrop" onClick={handleBackdropClick}>
      <div className="task-modal">
        <div className="task-modal-header">
          <div className="task-modal-titleblock">
            <h2>{task.name}</h2>
            <div className="task-modal-badges">
              <span className={`task-status task-status--${task.status}`}>{statusLabels[task.status]}</span>
            </div>
          </div>
        </div>
        <div className="task-modal-body">
          <div className="task-modal-grid">
            <div className="task-modal-cell">
              <label>Due Date</label>
              <span>{dueDate}</span>
            </div>
            {createdDate && (
              <div className="task-modal-cell">
                <label>Created</label>
                <span>{createdDate}</span>
              </div>
            )}
            {task.assigned_to?.length > 0 && (
              <div className="task-modal-cell">
                <label>Assignees</label>
                <span>{Array.isArray(task.assigned_to) ? task.assigned_to.join(', ') : task.assigned_to}</span>
              </div>
            )}
            {task.calendar_event_id && (
              <div className="task-modal-cell">
                <label>Calendar Event</label>
                <span>{task.calendar_event_id}</span>
              </div>
            )}
          </div>

          {task.description && (
            <div className="task-modal-section">
              <label>Description</label>
              <p>{task.description}</p>
            </div>
          )}

          {dependencyNames.length > 0 && (
            <div className="task-modal-section">
              <label>Dependencies</label>
              <div className="task-modal-taglist">
                {dependencyNames.map(name => (
                  <span key={name} className="task-modal-tag">{name}</span>
                ))}
              </div>
            </div>
          )}

          {task.related_files?.length > 0 && (
            <div className="task-modal-section">
              <label>Related Files</label>
              <div className="task-modal-taglist">
                {task.related_files.map(f => (
                  <span key={f} className="task-modal-tag task-modal-tag--file">{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TaskDetailsModal;
