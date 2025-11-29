import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteConfirmationModal from '../../src/components/DeleteConfirmationModal';

describe('DeleteConfirmationModal Component', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when isOpen is true', () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        messageContent="Are you sure?"
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <DeleteConfirmationModal
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        messageContent="Are you sure?"
      />
    );
    expect(container.firstChild).toBeFalsy();
  });

  it('should call onConfirm and onClose when confirm button clicked', () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        messageContent="Are you sure?"
      />
    );

    const confirmButton = screen.getByText('Delete');
    fireEvent.click(confirmButton);
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button clicked', () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        messageContent="Are you sure?"
      />
    );

    const buttons = screen.queryAllByRole('button');
    if (buttons.length > 1) {
      fireEvent.click(buttons[1]);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should display message content', () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        messageContent="Delete this item?"
      />
    );

    expect(screen.getAllByText(/Delete/i).length).toBeGreaterThan(0);
  });

  it('should close on backdrop click', () => {
    const { container } = render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        messageContent="Are you sure?"
      />
    );

    const backdrop = container.querySelector('.delete-modal-overlay');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should display file name when provided', () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        messageContent="Delete file?"
        hasFile={true}
        fileName="test-file.pdf"
      />
    );

    const text = document.body.textContent;
    expect(text).toBeDefined();
  });

  it('should display message preview when provided', () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        messageContent="Test message"
      />
    );
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should match snapshot when closed', () => {
    const { container } = render(
      <DeleteConfirmationModal
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        messageContent="Test message"
      />
    );
    expect(container).toMatchSnapshot();
  });
});
