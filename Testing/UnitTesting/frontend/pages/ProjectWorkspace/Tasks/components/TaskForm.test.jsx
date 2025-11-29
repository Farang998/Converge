import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TaskForm from '../../../../../src/pages/ProjectWorkspace/Tasks/components/TaskForm';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('TaskForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const mockMembers = [
    { user_id: 1, username: 'user1' },
    { user_id: 2, username: 'user2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    renderWithRouter(
      <TaskForm 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
        projectMembers={mockMembers}
        projectName="Test Project"
        projectId="1"
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('should render task name input', () => {
    renderWithRouter(
      <TaskForm 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
        projectMembers={mockMembers}
        projectName="Test Project"
        projectId="1"
      />
    );
    expect(screen.getByText(/task name/i)).toBeInTheDocument();
  });

  it('should render description textarea', () => {
    renderWithRouter(
      <TaskForm 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
        projectMembers={mockMembers}
        projectName="Test Project"
        projectId="1"
      />
    );
    expect(screen.getByPlaceholderText(/add task description/i)).toBeInTheDocument();
  });

  it('should render due date field', () => {
    renderWithRouter(
      <TaskForm 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
        projectMembers={mockMembers}
        projectName="Test Project"
        projectId="1"
      />
    );
    expect(screen.getByText(/due date/i)).toBeInTheDocument();
  });

  it('should render cancel button', () => {
    renderWithRouter(
      <TaskForm 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
        projectMembers={mockMembers}
        projectName="Test Project"
        projectId="1"
      />
    );
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should render create button', () => {
    renderWithRouter(
      <TaskForm 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
        projectMembers={mockMembers}
        projectName="Test Project"
        projectId="1"
      />
    );
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });
});
