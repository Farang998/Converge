import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityView from '../../../src/pages/ProjectWorkspace/ActivityView';

describe('ActivityView', () => {
  it('should render without crashing', () => {
    render(<ActivityView activity={[]} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should show empty state when no activity', () => {
    render(<ActivityView activity={[]} />);
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
  });

  it('should render activity feed heading when activity exists', () => {
    const activity = [{ id: 1, text: 'Task created', time: '2024-01-15T10:00:00Z' }];
    render(<ActivityView activity={activity} />);
    expect(screen.getByText(/activity feed/i)).toBeInTheDocument();
  });

  it('should render activity items', () => {
    const activity = [
      { id: 1, text: 'Task created', time: '2024-01-15T10:00:00Z' },
      { id: 2, text: 'File uploaded', time: '2024-01-15T11:00:00Z' },
    ];
    render(<ActivityView activity={activity} />);
    expect(screen.getByText('Task created')).toBeInTheDocument();
    expect(screen.getByText('File uploaded')).toBeInTheDocument();
  });
});
