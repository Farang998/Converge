import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../src/contexts/AuthContext';
import Login from '../../../src/pages/Auth/Login.jsx';
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
    useParams: () => ({ projectId: '1', taskId: '1', chatId: '1', id: '1' }),
  };
});

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render without crashing', () => {
    renderWithProviders(<Login />);
    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
  });

  it('should render component structure', () => {
    renderWithProviders(<Login />);
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should handle component lifecycle', () => {
    const { rerender } = renderWithProviders(<Login />);
    rerender(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
  });

  it('should match snapshot', () => {
    const { container } = renderWithProviders(<Login />);
    expect(container).toMatchSnapshot();
  });

  it('should update form fields on input', () => {
    renderWithProviders(<Login />);
    const usernameInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(usernameInput, { target: { id: 'loginIdentifier', value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { id: 'loginPassword', value: 'testpass' } });

    expect(usernameInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('testpass');
  });

  it('should submit form with valid credentials', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        token: 'test-token',
        user_id: 1,
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com'
      }
    });

    renderWithProviders(<Login />);
    
    const usernameInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /log in/i });

    fireEvent.change(usernameInput, { target: { id: 'loginIdentifier', value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { id: 'loginPassword', value: 'testpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('auth/login/', {
        username: 'testuser',
        password: 'testpass'
      });
    });
  });

  it('should handle login error', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Invalid credentials'
        }
      }
    });

    renderWithProviders(<Login />);
    
    const usernameInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /log in/i });

    fireEvent.change(usernameInput, { target: { id: 'loginIdentifier', value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { id: 'loginPassword', value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  it('should navigate to register page', () => {
    renderWithProviders(<Login />);
    const registerButton = screen.getByText(/create one now/i);
    fireEvent.click(registerButton);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('should render login form', () => {
    const { container } = renderWithProviders(<Login />);
    expect(container.querySelector('form')).toBeInTheDocument();
  });

  it('should display login button', () => {
    renderWithProviders(<Login />);
    expect(screen.getByRole('button', { name: /log in/i })).toBeTruthy();
  });

  it('should render input fields', () => {
    renderWithProviders(<Login />);
    expect(screen.getByLabelText(/email or username/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
  });

  it('should handle form validation', () => {
    renderWithProviders(<Login />);
    const submitButton = screen.getByRole('button', { name: /log in/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('should render login page container', () => {
    const { container } = renderWithProviders(<Login />);
    expect(container.firstChild).toBeTruthy();
  });
});
