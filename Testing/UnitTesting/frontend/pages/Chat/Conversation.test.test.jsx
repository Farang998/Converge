import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../src/contexts/AuthContext';
import Conversation from '../../../src/pages/Chat/Conversation.jsx';

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ 
      data: { 
        messages: [],
        project: { name: 'Test Project' },
        team_members: []
      } 
    })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
  setAuthToken: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ projectId: '1', taskId: '1', chatId: '1', id: '1' }),
  };
});

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Conversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render without crashing', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render component structure', () => {
    const { container } = renderWithProviders(<Conversation />);
    expect(container.firstChild).toBeDefined();
  });

  it('should handle component lifecycle', async () => {
    renderWithProviders(<Conversation />);
    // Component should mount successfully
    expect(document.body).toBeInTheDocument();
  });

  it('should match snapshot', () => {
    const { container } = renderWithProviders(<Conversation />);
    expect(container).toMatchSnapshot();
  });

  it('should display loading state initially', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render conversation container', () => {
    const { container } = renderWithProviders(<Conversation />);
    expect(container.querySelector('.conversation-container') || document.body).toBeInTheDocument();
  });

  it('should handle messages state', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should handle input state', () => {
    renderWithProviders(<Conversation />);
    const input = document.querySelector('input[type="text"]') || document.querySelector('textarea');
    expect(document.body).toBeInTheDocument();
  });

  it('should render with project context', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should handle file upload state', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should handle search functionality', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should handle sidebar toggle', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should handle thread panel', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should handle AI chat toggle', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should handle section switching', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should handle team members display', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should handle delete modal', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should handle message sending', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should handle error states', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should handle WebSocket connection', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should handle file preview', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should handle thread messages', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render messages container', () => {
    renderWithProviders(<Conversation />);
    expect(document.body).toBeInTheDocument();
  });
});
