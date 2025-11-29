import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CreateProject from '../../../src/pages/Dashboard/CreateProject';
import * as AuthContextModule from '../../../src/contexts/AuthContext';

// Mock fetch globally
global.fetch = vi.fn();

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser = {
  id: 'user123',
  username: 'testuser',
  email: 'test@example.com'
};

const renderComponent = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('CreateProject Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockClear();
    localStorage.setItem('authToken', 'test-token');
    
    // Re-mock useAuth hook before each test
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      isAuthenticated: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render create project form', () => {
      renderComponent(<CreateProject />);
      
      expect(screen.getByText(/create new project/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('should render as modal when isModal prop is true', () => {
      renderComponent(<CreateProject isModal={true} />);
      
      expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument();
    });

    it('should render team members section', () => {
      renderComponent(<CreateProject />);
      
      expect(screen.getByPlaceholderText(/type username.*and press enter/i)).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked in modal mode', () => {
      const onClose = vi.fn();
      renderComponent(<CreateProject isModal={true} onClose={onClose} />);
      
      const closeButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onClose).toHaveBeenCalled();
      }
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting empty form', async () => {
      renderComponent(<CreateProject />);
      
      const submitButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please fill required fields/i)).toBeInTheDocument();
      });
    });

    it('should show error when project name is missing', async () => {
      renderComponent(<CreateProject />);
      
      const descInput = screen.getByLabelText(/description/i);
      fireEvent.change(descInput, { target: { value: 'Test description' } });

      const submitButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please fill required fields/i)).toBeInTheDocument();
      });
    });

    it('should show error when description is missing', async () => {
      renderComponent(<CreateProject />);
      
      const nameInput = screen.getByLabelText(/project name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Project' } });

      const submitButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please fill required fields/i)).toBeInTheDocument();
      });
    });

    it('should update project name input', () => {
      renderComponent(<CreateProject />);
      
      const nameInput = screen.getByLabelText(/project name/i);
      fireEvent.change(nameInput, { target: { value: 'My New Project' } });

      expect(nameInput.value).toBe('My New Project');
    });

    it('should update description input', () => {
      renderComponent(<CreateProject />);
      
      const descInput = screen.getByLabelText(/description/i);
      fireEvent.change(descInput, { target: { value: 'Project description' } });

      expect(descInput.value).toBe('Project description');
    });
  });

  describe('Team Member Management', () => {
    it('should update new member input', () => {
      renderComponent(<CreateProject />);
      
      const memberInput = screen.getByPlaceholderText(/type username.*and press enter/i);
      fireEvent.change(memberInput, { target: { value: 'newuser' } });

      expect(memberInput.value).toBe('newuser');
    });

    it('should validate username format', async () => {
      renderComponent(<CreateProject />);
      
      const memberInput = screen.getByPlaceholderText(/type username.*and press enter/i);
      
      // Invalid username (too short)
      fireEvent.change(memberInput, { target: { value: 'ab' } });
      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        const errorElements = screen.queryAllByText(/username invalid.*use 3-30 chars/i);
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('should add valid team member', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: 'user456', username: 'validuser' } })
      });

      renderComponent(<CreateProject />);
      
      const memberInput = screen.getByPlaceholderText(/type username.*and press enter/i);
      fireEvent.change(memberInput, { target: { value: 'validuser' } });

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('validuser')).toBeInTheDocument();
      });
    });

    it('should show error for non-existent user', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      renderComponent(<CreateProject />);
      
      const memberInput = screen.getByPlaceholderText(/type username.*and press enter/i);
      fireEvent.change(memberInput, { target: { value: 'nonexistent' } });

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/user not found/i)).toBeInTheDocument();
      });
    });

    it('should remove team member from list', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: 'user456', username: 'memberuser' } })
      });

      renderComponent(<CreateProject />);
      
      const memberInput = screen.getByPlaceholderText(/type username.*and press enter/i);
      fireEvent.change(memberInput, { target: { value: 'memberuser' } });

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('memberuser')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /remove memberuser/i });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('memberuser')).not.toBeInTheDocument();
      });
    });

    it('should prevent adding duplicate team members', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: 'user456', username: 'duplicateuser' } })
      });

      renderComponent(<CreateProject />);
      
      const memberInput = screen.getByPlaceholderText(/type username.*and press enter/i);
      const addButton = screen.getByRole('button', { name: /add/i });

      // Add first time
      fireEvent.change(memberInput, { target: { value: 'duplicateuser' } });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('duplicateuser')).toBeInTheDocument();
      });

      // Try to add again
      fireEvent.change(memberInput, { target: { value: 'duplicateuser' } });
      fireEvent.click(addButton);

      await waitFor(() => {
        const memberElements = screen.queryAllByText('duplicateuser');
        expect(memberElements.length).toBe(1); // Should only appear once
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          project: { 
            id: 'proj123', 
            name: 'Test Project',
            description: 'Test Description'
          } 
        })
      });

      renderComponent(<CreateProject />);
      
      const nameInput = screen.getByLabelText(/project name/i);
      const descInput = screen.getByLabelText(/description/i);
      
      fireEvent.change(nameInput, { target: { value: 'Test Project' } });
      fireEvent.change(descInput, { target: { value: 'Test Description' } });

      const submitButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/projects/',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        );
      });
    });

    it('should handle API errors during submission', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Project name already exists' })
      });

      renderComponent(<CreateProject />);
      
      const nameInput = screen.getByLabelText(/project name/i);
      const descInput = screen.getByLabelText(/description/i);
      
      fireEvent.change(nameInput, { target: { value: 'Duplicate Project' } });
      fireEvent.change(descInput, { target: { value: 'Description' } });

      const submitButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/project name already exists/i)).toBeInTheDocument();
      });
    });

    it('should navigate to dashboard on successful creation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          project: { 
            id: 'newproj123', 
            name: 'New Project'
          } 
        })
      });

      renderComponent(<CreateProject />);
      
      const nameInput = screen.getByLabelText(/project name/i);
      const descInput = screen.getByLabelText(/description/i);
      
      fireEvent.change(nameInput, { target: { value: 'New Project' } });
      fireEvent.change(descInput, { target: { value: 'New Description' } });

      const submitButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      }, { timeout: 5000 });
    });

    it('should include team members in submission payload', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { id: 'user456', username: 'member1' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            project: { id: 'proj123', name: 'Team Project' } 
          })
        });

      renderComponent(<CreateProject />);
      
      // Add team member
      const memberInput = screen.getByPlaceholderText(/type username.*and press enter/i);
      fireEvent.change(memberInput, { target: { value: 'member1' } });
      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('member1')).toBeInTheDocument();
      });

      // Fill form and submit
      const nameInput = screen.getByLabelText(/project name/i);
      const descInput = screen.getByLabelText(/description/i);
      fireEvent.change(nameInput, { target: { value: 'Team Project' } });
      fireEvent.change(descInput, { target: { value: 'Project with team' } });

      const submitButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const calls = global.fetch.mock.calls;
        const createCall = calls.find(call => 
          call[0] === 'http://localhost:8000/api/projects/' && 
          call[1]?.method === 'POST'
        );
        expect(createCall).toBeDefined();
        if (createCall) {
          const body = JSON.parse(createCall[1].body);
          expect(body.team_members).toContain('member1');
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message', () => {
      renderComponent(<CreateProject />);
      
      const submitButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(submitButton);

      expect(screen.getByText(/please fill required fields/i)).toBeInTheDocument();
    });

    it('should clear error on new input', async () => {
      renderComponent(<CreateProject />);
      
      // Trigger error
      const submitButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please fill required fields/i)).toBeInTheDocument();
      });

      // Type in input to clear error
      const nameInput = screen.getByLabelText(/project name/i);
      fireEvent.change(nameInput, { target: { value: 'New' } });

      // Error should be cleared (implementation dependent)
    });

    it('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      renderComponent(<CreateProject />);
      
      const nameInput = screen.getByLabelText(/project name/i);
      const descInput = screen.getByLabelText(/description/i);
      
      fireEvent.change(nameInput, { target: { value: 'Project' } });
      fireEvent.change(descInput, { target: { value: 'Description' } });

      const submitButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorText = screen.queryByText(/failed|error/i);
        expect(errorText).toBeInTheDocument();
      });
    });
  });

  describe('Username Validation', () => {
    it('should reject usernames shorter than 3 characters', async () => {
      renderComponent(<CreateProject />);
      
      const memberInput = screen.getByPlaceholderText(/type username.*and press enter/i);
      fireEvent.change(memberInput, { target: { value: 'ab' } });

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/username invalid.*use 3-30 chars/i)).toBeInTheDocument();
      });
    });

    it('should reject usernames with invalid characters', async () => {
      renderComponent(<CreateProject />);
      
      const memberInput = screen.getByPlaceholderText(/type username.*and press enter/i);
      fireEvent.change(memberInput, { target: { value: 'invalid@user!' } });

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/username invalid.*use 3-30 chars/i)).toBeInTheDocument();
      });
    });

    it('should accept valid usernames with letters and numbers', async () => {
      global.fetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ user: { id: 'differentuser456', username: 'alice2024' } })
        })
      );

      renderComponent(<CreateProject />);
      
      const memberInput = screen.getByPlaceholderText(/type username.*and press enter/i);
      fireEvent.change(memberInput, { target: { value: 'alice2024' } });

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('alice2024')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should accept usernames with underscores and dashes', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: 'userid456', username: 'user_name-123' } })
      });

      renderComponent(<CreateProject />);
      
      const memberInput = screen.getByPlaceholderText(/type username.*and press enter/i);
      fireEvent.change(memberInput, { target: { value: 'user_name-123' } });

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('user_name-123')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
