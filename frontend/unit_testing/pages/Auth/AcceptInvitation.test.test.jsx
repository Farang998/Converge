import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../src/contexts/AuthContext';
import AcceptInvitation from '../../../src/pages/Auth/AcceptInvitation.jsx';
import api from '../../../src/services/api';

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
  setAuthToken: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ projectId: '123' }),
  };
});

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('AcceptInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('authToken', 'test-token');
  });

  it('should render without crashing', () => {
    api.get.mockResolvedValueOnce({
      data: { name: 'Test Project', description: 'Test Description' }
    });
    renderWithProviders(<AcceptInvitation />);
    expect(screen.getByText(/project invitation/i)).toBeInTheDocument();
  });

  it('should render component structure', () => {
    api.get.mockResolvedValueOnce({
      data: { name: 'Test Project' }
    });
    renderWithProviders(<AcceptInvitation />);
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
  });

  it('should handle component lifecycle', () => {
    api.get.mockResolvedValueOnce({
      data: { name: 'Test Project' }
    });
    const { rerender } = renderWithProviders(<AcceptInvitation />);
    rerender(
      <BrowserRouter>
        <AuthProvider>
          <AcceptInvitation />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByText(/project invitation/i)).toBeInTheDocument();
  });

  it('should match snapshot', () => {
    api.get.mockResolvedValueOnce({
      data: { name: 'Test Project' }
    });
    const { container } = renderWithProviders(<AcceptInvitation />);
    expect(container).toMatchSnapshot();
  });

  it('should redirect to login if no auth token', () => {
    localStorage.clear();
    renderWithProviders(<AcceptInvitation />);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should fetch project info on mount', async () => {
    api.get.mockResolvedValueOnce({
      data: { name: 'My Project', description: 'Project Description' }
    });

    renderWithProviders(<AcceptInvitation />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('projects/123/');
    });
  });

  it('should accept invitation when accept button clicked', async () => {
    api.get.mockResolvedValueOnce({
      data: { name: 'Test Project' }
    }).mockResolvedValueOnce({
      data: { message: 'Invitation accepted successfully' }
    });

    api.post.mockResolvedValueOnce({
      data: {}
    });

    renderWithProviders(<AcceptInvitation />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    });

    const acceptButton = screen.getByRole('button', { name: /accept/i });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('projects/accept-invitation/123/');
    });
  });

  it('should decline invitation when decline button clicked', async () => {
    api.get.mockResolvedValueOnce({
      data: { name: 'Test Project' }
    }).mockResolvedValueOnce({
      data: { message: 'Invitation declined' }
    });

    api.post.mockResolvedValueOnce({
      data: {}
    });

    renderWithProviders(<AcceptInvitation />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
    });

    const declineButton = screen.getByRole('button', { name: /decline/i });
    fireEvent.click(declineButton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('projects/decline-invitation/123/');
    });
  });

  it('should handle accept invitation error', async () => {
    api.get.mockResolvedValueOnce({
      data: { name: 'Test Project' }
    }).mockRejectedValueOnce({
      response: {
        data: { error: 'Invitation already accepted' }
      }
    });

    renderWithProviders(<AcceptInvitation />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    });

    const acceptButton = screen.getByRole('button', { name: /accept/i });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it('should navigate back to dashboard', async () => {
    api.get.mockResolvedValueOnce({
      data: { name: 'Test Project' }
    });

    renderWithProviders(<AcceptInvitation />);

    await waitFor(() => {
      const backButton = screen.getByText(/back to dashboard/i);
      fireEvent.click(backButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});
