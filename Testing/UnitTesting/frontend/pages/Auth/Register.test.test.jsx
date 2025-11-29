import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../src/contexts/AuthContext';
import Register from '../../../src/pages/Auth/Register.jsx';
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

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render without crashing', () => {
    renderWithProviders(<Register />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
  });

  it('should render component structure', () => {
    renderWithProviders(<Register />);
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('should handle component lifecycle', () => {
    const { rerender } = renderWithProviders(<Register />);
    rerender(
      <BrowserRouter>
        <AuthProvider>
          <Register />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
  });

  it('should match snapshot', () => {
    const { container } = renderWithProviders(<Register />);
    expect(container).toMatchSnapshot();
  });

  it('should update form fields on input', () => {
    renderWithProviders(<Register />);
    
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);

    fireEvent.change(firstNameInput, { target: { id: 'firstName', value: 'John' } });
    fireEvent.change(lastNameInput, { target: { id: 'lastName', value: 'Doe' } });
    fireEvent.change(usernameInput, { target: { id: 'username', value: 'johndoe' } });
    fireEvent.change(emailInput, { target: { id: 'email', value: 'john@example.com' } });

    expect(firstNameInput.value).toBe('John');
    expect(lastNameInput.value).toBe('Doe');
    expect(usernameInput.value).toBe('johndoe');
    expect(emailInput.value).toBe('john@example.com');
  });

  it('should show error when password is too short', async () => {
    renderWithProviders(<Register />);
    
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /send otp/i });

    fireEvent.change(firstNameInput, { target: { id: 'firstName', value: 'John' } });
    fireEvent.change(lastNameInput, { target: { id: 'lastName', value: 'Doe' } });
    fireEvent.change(usernameInput, { target: { id: 'username', value: 'johndoe' } });
    fireEvent.change(emailInput, { target: { id: 'email', value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { id: 'password', value: 'short' } });
    fireEvent.change(confirmPasswordInput, { target: { id: 'confirmPassword', value: 'short' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('should show error when passwords do not match', async () => {
    renderWithProviders(<Register />);
    
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /send otp/i });

    fireEvent.change(firstNameInput, { target: { id: 'firstName', value: 'John' } });
    fireEvent.change(lastNameInput, { target: { id: 'lastName', value: 'Doe' } });
    fireEvent.change(usernameInput, { target: { id: 'username', value: 'johndoe' } });
    fireEvent.change(emailInput, { target: { id: 'email', value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { id: 'password', value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { id: 'confirmPassword', value: 'password456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('should validate username and email before sending OTP', async () => {
    api.post.mockResolvedValueOnce({
      data: { success: true }
    }).mockResolvedValueOnce({
      data: { success: true, message: 'OTP sent' }
    });

    renderWithProviders(<Register />);
    
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /send otp/i });

    fireEvent.change(firstNameInput, { target: { id: 'firstName', value: 'Test' } });
    fireEvent.change(lastNameInput, { target: { id: 'lastName', value: 'User' } });
    fireEvent.change(usernameInput, { target: { id: 'username', value: 'testuser' } });
    fireEvent.change(emailInput, { target: { id: 'email', value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { id: 'password', value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { id: 'confirmPassword', value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('auth/validate-user/', {
        username: 'testuser',
        email: 'test@example.com'
      });
    });
  });

  it('should show error when username already exists', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        data: { message: 'Username already exists' }
      }
    });

    renderWithProviders(<Register />);
    
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /send otp/i });

    fireEvent.change(firstNameInput, { target: { id: 'firstName', value: 'Existing' } });
    fireEvent.change(lastNameInput, { target: { id: 'lastName', value: 'User' } });
    fireEvent.change(usernameInput, { target: { id: 'username', value: 'existinguser' } });
    fireEvent.change(emailInput, { target: { id: 'email', value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { id: 'password', value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { id: 'confirmPassword', value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
    });
  });

  it('should send OTP after successful validation', async () => {
    api.post.mockResolvedValueOnce({
      data: { success: true }
    }).mockResolvedValueOnce({
      data: { success: true, message: 'OTP sent to your email' }
    });

    renderWithProviders(<Register />);
    
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /send otp/i });

    fireEvent.change(firstNameInput, { target: { id: 'firstName', value: 'New' } });
    fireEvent.change(lastNameInput, { target: { id: 'lastName', value: 'User' } });
    fireEvent.change(usernameInput, { target: { id: 'username', value: 'newuser' } });
    fireEvent.change(emailInput, { target: { id: 'email', value: 'new@example.com' } });
    fireEvent.change(passwordInput, { target: { id: 'password', value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { id: 'confirmPassword', value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('auth/send-otp/', {
        email: 'new@example.com',
        purpose: 'register'
      });
    });
  });

  it('should navigate to login page', () => {
    renderWithProviders(<Register />);
    const loginButton = screen.getByText(/LOGIN/i);
    fireEvent.click(loginButton);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('should render registration form', () => {
    const { container } = renderWithProviders(<Register />);
    expect(container.querySelector('form')).toBeInTheDocument();
  });

  it('should display all form fields', () => {
    renderWithProviders(<Register />);
    expect(screen.getByLabelText(/first name/i)).toBeTruthy();
    expect(screen.getByLabelText(/last name/i)).toBeTruthy();
    expect(screen.getByLabelText(/username/i)).toBeTruthy();
  });

  it('should render register component container', () => {
    const { container } = renderWithProviders(<Register />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should handle form inputs', () => {
    renderWithProviders(<Register />);
    const firstNameInput = screen.getByLabelText(/first name/i);
    expect(firstNameInput).toBeTruthy();
  });
});
