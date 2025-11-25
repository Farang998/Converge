import React, { useState } from 'react';
import api from '../../services/api';
import './GitHubImport.css';

// Modal to import a GitHub repository into project storage (S3) and then
// call the ingest API with the list of S3 URIs returned by the importer.
export default function GitHubImport({ projectId, onImportSuccess, onClose }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [token, setToken] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const resetState = () => {
    setRepoUrl('');
    setBranch('');
    setToken('');
    setIsPrivate(false);
    setLoading(false);
    setError('');
    setMessage('');
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!projectId) {
      setError('Missing project id');
      return;
    }
    if (!repoUrl || !repoUrl.trim()) {
      setError('Repository URL is required');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        repo_url: repoUrl.trim(),
        branch: branch?.trim() || undefined,
      };
      if (isPrivate && token) payload.token = token;

      // Call backend importer
      const resp = await api.post(`projects/${projectId}/import-github/`, payload);
      const data = resp.data || {};

      const files = Array.isArray(data.files) ? data.files : (data.uploaded_files || []);
      
      // Backend now handles ingest API call automatically
      const ingestStarted = data.ingest_started || false;
      setMessage(`Import completed! ${files.length} files uploaded.${ingestStarted ? ' Ingest started.' : ''}`);

      // Let parent refresh file list
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Import failed');
      console.error('Import error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop theme-light" data-theme="light">
      <div className="modal-card" style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Import from GitHub</h3>
          <button className="btn ghost" onClick={() => { resetState(); onClose && onClose(); }}>Close</button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <label>Repository URL (e.g. https://github.com/owner/repo)</label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              style={{ width: '100%' }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label>Branch (optional)</label>
              <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" />
            </div>
            <div style={{ width: 140 }}>
              <label style={{ display: 'block' }}>Private repo?</label>
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            </div>
          </div>

          {isPrivate && (
            <div style={{ marginBottom: 8 }}>
              <label>GitHub token (with repo access)</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                style={{ width: '100%' }}
                required
              />
            </div>
          )}

          {error && <div style={{ color: '#c33', marginBottom: 8 }}>{error}</div>}
          {message && <div style={{ color: '#2a7', marginBottom: 8 }}>{message}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Importing...' : 'Import and Ingest'}
            </button>
            <button type="button" className="btn" onClick={() => { resetState(); onClose && onClose(); }} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
 
