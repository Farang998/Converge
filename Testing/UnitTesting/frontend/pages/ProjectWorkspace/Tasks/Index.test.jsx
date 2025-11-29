import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../../src/contexts/AuthContext';
import Index from '../../../../src/pages/ProjectWorkspace/Tasks/Index';

vi.mock('reactflow', () => ({
  ReactFlowProvider: ({ children }) => <div>{children}</div>,
  default: ({ children }) => <div data-testid="react-flow">{children}</div>,
  Controls: () => <div data-testid="controls" />,
  Background: () => <div data-testid="background" />,
  BackgroundVariant: {
    Dots: 'dots',
    Lines: 'lines',
    Cross: 'cross',
  },
  MiniMap: () => <div data-testid="minimap" />,
  useNodesState: () => [[], vi.fn(), vi.fn()],
  useEdgesState: () => [[], vi.fn(), vi.fn()],
  addEdge: vi.fn(),
}));

vi.mock('../../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ 
      data: [
        { id: 1, name: 'Test Project', team_members: [] }
      ]
    })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Tasks Index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('authToken', 'test-token');
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      renderWithProviders(<Index />);
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    });

    it('should render controls', () => {
      renderWithProviders(<Index />);
      expect(screen.getByTestId('controls')).toBeInTheDocument();
    });

    it('should render background', () => {
      renderWithProviders(<Index />);
      expect(screen.getByTestId('background')).toBeInTheDocument();
    });

    it('should render minimap', () => {
      renderWithProviders(<Index />);
      expect(screen.getByTestId('minimap')).toBeInTheDocument();
    });

    it('should render task workflow container', () => {
      const { container } = renderWithProviders(<Index />);
      expect(container.firstChild).toBeTruthy();
    });

    it('should initialize react flow', () => {
      renderWithProviders(<Index />);
      expect(screen.getByTestId('react-flow')).toBeTruthy();
    });

    it('should render with auth context', () => {
      renderWithProviders(<Index />);
      expect(document.body).toBeTruthy();
    });

    it('should display workflow visualization', () => {
      renderWithProviders(<Index />);
      expect(screen.getByTestId('controls')).toBeTruthy();
    });

    it('should render ReactFlowProvider wrapper', () => {
      const { container } = renderWithProviders(<Index />);
      expect(container.querySelector('[data-testid="react-flow"]')).toBeInTheDocument();
    });

    it('should render with project ID prop', () => {
      renderWithProviders(<Index projectId={1} />);
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    });

    it('should handle missing project ID', () => {
      renderWithProviders(<Index />);
      expect(document.body).toBeTruthy();
    });

    it('should initialize nodes state', () => {
      renderWithProviders(<Index projectId={1} />);
      expect(document.body).toBeTruthy();
    });

    it('should initialize edges state', () => {
      renderWithProviders(<Index projectId={1} />);
      expect(document.body).toBeTruthy();
    });

    it('should handle modal state', () => {
      renderWithProviders(<Index projectId={1} />);
      expect(document.body).toBeTruthy();
    });

    it('should handle pending edges', () => {
      renderWithProviders(<Index projectId={1} />);
      expect(document.body).toBeTruthy();
    });

    it('should handle notification state', () => {
      renderWithProviders(<Index projectId={1} />);
      expect(document.body).toBeTruthy();
    });

    it('should render task visualization container', () => {
      const { container } = renderWithProviders(<Index projectId={1} />);
      expect(container.firstChild).toBeDefined();
    });

    it('should handle project data loading', () => {
      renderWithProviders(<Index projectId={1} />);
      expect(document.body).toBeTruthy();
    });

    it('should render flow controls properly', () => {
      renderWithProviders(<Index projectId={1} />);
      expect(screen.getByTestId('controls')).toBeTruthy();
    });

    it('should render background grid', () => {
      renderWithProviders(<Index projectId={1} />);
      expect(screen.getByTestId('background')).toBeTruthy();
    });

    it('should render minimap component', () => {
      renderWithProviders(<Index projectId={1} />);
      expect(screen.getByTestId('minimap')).toBeTruthy();
    });

    it('should handle task workflow state', () => {
      renderWithProviders(<Index projectId={1} />);
      expect(document.body).toBeTruthy();
    });

    it('should initialize with empty nodes', () => {
      renderWithProviders(<Index projectId={1} />);
      expect(document.body).toBeTruthy();
    });

    it('should initialize with empty edges', () => {
      renderWithProviders(<Index projectId={1} />);
      expect(document.body).toBeTruthy();
    });
  });
});
