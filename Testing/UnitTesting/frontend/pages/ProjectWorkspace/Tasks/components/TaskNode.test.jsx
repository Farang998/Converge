import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskNode from '../../../../../src/pages/ProjectWorkspace/Tasks/components/TaskNode.jsx';

vi.mock('reactflow', () => ({
  Handle: ({ type, position }) => <div data-testid={`handle-${type}`}>{type}</div>,
  Position: {
    Top: 'top',
    Bottom: 'bottom',
  },
}));

vi.mock('../../../../../src/pages/ProjectWorkspace/Tasks/components/TaskDetailsModal.jsx', () => ({
  default: () => <div>TaskDetailsModal</div>,
}));

describe('TaskNode', () => {
  const mockData = {
    name: 'Test Task',
    status: 'in_progress',
    due_date: '2024-12-31',
    assigned_to: ['User1', 'User2'],
    created_at: '2024-01-15T10:00:00Z',
  };

  it('should render without crashing', () => {
    render(<TaskNode data={mockData} selected={false} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render task name', () => {
    render(<TaskNode data={mockData} selected={false} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should render status label', () => {
    render(<TaskNode data={mockData} selected={false} />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('should render due date label', () => {
    render(<TaskNode data={mockData} selected={false} />);
    expect(screen.getByText(/due:/i)).toBeInTheDocument();
  });

  it('should render assigned users', () => {
    render(<TaskNode data={mockData} selected={false} />);
    expect(screen.getByText('User1, User2')).toBeInTheDocument();
  });

  it('should render handles', () => {
    const { getByTestId } = render(<TaskNode data={mockData} selected={false} />);
    expect(getByTestId('handle-target')).toBeInTheDocument();
    expect(getByTestId('handle-source')).toBeInTheDocument();
  });
});
