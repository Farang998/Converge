import React, { useState } from 'react';
import './GitHubImport.css';
import api from '../../src/services/api';

const GitHubImport = ({ projectId, onImportSuccess, onClose }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [githubToken, setGithubToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  const handleImport = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        repo_url: repoUrl,
        branch: branch || 'main'
      };

      // Include GitHub token only if provided (for private repos)
      if (githubToken.trim()) {
        payload.github_token = githubToken.trim();
      }

      const response = await api.post(
        `/projects/${projectId}/import-github/`,
        payload
      );

      if (response.data.success) {
        // Show success message
        alert(`Successfully imported ${response.data.total_files} files from ${response.data.repository.full_name}`);
        
        // Call success callback
        if (onImportSuccess) {
          onImportSuccess(response.data);
        }
        
        // Reset form
        setRepoUrl('');
        setBranch('main');
        setGithubToken('');
        setShowTokenInput(false);
        
        // Close modal if provided
        if (onClose) {
          onClose();
        }
      }
    } catch (err) {
      console.error('GitHub import error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to import repository. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setRepoUrl('');
    setBranch('main');
    setGithubToken('');
    setShowTokenInput(false);
    setError('');
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="github-import-modal">
      <div className="github-import-content">
        <div className="github-import-header">
          <h2>Import GitHub Repository</h2>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>

        <form onSubmit={handleImport} className="github-import-form">
          <div className="form-group">
            <label htmlFor="repoUrl">
              Repository URL <span className="required">*</span>
            </label>
            <input
              id="repoUrl"
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repository"
              required
              disabled={loading}
              className="form-input"
            />
            <small className="form-hint">
              Paste the GitHub repository URL (e.g., https://github.com/owner/repo)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="branch">Branch</label>
            <input
              id="branch"
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              disabled={loading}
              className="form-input"
            />
            <small className="form-hint">
              Default: main (will try 'master' if 'main' doesn't exist)
            </small>
          </div>

          <div className="form-group">
            <div className="private-repo-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={showTokenInput}
                  onChange={(e) => setShowTokenInput(e.target.checked)}
                  disabled={loading}
                />
                <span>Private repository (requires token)</span>
              </label>
            </div>
          </div>

          {showTokenInput && (
            <div className="form-group">
              <label htmlFor="githubToken">
                GitHub Personal Access Token
              </label>
              <input
                id="githubToken"
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                disabled={loading}
                className="form-input"
              />
              <small className="form-hint">
                Required for private repositories. 
                <a 
                  href="https://github.com/settings/tokens" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="token-link"
                >
                  Generate token
                </a>
              </small>
            </div>
          )}

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="import-info">
            <h4>What will be imported:</h4>
            <ul>
              <li>All files from the selected branch</li>
              <li>Files will be stored in AWS S3</li>
              <li>Maximum 500 files (100MB each)</li>
              <li>Common directories like node_modules, .git will be excluded</li>
            </ul>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-cancel"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-import"
              disabled={loading || !repoUrl.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Importing...
                </>
              ) : (
                <>
                  <span className="import-icon">📦</span>
                  Import Repository
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GitHubImport;
