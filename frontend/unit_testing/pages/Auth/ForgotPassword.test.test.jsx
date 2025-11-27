import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../src/contexts/AuthContext';
import ForgotPassword from '../../../src/pages/Auth/ForgotPassword.jsx';
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

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render without crashing', () => {
    renderWithProviders(<ForgotPassword />);
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('should render component structure', () => {
    renderWithProviders(<ForgotPassword />);
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument();
  });

  it('should handle component lifecycle', () => {
    const { rerender } = renderWithProviders(<ForgotPassword />);
    rerender(
      <BrowserRouter>
        <AuthProvider>
          <ForgotPassword />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('should match snapshot', () => {
    const { container } = renderWithProviders(<ForgotPassword />);
    expect(container).toMatchSnapshot();
  });

  it('should update email input', () => {
    renderWithProviders(<ForgotPassword />);
    const emailInput = screen.getByPlaceholderText(/email address/i);
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput.value).toBe('test@example.com');
  });

  it('should request OTP when form submitted', async () => {
    api.post.mockResolvedValueOnce({
      data: { message: 'OTP sent to your email' }
    });

    renderWithProviders(<ForgotPassword />);
    const emailInput = screen.getByPlaceholderText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send otp/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('auth/forgot-password/request/', { 
        email: 'test@example.com' 
      });
    });
  });

  it('should show OTP input after successful email submission', async () => {
    api.post.mockResolvedValueOnce({
      data: { message: 'OTP sent to your email' }
    });

    renderWithProviders(<ForgotPassword />);
    const emailInput = screen.getByPlaceholderText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send otp/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter otp/i)).toBeInTheDocument();
    });
  });

  it('should handle OTP submission error', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        data: { error: 'Email not found' }
      }
    });

    renderWithProviders(<ForgotPassword />);
    const emailInput = screen.getByPlaceholderText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send otp/i });
    
    fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email not found/i)).toBeInTheDocument();
    });
  });

  it('should validate OTP and show password reset form', async () => {
    // First request OTP
    api.post.mockResolvedValueOnce({
      data: { message: 'OTP sent' }
    }).mockResolvedValueOnce({
      data: { success: true, message: 'OTP validated' }
    });

    renderWithProviders(<ForgotPassword />);
    
    // Step 1: Request OTP
    const emailInput = screen.getByPlaceholderText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send otp/i }));

    // Step 2: Enter OTP
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter otp/i)).toBeInTheDocument();
    });

    const otpInput = screen.getByPlaceholderText(/enter otp/i);
    fireEvent.change(otpInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /verify otp/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('auth/validate-otp/', {
        email: 'test@example.com',
        otp: '123456',
        purpose: 'password_reset'
      });
    });
  });

  it('should navigate back to login', () => {
    renderWithProviders(<ForgotPassword />);
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
