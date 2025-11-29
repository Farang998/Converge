import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NotFound from '../../../../src/pages/ProjectWorkspace/Tasks/NotFound';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('NotFound', () => {
  it('should render 404 heading', () => {
    renderWithRouter(<NotFound />);
    expect(screen.getByText(/404/i)).toBeInTheDocument();
  });

  it('should render page not found message', () => {
    renderWithRouter(<NotFound />);
    expect(screen.getByText(/page you are looking for does not exist/i)).toBeInTheDocument();
  });

  it('should render go home link', () => {
    renderWithRouter(<NotFound />);
    const homeLink = screen.getByRole('link', { name: /go home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
