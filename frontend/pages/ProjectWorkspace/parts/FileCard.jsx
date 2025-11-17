// src/components/ProjectWorkspace/parts/FileCard.jsx
import React, { useState } from 'react';
import api from '../../../src/services/api';
import { FaDownload, FaSpinner, FaUsers } from 'react-icons/fa';

export default function FileCard({ file, projectId }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    
    try {
      const response = await api.get(`file_sharing/download/${file.file_id}/`);
      const url = response.data.download_url;
      
      // Open download URL in new tab
      window.open(url, '_blank');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get download URL');
      console.error('Error downloading file:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Get access count (project participants have access)
  const getAccessCount = () => {
    // This would ideally come from the file data or project info
    // For now, we'll show a placeholder
    return 'All project members';
  };

  return (
    <div className="file-card">
      <div className="file-name">{file.file_name}</div>
      <div className="muted">
        {formatFileSize(file.file_size)} • {formatDate(file.uploaded_at)}
      </div>
      {file.uploaded_by && (
        <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
          Uploaded by: <strong>{file.uploaded_by.username || 'Unknown'}</strong>
        </div>
      )}
      {error && (
        <div style={{ 
          fontSize: '12px', 
          color: '#c33', 
          marginTop: '8px',
          padding: '4px',
          background: '#fee',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: 8, display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button 
          className="btn ghost" 
          onClick={handleDownload}
          disabled={downloading}
          style={{ flex: 1 }}
        >
          {downloading ? (
            <>
              <FaSpinner className="spinner" style={{ marginRight: '4px' }} />
              Downloading...
            </>
          ) : (
            <>
              <FaDownload style={{ marginRight: '4px' }} />
              Download
            </>
          )}
        </button>
      </div>
      <div style={{ 
        marginTop: '8px', 
        fontSize: '11px', 
        color: '#6c7385',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <FaUsers style={{ fontSize: '10px' }} />
        <span>{getAccessCount()}</span>
      </div>
    </div>
  );
}
