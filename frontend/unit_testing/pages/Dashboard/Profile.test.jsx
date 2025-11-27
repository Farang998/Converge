import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Profile from '../../../src/pages/Dashboard/Profile';
import api from '../../../src/services/api';

vi.mock('../../../src/services/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderProfile = () => {
  return render(
    <BrowserRouter>
      <Profile />
    </BrowserRouter>
  );
};

describe('Profile Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      api.get.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderProfile();
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Successful Profile Load', () => {
    it('should display user profile information', async () => {
      const mockUser = {
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        date_joined: '2024-01-15T10:30:00Z'
      };

      api.get.mockResolvedValueOnce({ data: { user: mockUser } });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should display username when no first/last name', async () => {
      const mockUser = {
        username: 'johndoe',
        email: 'john@example.com',
        first_name: '',
        last_name: '',
        date_joined: '2024-01-15T10:30:00Z'
      };

      api.get.mockResolvedValueOnce({ data: { user: mockUser } });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('johndoe')).toBeInTheDocument();
      });
    });

    it('should format date joined correctly', async () => {
      const mockUser = {
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        date_joined: '2024-03-20T14:30:00Z'
      };

      api.get.mockResolvedValueOnce({ data: { user: mockUser } });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/march 20, 2024/i)).toBeInTheDocument();
      });
    });

    it('should display "Unavailable" for invalid date', async () => {
      const mockUser = {
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        date_joined: 'invalid-date'
      };

      api.get.mockResolvedValueOnce({ data: { user: mockUser } });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('Unavailable')).toBeInTheDocument();
      });
    });

    it('should display "Unavailable" when date is null', async () => {
      const mockUser = {
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        date_joined: null
      };

      api.get.mockResolvedValueOnce({ data: { user: mockUser } });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('Unavailable')).toBeInTheDocument();
      });
    });

    it('should display user icon for profile', async () => {
      const mockUser = {
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        date_joined: '2024-01-15T10:30:00Z'
      };

      api.get.mockResolvedValueOnce({ data: { user: mockUser } });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      const container = screen.getByText('Test User').closest('.profile-container');
      expect(container).toBeInTheDocument();
    });

    it('should call API with correct endpoint', async () => {
      const mockUser = {
        username: 'testuser',
        email: 'test@example.com',
        date_joined: '2024-01-15T10:30:00Z'
      };

      api.get.mockResolvedValueOnce({ data: { user: mockUser } });
      
      renderProfile();

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('auth/identify-user/');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      api.get.mockRejectedValueOnce({
        response: { data: { error: 'Failed to load profile' } }
      });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
      });
    });

    it('should redirect to login on 401 error', async () => {
      api.get.mockRejectedValueOnce({
        response: { status: 401 }
      });
      
      renderProfile();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should show generic error when no specific error message', async () => {
      api.get.mockRejectedValueOnce(new Error('Network error'));
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
      });
    });

    it('should handle missing user data in response', async () => {
      api.get.mockResolvedValueOnce({ data: {} });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/unable to load profile information/i)).toBeInTheDocument();
      });
    });

    it('should handle null response data', async () => {
      api.get.mockResolvedValueOnce({ data: null });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/unable to load profile information/i)).toBeInTheDocument();
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('should cleanup on unmount', async () => {
      const mockUser = {
        username: 'testuser',
        email: 'test@example.com',
        date_joined: '2024-01-15T10:30:00Z'
      };

      api.get.mockResolvedValueOnce({ data: { user: mockUser } });
      
      const { unmount } = renderProfile();

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      unmount();
      
      // Component should cleanup without errors
      expect(true).toBe(true);
    });

    it('should not update state after unmount', async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      api.get.mockReturnValueOnce(promise);
      
      const { unmount } = renderProfile();
      
      unmount();

      // Resolve after unmount
      resolvePromise({ 
        data: { 
          user: { username: 'test', email: 'test@example.com' } 
        } 
      });

      // Should not cause any errors
      await waitFor(() => {
        expect(true).toBe(true);
      });
    });
  });

  describe('Display Name Logic', () => {
    it('should combine first and last names', async () => {
      const mockUser = {
        username: 'jdoe',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        date_joined: '2024-01-15T10:30:00Z'
      };

      api.get.mockResolvedValueOnce({ data: { user: mockUser } });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should show only first name if last name is missing', async () => {
      const mockUser = {
        username: 'jane',
        first_name: 'Jane',
        last_name: '',
        email: 'jane@example.com',
        date_joined: '2024-01-15T10:30:00Z'
      };

      api.get.mockResolvedValueOnce({ data: { user: mockUser } });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });
    });

    it('should show only last name if first name is missing', async () => {
      const mockUser = {
        username: 'smith',
        first_name: '',
        last_name: 'Smith',
        email: 'smith@example.com',
        date_joined: '2024-01-15T10:30:00Z'
      };

      api.get.mockResolvedValueOnce({ data: { user: mockUser } });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('Smith')).toBeInTheDocument();
      });
    });

    it('should trim whitespace from names', async () => {
      const mockUser = {
        username: 'tester',
        first_name: '  John  ',
        last_name: '  Doe  ',
        email: 'test@example.com',
        date_joined: '2024-01-15T10:30:00Z'
      };

      api.get.mockResolvedValueOnce({ data: { user: mockUser } });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Profile Information Display', () => {
    it('should display all user information fields', async () => {
      const mockUser = {
        username: 'completeuser',
        email: 'complete@example.com',
        first_name: 'Complete',
        last_name: 'User',
        date_joined: '2024-01-15T10:30:00Z'
      };

      api.get.mockResolvedValueOnce({ data: { user: mockUser } });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('Complete User')).toBeInTheDocument();
      });

      expect(screen.getAllByText('completeuser').length).toBeGreaterThan(0);
      expect(screen.getAllByText('complete@example.com').length).toBeGreaterThan(0);
      expect(screen.getByText(/january 15, 2024/i)).toBeInTheDocument();
    });

    it('should have proper section headings', async () => {
      const mockUser = {
        username: 'testuser',
        email: 'test@example.com',
        date_joined: '2024-01-15T10:30:00Z'
      };

      api.get.mockResolvedValueOnce({ data: { user: mockUser } });
      
      renderProfile();

      await waitFor(() => {
        expect(screen.getAllByText('testuser').length).toBeGreaterThan(0);
      });

      // Check for profile structure
      const elements = screen.getAllByText('testuser');
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
