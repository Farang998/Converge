import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProjectHeader from '../../../src/pages/ProjectWorkspace/ProjectHeader';

describe('ProjectHeader', () => {
  const mockProject = {
    name: 'Test Project',
    owner: { name: 'John Doe' },
  };

  it('should render without crashing', () => {
    render(
      <BrowserRouter>
        <ProjectHeader project={mockProject} progressPct={50} onOpenDetails={vi.fn()} />
      </BrowserRouter>
    );
    expect(document.body).toBeInTheDocument();
  });

  it('should render project name', () => {
    render(
      <BrowserRouter>
        <ProjectHeader project={mockProject} progressPct={50} onOpenDetails={vi.fn()} />
      </BrowserRouter>
    );
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('should render owner name', () => {
    render(
      <BrowserRouter>
        <ProjectHeader project={mockProject} progressPct={50} onOpenDetails={vi.fn()} />
      </BrowserRouter>
    );
    expect(screen.getByText(/managed by john doe/i)).toBeInTheDocument();
  });

  it('should render update details button', () => {
    render(
      <BrowserRouter>
        <ProjectHeader project={mockProject} progressPct={50} onOpenDetails={vi.fn()} />
      </BrowserRouter>
    );
    expect(screen.getByText(/update details/i)).toBeInTheDocument();
  });

  it('should render back button', () => {
    render(
      <BrowserRouter>
        <ProjectHeader project={mockProject} progressPct={50} onOpenDetails={vi.fn()} />
      </BrowserRouter>
    );
    expect(screen.getByText(/back/i)).toBeInTheDocument();
  });
});
