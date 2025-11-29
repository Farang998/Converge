import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskDetailsModal from '../../../../../src/pages/ProjectWorkspace/Tasks/components/TaskDetailsModal';

describe('TaskDetailsModal', () => {
  const mockOnClose = vi.fn();
  const mockTask = {
    id: '1',
    name: 'Test Task',
    description: 'Test description',
    status: 'in_progress',
    due_date: '2024-12-31T10:00:00Z',
    created_at: '2024-01-01T10:00:00Z',
    assigned_to: [{ username: 'user1' }],
    dependencies: ['2'],
  };

  const mockTasksList = [
    { id: '1', name: 'Test Task' },
    { id: '2', name: 'Dependency Task' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render task name', () => {
    render(<TaskDetailsModal task={mockTask} tasksList={mockTasksList} onClose={mockOnClose} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should render task status', () => {
    render(<TaskDetailsModal task={mockTask} tasksList={mockTasksList} onClose={mockOnClose} />);
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
  });

  it('should render due date label', () => {
    render(<TaskDetailsModal task={mockTask} tasksList={mockTasksList} onClose={mockOnClose} />);
    expect(screen.getByText(/due date/i)).toBeInTheDocument();
  });

  it('should return null when task is null', () => {
    const { container } = render(<TaskDetailsModal task={null} tasksList={mockTasksList} onClose={mockOnClose} />);
    expect(container.firstChild).toBeNull();
  });

  it('should return null when task is undefined', () => {
    const { container } = render(<TaskDetailsModal tasksList={mockTasksList} onClose={mockOnClose} />);
    expect(container.firstChild).toBeNull();
  });

  it('should handle task without dependencies', () => {
    const taskWithoutDeps = { ...mockTask, dependencies: undefined };
    render(<TaskDetailsModal task={taskWithoutDeps} tasksList={mockTasksList} onClose={mockOnClose} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should handle empty tasksList', () => {
    render(<TaskDetailsModal task={mockTask} tasksList={[]} onClose={mockOnClose} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
});
