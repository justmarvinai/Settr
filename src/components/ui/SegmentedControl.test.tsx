import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { SegmentedControl } from './SegmentedControl';

const options = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
] as const;

function Harness() {
  const [value, setValue] = useState<(typeof options)[number]['value']>('system');
  return (
    <SegmentedControl label="Design" value={value} onValueChange={setValue} options={options} />
  );
}

describe('SegmentedControl', () => {
  it('is a labelled radio group with one checked option', async () => {
    const screen = await render(<Harness />);
    await expect.element(screen.getByRole('radiogroup', { name: 'Design' })).toBeVisible();
    await expect.element(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    await expect.element(screen.getByRole('radio', { name: 'Hell' })).not.toBeChecked();
  });

  it('selects by click and by arrow keys', async () => {
    const screen = await render(<Harness />);
    await screen.getByRole('radio', { name: 'Dunkel' }).click();
    await expect.element(screen.getByRole('radio', { name: 'Dunkel' })).toBeChecked();
    await userEvent.keyboard('{ArrowLeft}');
    await expect.element(screen.getByRole('radio', { name: 'Hell' })).toBeChecked();
    await expect.element(screen.getByRole('radio', { name: 'Hell' })).toHaveFocus();
  });

  it('draws the chosen option as the ink pill', async () => {
    const screen = await render(<Harness />);
    const checked = screen.getByRole('radio', { name: 'System' }).element();
    const unchecked = screen.getByRole('radio', { name: 'Hell' }).element();
    expect(getComputedStyle(checked).backgroundColor).not.toBe(
      getComputedStyle(unchecked).backgroundColor,
    );
    expect(checked.getBoundingClientRect().height).toBe(40); // 40 px pills in a 48 px track
  });
});
