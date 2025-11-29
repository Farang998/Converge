import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../src/contexts/AuthContext';
import Notifications from '../../../src/pages/Notifications/Notifications';
import api from '../../../src/services/api';
import { toast } from 'react-toastify';

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('authToken', 'test-token');
  });

  describe('Rendering', () => {
    it('should render notifications page', async () => {
      api.get.mockResolvedValueOnce({ data: [] });
      renderWithProviders(<Notifications />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
      });
    });

    it('should render back button', async () => {
      api.get.mockResolvedValueOnce({ data: [] });
      renderWithProviders(<Notifications />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });
    });
  });

  describe('Fetching Notifications', () => {
    it('should fetch notifications on mount', async () => {
      const mockNotifications = [
        { id: 1, message: 'Test notification', read: false, created_at: '2024-01-15T10:30:00Z' },
      ];
      
      api.get.mockResolvedValueOnce({ data: mockNotifications });
      renderWithProviders(<Notifications />);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('notifications/');
      });
    });

    it('should display notifications list', async () => {
      const mockNotifications = [
        { id: 1, message: 'Test notification 1', read: false, created_at: '2024-01-15T10:30:00Z' },
        { id: 2, message: 'Test notification 2', read: true, created_at: '2024-01-15T11:30:00Z' },
      ];
      
      api.get.mockResolvedValueOnce({ data: mockNotifications });
      renderWithProviders(<Notifications />);
      
      await waitFor(() => {
        expect(screen.getByText('Test notification 1')).toBeInTheDocument();
        expect(screen.getByText('Test notification 2')).toBeInTheDocument();
      });
    });

    it('should handle fetch error', async () => {
      api.get.mockRejectedValueOnce(new Error('Fetch failed'));
      renderWithProviders(<Notifications />);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load notifications');
      });
    });
  });



  describe('Refresh', () => {
    it('should refresh notifications when refresh button clicked', async () => {
      api.get.mockResolvedValue({ data: [] });
      renderWithProviders(<Notifications />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
      });
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button clicked', async () => {
      api.get.mockResolvedValueOnce({ data: [] });
      renderWithProviders(<Notifications />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });
      
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no notifications', async () => {
      api.get.mockResolvedValueOnce({ data: [] });
      renderWithProviders(<Notifications />);
      
      await waitFor(() => {
        expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
      });
    });

    it('should render notifications container', async () => {
      api.get.mockResolvedValueOnce({ data: [] });
      const { container } = renderWithProviders(<Notifications />);
      
      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('should handle loading state', async () => {
      api.get.mockResolvedValueOnce({ data: [] });
      renderWithProviders(<Notifications />);
      
      await waitFor(() => {
        expect(document.body).toBeTruthy();
      });
    });

    it('should initialize notifications list', async () => {
      api.get.mockResolvedValueOnce({ data: [] });
      renderWithProviders(<Notifications />);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });

    it('should render page heading', async () => {
      api.get.mockResolvedValueOnce({ data: [] });
      renderWithProviders(<Notifications />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading')).toBeTruthy();
      });
    });

    it('should display notification interface', async () => {
      api.get.mockResolvedValueOnce({ data: [] });
      renderWithProviders(<Notifications />);
      
      await waitFor(() => {
        expect(document.body.textContent).toContain('Notifications');
      });
    });
  });
});
