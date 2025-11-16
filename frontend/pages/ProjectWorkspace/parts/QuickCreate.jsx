// src/components/ProjectWorkspace/parts/QuickCreate.jsx
import React, { useState } from 'react';

export default function QuickCreate({ onCreate }) {
  const [val, setVal] = useState('');
  return (
    <div>
      <input className="input" value={val} onChange={e => setVal(e.target.value)} placeholder="Task title" />
      <div className="mt-sm">
        <button className="btn primary" onClick={() => { if (val.trim()) { onCreate(val.trim()); setVal(''); } }}>Create</button>
      </div>
    </div>
  );
}
