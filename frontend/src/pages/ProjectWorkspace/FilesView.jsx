// src/components/ProjectWorkspace/FilesView.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import FileCard from './parts/FileCard';
import { FaSpinner, FaExclamationCircle } from 'react-icons/fa';
import GitHubImport from './GitHubImport';

export default function FilesView({ projectId: propProjectId }) {
  const { projectId: paramProjectId } = useParams();
  const projectId = propProjectId || paramProjectId;
  
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isGitHubImportOpen, setIsGitHubImportOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchFiles();
    }
  }, [projectId]);

  const fetchFiles = async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`file_sharing/project/${projectId}/`);
      setFiles(response.data.files || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load files');
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file) => {
    if (!file || !projectId) return;

    // Check file size (5 MB limit)
    const maxSize = 5 * 1024 * 1024; // 5 MB in bytes
    if (file.size > maxSize) {
      setError(`File size exceeds 5 MB limit. File size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);

    try {
      await api.post('file_sharing/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Refresh file list
      await fetchFiles();
      // Clear file input
      const fileInput = document.getElementById('file-input-workspace');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload file');
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="view-grid">
      <div className="view-content"></div>
      <div className="view-card">
        <div className="files-header">
          <label className={`btn primary ${uploading ? 'disabled' : ''}`}>
            {uploading ? (
              <>
                <FaSpinner className="spinner" style={{ marginRight: '8px' }} />
                Uploading...
              </>
            ) : (
              'Upload file'
            )}
            <input
              id="file-input-workspace"
              type="file"
              hidden
              onChange={(e) => handleFileSelect(e.target.files[0])}
              disabled={uploading}
            />
          </label>
          <button
            type="button"
            className={`btn secondary ${uploading ? 'disabled' : ''}`}
            onClick={() => setIsGitHubImportOpen(true)}
            disabled={uploading}
            style={{ marginLeft: 8 }}
          >
            Import from GitHub
          </button>
        </div>

        {error && (
          <div className="error-message" style={{ 
            padding: '12px', 
            background: '#fee', 
            color: '#c33', 
            borderRadius: '8px', 
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FaExclamationCircle /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#6c7385' }}>
            <FaSpinner className="spinner" style={{ fontSize: '24px', marginBottom: '12px' }} />
            <div>Loading files...</div>
          </div>
        ) : (
          <div className="files-grid">
            {files.map(f => (
              <FileCard 
                key={f.file_id} 
                file={f} 
                projectId={projectId}
              />
            ))}
            {files.length === 0 && (
              <div className="muted" style={{ textAlign: 'center', padding: '48px' }}>
                No files uploaded yet.
              </div>
            )}
          </div>
        )}
      </div>
      {isGitHubImportOpen && (
        <GitHubImport
          projectId={projectId}
          onImportSuccess={async () => { await fetchFiles(); setIsGitHubImportOpen(false); }}
          onClose={() => setIsGitHubImportOpen(false)}
        />
      )}
    </main>
  );
}
