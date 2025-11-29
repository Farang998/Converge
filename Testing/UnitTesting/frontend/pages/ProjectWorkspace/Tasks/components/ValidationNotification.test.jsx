import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ValidationNotification from '../../../../../src/pages/ProjectWorkspace/Tasks/components/ValidationNotification.jsx';

describe('ValidationNotification', () => {
  it('should render without crashing', () => {
    const notification = { type: 'success', title: 'Success', message: 'Operation completed' };
    render(<ValidationNotification notification={notification} onClose={vi.fn()} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render notification title', () => {
    const notification = { type: 'success', title: 'Success', message: 'Operation completed' };
    render(<ValidationNotification notification={notification} onClose={vi.fn()} />);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('should render notification message', () => {
    const notification = { type: 'success', title: 'Success', message: 'Operation completed' };
    render(<ValidationNotification notification={notification} onClose={vi.fn()} />);
    expect(screen.getByText('Operation completed')).toBeInTheDocument();
  });

  it('should render error notification', () => {
    const notification = { type: 'error', title: 'Error', message: 'Something went wrong' };
    render(<ValidationNotification notification={notification} onClose={vi.fn()} />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should render warning notification', () => {
    const notification = { type: 'warning', title: 'Warning', message: 'Please check' };
    render(<ValidationNotification notification={notification} onClose={vi.fn()} />);
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('should render close button', () => {
    const notification = { type: 'success', title: 'Success', message: 'Done' };
    render(<ValidationNotification notification={notification} onClose={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
