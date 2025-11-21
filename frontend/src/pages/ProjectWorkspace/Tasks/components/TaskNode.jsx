import { memo, useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import TaskDetailsModal from './TaskDetailsModal';

const TaskNode = memo(({ data, selected }) => {
  // Track manual close so user can dismiss modal while node remains selected
  const [closed, setClosed] = useState(false);

  // Reset closed state whenever selection changes to true again
  useEffect(() => {
    if (selected) {
      setClosed(false);
    }
  }, [selected]);
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
            <span className={`task-status task-status--${data.status}`}>{statusLabels[data.status]}</span>
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
      {selected && !closed && (
        <TaskDetailsModal task={data} tasksList={data.tasksList} onClose={() => setClosed(true)} />
      )}
    </>
  );
});

TaskNode.displayName = 'TaskNode';

export default TaskNode;
