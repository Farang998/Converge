import { useState, useEffect } from 'react';

const TaskForm = ({ task = null, projectMembers = [], onSave, onCancel }) => {
  console.log('[TaskForm] Component rendered with task:', task);
  console.log('[TaskForm] Received projectMembers:', projectMembers);
  
  const [formData, setFormData] = useState({

    name: task?.name || '',
    description: task?.description || '',
    status: task?.status || 'pending',
    due_date: task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
    assigned_to: task?.assigned_to?.user_id || task?.assigned_to?.username || '',
  });

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
      assigned_to: formData.assigned_to || null,
    };

    if (task?.id) {
      taskData._id = task.id;
    }
    
    console.log('[TaskForm] Submitting taskData:', taskData);
    onSave(taskData);
  };

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#444' }}>
              Task Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px' }}
              required

            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#444' }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px', minHeight: '80px', fontFamily: 'inherit' }}
              placeholder="Add task description (optional)"

            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#444' }}>
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px' }}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="approval_pending">Approval Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#444' }}>
              Due Date
            </label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#444' }}>
              Assign To (optional - only accepted members)
            </label>
            <select

              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px' }}
            >
              <option value="">-- No assignment --</option>
              {projectMembers.length === 0 ? (
                <option disabled>No accepted members in project</option>
              ) : (
                projectMembers.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.username || member.user_id}
                  </option>
                ))
              )}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
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
          </div>
        </form>
      </div>
    </div>
  );
};
export default TaskForm;