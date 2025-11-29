import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProjectAnalytics from '../../../src/pages/Dashboard/analytics.jsx';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '123' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ 
      data: {
        task_status_counts: [],
        tasks_per_member: [],
        priority_by_due_date: [],
        priority_by_dependencies: [],
      } 
    })),
  },
}));

vi.mock('../../../src/components/AccordionSection.jsx', () => ({
  default: ({ title, children }) => <div><h3>{title}</h3>{children}</div>,
}));

vi.mock('../../../src/pages/Dashboard/TaskWorkflowManagement.jsx', () => ({
  default: () => <div>TaskWorkflowManagement</div>,
}));

vi.mock('../../../src/pages/Dashboard/TeamActivityDashboard.jsx', () => ({
  default: () => <div>TeamActivityDashboard</div>,
}));

vi.mock('../../../src/pages/Dashboard/FileActivityDashboard.jsx', () => ({
  default: () => <div>FileActivityDashboard</div>,
}));

vi.mock('../../../src/pages/Dashboard/Charts/TaskStatusChart.jsx', () => ({
  default: () => <div>TaskStatusChart</div>,
}));

vi.mock('../../../src/pages/Dashboard/Charts/WorkloadChart.jsx', () => ({
  default: () => <div>WorkloadChart</div>,
}));

vi.mock('../../../src/pages/Dashboard/Charts/PriorityByDependenciesChart.jsx', () => ({
  default: () => <div>PriorityByDependenciesChart</div>,
}));

vi.mock('../../../src/pages/Dashboard/Charts/PriorityByDueDateChart.jsx', () => ({
  default: () => <div>PriorityByDueDateChart</div>,
}));

describe('ProjectAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(
      <BrowserRouter>
        <ProjectAnalytics />
      </BrowserRouter>
    );
    expect(document.body).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <BrowserRouter>
        <ProjectAnalytics />
      </BrowserRouter>
    );
    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
  });

  it('should render task status chart after loading', async () => {
    render(
      <BrowserRouter>
        <ProjectAnalytics />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/taskstatuschart/i)).toBeInTheDocument();
    });
  });

  it('should render analytics grid', async () => {
    const { container } = render(
      <BrowserRouter>
        <ProjectAnalytics />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(container.querySelector('.analytics-grid')).toBeInTheDocument();
    });
  });
});
