import { useState } from 'react';

const TaskForm = ({ task = null, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    id: task?.id || '',
    name: task?.name || '',
    status: task?.status || 'pending',
    due_date: task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
    assigned_to: task?.assigned_to || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const dueDateISO = formData.due_date 
      ? new Date(formData.due_date).toISOString() 
      : null; // Set to null if empty
    
    const taskData = {
      id: formData.id,
      name: formData.name,
      status: formData.status,
      due_date: dueDateISO,
      assigned_to: formData.assigned_to || null,
    };
    
    onSave(taskData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>
          {task ? 'Edit Task' : 'Create New Task'}
        </h2>
        
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label className="form-label">
              Task ID *
            </label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              className="form-input"
              required
              disabled={!!task}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Task Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="form-select"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Due Date
            </label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Assigned To
            </label>
            <input
              type="text"
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="form-input"
              placeholder="Username or leave empty"
            />
          </div>

          <div className="form-button-group">
            <button
              type="submit"
              className="button button-primary"
            >
              {task ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="button button-secondary"
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