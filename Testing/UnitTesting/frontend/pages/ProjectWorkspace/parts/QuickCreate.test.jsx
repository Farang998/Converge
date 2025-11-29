import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickCreate from '../../../../src/pages/ProjectWorkspace/parts/QuickCreate';

describe('QuickCreate', () => {
  it('should render input field', () => {
    const mockOnCreate = vi.fn();
    render(<QuickCreate onCreate={mockOnCreate} />);
    expect(screen.getByPlaceholderText(/task title/i)).toBeInTheDocument();
  });

  it('should render create button', () => {
    const mockOnCreate = vi.fn();
    render(<QuickCreate onCreate={mockOnCreate} />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('should update input value on change', () => {
    const mockOnCreate = vi.fn();
    render(<QuickCreate onCreate={mockOnCreate} />);
    const input = screen.getByPlaceholderText(/task title/i);
    
    fireEvent.change(input, { target: { value: 'New Task' } });
    expect(input.value).toBe('New Task');
  });

  it('should call onCreate with trimmed value when create button clicked', () => {
    const mockOnCreate = vi.fn();
    render(<QuickCreate onCreate={mockOnCreate} />);
    const input = screen.getByPlaceholderText(/task title/i);
    const button = screen.getByRole('button', { name: /create/i });
    
    fireEvent.change(input, { target: { value: '  Test Task  ' } });
    fireEvent.click(button);
    
    expect(mockOnCreate).toHaveBeenCalledWith('Test Task');
  });

  it('should clear input after creating', () => {
    const mockOnCreate = vi.fn();
    render(<QuickCreate onCreate={mockOnCreate} />);
    const input = screen.getByPlaceholderText(/task title/i);
    const button = screen.getByRole('button', { name: /create/i });
    
    fireEvent.change(input, { target: { value: 'Test Task' } });
    fireEvent.click(button);
    
    expect(input.value).toBe('');
  });

  it('should not call onCreate with empty or whitespace-only value', () => {
    const mockOnCreate = vi.fn();
    render(<QuickCreate onCreate={mockOnCreate} />);
    const button = screen.getByRole('button', { name: /create/i });
    
    fireEvent.click(button);
    expect(mockOnCreate).not.toHaveBeenCalled();
    
    const input = screen.getByPlaceholderText(/task title/i);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(button);
    
    expect(mockOnCreate).not.toHaveBeenCalled();
  });
});
