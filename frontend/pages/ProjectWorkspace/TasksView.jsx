// src/components/ProjectWorkspace/TasksView.jsx
import React, { useState } from 'react';
import TaskCard from './parts/TaskCard';

export default function TasksView({ tasks, toggleTaskStatus, selectTask, selectedTask }) {
  // Use selectedTask prop passed from ProjectWorkspace to highlight the active card
  const [query, setQuery] = useState('');
  const filtered = tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));

  return (
    // Removed redundant view-grid and view-content wrappers
    <div className="container-card">
      <div className="tasks-toolbar">
        
        {/* Search and Filter Group */}
        <div className="search-filter-group">
          <input className="input" placeholder="Search tasks..." value={query} onChange={e => setQuery(e.target.value)} />
          {/* Placeholder for future filter implementation */}
          <button className="filter-btn">
             {/* Use your icon component here, e.g., <FilterIcon size={16} /> */}
             Filter
          </button>
        </div>
        
        
      </div>

      <div className="tasks-list">
        {filtered.map(t => (
          <TaskCard 
            key={t.id} 
            task={t} 
            onToggle={() => toggleTaskStatus(t.id)} 
            onSelect={() => selectTask(t)} 
            // Pass the selection state
            isSelected={selectedTask && selectedTask.id === t.id}
          />
        ))}
        {filtered.length === 0 && <div className="muted">No tasks match your search.</div>}
      </div>
    </div>
  );
}