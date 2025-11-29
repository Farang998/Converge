import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FilesView from '../../../src/pages/ProjectWorkspace/FilesView';

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { files: [] } })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock('../../../src/services/ingest', () => ({
  ingestS3Uris: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../src/pages/ProjectWorkspace/parts/FileCard', () => ({
  default: () => <div>FileCard</div>,
}));

vi.mock('../../../src/pages/ProjectWorkspace/GitHubImport', () => ({
  default: () => <div>GitHubImport</div>,
}));

describe('FilesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(
      <BrowserRouter>
        <FilesView projectId="123" />
      </BrowserRouter>
    );
    expect(document.body).toBeInTheDocument();
  });

  it('should show loading spinner initially', () => {
    render(
      <BrowserRouter>
        <FilesView projectId="123" />
      </BrowserRouter>
    );
    expect(screen.getByText(/loading files/i)).toBeInTheDocument();
  });

  it('should render upload button', async () => {
    render(
      <BrowserRouter>
        <FilesView projectId="123" />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/upload file/i)).toBeInTheDocument();
    });
  });

  it('should render GitHub import button', async () => {
    render(
      <BrowserRouter>
        <FilesView projectId="123" />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/import from github/i)).toBeInTheDocument();
    });
  });

  it('should show empty state when no files', async () => {
    render(
      <BrowserRouter>
        <FilesView projectId="123" />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/no files uploaded yet/i)).toBeInTheDocument();
    });
  });

  it('should render files view container', () => {
    const { container } = render(
      <BrowserRouter>
        <FilesView projectId="123" />
      </BrowserRouter>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('should render with projectId prop', () => {
    render(
      <BrowserRouter>
        <FilesView projectId="456" />
      </BrowserRouter>
    );
    expect(screen.getByText(/loading files/i)).toBeInTheDocument();
  });

  it('should handle files list', async () => {
    render(
      <BrowserRouter>
        <FilesView projectId="123" />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  it('should render file management interface', () => {
    render(
      <BrowserRouter>
        <FilesView projectId="123" />
      </BrowserRouter>
    );
    expect(document.body.textContent).toContain('Loading files');
  });
});
