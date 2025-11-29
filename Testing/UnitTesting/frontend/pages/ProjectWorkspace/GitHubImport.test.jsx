import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GitHubImport from '../../../src/pages/ProjectWorkspace/GitHubImport';

vi.mock('../../../src/services/api', () => ({
  default: {
    post: vi.fn(() => Promise.resolve({ data: { files: [], ingest_started: false } })),
  },
}));

describe('GitHubImport', () => {
  const mockProps = {
    projectId: '123',
    onImportSuccess: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<GitHubImport {...mockProps} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render modal heading', () => {
    render(<GitHubImport {...mockProps} />);
    expect(screen.getByText(/import from github/i)).toBeInTheDocument();
  });

  it('should render close button', () => {
    render(<GitHubImport {...mockProps} />);
    expect(screen.getByText(/close/i)).toBeInTheDocument();
  });

  it('should render repository URL label', () => {
    render(<GitHubImport {...mockProps} />);
    expect(screen.getByText(/repository url/i)).toBeInTheDocument();
  });

  it('should render branch input', () => {
    render(<GitHubImport {...mockProps} />);
    expect(screen.getByPlaceholderText(/main/i)).toBeInTheDocument();
  });

  it('should render private checkbox', () => {
    render(<GitHubImport {...mockProps} />);
    expect(screen.getByText(/private repo/i)).toBeInTheDocument();
  });

  it('should render submit button', () => {
    render(<GitHubImport {...mockProps} />);
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
  });

  it('should render form element', () => {
    const { container } = render(<GitHubImport {...mockProps} />);
    expect(container.querySelector('form')).toBeInTheDocument();
  });

  it('should render repository URL input', () => {
    const { container } = render(<GitHubImport {...mockProps} />);
    const input = container.querySelector('input[type="text"]');
    expect(input).toBeInTheDocument();
  });

  it('should render modal overlay', () => {
    const { container } = render(<GitHubImport {...mockProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should have private repo checkbox', () => {
    const { container } = render(<GitHubImport {...mockProps} />);
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeInTheDocument();
  });

  it('should render GitHub import modal', () => {
    render(<GitHubImport {...mockProps} />);
    expect(screen.getByText(/import from github/i)).toBeTruthy();
  });
});
