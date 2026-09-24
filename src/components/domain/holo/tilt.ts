import { isSettled, settle, spring, stepSpring } from './spring';

/** Maximum lean per axis (DESIGN_SYSTEM.md §7). */
export const MAX_TILT_DEG = 12;

/** Viewing distance for the 3D lean: far enough that ±12° stays calm on a 400 px card. */
const PERSPECTIVE_PX = 1100;

/** Longest frame the spring integrates, so a stalled main thread doesn't jolt the card. */
const MAX_FRAME_S = 1 / 20;

export interface TiltController {
  /** Leans towards a point: −1…1 from the card's left/top edge to its right/bottom edge. */
  aim(x: number, y: number): void;
  /** Springs back to flat. */
  rest(): void;
  /** Stops the frame loop and removes everything it wrote to the element. */
  destroy(): void;
}

const VARIABLES = ['--pointer-x', '--pointer-y', '--tilt-x', '--tilt-y', '--tilt'] as const;

const clamp = (n: number) => (Number.isNaN(n) ? 0 : Math.min(Math.max(n, -1), 1));

/**
 * Drives one card's tilt with a spring (stiffness 220, damping 22) in a requestAnimationFrame loop
 * that runs only while the card moves, and pauses while the tab is hidden. Per frame it writes the
 * transform plus the variables holo.css reads: `--pointer-x`/`--pointer-y` (where the light is, in
 * %), `--tilt-x`/`--tilt-y` (−1…1) and `--tilt` (0…1, how far the card leans). At rest it removes
 * them all, so a still card carries no transform and no `will-change`.
 */
export function createTilt(card: HTMLElement): TiltController {
  const x = spring();
  const y = spring();
  let frame = 0;
  let last: number | undefined;

  const write = () => {
    // The card turns its face towards the light: right edge away when the pointer is on the right.
    const rotateX = -y.value * MAX_TILT_DEG;
    const rotateY = x.value * MAX_TILT_DEG;
    const style = card.style;
    style.transform = `perspective(${PERSPECTIVE_PX}px) rotateX(${rotateX.toFixed(3)}deg) rotateY(${rotateY.toFixed(3)}deg)`;
    style.setProperty('--pointer-x', `${(50 + x.value * 50).toFixed(2)}%`);
    style.setProperty('--pointer-y', `${(50 + y.value * 50).toFixed(2)}%`);
    style.setProperty('--tilt-x', x.value.toFixed(4));
    style.setProperty('--tilt-y', y.value.toFixed(4));
    style.setProperty('--tilt', Math.min(1, Math.hypot(x.value, y.value)).toFixed(4));
  };

  const clear = () => {
    card.style.removeProperty('transform');
    for (const name of VARIABLES) card.style.removeProperty(name);
  };

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    last = undefined;
    card.style.removeProperty('will-change');
  };

  const tick = (now: number) => {
    frame = 0;
    const seconds = last === undefined ? 1 / 60 : Math.min((now - last) / 1000, MAX_FRAME_S);
    last = now;
    stepSpring(x, seconds);
    stepSpring(y, seconds);
    if (isSettled(x) && isSettled(y)) {
      settle(x);
      settle(y);
      stop();
      if (x.value === 0 && y.value === 0) clear();
      else write();
      return;
    }
    write();
    frame = requestAnimationFrame(tick);
  };

  const start = () => {
    const still = x.value === x.target && y.value === y.target && !x.velocity && !y.velocity;
    if (frame || still || document.hidden) return;
    card.style.setProperty('will-change', 'transform');
    frame = requestAnimationFrame(tick);
  };

  // Hidden tab: stop at once and wait flat for the next pointer or tilt.
  const onVisibilityChange = () => {
    if (!document.hidden) return;
    x.target = 0;
    y.target = 0;
    settle(x);
    settle(y);
    stop();
    clear();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    aim(toX, toY) {
      x.target = clamp(toX);
      y.target = clamp(toY);
      start();
    },
    rest() {
      x.target = 0;
      y.target = 0;
      start();
    },
    destroy() {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stop();
      clear();
    },
  };
}
