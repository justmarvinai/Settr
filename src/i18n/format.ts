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

export type MoneyParseResult =
  | { ok: true; minor: number }
  | { ok: false; error: 'empty' | 'invalid' | 'negative' | 'too-many-decimals' };

/**
 * Parses what people type into a price field (I18N.md §3, MoneyInput rules):
 * `4,5` → 450 · `1.234,56` → 123456 · `1.234` → 123400 · `4.50` → 450 · `1,234.56` → 123456.
 */
export function parseMoneyInput(input: string, currency: CurrencyCode = 'EUR'): MoneyParseResult {
  const digits = MINOR_DIGITS[currency];
  const cleaned = input.replace(/\s| | /g, '').replace(/€|eur/gi, '');
  if (cleaned === '') return { ok: false, error: 'empty' };
  if (/^[-−]/.test(cleaned)) return { ok: false, error: 'negative' };
  if (!/^[\d.,]+$/.test(cleaned) || !/\d/.test(cleaned)) return { ok: false, error: 'invalid' };

  let intPart = cleaned;
  let fracPart = '';
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    // Both present: the last one is the decimal separator.
    const decimalAt = Math.max(lastComma, lastDot);
    const thousands = decimalAt === lastComma ? '.' : ',';
    const head = cleaned.slice(0, decimalAt);
    if (head.includes(cleaned[decimalAt] ?? '')) return { ok: false, error: 'invalid' };
    if (!/^\d{1,3}([.,]\d{3})*$/.test(head) || head.includes(thousands === '.' ? ',' : '.')) {
      return { ok: false, error: 'invalid' };
    }
    intPart = head.split(thousands).join('');
    fracPart = cleaned.slice(decimalAt + 1);
  } else if (lastComma >= 0) {
    // Comma only: decimal separator (German habit).
    if (cleaned.indexOf(',') !== lastComma) return { ok: false, error: 'invalid' };
    intPart = cleaned.slice(0, lastComma);
    fracPart = cleaned.slice(lastComma + 1);
  } else if (lastDot >= 0) {
    const tail = cleaned.slice(lastDot + 1);
    const dots = cleaned.split('.').length - 1;
    if (tail.length === 3 || dots > 1) {
      // Dot + exactly 3 digits (or several dots) = thousands separator.
      if (!/^\d{1,3}(\.\d{3})+$/.test(cleaned)) return { ok: false, error: 'invalid' };
      intPart = cleaned.split('.').join('');
    } else {
      // Dot + 1–2 digits = decimal separator (forgiving for English-habit typing).
      intPart = cleaned.slice(0, lastDot);
      fracPart = tail;
    }
  }

  if (intPart === '') intPart = '0';
  if (!/^\d+$/.test(intPart) || !/^\d*$/.test(fracPart)) return { ok: false, error: 'invalid' };
  if (fracPart.length > digits) return { ok: false, error: 'too-many-decimals' };
  const minor = Number(intPart) * 10 ** digits + Number(fracPart.padEnd(digits, '0') || '0');
  if (!Number.isSafeInteger(minor)) return { ok: false, error: 'invalid' };
  return { ok: true, minor };
}
