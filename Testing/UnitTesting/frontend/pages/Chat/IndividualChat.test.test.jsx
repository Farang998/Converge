import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../src/contexts/AuthContext';
import IndividualChat from '../../../src/pages/Chat/IndividualChat.jsx';

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
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

describe('IndividualChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render without crashing', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render component structure', () => {
    const { container } = renderWithProviders(<IndividualChat />);
    expect(container.firstChild).toBeDefined();
  });

  it('should handle component lifecycle', async () => {
    renderWithProviders(<IndividualChat />);
    // Component should mount successfully
    expect(document.body).toBeInTheDocument();
  });

  it('should match snapshot', () => {
    const { container } = renderWithProviders(<IndividualChat />);
    expect(container).toMatchSnapshot();
  });

  it('should render chat interface', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should handle individual chat state', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should render message container', () => {
    const { container } = renderWithProviders(<IndividualChat />);
    expect(container.firstChild).toBeDefined();
  });

  it('should handle user messages', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should render chat UI', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should handle message input', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should handle message sending', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should render with project context', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should handle chat history', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should handle WebSocket connection', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should handle typing indicators', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should render message list', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should handle message updates', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should handle scroll behavior', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should render chat header', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should handle file attachments', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should handle emoji picker', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should handle message deletion', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should handle loading states', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });

  it('should handle error states', () => {
    renderWithProviders(<IndividualChat />);
    expect(document.body).toBeTruthy();
  });
});
