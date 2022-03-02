import { vi } from 'vitest';
import type { BinaryLike } from 'crypto';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ReactiveHash from '../src/components/ReactiveHash';

/**
 * Mock expected global api exposed by {@link module:preload}
 */
type WindowType = Window &
  typeof globalThis & { nodeCrypto: { sha256sum: (s: BinaryLike) => string } };
(window as WindowType).nodeCrypto = {
  sha256sum: vi.fn((s: BinaryLike) => `${s}:HASHED`),
};

describe('ReactiveHash component', async () => {
  it('should be initialised to Hello World', async () => {
    render(<ReactiveHash />);

    const dataInput = await waitFor(() =>
      screen.getByRole('textbox', { name: 'Raw value:' }),
    );

    const hashInput = await waitFor(() =>
      screen.getByRole('textbox', { name: 'Hashed by nodeCrypto:' }),
    );

    expect(dataInput).toHaveValue('Hello World');
    expect(hashInput).toHaveValue('Hello World:HASHED');
  });

  it('should hash value that is typed in', async () => {
    render(<ReactiveHash />);

    const dataInput = await waitFor(() =>
      screen.getByRole('textbox', { name: 'Raw value:' }),
    );

    const hashInput = await waitFor(() =>
      screen.getByRole('textbox', { name: 'Hashed by nodeCrypto:' }),
    );

    const dataToHash = 'Raw data from unit test';

    fireEvent.change(dataInput, {
      target: {
        value: dataToHash,
      },
    });

    expect(hashInput).toHaveValue(`${dataToHash}:HASHED`);
  });
});
