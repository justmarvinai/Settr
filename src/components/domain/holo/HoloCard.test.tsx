import { afterEach, describe, expect, it, vi } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { HoloCard, type HoloMotion } from './HoloCard';

const labels = {
  enableGyro: 'Holo aktivieren',
  openFullscreen: 'Vollbild öffnen',
  closeFullscreen: 'Schließen',
};
const alt = 'Testkarte ex, 025';

async function renderCard(motion: HoloMotion) {
  const screen = await render(
    <div style={{ width: 300, padding: 24 }}>
      <HoloCard
        image={undefined}
        alt={alt}
        label="025"
        foil="holo"
        motion={motion}
        labels={labels}
      />
    </div>,
  );
  const card = screen.container.querySelector<HTMLElement>('.holo-card');
  if (!card) throw new Error('no .holo-card');
  return { screen, card, open: screen.getByRole('button', { name: labels.openFullscreen }) };
}

/** True when the element is turned out of the screen plane (perspective alone doesn't count). */
function isRotated(element: HTMLElement): boolean {
  const m = new DOMMatrixReadOnly(getComputedStyle(element).transform);
  return [m.m13, m.m23, m.m31, m.m32].some((value) => Math.abs(value) > 1e-3);
}

const frames = async (count: number) => {
  for (let i = 0; i < count; i++) await new Promise(requestAnimationFrame);
};

/** The phone's tilt, as its orientation sensor reports it. */
function orient(beta: number, gamma: number) {
  window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta, gamma }));
}

/** A finger on the card, as a phone reports it. */
function touch(target: Element, type: string, clientX: number, clientY: number) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      clientX,
      clientY,
    }),
  );
}

afterEach(async () => {
  Reflect.deleteProperty(DeviceOrientationEvent, 'requestPermission');
  await cdp().send('Emulation.setEmulatedMedia', { features: [] });
});

describe('HoloCard', () => {
  it('stays flat and still with motion off', async () => {
    const { screen, card, open } = await renderCard('off');
    await userEvent.hover(open, { position: { x: 240, y: 30 } });
    await userEvent.hover(open, { position: { x: 30, y: 300 } });
    await frames(4);
    expect(getComputedStyle(card).transform).toBe('none');
    expect(screen.container.querySelector('.holo-foil, .holo-glare')).toBeNull();
  });

  it('leans towards the pointer on a spring, and back to flat when it leaves', async () => {
    const { card, open } = await renderCard('full');
    // The mouse may still rest where the last test left it: start away from the card
    await userEvent.unhover(open);
    await expect.poll(() => getComputedStyle(card).transform, { timeout: 3000 }).toBe('none');
    await userEvent.hover(open, { position: { x: 240, y: 30 } });
    await expect.poll(() => isRotated(card)).toBe(true);
    expect(card.style.willChange).toBe('transform');
    // the foil and the glare follow the light
    expect(Number(card.style.getPropertyValue('--tilt'))).toBeGreaterThan(0);
    await userEvent.unhover(open);
    await expect.poll(() => getComputedStyle(card).transform, { timeout: 3000 }).toBe('none');
    expect(card.style.willChange).toBe('');
  });

  it('stays flat when the system asks for less motion', async () => {
    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    const { screen, card, open } = await renderCard('full');
    await userEvent.hover(open, { position: { x: 240, y: 30 } });
    await frames(4);
    expect(getComputedStyle(card).transform).toBe('none');
    // a faint static sheen, no glare
    expect(screen.container.querySelector('.holo-foil')).not.toBeNull();
    expect(screen.container.querySelector('.holo-glare')).toBeNull();
  });

  it('keeps the picture described and the effect layers hidden from screen readers', async () => {
    const { screen } = await renderCard('full');
    await expect.element(screen.getByRole('img', { name: alt })).toBeInTheDocument();
    const layers = screen.container.querySelectorAll('.holo-foil, .holo-shine, .holo-glare');
    expect(layers.length).toBe(3);
    for (const layer of layers) expect(layer.getAttribute('aria-hidden')).toBe('true');
  });

  it('opens fullscreen on click, closes on Escape and returns focus to the card', async () => {
    const { open } = await renderCard('full');
    await open.click();
    const dialog = page.getByRole('dialog', { name: alt });
    await expect.element(dialog).toBeVisible();
    await expect.element(page.getByRole('button', { name: labels.closeFullscreen })).toBeVisible();
    await expect.element(dialog.getByRole('img', { name: alt })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(open).toHaveFocus();
  });

  it('opens fullscreen from the keyboard and closes with its button, also without motion', async () => {
    const { open } = await renderCard('off');
    (open.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    const dialog = page.getByRole('dialog', { name: alt });
    await expect.element(dialog).toBeVisible();
    await page.getByRole('button', { name: labels.closeFullscreen }).click();
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(open).toHaveFocus();
  });

  it('offers the gyroscope button only where iOS asks for permission', async () => {
    const first = await renderCard('full');
    expect(first.screen.getByRole('button', { name: labels.enableGyro }).query()).toBeNull();
    await first.screen.unmount();

    const requestPermission = vi.fn<() => Promise<string>>(() => Promise.resolve('granted'));
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      value: requestPermission,
      configurable: true,
    });
    const { screen } = await renderCard('full');
    const enable = screen.getByRole('button', { name: labels.enableGyro });
    await expect.element(enable).toBeVisible();
    expect((enable.element() as HTMLElement).getBoundingClientRect().height).toBeGreaterThanOrEqual(
      44,
    );
    await enable.click();
    expect(requestPermission).toHaveBeenCalledOnce();
    await expect.element(enable).not.toBeInTheDocument();
  });

  it('follows the phone only after a touch on the card, and never leans under a finger inline', async () => {
    const { card } = await renderCard('full');
    const stage = card.parentElement!;
    orient(45, 0);
    orient(45, 8);
    await frames(4);
    expect(isRotated(card)).toBe(false); // not listening on load

    const box = stage.getBoundingClientRect();
    touch(stage, 'pointerdown', box.right - 10, box.top + 10);
    touch(stage, 'pointermove', box.right - 5, box.top + 5);
    await frames(4);
    expect(isRotated(card)).toBe(false); // touch scrolls and swipes inline
    touch(stage, 'pointerup', box.right - 5, box.top + 5);

    orient(45, 0);
    orient(45, 8);
    await expect.poll(() => isRotated(card)).toBe(true);
  });

  it('leans under a finger in fullscreen', async () => {
    const { open } = await renderCard('full');
    await open.click();
    await expect.element(page.getByRole('dialog', { name: alt })).toBeVisible();
    await userEvent.unhover(page.getByRole('button', { name: labels.closeFullscreen }));
    const stage = document.querySelector<HTMLElement>('.holo-dialog .holo-stage')!;
    const card = stage.querySelector<HTMLElement>('.holo-card')!;
    const box = stage.getBoundingClientRect();
    touch(stage, 'pointerdown', box.left + 10, box.bottom - 10);
    await expect.poll(() => isRotated(card)).toBe(true);
    touch(stage, 'pointerup', box.left + 10, box.bottom - 10);
    await expect.poll(() => getComputedStyle(card).transform, { timeout: 3000 }).toBe('none');
  });

  it('offers no gyroscope without motion', async () => {
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      value: () => Promise.resolve('granted'),
      configurable: true,
    });
    const { screen } = await renderCard('reduced');
    expect(screen.getByRole('button', { name: labels.enableGyro }).query()).toBeNull();
  });
});
