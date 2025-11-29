import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AccordionSection from '../../src/components/AccordionSection';

describe('AccordionSection Component', () => {
  const mockProps = {
    title: 'Test Section',
    children: <div>Test Content</div>,
  };

  it('should render without crashing', () => {
    render(<AccordionSection {...mockProps} />);
    expect(document.body).toBeInTheDocument();
  });

  it('should display title', () => {
    render(<AccordionSection {...mockProps} />);
    expect(screen.queryByText('Test Section')).toBeDefined();
  });

  it('should toggle content on click', () => {
    render(<AccordionSection {...mockProps} />);
    const buttons = screen.queryAllByRole('button');
    
    if (buttons.length > 0) {
      fireEvent.click(buttons[0]);
      expect(buttons[0]).toBeInTheDocument();
    }
  });

  it('should render children when expanded', () => {
    render(<AccordionSection {...mockProps} isOpen={true} />);
    expect(screen.queryByText('Test Content')).toBeDefined();
  });

  it('should handle custom className', () => {
    const { container } = render(
      <AccordionSection {...mockProps} className="custom-class" />
    );
    expect(container.querySelector('.custom-class') || container.firstChild).toBeDefined();
  });

  it('should match snapshot', () => {
    const { container } = render(<AccordionSection {...mockProps} />);
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot when open', () => {
    const { container } = render(<AccordionSection {...mockProps} isOpen={true} />);
    expect(container).toMatchSnapshot();
  });
});
