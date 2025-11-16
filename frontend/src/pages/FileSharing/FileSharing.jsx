import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './FileSharing.css';
import { FaUpload, FaDownload, FaFile, FaUsers, FaSpinner, FaExclamationCircle, FaCheckCircle, FaEllipsisV, FaTrash } from 'react-icons/fa';

export default function FileSharing() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [projectInfo, setProjectInfo] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    if (projectId) {
      fetchFiles();
      fetchProjectInfo();
    }
  }, [projectId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && !event.target.closest('.file-menu-container')) {
        setMenuOpen(null);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [menuOpen]);

  const fetchProjectInfo = async () => {
    try {
      const response = await api.get('projects/');
      const projects = response.data || [];
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setProjectInfo(project);
      }
    } catch (err) {
      console.error('Error fetching project info:', err);
    }
  };

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
    if (!file) return;

    // Check file size (5 MB limit)
    const maxSize = 5 * 1024 * 1024; // 5 MB in bytes
    if (file.size > maxSize) {
      setError(`File size exceeds 5 MB limit. File size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      setSuccess('');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);

    try {
      const response = await api.post('file_sharing/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(`File "${file.name}" uploaded successfully!`);
      // Refresh file list
      await fetchFiles();
      // Clear file input
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload file');
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file) => {
    setSelectedFile(file);
    setError('');
    
    try {
      const response = await api.get(`file_sharing/download/${file.file_id}/`);
      const url = response.data.download_url;
      
      // Open download URL in new tab
      window.open(url, '_blank');
      
      // Alternatively, trigger download
      // const link = document.createElement('a');
      // link.href = url;
      // link.download = file.file_name;
      // document.body.appendChild(link);
      // link.click();
      // document.body.removeChild(link);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get download URL');
      console.error('Error downloading file:', err);
    } finally {
      setSelectedFile(null);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.file_name}"?`)) {
      return;
    }

    setDeleting(file.file_id);
    setError('');
    setSuccess('');
    setMenuOpen(null);

    try {
      await api.delete(`file_sharing/delete/${file.file_id}/`);
      setSuccess(`File "${file.file_name}" deleted successfully`);
      // Refresh file list
      await fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete file');
      console.error('Error deleting file:', err);
    } finally {
      setDeleting(null);
    }
  };

  const isFileOwner = (file) => {
    if (!user || !file.uploaded_by) return false;
    return file.uploaded_by.user_id === user.id || file.uploaded_by.id === user.id;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

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

  // Get participants with access (from project info or file data)
  const getParticipantsWithAccess = (file) => {
    // If file has participants_with_access from upload response, use that
    if (file.participants_with_access) {
      return file.participants_with_access;
    }
    
    // Otherwise, get from project info
    if (projectInfo) {
      const participants = [];
      if (projectInfo.team_leader) {
        participants.push({
          user_id: projectInfo.team_leader.user_id || projectInfo.team_leader.id,
          username: projectInfo.team_leader.username || 'Team Leader'
        });
      }
      if (projectInfo.team_members) {
        projectInfo.team_members.forEach(member => {
          if (member.accepted) {
            participants.push({
              user_id: member.user_id,
              username: member.username || 'Member'
            });
          }
        });
      }
      return participants;
    }
    
    return [];
  };

  if (!projectId) {
    return (
      <div className="file-sharing-container">
        <div className="error-message">
          <FaExclamationCircle /> No project ID provided
        </div>
      </div>
    );
  }

  return (
    <div className="file-sharing-container">
      <div className="file-sharing-header">
        <h2>File Sharing</h2>
        {projectInfo && (
          <div className="project-info">
            <span className="project-name">{projectInfo.name}</span>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="upload-section">
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            id="file-input"
            type="file"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          <label htmlFor="file-input" className="upload-label">
            {uploading ? (
              <>
                <FaSpinner className="spinner" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <FaUpload />
                <span>Click to upload or drag and drop</span>
                <small>Maximum file size: 5 MB</small>
              </>
            )}
          </label>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="message error">
          <FaExclamationCircle /> {error}
        </div>
      )}
      {success && (
        <div className="message success">
          <FaCheckCircle /> {success}
        </div>
      )}

      {/* Files List */}
      <div className="files-section">
        <h3>Files ({files.length})</h3>
        {loading ? (
          <div className="loading">
            <FaSpinner className="spinner" /> Loading files...
          </div>
        ) : files.length === 0 ? (
          <div className="empty-state">
            <FaFile />
            <p>No files uploaded yet</p>
            <small>Upload a file to get started</small>
          </div>
        ) : (
          <div className="files-grid">
            {files.map((file) => {
              const participants = getParticipantsWithAccess(file);
              return (
                <div key={file.file_id} className="file-card">
                  <div className="file-icon">
                    <FaFile />
                  </div>
                  <div className="file-info">
                    <div className="file-name" title={file.file_name}>
                      {file.file_name}
                    </div>
                    <div className="file-meta">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>{formatDate(file.uploaded_at)}</span>
                    </div>
                    <div className="file-uploader">
                      Uploaded by: <strong>{file.uploaded_by?.username || 'Unknown'}</strong>
                    </div>
                    {participants.length > 0 && (
                      <div className="file-access">
                        <FaUsers />
                        <span>{participants.length} user{participants.length !== 1 ? 's' : ''} have access</span>
                        <div className="access-tooltip">
                          <div className="access-list">
                            {participants.map((p) => (
                              <div key={p.user_id} className="access-item">
                                {p.username}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="file-actions">
                    <button
                      className="btn-download"
                      onClick={() => handleDownload(file)}
                      disabled={selectedFile?.file_id === file.file_id}
                    >
                      <FaDownload />
                      {selectedFile?.file_id === file.file_id ? 'Downloading...' : 'Download'}
                    </button>
                    {isFileOwner(file) && (
                      <div className="file-menu-container">
                        <button
                          className="file-menu-btn"
                          onClick={() => setMenuOpen(menuOpen === file.file_id ? null : file.file_id)}
                          disabled={deleting === file.file_id}
                        >
                          <FaEllipsisV />
                        </button>
                        {menuOpen === file.file_id && (
                          <div className="file-menu">
                            <button
                              className="file-menu-item delete"
                              onClick={() => handleDelete(file)}
                              disabled={deleting === file.file_id}
                            >
                              {deleting === file.file_id ? (
                                <>
                                  <FaSpinner className="spinner" /> Deleting...
                                </>
                              ) : (
                                <>
                                  <FaTrash /> Delete
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}