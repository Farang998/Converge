import { memo } from 'react';
import { Handle, Position } from 'reactflow';

const TaskNode = memo(({ data, selected }) => {

  const statusLabels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    approval_pending: 'Approval Pending',
  };

  const dueDate = data.due_date ? new Date(data.due_date).toLocaleDateString() : 'No due date';

  // Construct class names
  const nodeClasses = [
    'task-node',
    `task-node--${data.status}`,
    selected ? 'task-node--selected' : '',
  ].join(' ');

  const statusClasses = [
    'task-status',
    `task-status--${data.status}`
  ].join(' ');

  return (
    <div className={nodeClasses}>
      <Handle
        type="target"
        position={Position.Top}
        className="task-handle"
      />

      <div className="task-node-content">
        <div className="task-node-header">
          <h3>{data.name}</h3>
          <span className={statusClasses}>
            {statusLabels[data.status]}
          </span>
        </div>
        
        <div className="task-node-body">
          <div className="task-node-detail">
            <span>Due:</span>
            <span>{dueDate}</span>
          </div>
          {data.assigned_to && (
            <div className="task-node-detail">
              <span>Assigned:</span>
              <span className="task-node-assignee">{data.assigned_to}</span>
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="task-handle"
      />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';

export default TaskNode;