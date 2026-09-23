/**
 * Money is never a float (DATA_MODEL.md §5.1): all arithmetic runs on integer minor units.
 * Formatting lives in src/i18n/format.ts.
 */

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CNY', 'TWD', 'HKD'] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export interface Money {
  readonly minor: number;
  readonly currency: CurrencyCode;
}

/** Decimal places of each currency's minor unit (JPY has none). */
export const MINOR_DIGITS: Readonly<Record<CurrencyCode, number>> = {
  EUR: 2,
  USD: 2,
  GBP: 2,
  CHF: 2,
  JPY: 0,
  CNY: 2,
  TWD: 2,
  HKD: 2,
};

export const BASE_CURRENCY: CurrencyCode = 'EUR';

function assertSafeInteger(value: number, what: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${what} must be a safe integer, got ${value}`);
  }
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function money(minor: number, currency: CurrencyCode = BASE_CURRENCY): Money {
  assertSafeInteger(minor, 'Money.minor');
  return { minor, currency };
}

export function zero(currency: CurrencyCode = BASE_CURRENCY): Money {
  return money(0, currency);
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.minor + b.minor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.minor - b.minor, a.currency);
}

/** Multiplies by an integer factor, e.g. a quantity. */
export function multiply(m: Money, factor: number): Money {
  assertSafeInteger(factor, 'factor');
  return money(m.minor * factor, m.currency);
}

export function negate(m: Money): Money {
  return money(m.minor === 0 ? 0 : -m.minor, m.currency);
}

export function sum(items: readonly Money[], currency: CurrencyCode = BASE_CURRENCY): Money {
  return items.reduce((acc, item) => add(acc, item), zero(currency));
}

export function isZero(m: Money): boolean {
  return m.minor === 0;
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  return a.minor < b.minor ? -1 : a.minor > b.minor ? 1 : 0;
}

export function equals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.minor === b.minor;
}

/**
 * Splits an integer total into parts proportional to integer weights, using the largest-remainder
 * method, so the parts always sum exactly to the total (DATA_MODEL.md §5.1, §6.2).
 * All-zero weights split evenly. Ties go to the earlier index. BigInt keeps it exact for large values.
 */
export function allocate(total: number, weights: readonly number[]): number[] {
  assertSafeInteger(total, 'total');
  if (weights.length === 0) {
    if (total !== 0) throw new RangeError('Cannot allocate a non-zero total to no parts');
    return [];
  }
  for (const w of weights) {
    assertSafeInteger(w, 'weight');
    if (w < 0) throw new RangeError(`Weights must not be negative, got ${w}`);
  }
  const allZero = weights.every((w) => w === 0);
  const ws = (allZero ? weights.map(() => 1) : weights).map((w) => BigInt(w));
  const sumW = ws.reduce((a, b) => a + b, 0n);
  const sign = total < 0 ? -1n : 1n;
  const abs = BigInt(Math.abs(total));

  const parts = ws.map((w) => (abs * w) / sumW);
  const remainders = ws.map((w, index) => ({ index, rest: (abs * w) % sumW }));
  let leftover = abs - parts.reduce((a, b) => a + b, 0n);
  remainders.sort((a, b) => (a.rest === b.rest ? a.index - b.index : a.rest > b.rest ? -1 : 1));
  for (const { index } of remainders) {
    if (leftover === 0n) break;
    parts[index] = (parts[index] ?? 0n) + 1n;
    leftover -= 1n;
  }
  return parts.map((p) => Number(p * sign));
}

/** Splits an integer total into n parts that differ by at most one unit. */
export function allocateEvenly(total: number, parts: number): number[] {
  assertSafeInteger(parts, 'parts');
  if (parts < 0) throw new RangeError('parts must not be negative');
  return allocate(
    total,
    Array.from({ length: parts }, () => 1),
  );
}
