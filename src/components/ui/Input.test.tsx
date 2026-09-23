import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { TextField } from './Input';

describe('TextField', () => {
  it('labels the input and describes it with the hint', async () => {
    const screen = await render(<TextField label="Notiz" hint="Nur für dich sichtbar" />);
    const input = screen.getByRole('textbox', { name: 'Notiz' });
    await expect.element(input).toHaveAccessibleDescription('Nur für dich sichtbar');
    await expect.element(input).not.toHaveAttribute('aria-invalid');
  });

  it('marks the input invalid and announces the error', async () => {
    const screen = await render(<TextField label="Preis" error="Bitte einen Betrag eingeben" />);
    const input = screen.getByRole('textbox', { name: 'Preis' });
    await expect.element(input).toHaveAttribute('aria-invalid', 'true');
    await expect.element(screen.getByText('Bitte einen Betrag eingeben')).toBeVisible();
  });
});
