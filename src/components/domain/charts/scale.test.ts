import { describe, expect, it } from 'vitest';
import { dayNumber } from '@/domain/dates';
import {
  closePath,
  linearScale,
  linePath,
  nearestIndex,
  niceStep,
  niceTicks,
  rangeStartDay,
  stepPath,
} from './scale';

describe('linearScale', () => {
  it('maps a domain onto a range, also inverted (SVG y grows downwards)', () => {
    const y = linearScale([0, 1000], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(1000)).toBe(0);
    expect(y(250)).toBe(150);
  });

  it('puts every value in the middle when the domain is one value', () => {
    expect(linearScale([5, 5], [0, 100])(5)).toBe(50);
  });
});

describe('niceStep', () => {
  it.each([
    [1000, 3, 500],
    [110, 3, 50],
    [69, 3, 25],
    [11, 3, 5],
    [1, 3, 1],
    [0, 3, 1],
    [340_000, 4, 100_000],
  ])('span %i in %i parts → %i', (span, count, step) => {
    expect(niceStep(span, count)).toBe(step);
  });

  it('never returns a fraction of a cent', () => {
    for (const span of [1, 3, 7, 9, 23, 77]) expect(Number.isInteger(niceStep(span, 3))).toBe(true);
  });
});

describe('niceTicks', () => {
  it('follows the data with a little air, gridlines at nice values inside', () => {
    // 24,90 € … 34,90 € → about 24,10 € … 35,70 €, gridlines at 25, 30 and 35 €
    const { domain, ticks } = niceTicks(2490, 3490);
    expect(domain[0]).toBeCloseTo(2410);
    expect(domain[1]).toBeCloseTo(3570);
    expect(ticks).toEqual([2500, 3000, 3500]);
  });

  it('gives a flat line room around it and stays at or above zero', () => {
    const { domain, ticks } = niceTicks(450, 450);
    expect(domain[0]).toBeLessThan(450);
    expect(domain[1]).toBeGreaterThan(450);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(niceTicks(0, 0).domain[0]).toBe(0);
    expect(niceTicks(20, 5000).domain[0]).toBe(0);
  });

  it('has at least three gridlines for spans from zero, and never −0', () => {
    // 0 … 292,70 € (a portfolio's value) → 0, 100, 200, 300 €
    expect(niceTicks(0, 29_270).ticks).toEqual([0, 10_000, 20_000, 30_000]);
    // P/L from −5 € to +80 € → the zero line is a plain 0
    const pl = niceTicks(-500, 8000);
    expect(pl.ticks).toContain(0);
    expect(pl.ticks.some((t) => Object.is(t, -0))).toBe(false);
  });

  it('keeps 2 to 5 gridlines, all inside the domain', () => {
    for (const [lo, hi] of [
      [100, 199],
      [1, 99_999],
      [12_345, 12_400],
      [4900, 5100],
      [2990, 3010],
    ] as const) {
      const { domain, ticks } = niceTicks(lo, hi);
      expect(ticks.length).toBeGreaterThanOrEqual(2);
      expect(ticks.length).toBeLessThanOrEqual(5);
      for (const t of ticks) {
        expect(t).toBeGreaterThanOrEqual(domain[0]);
        expect(t).toBeLessThanOrEqual(domain[1]);
        expect(Number.isInteger(t)).toBe(true);
      }
      expect(domain[0]).toBeLessThanOrEqual(lo);
      expect(domain[1]).toBeGreaterThanOrEqual(hi);
    }
  });
});

describe('rangeStartDay', () => {
  const today = '2026-09-23';
  it('counts calendar months back from today', () => {
    expect(rangeStartDay('1m', today, undefined)).toBe(dayNumber('2026-08-23'));
    expect(rangeStartDay('1y', today, undefined)).toBe(dayNumber('2025-09-23'));
  });

  it('starts Max at the first data day, but shows at least 30 days', () => {
    expect(rangeStartDay('max', today, dayNumber('2026-01-02'))).toBe(dayNumber('2026-01-02'));
    expect(rangeStartDay('max', today, dayNumber('2026-09-20'))).toBe(dayNumber(today) - 30);
    expect(rangeStartDay('max', today, undefined)).toBe(dayNumber(today) - 30);
  });
});

describe('nearestIndex', () => {
  it('finds the closest value, preferring the earlier one on a tie', () => {
    const xs = [0, 10, 20, 40];
    expect(nearestIndex(xs, -5)).toBe(0);
    expect(nearestIndex(xs, 14)).toBe(1);
    expect(nearestIndex(xs, 15)).toBe(1);
    expect(nearestIndex(xs, 16)).toBe(2);
    expect(nearestIndex(xs, 99)).toBe(3);
    expect(nearestIndex([], 3)).toBe(-1);
  });
});

describe('paths', () => {
  const points = [
    [0, 10],
    [5, 20],
    [10, 15],
  ] as const;
  it('draws straight segments and steps', () => {
    expect(linePath(points)).toBe('M0 10L5 20L10 15');
    expect(stepPath(points)).toBe('M0 10H5V20H10V15');
  });

  it('closes a path down to a baseline', () => {
    expect(closePath(linePath(points), points, 30)).toBe('M0 10L5 20L10 15L10 30L0 30Z');
    expect(closePath('', [], 30)).toBe('');
  });
});
