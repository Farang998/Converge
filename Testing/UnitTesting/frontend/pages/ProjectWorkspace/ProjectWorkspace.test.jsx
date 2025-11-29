import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProjectWorkspace from '../../../src/pages/ProjectWorkspace/ProjectWorkspace.jsx';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ projectId: '123' }),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/project/123' }),
  };
});

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', name: 'Test User' } }),
}));

vi.mock('../../../src/pages/ProjectWorkspace/ProjectHeader.jsx', () => ({
  default: () => <div>ProjectHeader</div>,
}));

vi.mock('../../../src/pages/ProjectWorkspace/StatusStrip.jsx', () => ({
  default: () => <div>StatusStrip</div>,
}));

vi.mock('../../../src/pages/ProjectWorkspace/ProjectNav.jsx', () => ({
  default: () => <div>ProjectNav</div>,
}));

vi.mock('../../../src/pages/ProjectWorkspace/OverviewView.jsx', () => ({
  default: () => <div>OverviewView</div>,
}));

vi.mock('../../../src/pages/ProjectWorkspace/FilesView.jsx', () => ({
  default: () => <div>FilesView</div>,
}));

vi.mock('../../../src/pages/ProjectWorkspace/ActivityView.jsx', () => ({
  default: () => <div>ActivityView</div>,
}));

vi.mock('../../../src/pages/ProjectWorkspace/Tasks/Index.jsx', () => ({
  default: () => <div>TasksIndex</div>,
}));

vi.mock('../../../src/pages/ProjectWorkspace/Calendar/CalendarView.jsx', () => ({
  default: () => <div>CalendarView</div>,
}));

vi.mock('../../../src/pages/ProjectWorkspace/parts/ProjectDetailsModal.jsx', () => ({
  default: () => <div>ProjectDetailsModal</div>,
}));

describe('ProjectWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(
      <BrowserRouter>
        <ProjectWorkspace />
      </BrowserRouter>
    );
    expect(document.body).toBeInTheDocument();
  });

  it('should render project header', () => {
    render(
      <BrowserRouter>
        <ProjectWorkspace />
      </BrowserRouter>
    );
    expect(screen.getByText(/projectheader/i)).toBeInTheDocument();
  });

  it('should render project navigation', () => {
    render(
      <BrowserRouter>
        <ProjectWorkspace />
      </BrowserRouter>
    );
    expect(screen.getByText(/projectnav/i)).toBeInTheDocument();
  });

  it('should render overview view by default', () => {
    render(
      <BrowserRouter>
        <ProjectWorkspace />
      </BrowserRouter>
    );
    expect(screen.getByText(/overviewview/i)).toBeInTheDocument();
  });
});
