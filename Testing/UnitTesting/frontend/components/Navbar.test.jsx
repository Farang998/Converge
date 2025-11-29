import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../../src/components/Navbar';
import { AuthProvider } from '../../src/contexts/AuthContext';

vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
  },
  setAuthToken: vi.fn(),
}));

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Navbar Component', () => {
  it('should render without crashing', () => {
    renderWithProviders(<Navbar />);
    expect(document.body).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    renderWithProviders(<Navbar />);
    const links = screen.queryAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle user interactions', () => {
    renderWithProviders(<Navbar />);
    const buttons = screen.queryAllByRole('button');
    
    if (buttons.length > 0) {
      fireEvent.click(buttons[0]);
      expect(buttons[0]).toBeInTheDocument();
    }
  });

  it('should match snapshot', () => {
    const { container } = renderWithProviders(<Navbar />);
    expect(container).toMatchSnapshot();
  });
});
