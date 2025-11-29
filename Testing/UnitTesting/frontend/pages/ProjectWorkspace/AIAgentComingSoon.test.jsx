import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AIAgentComingSoon from '../../../src/pages/ProjectWorkspace/AIAgentComingSoon';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ projectId: '1', taskId: '1' }),
    useLocation: () => ({ 
      state: { 
        task: { name: 'Test Task', description: 'Test Description' }, 
        projectName: 'Test Project' 
      } 
    }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('AIAgentComingSoon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    renderWithRouter(<AIAgentComingSoon />);
    expect(document.body).toBeInTheDocument();
  });

  it('should display AI agent heading', () => {
    renderWithRouter(<AIAgentComingSoon />);
    expect(screen.getByText(/ai agent/i)).toBeInTheDocument();
  });

  it('should display task details section', () => {
    renderWithRouter(<AIAgentComingSoon />);
    expect(screen.getByText(/task details/i)).toBeInTheDocument();
  });

  it('should display back button', () => {
    renderWithRouter(<AIAgentComingSoon />);
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('should render AI agent component', () => {
    const { container } = renderWithRouter(<AIAgentComingSoon />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should display task information', () => {
    renderWithRouter(<AIAgentComingSoon />);
    expect(document.body.textContent).toContain('Task Details');
  });

  it('should render with router context', () => {
    renderWithRouter(<AIAgentComingSoon />);
    expect(document.body).toBeTruthy();
  });

  it('should show AI agent interface', () => {
    renderWithRouter(<AIAgentComingSoon />);
    expect(screen.getByText(/ai agent/i)).toBeTruthy();
  });
});
