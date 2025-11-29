import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectDetailsModal from '../../../../src/pages/ProjectWorkspace/parts/ProjectDetailsModal';

describe('ProjectDetailsModal', () => {
  const mockProject = {
    name: 'Test Project',
    description: 'Project description',
    owner: { id: 1, name: 'Owner' },
  };

  const mockMembers = [
    { id: 1, name: 'User1', email: 'user1@example.com' },
  ];

  it('should render nothing when not open', () => {
    const { container } = render(
      <ProjectDetailsModal
        isOpen={false}
        onClose={vi.fn()}
        project={mockProject}
        members={mockMembers}
        onSave={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render when open', () => {
    render(
      <ProjectDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        project={mockProject}
        members={mockMembers}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText(/update project details/i)).toBeInTheDocument();
  });

  it('should render project name input', () => {
    render(
      <ProjectDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        project={mockProject}
        members={mockMembers}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
  });

  it('should render close button', () => {
    render(
      <ProjectDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        project={mockProject}
        members={mockMembers}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText('×')).toBeInTheDocument();
  });
});
