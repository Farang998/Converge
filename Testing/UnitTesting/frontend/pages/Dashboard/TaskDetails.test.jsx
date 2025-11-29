import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TaskDetails from '../../../src/pages/Dashboard/TaskDetails.jsx';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ taskId: '123' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ 
      data: { 
        id: 123, 
        name: 'Test Task', 
        status: 'in_progress',
        description: 'Task description',
        due_date: '2024-12-31',
      } 
    })),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
  ToastContainer: () => <div>ToastContainer</div>,
}));

describe('TaskDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(
      <BrowserRouter>
        <TaskDetails />
      </BrowserRouter>
    );
    expect(document.body).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <BrowserRouter>
        <TaskDetails />
      </BrowserRouter>
    );
    expect(screen.getByText(/loading task information/i)).toBeInTheDocument();
  });

  it('should render task name after loading', async () => {
    render(
      <BrowserRouter>
        <TaskDetails />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/test task/i)).toBeInTheDocument();
    });
  });

  it('should render task details page container', () => {
    const { container } = render(
      <BrowserRouter>
        <TaskDetails />
      </BrowserRouter>
    );
    expect(container.querySelector('.task-details-page')).toBeInTheDocument();
  });
});
