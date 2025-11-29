import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HelpSupport from '../../../src/pages/Dashboard/HelpSupport';
import api from '../../../src/services/api';
import { toast } from 'react-toastify';

vi.mock('../../../src/services/api');
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  ToastContainer: () => <div data-testid="toast-container" />,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <HelpSupport />
    </BrowserRouter>
  );
};

describe('HelpSupport Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post = vi.fn();
    delete window.location;
    window.location = { href: '' };
  });

  describe('Rendering', () => {
    it('should render help and support page', () => {
      renderComponent();
      expect(screen.getByText(/help.*support/i)).toBeInTheDocument();
    });

    it('should render contact support section', () => {
      renderComponent();
      expect(screen.getByText(/contact support/i)).toBeInTheDocument();
    });

    it('should display support team description', () => {
      renderComponent();
      expect(screen.getByText(/reach out to the support team/i)).toBeInTheDocument();
    });

    it('should render feedback textarea', () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/type your feedback here/i);
      expect(textarea).toBeInTheDocument();
    });

    it('should render send feedback button', () => {
      renderComponent();
      const sendButton = screen.getByRole('button', { name: /send feedback/i });
      expect(sendButton).toBeInTheDocument();
    });

    it('should render send email button', () => {
      renderComponent();
      const sendEmailButton = screen.getByRole('button', { name: /send email/i });
      expect(sendEmailButton).toBeInTheDocument();
    });
  });

  describe('Email Contact', () => {
    it('should open mailto link when send email button clicked', () => {
      renderComponent();
      const sendEmailButton = screen.getByRole('button', { name: /send email/i });
      
      fireEvent.click(sendEmailButton);
      
      expect(window.location.href).toContain('mailto:convergework23@gmail.com');
    });
  });

  describe('Feedback Submission', () => {
    it('should allow typing in feedback textarea', () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/type your feedback here/i);
      
      fireEvent.change(textarea, { target: { value: 'Test feedback' } });
      
      expect(textarea.value).toBe('Test feedback');
    });

    it('should show warning when submitting empty feedback', async () => {
      renderComponent();
      const sendButton = screen.getByRole('button', { name: /send feedback/i });
      
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(toast.warn).toHaveBeenCalledWith(expect.stringContaining('enter feedback'));
      });
    });

    it('should submit feedback successfully', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } });
      
      renderComponent();
      const textarea = screen.getByPlaceholderText(/type your feedback here/i);
      const sendButton = screen.getByRole('button', { name: /send feedback/i });
      
      fireEvent.change(textarea, { target: { value: 'Great app!' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('feedback/', {
          message: 'Great app!',
          context_url: expect.any(String),
        });
      });
      
      expect(toast.success).toHaveBeenCalled();
    });

    it('should clear feedback after successful submission', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } });
      
      renderComponent();
      const textarea = screen.getByPlaceholderText(/type your feedback here/i);
      const sendButton = screen.getByRole('button', { name: /send feedback/i });
      
      fireEvent.change(textarea, { target: { value: 'Great app!' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('should handle feedback submission errors', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { error: 'Server error' } }
      });
      
      renderComponent();
      const textarea = screen.getByPlaceholderText(/type your feedback here/i);
      const sendButton = screen.getByRole('button', { name: /send feedback/i });
      
      fireEvent.change(textarea, { target: { value: 'Test feedback' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should navigate to login on 401 error', async () => {
      api.post.mockRejectedValueOnce({
        response: { status: 401 }
      });
      
      renderComponent();
      const textarea = screen.getByPlaceholderText(/type your feedback here/i);
      const sendButton = screen.getByRole('button', { name: /send feedback/i });
      
      fireEvent.change(textarea, { target: { value: 'Test feedback' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should disable button while submitting', async () => {
      api.post.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ data: {} }), 100)));
      
      renderComponent();
      const textarea = screen.getByPlaceholderText(/type your feedback here/i);
      const sendButton = screen.getByRole('button', { name: /send feedback/i });
      
      fireEvent.change(textarea, { target: { value: 'Test feedback' } });
      fireEvent.click(sendButton);
      
      // Button should be disabled during submission
      expect(sendButton).toBeDisabled();
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });
    });

    it('should trim whitespace from feedback', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } });
      
      renderComponent();
      const textarea = screen.getByPlaceholderText(/type your feedback here/i);
      const sendButton = screen.getByRole('button', { name: /send feedback/i });
      
      fireEvent.change(textarea, { target: { value: '  Test feedback  ' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('feedback/', {
          message: 'Test feedback',
          context_url: expect.any(String),
        });
      });
    });
  });

  describe('Component Structure', () => {
    it('should render help icon', () => {
      renderComponent();
      const { container } = render(<BrowserRouter><HelpSupport /></BrowserRouter>);
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render toast container', () => {
      renderComponent();
      expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    });
  });
});
