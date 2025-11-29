import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import TaskDetailsModal from './TaskDetailsModal';

const TaskNode = memo(({ data, selected }) => {
  // Modal open state — only open when user clicks "Details"
  const [open, setOpen] = useState(false);
  const statusLabels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    approval_pending: 'Approval Pending',
  };

  const dueDate = data.due_date
    ? new Date(data.due_date).toLocaleDateString()
    : 'No due date';

  const createdDate = data.created_at
    ? new Date(data.created_at).toLocaleString()
    : null;

  const nodeClasses = [
    'task-node',
    `task-node--${data.status}`,
    selected ? 'task-node--selected' : '',
  ].join(' ');

  return (
    <>
      <div className={nodeClasses}>
        <Handle type="target" position={Position.Top} className="task-handle" />
        <div className="task-node-content">
          <div className="task-node-header">
            <h3>{data.name}</h3>
            <div className="task-node-header-right">
              <span className={`task-status task-status--${data.status}`}>{statusLabels[data.status]}</span>
              <button className="task-details-button" onClick={(e) => { e.stopPropagation(); setOpen(true); }} aria-label="Open details">Details</button>
            </div>
          </div>
          <div className="task-node-body">
            <div className="task-node-detail">
              <span>Due:</span>
              <span>{dueDate}</span>
            </div>
            {data.assigned_to?.length > 0 && (
              <div className="task-node-detail">
                <span>Assigned:</span>
                <span className="task-node-assignee">{data.assigned_to.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} className="task-handle" />
      </div>
      {open && (
        <TaskDetailsModal task={data} tasksList={data.tasksList} onClose={() => setOpen(false)} />
      )}
    </>
  );
});

TaskNode.displayName = 'TaskNode';

export default TaskNode;
