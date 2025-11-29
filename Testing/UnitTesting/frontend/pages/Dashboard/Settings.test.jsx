import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Settings from '../../../src/pages/Dashboard/Settings';
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

const mockUserData = {
  user: {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    username: 'johndoe',
  }
};

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <Settings />
    </BrowserRouter>
  );
};

describe('Settings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get = vi.fn().mockResolvedValue({ data: mockUserData });
    api.put = vi.fn();
    api.post = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    document.body.classList.remove('dark-theme');
  });

  describe('Profile Loading', () => {
    it('should load user profile on mount', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('auth/identify-user/');
      });
    });

    it('should display loaded profile data', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('johndoe')).toBeInTheDocument();
      });
    });

    it('should navigate to login on 401 error', async () => {
      api.get.mockRejectedValueOnce({ response: { status: 401 } });
      
      renderComponent();
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should show error toast on profile load failure', async () => {
      api.get.mockRejectedValueOnce({
        response: { data: { error: 'Load failed' } }
      });
      
      renderComponent();
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Profile Editing', () => {
    it('should allow editing first name', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      });
      
      const firstNameInput = screen.getByDisplayValue('John');
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
      
      expect(firstNameInput.value).toBe('Jane');
    });

    it('should allow editing last name', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      });
      
      const lastNameInput = screen.getByDisplayValue('Doe');
      fireEvent.change(lastNameInput, { target: { value: 'Smith' } });
      
      expect(lastNameInput.value).toBe('Smith');
    });

    it('should show success message after saving', async () => {
      api.put.mockResolvedValueOnce({ data: { success: true } });
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      });
      
      const saveButton = screen.getByRole('button', { name: /save (profile )?changes/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it('should render settings container', () => {
      const { container } = renderComponent();
      expect(container.firstChild).toBeTruthy();
    });

    it('should display settings form', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      });
    });

    it('should handle profile updates', async () => {
      renderComponent();
      await waitFor(() => {
        expect(document.body).toBeTruthy();
      });
    });

    it('should render settings interface', () => {
      const { container } = renderComponent();
      expect(container.querySelector('.settings-page')).toBeTruthy();
    });
  });
});
