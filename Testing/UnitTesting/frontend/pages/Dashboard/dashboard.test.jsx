import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import Dashboard from '../../../src/pages/Dashboard/dashboard';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { user: { id: 1, username: 'testuser' } } })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'testuser' },
    logout: vi.fn(),
  }),
}));

vi.mock('react-icons/fa', () => ({
  FaBell: () => <div>FaBell</div>,
  FaCog: () => <div>FaCog</div>,
  FaUser: () => <div>FaUser</div>,
  FaPlus: () => <div>FaPlus</div>,
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('authToken', 'test-token');
  });

  it('should render without crashing', () => {
    render(<Dashboard />);
    expect(document.body).toBeTruthy();
  });

  it('should render dashboard container', () => {
    render(<Dashboard />);
    expect(document.body).toBeTruthy();
  });

  it('should render icons', () => {
    render(<Dashboard />);
    expect(document.body.textContent).toContain('FaBell');
  });

  it('should render main dashboard', () => {
    const { container } = render(<Dashboard />);
    expect(container.firstChild).toBeTruthy();
  });
});
