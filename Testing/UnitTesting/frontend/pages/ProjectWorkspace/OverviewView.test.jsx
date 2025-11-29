import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OverviewView from '../../../src/pages/ProjectWorkspace/OverviewView';

vi.mock('../../../src/pages/ProjectWorkspace/ActivityView', () => ({
  default: () => <div>ActivityView</div>,
}));

describe('OverviewView', () => {
  const mockProject = {
    name: 'Test Project',
    description: 'Project description',
    members: [{ id: 1, name: 'User1' }, { id: 2, name: 'User2' }],
  };

  const mockTasks = [
    { id: 1, name: 'Task 1' },
    { id: 2, name: 'Task 2' },
  ];

  const mockFiles = [{ id: 1, name: 'file1.pdf' }];

  const mockActivity = [];

  it('should render without crashing', () => {
    render(
      <OverviewView
        project={mockProject}
        tasks={mockTasks}
        files={mockFiles}
        activity={mockActivity}
        onCreateTask={vi.fn()}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('should render project summary heading', () => {
    render(
      <OverviewView
        project={mockProject}
        tasks={mockTasks}
        files={mockFiles}
        activity={mockActivity}
        onCreateTask={vi.fn()}
      />
    );
    expect(screen.getByText(/project summary/i)).toBeInTheDocument();
  });

  it('should render project description', () => {
    render(
      <OverviewView
        project={mockProject}
        tasks={mockTasks}
        files={mockFiles}
        activity={mockActivity}
        onCreateTask={vi.fn()}
      />
    );
    expect(screen.getByText(/project description/i)).toBeInTheDocument();
  });

  it('should display tasks count', () => {
    render(
      <OverviewView
        project={mockProject}
        tasks={mockTasks}
        files={mockFiles}
        activity={mockActivity}
        onCreateTask={vi.fn()}
      />
    );
    expect(screen.getByText(/tasks/i)).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('should display files count', () => {
    render(
      <OverviewView
        project={mockProject}
        tasks={mockTasks}
        files={mockFiles}
        activity={mockActivity}
        onCreateTask={vi.fn()}
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should display members count', () => {
    render(
      <OverviewView
        project={mockProject}
        tasks={mockTasks}
        files={mockFiles}
        activity={mockActivity}
        onCreateTask={vi.fn()}
      />
    );
    expect(screen.getAllByText('2')[0]).toBeInTheDocument();
  });
});
