/**
 * All formatting and parsing of numbers, money and dates (I18N.md §3). Never call toFixed or build
 * these strings by hand. v1 is German only (de-DE).
 */
import { MINOR_DIGITS, type CurrencyCode, type Money } from '@/domain/money';

export const LOCALE = 'de-DE';
const MINUS = '−';
const DASH = '—';

const moneyFormatters = new Map<string, Intl.NumberFormat>();
function moneyFormatter(currency: CurrencyCode, signed: boolean): Intl.NumberFormat {
  const key = `${currency}|${signed}`;
  let f = moneyFormatters.get(key);
  if (!f) {
    const digits = MINOR_DIGITS[currency];
    f = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      signDisplay: signed ? 'exceptZero' : 'auto',
    });
    moneyFormatters.set(key, f);
  }
  return f;
}

function toMajor(m: Money): number {
  return m.minor / 10 ** MINOR_DIGITS[m.currency];
}

function trueMinus(s: string): string {
  return s.replace('-', MINUS);
}

/** `1.234,56 €` */
export function formatMoney(m: Money): string {
  return trueMinus(moneyFormatter(m.currency, false).format(toMajor(m)));
}

/** `+12,30 €` / `−12,30 €` / `0,00 €` */
export function formatDelta(m: Money): string {
  return trueMinus(moneyFormatter(m.currency, true).format(toMajor(m)));
}

const percentFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

/** Ratio → `+14,6 %`. `—` when undefined or not finite. */
export function formatPercent(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return DASH;
  return trueMinus(percentFormatter.format(ratio));
}

const shareFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  maximumFractionDigits: 0,
});

/**
 * Progress as a whole percentage, rounded down so it reads 100 % only when complete
 * (set completion: `64 %`, 198 of 199 = `99 %`).
 */
export function formatShare(ratio: number): string {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
  return shareFormatter.format(clamped === 1 ? 1 : Math.floor(clamped * 100) / 100);
}

const countFormatter = new Intl.NumberFormat(LOCALE);
export function formatCount(n: number): string {
  return trueMinus(countFormatter.format(n));
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) throw new RangeError(`Not an ISO date: ${iso}`);
  return new Date(y, m - 1, d);
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
/** 'YYYY-MM-DD' or Date → `23.09.2026` */
export function formatDate(value: string | Date): string {
  return dateFormatter.format(typeof value === 'string' ? parseIsoDate(value) : value);
}

const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
const DAY_MS = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** `vor 3 Tagen`, `gestern`, `heute`, `vor 2 Monaten` (calendar days in local time). */
export function formatRelative(value: string | Date, now: Date | number = Date.now()): string {
  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? parseIsoDate(value)
      : new Date(value);
  const days = Math.round((startOfDay(date) - startOfDay(new Date(now))) / DAY_MS);
  if (Math.abs(days) < 31) return relativeFormatter.format(days, 'day');
  const months = Math.round(days / 30.44);
  if (Math.abs(months) < 12) return relativeFormatter.format(months, 'month');
  return relativeFormatter.format(Math.round(days / 365.25), 'year');
}

const byteUnits = [
  { unit: 'byte', size: 1 },
  { unit: 'kilobyte', size: 1_000 },
  { unit: 'megabyte', size: 1_000_000 },
  { unit: 'gigabyte', size: 1_000_000_000 },
] as const;

/** `740 kB`, `12,4 MB` (decimal units, as browsers report storage). */
export function formatBytes(bytes: number): string {
  let chosen: (typeof byteUnits)[number] = byteUnits[0];
  for (const u of byteUnits) if (bytes >= u.size) chosen = u;
  return new Intl.NumberFormat(LOCALE, {
    style: 'unit',
    unit: chosen.unit,
    maximumFractionDigits: chosen.size === 1 ? 0 : 1,
  }).format(bytes / chosen.size);
}
