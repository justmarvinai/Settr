import { useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useRovingFocus } from './useRovingFocus';

/** Seven tiles in three columns, each with a link and a button on it. */
function Grid() {
  const ref = useRef<HTMLUListElement>(null);
  useRovingFocus(ref);
  return (
    <>
      <button type="button">before</button>
      <ul
        ref={ref}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 120px)',
          gap: 8,
          listStyle: 'none',
          padding: 0,
        }}
      >
        {Array.from({ length: 7 }, (_, i) => (
          <li key={i} data-roving-tile>
            <a href={`#tile-${i}`} data-roving>
              {`Tile ${i}`}
            </a>
            <button type="button">{`Add ${i}`}</button>
          </li>
        ))}
      </ul>
      <button type="button">after</button>
    </>
  );
}

describe('useRovingFocus', () => {
  it('makes the grid one tab stop plus the focused tile’s controls', async () => {
    const screen = await render(<Grid />);
    await screen.getByRole('button', { name: 'before' }).click();
    await userEvent.tab();
    await expect.element(screen.getByRole('link', { name: 'Tile 0' })).toHaveFocus();
    await userEvent.tab();
    await expect.element(screen.getByRole('button', { name: 'Add 0' })).toHaveFocus();
    await userEvent.tab();
    await expect.element(screen.getByRole('button', { name: 'after' })).toHaveFocus();
  });

  it('moves by screen position with the arrows, Home and End', async () => {
    const screen = await render(<Grid />);
    const tile = (i: number) => screen.getByRole('link', { name: `Tile ${i}` });
    tile(0).element().focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(tile(1)).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(tile(4)).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect.element(tile(3)).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(tile(6)).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await expect.element(tile(3)).toHaveFocus();
    await userEvent.keyboard('{End}');
    await expect.element(tile(6)).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect.element(tile(0)).toHaveFocus();
  });

  it('lets Tab reach the controls of the tile you moved to', async () => {
    const screen = await render(<Grid />);
    screen.getByRole('link', { name: 'Tile 0' }).element().focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await userEvent.tab();
    await expect.element(screen.getByRole('button', { name: 'Add 2' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await userEvent.tab({ shift: true });
    await expect.element(screen.getByRole('button', { name: 'before' })).toHaveFocus();
  });

  it('leaves the arrow keys to controls on a tile', async () => {
    const screen = await render(<Grid />);
    screen.getByRole('link', { name: 'Tile 0' }).element().focus();
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(screen.getByRole('button', { name: 'Add 0' })).toHaveFocus();
  });
});
