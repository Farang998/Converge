import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusStrip from '../../../src/pages/ProjectWorkspace/StatusStrip';

describe('StatusStrip', () => {
  it('should render without crashing', () => {
    render(<StatusStrip progress={50} nextMilestone={null} lastActivity={null} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render progress percentage', () => {
    render(<StatusStrip progress={75} nextMilestone={null} lastActivity={null} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should render progress label', () => {
    render(<StatusStrip progress={50} nextMilestone={null} lastActivity={null} />);
    expect(screen.getByText(/progress:/i)).toBeInTheDocument();
  });

  it('should render next milestone when provided', () => {
    const milestone = { title: 'Release v1.0' };
    render(<StatusStrip progress={50} nextMilestone={milestone} lastActivity={null} />);
    expect(screen.getByText('Release v1.0')).toBeInTheDocument();
  });

  it('should render dash when no milestone', () => {
    render(<StatusStrip progress={50} nextMilestone={null} lastActivity={null} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('should render last activity label', () => {
    render(<StatusStrip progress={50} nextMilestone={null} lastActivity={null} />);
    expect(screen.getByText(/last activity:/i)).toBeInTheDocument();
  });
});
