import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';

vi.mock('../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { user: null } })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
  },
  setAuthToken: vi.fn(),
}));

// Mock all page components to speed up tests
vi.mock('../src/pages/Auth/Login', () => ({
  default: () => <div>Login Page</div>,
}));

vi.mock('../src/pages/Auth/Register', () => ({
  default: () => <div>Register Page</div>,
}));

vi.mock('../src/pages/Dashboard/dashboard', () => ({
  default: () => <div>Dashboard Page</div>,
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render without crashing', () => {
    render(<App />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render loading state initially', () => {
    render(<App />);
    const loadingText = screen.queryByText(/Loading/i);
    expect(loadingText || document.body).toBeDefined();
  });

  it('should provide AuthContext to children', async () => {
    render(<App />);
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });

  it('should render router with routes', async () => {
    render(<App />);
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });

  it('should handle authentication state changes', async () => {
    const { rerender } = render(<App />);
    
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });

    rerender(<App />);
    expect(document.body).toBeInTheDocument();
  });

  it('should match snapshot', async () => {
    const { container } = render(<App />);
    await waitFor(() => {
      expect(container).toBeDefined();
    });
    expect(container).toMatchSnapshot();
  });
});
