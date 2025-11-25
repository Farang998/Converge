import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

const TaskForm = ({ task = null, projectMembers = [], onSave, onCancel, projectName, projectId }) => {
  console.log('[TaskForm] Component rendered with task:', task);
  console.log('[TaskForm] Received projectMembers:', projectMembers);

  // Convert task.assigned_to (array of {user_id, username}) into array of IDs
  const initialAssignees = task?.assigned_to
    ? task.assigned_to.map(u => u.user_id)
    : [];

  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    status: task?.status || 'pending',
    due_date: task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
    assigned_to: initialAssignees, // ARRAY NOW
  });

  // Toggle a user in/out of the assigned_to list
  const toggleAssignee = (userId) => {
    setFormData(prev => {
      const alreadyAssigned = prev.assigned_to.includes(userId);
      if (alreadyAssigned) {
        return { ...prev, assigned_to: prev.assigned_to.filter(id => id !== userId) };
      } else {
        return { ...prev, assigned_to: [...prev.assigned_to, userId] };
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Task name is required');
      return;
    }

    const dueDateISO = formData.due_date
      ? new Date(formData.due_date).toISOString()
      : null;

    const taskData = {
      name: formData.name,
      description: formData.description || '',
      status: formData.status,
      due_date: dueDateISO,
      assigned_to: formData.assigned_to, // array of userIds
    };

    if (task?.id) {
      taskData._id = task.id;
    }

    console.log('[TaskForm] Submitting taskData:', taskData);
    onSave(taskData);
  };

  const navigate = useNavigate();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          padding: '24px',
          width: '90%',
          maxWidth: '450px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 700 }}>
          {task ? 'Edit Task' : 'Create New Task'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Name */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#444' }}>
              Task Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#444' }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                fontSize: '14px',
                minHeight: '80px',
                fontFamily: 'inherit'
              }}
              placeholder="Add task description (optional)"
            />
          </div>

          {/* Due Date */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#444' }}>
              Due Date
            </label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Multi-Assignee Selection */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#444' }}>
              Assign To (select multiple)
            </label>

            {projectMembers.length === 0 ? (
              <p style={{ color: '#999', fontSize: '13px' }}>
                No accepted members in this project.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {projectMembers.map(member => {
                  const isSelected = formData.assigned_to.includes(member.user_id);

                  return (
                    <div
                      key={member.user_id}
                      onClick={() => toggleAssignee(member.user_id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        border: isSelected ? '2px solid #03003b' : '1px solid #ccc',
                        backgroundColor: isSelected ? '#03003b' : 'white',
                        color: isSelected ? 'white' : '#333',
                        userSelect: 'none'
                      }}
                    >
                      {member.username}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexWrap:'wrap', gap: '12px', marginTop: '16px' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                backgroundColor: '#03003b',
                color: 'white'
              }}
            >
              {task ? 'Update' : 'Create'}
            </button>

            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                backgroundColor: '#e0e0e0',
                color: '#333'
              }}
            >
              Cancel
            </button>

            {task && projectId && (
              <button
                type="button"
                onClick={() => {
                  const aiTaskPayload = {
                    name: task.name,
                    description: task.description,
                    status: task.status,
                    due_date: task.due_date,
                    assigned_to: (task.assigned_to || []).map(u => (typeof u === 'string' ? u : u.username)),
                    dependencies: task.dependencies || [],
                  };
                  navigate(`/projects/${projectId}/tasks/${task.id}/ai-agent`, { state: { projectName } });
                }}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  backgroundColor: '#03003b',
                  color: '#fff'
                }}
              >
                AI Agent (Coming Soon)
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};

export default TaskForm;
