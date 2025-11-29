import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectNav from '../../../src/pages/ProjectWorkspace/ProjectNav';

describe('ProjectNav', () => {
  const mockProject = {
    members: [{ id: 1 }, { id: 2 }, { id: 3 }],
  };

  it('should render without crashing', () => {
    render(<ProjectNav active="overview" setActive={vi.fn()} project={mockProject} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render project section label', () => {
    render(<ProjectNav active="overview" setActive={vi.fn()} project={mockProject} />);
    expect(screen.getByText(/project/i)).toBeInTheDocument();
  });

  it('should render overview nav item', () => {
    render(<ProjectNav active="overview" setActive={vi.fn()} project={mockProject} />);
    expect(screen.getByText(/overview/i)).toBeInTheDocument();
  });

  it('should render tasks nav item', () => {
    render(<ProjectNav active="overview" setActive={vi.fn()} project={mockProject} />);
    expect(screen.getByText(/tasks/i)).toBeInTheDocument();
  });

  it('should render files nav item', () => {
    render(<ProjectNav active="overview" setActive={vi.fn()} project={mockProject} />);
    expect(screen.getByText(/files/i)).toBeInTheDocument();
  });

  it('should render calendar nav item', () => {
    render(<ProjectNav active="overview" setActive={vi.fn()} project={mockProject} />);
    expect(screen.getByText(/calendar/i)).toBeInTheDocument();
  });

  it('should render members count in footer', () => {
    render(<ProjectNav active="overview" setActive={vi.fn()} project={mockProject} />);
    expect(screen.getByText(/members: 3/i)).toBeInTheDocument();
  });
});
