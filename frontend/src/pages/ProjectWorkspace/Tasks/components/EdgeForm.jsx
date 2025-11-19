import { useState } from 'react';

const EdgeForm = ({ nodes, onSave, onCancel, existingEdge = null }) => {
  const [formData, setFormData] = useState({
    from: existingEdge?.from || '',
    to: existingEdge?.to || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.from && formData.to && formData.from !== formData.to) {
      onSave({ from: formData.from, to: formData.to });
    }
  };

  // Filter out the selected 'to' node from 'from' options and vice versa
  const fromOptions = nodes.filter(node => node.id !== formData.to);
  const toOptions = nodes.filter(node => node.id !== formData.from);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>
          {existingEdge ? 'Edit Dependency' : 'Create Dependency'}
        </h2>
        
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label className="form-label">
              From (Dependency Task) *
            </label>
            <select
              value={formData.from}
              onChange={(e) => setFormData({ ...formData, from: e.target.value })}
              className="form-select"
              required
              disabled={!!existingEdge}
            >
              <option value="">Select a task</option>
              {fromOptions.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} ({node.id})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              To (Dependent Task) *
            </label>
            <select
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              className="form-select"
              required
              disabled={!!existingEdge}
            >
              <option value="">Select a task</option>
              {toOptions.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} ({node.id})
                </option>
              ))}
            </select>
          </div>

          {formData.from && formData.to && formData.from === formData.to && (
            <p className="form-error">Cannot create dependency to itself</p>
          )}

          <div className="form-button-group">
            <button
              type="submit"
              className="button button-primary"
              disabled={!formData.from || !formData.to || formData.from === formData.to}
            >
              {existingEdge ? 'Update' : 'Create'}
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

export default EdgeForm;