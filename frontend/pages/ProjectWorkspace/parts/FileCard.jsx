// src/components/ProjectWorkspace/parts/FileCard.jsx
import React from 'react';

export default function FileCard({ file }) {
  return (
    <div className="file-card">
      <div className="file-name">{file.name}</div>
      <div className="muted">{file.size} • {new Date(file.uploadedAt).toLocaleString()}</div>
      <div style={{ marginTop: 8 }}>
        <button className="btn ghost" onClick={() => alert('Preview ' + file.name)}>Preview</button>
        <button className="btn ghost" onClick={() => alert('Download ' + file.name)}>Download</button>
      </div>
    </div>
  );
}
