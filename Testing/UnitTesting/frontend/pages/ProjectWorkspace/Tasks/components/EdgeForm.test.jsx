import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EdgeForm from '../../../../../src/pages/ProjectWorkspace/Tasks/components/EdgeForm';

describe('EdgeForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const mockNodes = [
    { id: '1', data: { label: 'Task 1' } },
    { id: '2', data: { label: 'Task 2' } },
    { id: '3', data: { label: 'Task 3' } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<EdgeForm nodes={mockNodes} onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render create dependency heading for new edge', () => {
    render(<EdgeForm nodes={mockNodes} onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByText(/create dependency/i)).toBeInTheDocument();
  });

  it('should render edit dependency heading for existing edge', () => {
    const existingEdge = { from: '1', to: '2' };
    render(<EdgeForm nodes={mockNodes} onSave={mockOnSave} onCancel={mockOnCancel} existingEdge={existingEdge} />);
    expect(screen.getByText(/edit dependency/i)).toBeInTheDocument();
  });

  it('should render from and to labels', () => {
    render(<EdgeForm nodes={mockNodes} onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByText(/from/i)).toBeInTheDocument();
    expect(screen.getByText(/to/i)).toBeInTheDocument();
  });

  it('should render create/save button', () => {
    render(<EdgeForm nodes={mockNodes} onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('should render cancel button', () => {
    render(<EdgeForm nodes={mockNodes} onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should display select dropdowns', () => {
    const { container } = render(<EdgeForm nodes={mockNodes} onSave={mockOnSave} onCancel={mockOnCancel} />);
    const selects = container.querySelectorAll('select');
    expect(selects).toHaveLength(2);
  });
});
