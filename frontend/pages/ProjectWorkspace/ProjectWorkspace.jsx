// main container orchestrating data and views.
import React, { useState, useMemo, Suspense, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../../src/services/api';
import ProjectHeader from './ProjectHeader';
import StatusStrip from './StatusStrip';
import ProjectNav from './ProjectNav';
import OverviewView from './OverviewView';
import TasksView from './TasksView';
import FilesView from './FilesView';
import ActivityView from './ActivityView';
import RightPanel from './RightPanel';
import QuickCreate from './parts/QuickCreate';
import './ProjectWorkspace.css';
import ProjectDetailsModal from './parts/ProjectDetailsModal';
import GitHubImport from './GitHubImport';


const TimelineView = React.lazy(() => import('./TimelineView'));

// --- Mock data (in a real app replace with API calls) ---
const nowIso = () => new Date().toISOString();

const sampleProject = {
  id: 'proj_123',
  name: 'Project 1',
  owner: { id: 'user_1', name: 'Ishti Patel' },
  members: [
    { id: 'user_1', name: 'Ishti' },
    { id: 'user_2', name: 'Rohit' },
    { id: 'user_3', name: 'Ayesha' }
  ],
  description: 'A small collaboration workspace to manage tasks, files and timelines.'
};

const seedTasks = [
  { id: 't1', title: 'Design project page', status: 'in_progress', assignee: 'user_2', milestone: 'm1', updatedAt: nowIso(), priority: 'High' },
  { id: 't2', title: 'Implement file upload', status: 'todo', assignee: 'user_3', milestone: 'm1', updatedAt: nowIso(), priority: 'Medium' },
  { id: 't3', title: 'Write API endpoints', status: 'done', assignee: 'user_1', milestone: 'm0', updatedAt: nowIso(), priority: 'High' }
];

const seedFiles = [
  { id: 'f1', name: 'requirements.pdf', uploader: 'user_1', uploadedAt: nowIso(), size: '230KB' },
  { id: 'f2', name: 'wireframe.png', uploader: 'user_2', uploadedAt: nowIso(), size: '480KB' }
];

const seedMilestones = [
  { id: 'm0', title: 'Discovery', dueDate: '2025-11-05', state: 'complete', progress: 100 },
  { id: 'm1', title: 'MVP', dueDate: '2025-11-25', state: 'in_progress', progress: 42 },
  { id: 'm2', title: 'Beta release', dueDate: '2025-12-20', state: 'upcoming', progress: 0 }
];

const seedActivity = [
  { id: 'a1', text: 'Ishti marked "Write API endpoints" as done', time: nowIso() },
  { id: 'a2', text: 'Rohit uploaded wireframe.png', time: nowIso() }
];

// --- Main component ---
export default function ProjectWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();

  // Prefer project from navigation state (fast). Otherwise seed sampleProject while we fetch.
  const initialProject = location?.state?.project ?? sampleProject;

  // App-level state
  const [project, setProject] = useState(initialProject);
  const [tasks, setTasks] = useState(seedTasks);
  const [files, setFiles] = useState(seedFiles);
  const [milestones] = useState(seedMilestones);
  const [activity, setActivity] = useState(seedActivity);
  const [activeView, setActiveView] = useState('overview'); // overview|tasks|files|timeline|activity
  const [selectedTask, setSelectedTask] = useState(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isGitHubImportOpen, setIsGitHubImportOpen] = useState(false);
  // Derived KPIs
  const completedCount = useMemo(() => tasks.filter(t => t.status === 'done').length, [tasks]);
  const progressPct = Math.round((completedCount / Math.max(1, tasks.length)) * 100);

  const handleSaveProjectDetails = (updatedProject, invitations) => {
    setProject(updatedProject);
    // In a real app: handle member invitations here (e.g., updating a 'members' state array)
    console.log('Project updated:', updatedProject);
    console.log('Invitations sent:', invitations);
    addActivity('Updated project details');
  };

  // Helpers
  function addActivity(text) {
    setActivity(prev => [{ id: 'a' + Date.now(), text, time: nowIso() }, ...prev].slice(0, 200));
  }

  // If a projectId is present in the route, try to load the project from backend.
  // We only fetch when projectId exists and it doesn't match the current project.id.
  useEffect(() => {
    if (!projectId) return;

    // If we already have a project from location state and its id matches, skip fetch.
    if (project && project.id === projectId) return;

    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get('projects/');
        const data = resp?.data;
        if (Array.isArray(data)) {
          const found = data.find(p => p.id === projectId);
          if (!cancelled) {
            const toUse = found || data[0];
            if (toUse) {
              // normalize backend project shape to the UI shape expected by this component
              const mapped = {
                id: toUse.id || toUse._id || (toUse.project_id && String(toUse.project_id)),
                name: toUse.name || toUse.title || 'Project',
                description: toUse.description || '',
                owner: (toUse.team_leader && {
                  id: toUse.team_leader.user_id || toUse.team_leader.id || String(toUse.team_leader),
                  name: toUse.team_leader.username || toUse.team_leader.name || 'Owner'
                }) || (toUse.owner || { id: null, name: 'Owner' }),
                members: Array.isArray(toUse.team_members)
                  ? toUse.team_members.map(m => ({ id: m.user || m.user_id || m.id, name: m.username || m.name || String(m.user || m.user_id || '') }))
                  : (toUse.members || []),
              };
              setProject(mapped);
            }
          }
        }
      } catch (err) {
        // If unauthenticated or error, keep the seeded/initial project and log
        console.debug('Could not load project from API:', err?.message || err);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, project]);

  useEffect(() => {
    const handleOpenGitHubImport = () => {
      setIsGitHubImportOpen(true);
    };
    
    window.addEventListener('openGitHubImport', handleOpenGitHubImport);
    
    return () => {
      window.removeEventListener('openGitHubImport', handleOpenGitHubImport);
    };
  }, []);

  function createTask(title) {
    const t = { id: 't' + Date.now(), title, status: 'todo', assignee: null, milestone: null, updatedAt: nowIso(), priority: 'Low' };
    setTasks(prev => [t, ...prev]);
    addActivity(`Created task "${title}"`);
    setActiveView('tasks');
  }

  function toggleTaskStatus(id) {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = t.status === 'done' ? 'todo' : 'done';
      addActivity(`Changed status of "${t.title}" to ${next}`);
      return { ...t, status: next, updatedAt: nowIso() };
    }));
  }

  function uploadFile(file) {
    const f = { id: 'f' + Date.now(), name: file.name, uploader: project?.owner?.id ?? 'unknown', uploadedAt: nowIso(), size: `${Math.round(file.size / 1024)}KB` };
    setFiles(prev => [f, ...prev]);
    addActivity(`Uploaded file ${file.name}`);
    setActiveView('files');
  }

  // Layout: header -> status strip -> content (grid). Content area is scrollable and full-height.
  return (
    <div className="pw-root">
      <ProjectHeader 
        project={project} 
        progressPct={progressPct} 
        onOpenDetails={() => setIsDetailsModalOpen(true)}
      />

      {/* small toolbar under header */}
      <div className="pw-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
          <button onClick={() => navigate(-1)} className="pw-back-btn">← Back</button>
          <div style={{ fontSize: 14, color: '#555' }}>
            {project ? `${project.name}` : 'Project'}
            {projectId ? <span style={{ marginLeft: 8, color: '#888' }}>• {projectId}</span> : null}
          </div>
        </div>

        <StatusStrip progress={progressPct} nextMilestone={milestones.find(m => m.state === 'in_progress')} lastActivity={activity[0]} />

        <div className="pw-content">
          <aside className="pw-left">
            <ProjectNav 
              active={activeView} 
              setActive={setActiveView} 
              project={project}
              navItems={[
                { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
                { id: 'tasks', label: 'Tasks', icon: 'CheckSquare' },
                { id: 'files', label: 'Files', icon: 'Folder' },
                { id: 'timeline', label: 'Timeline', icon: 'Clock' },
                { id: 'activity', label: 'Activity', icon: 'Activity' }
              ]}
            />
          </aside>

          <main className="pw-main">
            {activeView === 'overview' && <OverviewView project={project} tasks={tasks} files={files} activity={activity} onCreateTask={createTask} />}
            {activeView === 'tasks' && <TasksView tasks={tasks} toggleTaskStatus={toggleTaskStatus} selectTask={setSelectedTask} />}
            {activeView === 'files' && <FilesView projectId={projectId} />}
            {activeView === 'activity' && <ActivityView activity={activity} />}

            {activeView === 'timeline' && (
              <Suspense fallback={<div className="skeleton">Loading timeline…</div>}>
                <TimelineView milestones={milestones} tasks={tasks} />
              </Suspense>
            )}
          </main>

          <aside className="pw-right">
            <RightPanel project={project} members={project?.members ?? []} selectedTask={selectedTask} />
            <div style={{ marginTop: 12 }}>
              <QuickCreate onCreate={createTask} />
            </div>
          </aside>
        </div>
      </div>
      
      <ProjectDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        project={project}
        members={project?.members ?? []}
        onSave={handleSaveProjectDetails}
      />
      
      {isGitHubImportOpen && (
        <GitHubImport
          projectId={projectId}
          onImportSuccess={(data) => {
            addActivity(`Imported ${data.total_files} files from ${data.repository.full_name}`);
            setActiveView('files');
          }}
          onClose={() => setIsGitHubImportOpen(false)}
        />
      )}
    </div>
  );
}
