import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ReactiveCounter from '../src/components/ReactiveCounter';

describe('ReactiveCounter component', async () => {
  it('should increment counter button when clicked', async () => {
    render(<ReactiveCounter />);
    const button = await waitFor(() => screen.getByRole('button'));
    expect(button).toHaveTextContent('count is: 0');
    fireEvent.click(button);
    expect(button).toHaveTextContent('count is: 1');
  });
});
