import { describe, expect, it } from 'vitest';
import { isSettled, settle, spring, stepSpring } from './spring';

/** Runs the spring at `hz` until it settles; returns the seconds it took and the peak value. */
function run(hz: number, target = 1) {
  const s = spring(0);
  s.target = target;
  let seconds = 0;
  let peak = 0;
  while (!isSettled(s) && seconds < 5) {
    stepSpring(s, 1 / hz);
    seconds += 1 / hz;
    peak = Math.max(peak, s.value);
  }
  return { s, seconds, peak };
}

describe('tilt spring', () => {
  it('settles on the target in well under a second, with a soft overshoot', () => {
    const { s, seconds, peak } = run(60);
    expect(isSettled(s)).toBe(true);
    expect(s.value).toBeCloseTo(1, 2);
    expect(seconds).toBeGreaterThan(0.3);
    expect(seconds).toBeLessThan(1);
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.06);
  });

  it('moves the same at 60 and 120 Hz', () => {
    const a = spring(0);
    const b = spring(0);
    a.target = 1;
    b.target = 1;
    for (let i = 0; i < 6; i++) stepSpring(a, 1 / 60);
    for (let i = 0; i < 12; i++) stepSpring(b, 1 / 120);
    expect(a.value).toBeCloseTo(b.value, 6);
  });

  it('stays stable after a long frame and ignores time running backwards', () => {
    const s = spring(0);
    s.target = 1;
    stepSpring(s, 0.5);
    expect(Math.abs(s.value)).toBeLessThan(2);
    const before = { ...s };
    stepSpring(s, -1);
    stepSpring(s, Number.NaN);
    expect(s).toEqual(before);
  });

  it('snaps onto the target when settled', () => {
    const s = spring(0.4);
    s.target = 0;
    s.velocity = 3;
    settle(s);
    expect(s).toEqual({ value: 0, velocity: 0, target: 0 });
  });
});
