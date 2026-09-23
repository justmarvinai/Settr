import { addMonths, dayNumber } from '@/domain/dates';

/**
 * Chart math (DESIGN_SYSTEM.md §9): linear scales, 3–4 "nice" ticks, the range chips and the SVG
 * paths. Pure and unit-tested; the chart components only draw what these return. Values are
 * whatever the chart plots (money in minor units, day numbers on the x axis).
 */

export type Scale = (value: number) => number;

/** Maps `domain` onto `range`; a domain of one value maps to the middle of the range. */
export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return () => (r0 + r1) / 2;
  const k = (r1 - r0) / (d1 - d0);
  return (value) => r0 + (value - d0) * k;
}

const STEP_FACTORS = [1, 2, 2.5, 5, 10];

/**
 * A step of 1, 2, 2.5 or 5 × 10ⁿ that splits `span` into at most about `count` parts. Steps are
 * whole numbers, since money is plotted in cents (2,5 cents is not a step, 25 cents is).
 */
export function niceStep(span: number, count: number): number {
  if (!(span > 0)) return 1;
  const raw = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  for (const factor of STEP_FACTORS) {
    const step = factor * power;
    if (step >= raw && Number.isInteger(step)) return step;
  }
  return Math.max(1, 10 * power);
}

export interface Ticks {
  domain: [number, number];
  ticks: number[];
}

/**
 * The y domain for values from `min` to `max`: the data plus a little air (8 % of the span), with
 * 2–4 gridlines at nice values inside it. A flat line gets room around it (±10 %), and the domain
 * never goes below zero when the data doesn't. The domain follows the data rather than the ticks,
 * so a line from 24,90 € to 34,90 € uses the whole height instead of starting at 20 €.
 */
export function niceTicks(min: number, max: number, count = 3): Ticks {
  let lo: number;
  let hi: number;
  if (max > min) {
    const pad = (max - min) * 0.08;
    lo = min - pad;
    hi = max + pad;
  } else {
    const pad = Math.max(Math.abs(min) * 0.1, 10);
    lo = min - pad;
    hi = max + pad;
  }
  if (min >= 0) lo = Math.max(0, lo);
  const inside = (step: number) => {
    const ticks: number[] = [];
    for (let value = Math.ceil(lo / step) * step; value <= hi; value += step) ticks.push(value);
    return ticks;
  };
  let ticks = inside(niceStep(hi - lo, count));
  if (ticks.length < 2) ticks = inside(niceStep(hi - lo, count + 2));
  return { domain: [lo, hi], ticks };
}

/** Range chips `1M · 3M · 6M · 1J · Max` (no week: manual prices are too sparse for it). */
export const CHART_RANGES = ['1m', '3m', '6m', '1y', 'max'] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

const RANGE_MONTHS: Record<Exclude<ChartRange, 'max'>, number> = {
  '1m': 1,
  '3m': 3,
  '6m': 6,
  '1y': 12,
};

/** The shortest span a chart shows, so a lone point doesn't fill the whole width. */
export const MIN_SPAN_DAYS = 30;

/**
 * The first day (day number) of a range that ends `today`. `max` starts at the first data day, or
 * `MIN_SPAN_DAYS` back when the data is younger than that.
 */
export function rangeStartDay(
  range: ChartRange,
  today: string,
  firstDay: number | undefined,
): number {
  const end = dayNumber(today);
  if (range === 'max') return Math.min(firstDay ?? end, end - MIN_SPAN_DAYS);
  return dayNumber(addMonths(today, -RANGE_MONTHS[range]));
}

/** Index of the value in the ascending `values` closest to `target` (−1 when empty). */
export function nearestIndex(values: readonly number[], target: number): number {
  if (!values.length) return -1;
  let lo = 0;
  let hi = values.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((values[mid] ?? 0) < target) lo = mid + 1;
    else hi = mid;
  }
  const before = lo - 1;
  if (before >= 0 && target - (values[before] ?? 0) <= (values[lo] ?? 0) - target) return before;
  return lo;
}

export type XY = readonly [number, number];

const r = (n: number) => Math.round(n * 10) / 10;

/** Straight segments between the points (item price charts: real observations only). */
export function linePath(points: readonly XY[]): string {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${r(x)} ${r(y)}`).join('');
}

/** Step-after: the value holds until the next point (portfolio charts, values change on events). */
export function stepPath(points: readonly XY[]): string {
  return points.map(([x, y], i) => (i ? `H${r(x)}V${r(y)}` : `M${r(x)} ${r(y)}`)).join('');
}

/** Closes a line path down (or up) to `y`, for area fills and the tint against a baseline. */
export function closePath(path: string, points: readonly XY[], y: number): string {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return '';
  return `${path}L${r(last[0])} ${r(y)}L${r(first[0])} ${r(y)}Z`;
}
