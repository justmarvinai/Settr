/**
 * A damped spring (mass 1) for the holo tilt (DESIGN_SYSTEM.md §7: stiffness 220, damping 22, so
 * slightly underdamped: a soft ~3 % overshoot, visually still after about half a second). Pure; the
 * caller owns the state and the animation frame.
 */
export interface Spring {
  value: number;
  velocity: number;
  target: number;
}

export interface SpringConfig {
  stiffness: number;
  damping: number;
}

export const TILT_SPRING: SpringConfig = { stiffness: 220, damping: 22 };

/** Fixed sub-steps: stable at any frame rate, and the same motion at 60 and 120 Hz. */
const STEP = 1 / 240;

export function spring(value = 0): Spring {
  return { value, velocity: 0, target: value };
}

/** Advances the spring by `seconds` (semi-implicit Euler). */
export function stepSpring(s: Spring, seconds: number, config: SpringConfig = TILT_SPRING): void {
  let left = seconds > 0 ? seconds : 0;
  while (left > 0) {
    const h = Math.min(left, STEP);
    const acceleration = -config.stiffness * (s.value - s.target) - config.damping * s.velocity;
    s.velocity += acceleration * h;
    s.value += s.velocity * h;
    left -= h;
  }
}

/** Close enough to rest to snap (in the spring's own units; the tilt uses −1…1). */
export function isSettled(s: Spring, precision = 1e-3): boolean {
  return Math.abs(s.value - s.target) < precision && Math.abs(s.velocity) < precision * 5;
}

/** Ends the motion exactly on the target. */
export function settle(s: Spring): void {
  s.value = s.target;
  s.velocity = 0;
}
