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
