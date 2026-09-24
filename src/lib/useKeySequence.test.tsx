import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useKeySequence } from './useKeySequence';

function Harness({ onO }: { onO: () => void }) {
  useKeySequence('g', { o: onO });
  return <input aria-label="Feld" />;
}

describe('useKeySequence', () => {
  it('runs the action for the prefix and then its key', async () => {
    const onO = vi.fn<() => void>();
    await render(<Harness onO={onO} />);
    await userEvent.keyboard('go');
    expect(onO).toHaveBeenCalledTimes(1);
  });

  it('needs the prefix first, and another key ends the sequence', async () => {
    const onO = vi.fn<() => void>();
    await render(<Harness onO={onO} />);
    await userEvent.keyboard('o');
    await userEvent.keyboard('gxo');
    expect(onO).not.toHaveBeenCalled();
  });

  it('stays quiet while typing', async () => {
    const onO = vi.fn<() => void>();
    const screen = await render(<Harness onO={onO} />);
    await screen.getByRole('textbox', { name: 'Feld' }).click();
    await userEvent.keyboard('go');
    expect(onO).not.toHaveBeenCalled();
    await expect.element(screen.getByRole('textbox', { name: 'Feld' })).toHaveValue('go');
  });
});
