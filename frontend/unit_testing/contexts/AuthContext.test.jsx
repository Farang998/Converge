import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import api, { setAuthToken } from '../../src/services/api';

vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  setAuthToken: vi.fn(),
}));

const TestComponent = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="user">{auth.user ? auth.user.username : 'No user'}</div>
      <div data-testid="loading">{auth.loading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="authenticated">{auth.isAuthenticated ? 'Yes' : 'No'}</div>
      <button onClick={() => auth.login({ id: 1, username: 'test' }, 'token123')}>Login</button>
      <button onClick={auth.logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('AuthProvider initialization', () => {
    it('should render children', () => {
      render(
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      );
      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should start with not loading state', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });

    it('should verify token from localStorage on mount', async () => {
      localStorage.getItem.mockReturnValue('stored-token');
      api.get.mockResolvedValue({
        data: { user: { id: 1, username: 'testuser' } }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('auth/identify-user/');
      });
    });

    it('should set user if token verification succeeds', async () => {
      localStorage.getItem.mockReturnValue('valid-token');
      api.get.mockResolvedValue({
        data: { user: { id: 1, username: 'verifieduser' } }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('verifieduser');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
      });
    });

    it('should clear token if verification fails', async () => {
      localStorage.getItem.mockReturnValue('invalid-token');
      api.get.mockRejectedValue(new Error('Invalid token'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(setAuthToken).toHaveBeenCalledWith(null);
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });
    });

    it('should set loading to false after initialization', async () => {
      localStorage.getItem.mockReturnValue(null);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      });
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const BadComponent = () => {
        useAuth();
        return null;
      };

      expect(() => render(<BadComponent />)).toThrow('useAuth must be used within an AuthProvider');
    });

    it('should provide auth context values', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toBeDefined();
        expect(screen.getByTestId('loading')).toBeDefined();
        expect(screen.getByTestId('authenticated')).toBeDefined();
      });
    });
  });

  describe('login function', () => {
    it('should set user and token on login', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      });

      await act(async () => {
        screen.getByText('Login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
        expect(setAuthToken).toHaveBeenCalledWith('token123');
      });
    });

    it('should update isAuthenticated after login', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('No');
      });

      await act(async () => {
        screen.getByText('Login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
      });
    });
  });

  describe('logout function', () => {
    it('should clear user and token on logout', async () => {
      localStorage.getItem.mockReturnValue('token');
      api.get.mockResolvedValue({
        data: { user: { id: 1, username: 'loggeduser' } }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('loggeduser');
      });

      await act(async () => {
        screen.getByText('Logout').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('No');
        expect(setAuthToken).toHaveBeenCalledWith(null);
      });
    });

    it('should update isAuthenticated after logout', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Login first
      await act(async () => {
        screen.getByText('Login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
      });

      // Then logout
      await act(async () => {
        screen.getByText('Logout').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('No');
      });
    });
  });

  describe('isAuthenticated computed value', () => {
    it('should be false when user is null', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('No');
      });
    });

    it('should be true when user exists', async () => {
      localStorage.getItem.mockReturnValue('token');
      api.get.mockResolvedValue({
        data: { user: { id: 1, username: 'testuser' } }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
      });
    });
  });

  describe('Token verification edge cases', () => {
    it('should handle network errors during token verification', async () => {
      localStorage.getItem.mockReturnValue('token');
      api.get.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(setAuthToken).toHaveBeenCalledWith(null);
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      });
    });

    it('should handle empty user response', async () => {
      localStorage.getItem.mockReturnValue('token');
      api.get.mockResolvedValue({ data: { user: null } });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(setAuthToken).toHaveBeenCalledWith(null);
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });
    });

    it('should not make API call if no token in localStorage', async () => {
      localStorage.getItem.mockReturnValue(null);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      });

      expect(api.get).not.toHaveBeenCalled();
    });
  });
});
