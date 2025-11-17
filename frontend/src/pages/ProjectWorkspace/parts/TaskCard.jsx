
import React from 'react';


const getInitials = (name) => {
    if (!name) return '?';
    // Assume name is a simple string like 'Rohit' or 'user_2'
    return name.charAt(0).toUpperCase();
};

export default function TaskCard({ task, onToggle, onSelect, isSelected }) {
  // Determine the CSS class for the priority chip
  const priorityClass = task.priority ? `priority-${task.priority.toLowerCase()}` : 'priority-low';
  
  // NOTE: In a real app, map task.assignee ID to the member's full name (e.g., 'Rohit')
  // We use the raw assignee value for the avatar/text for now.
  const assigneeDisplay = task.assignee || 'Unassigned';

  return (
    <div 
      className={`task-card ${isSelected ? 'selected' : ''}`} // Apply selected class
      onClick={onSelect}
    >
      {/* CHECKBOX */}
      <div>
        <input 
          type="checkbox" 
          checked={task.status === 'done'} 
          onChange={e => { e.stopPropagation(); onToggle(); }} 
        />
      </div>

      {/* TASK BODY */}
      <div className="task-card-body">
        <div className="task-title">{task.title}</div>
        
        {/* METADATA ROW */}
        <div className="task-metadata">
          {/* PRIORITY TAG */}
          <span className={`priority-tag ${priorityClass}`}>
            {task.priority || 'Low'}
          </span>
          
          {/* ASSIGNEE DISPLAY (Avatar and Name) */}
          <span className="user-display">
             <div className="user-avatar">{getInitials(assigneeDisplay)}</div>
             {assigneeDisplay}
          </span>

          {/* LAST UPDATED */}
          <span>
            Updated {new Date(task.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      
      {/* STATUS (Optional: can remove this if checkbox is sufficient) */}
      <div style={{ marginLeft: 'auto' }} className="muted">
        {task.status === 'done' ? 'Completed' : 'Open'}
      </div>
    </div>
  );
}