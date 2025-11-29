import React, { useState, useMemo, Suspense, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ProjectHeader from './ProjectHeader';
import StatusStrip from './StatusStrip';
import ProjectNav from './ProjectNav';
import OverviewView from './OverviewView';
import FilesView from './FilesView';
import './ProjectWorkspace.css';
import ProjectDetailsModal from './parts/ProjectDetailsModal';
import Index from './Tasks/Index';
import CalendarView from './Calendar/CalendarView';


const nowIso = () => new Date().toISOString();

const sampleProject = {
  id: 'proj_123',
  name: 'Project 1',
  owner: { id: 'user_1', name: 'User1' },
  members: [
    { id: 'user_1', name: 'User_1' },
    { id: 'user_2', name: 'User_2' },
    { id: 'user_3', name: 'User_3' }
  ],
  description: 'This is the description of the project.'
};

const seedTasks = [
  { id: 't1', title: 'Design project page', status: 'in_progress', assignee: 'user_2', milestone: 'm1', updatedAt: nowIso(), priority: 'High' },
  { id: 't2', title: 'Implement file upload', status: 'todo', assignee: 'user_3', milestone: 'm1', updatedAt: nowIso(), priority: 'Medium' },
];

const seedFiles = [
  { id: 'f1', name: 'requirements.pdf', uploader: 'user_1', uploadedAt: nowIso(), size: '230KB' },
  { id: 'f2', name: 'wireframe.png', uploader: 'user_2', uploadedAt: nowIso(), size: '480KB' }
];



// --- Main component ---
export default function ProjectWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  // `AuthContext` is not present in this workspace for some environments
  // so fall back to a null user to avoid unresolved import errors during dev.
  const user = null;

  // Prefer project from navigation state (fast). Otherwise seed sampleProject while we fetch.
  const initialProject = location?.state?.project ?? sampleProject;

  // App-level state
  const [project, setProject] = useState(initialProject);
  const [tasks, setTasks] = useState(seedTasks);
  const [files, setFiles] = useState(seedFiles);
  const [activeView, setActiveView] = useState('overview'); // overview|tasks|files|calendar
  const [, setSelectedTask] = useState(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  // Derived KPIs
  const completedCount = useMemo(() => tasks.filter(t => t.status === 'done').length, [tasks]);
  const progressPct = Math.round((completedCount / Math.max(1, tasks.length)) * 100);
  const isTeamLeader = Boolean(user && project?.owner?.id && String(project.owner.id) === String(user.id));

  
  const normalizeProject = (toUse) => ({
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
  });

  const handleSaveProjectDetails = async (updatedProject, invitations = []) => {
    // updatedProject: { id, name, description, ... }
    // invitations: array of { usernameOrEmail: '...' } or similar
    try {
      // Prepare payload for backend (only send fields you want to update)
      const payload = {
        name: updatedProject.name,
        description: updatedProject.description
      };

      const patchResp = await api.patch(`projects/${updatedProject.id}/`, payload);

      // If backend responds with object, use it; otherwise re-fetch the project
      let backendProject = patchResp?.data;
      if (!backendProject || Object.keys(backendProject).length === 0) {
        const re = await api.get(`projects/${updatedProject.id}/`);
        backendProject = re.data;
      }

      // If there are invitations, send them (backend endpoint may vary)
      if (Array.isArray(invitations) && invitations.length > 0) {
        // send invites sequentially (or change to Promise.all for parallel)
        for (const inv of invitations) {
          const body = { user: inv.usernameOrEmail }; // adapt if backend expects { email } or { username }
          try {
            await api.post(`projects/${updatedProject.id}/invite/`, body);
          } catch (invErr) {
            console.warn('Invite failed for', inv, invErr?.response?.data || invErr);
            // do not fail the whole operation; you can collect invite errors if required
          }
        }
        // refresh project details after invites (to get updated members)
        const refreshed = await api.get(`projects/${updatedProject.id}/`);
        backendProject = refreshed.data;
      }

      // Normalize backend project using helper
      const mapped = normalizeProject(backendProject || updatedProject);

      // Update local UI state
      setProject(mapped);
      // also update members state if you keep separate members variable
      // setMembers(mapped.members ?? []);


      // resolve so modal can close (your modal awaits this as a promise)
      return mapped;
    } catch (err) {
      console.error('Failed to save project details:', err);
      // Throw to signal failure back to modal (modal shows the error)
      throw new Error(err?.response?.data?.detail || err?.message || 'Save failed');
    }
  };

  const handleRefreshProject = async (backendProject) => {
    if (!backendProject) return;
    try {
      const mapped = normalizeProject(backendProject);
      setProject(mapped);
      // Optionally update tasks/files if provided in backendProject
      if (Array.isArray(backendProject.tasks)) setTasks(backendProject.tasks);
      if (Array.isArray(backendProject.files)) setFiles(backendProject.files);
    } catch (e) {
      console.debug('handleRefreshProject failed', e);
    }
  };

  // We only fetch when projectId exists and it doesn't match the current project.id.
  useEffect(() => {
    if (!projectId) return;

    // If we already have a project from location state and its id matches, skip fetch.
    if (project?.id === projectId) return;

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
    if (!projectId) return;

    let cancelled = false;
    (async () => {
      try {
        // ASSUMPTION: The API for tasks is at projects/projectId/tasks
        const resp = await api.get(`projects/${projectId}/tasks/`);
        const data = resp?.data;
        if (Array.isArray(data) && !cancelled) {
          setTasks(data); // Update the tasks state with real data
        }
      } catch (err) {
        console.debug('Could not load tasks from API for overview:', err?.message || err);
        // On error, keep the seed data for development/placeholder
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // NEW: Load tasks & files for the overview and keep them in sync
  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    (async () => {
      try {
        const tasksResp = await api.get('tasks/', { params: { project_id: projectId } });
        const filesResp = await api.get('file_sharing/project/' + projectId + '/');
        if (!cancelled) {
          setTasks(Array.isArray(tasksResp?.data) ? tasksResp.data : []);
          setFiles(Array.isArray(filesResp?.data?.files) ? filesResp.data.files : []);
        }
      } catch (err) {
        console.debug('Could not load tasks/files from API for overview:', err?.message || err);
      }
    })();

    return () => { cancelled = true; };
  }, [projectId]);

  async function createTask(title) {
    // Create task via API so counts are consistent with backend
    if (!project?.id) {
      const t = { id: 't' + Date.now(), title, status: 'todo', assignee: null, milestone: null, updatedAt: nowIso(), priority: 'Low' };
      setTasks(prev => [t, ...prev]);
      setActiveView('tasks');
      return t;
    }
    try {
      const payload = { name: title, project_id: project.id, status: 'todo' };
      const resp = await api.post('tasks/', payload);
      const created = resp?.data;
      // Normalized created object to match tasks state shape
      if (created) {
        setTasks(prev => [created, ...prev]);
      }
      setActiveView('tasks');
      return created;
    } catch (err) {
      console.error('[ProjectWorkspace] createTask failed', err?.response?.data || err.message);
      // fallback to local-only creation
      const t = { id: 't' + Date.now(), title, status: 'todo', assignee: null, milestone: null, updatedAt: nowIso(), priority: 'Low' };
      setTasks(prev => [t, ...prev]);
      setActiveView('tasks');
      return t;
    }
  }

  function toggleTaskStatus(id) {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = t.status === 'done' ? 'todo' : 'done';
      return { ...t, status: next, updatedAt: nowIso() };
    }));
  }

  function uploadFile(file) {
    const f = { id: 'f' + Date.now(), name: file.name, uploader: project?.owner?.id ?? 'unknown', uploadedAt: nowIso(), size: `${Math.round(file.size / 1024)}KB` };
    setFiles(prev => [f, ...prev]);
    setActiveView('files');
  }

  // Layout: header -> status strip -> content (grid). Content area is scrollable and full-height.
  return (
    <div className="pw-root">
      <ProjectHeader 
        project={project} 
        progressPct={progressPct} 
        onOpenDetails={() => setIsDetailsModalOpen(true)}
      > 
      </ProjectHeader>

      <div className="pw-inner">

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
                { id: 'calendar', label: 'Calendar', icon: 'Calendar' },
              ]}
            />
          </aside>

          <main className="pw-main">
            {activeView === 'overview' && <OverviewView project={project} tasks={tasks} files={files}  onCreateTask={createTask} />}
            {activeView === 'tasks' && <Index projectId={projectId} onTasksUpdated={(newTasks) => setTasks(newTasks)} />}
            {activeView === 'files' && <FilesView projectId={projectId} onFilesUpdated={(newFiles) => setFiles(newFiles)} />}
            {activeView === 'calendar' && <CalendarView />}
             
          </main>
        </div>
      </div>
      
      <ProjectDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        project={project}
        members={project?.members ?? []}
        onSave={handleSaveProjectDetails}
        onRefresh={handleRefreshProject}
      />
    </div>
  );
}
