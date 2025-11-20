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
          {existingEdge ? 'Edit Dependency' : 'Create Dependency'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#444' }}>
              From (Dependency Task) *
            </label>
            <select
              value={formData.from}
              onChange={(e) => setFormData({ ...formData, from: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px' }}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#444' }}>
              To (Dependent Task) *
            </label>
            <select
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px' }}
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
            <p style={{ fontSize: '12px', color: '#e53e3e' }}>Cannot create dependency to itself</p>
          )}

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
              disabled={!formData.from || !formData.to || formData.from === formData.to}
            >
              {existingEdge ? 'Update' : 'Create'}
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
export default EdgeForm;