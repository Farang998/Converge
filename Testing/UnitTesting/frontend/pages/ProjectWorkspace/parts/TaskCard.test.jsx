import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from '../../../../src/pages/ProjectWorkspace/parts/TaskCard';

describe('TaskCard', () => {
  const mockTask = {
    title: 'Test Task',
    status: 'open',
    priority: 'High',
    assignee: 'John',
    updatedAt: '2024-01-15T10:30:00Z',
  };

  it('should render task title', () => {
    const mockOnToggle = vi.fn();
    const mockOnSelect = vi.fn();
    render(<TaskCard task={mockTask} onToggle={mockOnToggle} onSelect={mockOnSelect} isSelected={false} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should render priority tag', () => {
    const mockOnToggle = vi.fn();
    const mockOnSelect = vi.fn();
    render(<TaskCard task={mockTask} onToggle={mockOnToggle} onSelect={mockOnSelect} isSelected={false} />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('should render assignee name', () => {
    const mockOnToggle = vi.fn();
    const mockOnSelect = vi.fn();
    render(<TaskCard task={mockTask} onToggle={mockOnToggle} onSelect={mockOnSelect} isSelected={false} />);
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('should render status as Open for non-done tasks', () => {
    const mockOnToggle = vi.fn();
    const mockOnSelect = vi.fn();
    render(<TaskCard task={mockTask} onToggle={mockOnToggle} onSelect={mockOnSelect} isSelected={false} />);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('should render status as Completed for done tasks', () => {
    const doneTask = { ...mockTask, status: 'done' };
    const mockOnToggle = vi.fn();
    const mockOnSelect = vi.fn();
    render(<TaskCard task={doneTask} onToggle={mockOnToggle} onSelect={mockOnSelect} isSelected={false} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should check checkbox when status is done', () => {
    const doneTask = { ...mockTask, status: 'done' };
    const mockOnToggle = vi.fn();
    const mockOnSelect = vi.fn();
    render(<TaskCard task={doneTask} onToggle={mockOnToggle} onSelect={mockOnSelect} isSelected={false} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('should uncheck checkbox when status is not done', () => {
    const mockOnToggle = vi.fn();
    const mockOnSelect = vi.fn();
    render(<TaskCard task={mockTask} onToggle={mockOnToggle} onSelect={mockOnSelect} isSelected={false} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('should call onToggle when checkbox clicked', () => {
    const mockOnToggle = vi.fn();
    const mockOnSelect = vi.fn();
    render(<TaskCard task={mockTask} onToggle={mockOnToggle} onSelect={mockOnSelect} isSelected={false} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(mockOnToggle).toHaveBeenCalled();
  });

  it('should call onSelect when card clicked', () => {
    const mockOnToggle = vi.fn();
    const mockOnSelect = vi.fn();
    render(<TaskCard task={mockTask} onToggle={mockOnToggle} onSelect={mockOnSelect} isSelected={false} />);
    const card = screen.getByText('Test Task').closest('.task-card');
    fireEvent.click(card);
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('should apply selected class when isSelected is true', () => {
    const mockOnToggle = vi.fn();
    const mockOnSelect = vi.fn();
    render(<TaskCard task={mockTask} onToggle={mockOnToggle} onSelect={mockOnSelect} isSelected={true} />);
    const card = screen.getByText('Test Task').closest('.task-card');
    expect(card).toHaveClass('selected');
  });

  it('should display Unassigned when no assignee', () => {
    const unassignedTask = { ...mockTask, assignee: null };
    const mockOnToggle = vi.fn();
    const mockOnSelect = vi.fn();
    render(<TaskCard task={unassignedTask} onToggle={mockOnToggle} onSelect={mockOnSelect} isSelected={false} />);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('should display Low priority as default when no priority', () => {
    const noPriorityTask = { ...mockTask, priority: null };
    const mockOnToggle = vi.fn();
    const mockOnSelect = vi.fn();
    render(<TaskCard task={noPriorityTask} onToggle={mockOnToggle} onSelect={mockOnSelect} isSelected={false} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
  });
});
