// src/components/ProjectWorkspace/FilesView.jsx
import React from 'react';
import FileCard from './parts/FileCard';

export default function FilesView({ files, onUpload }) {
  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    onUpload(f);
  }

  return (
  <main className="view-grid">
    <div className="view-content"></div>
    <div className="view-card">
      <div className="files-header">
        <label className="btn primary">
          Upload file
          <input type="file" hidden onChange={handleFile} />
        </label>
      </div>

      <div className="files-grid">
        {files.map(f => <FileCard key={f.id} file={f} />)}
        {files.length === 0 && <div className="muted">No files uploaded yet.</div>}
      </div>
    </div>
    </main>
  );
}
