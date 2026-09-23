/**
 * Money as typed into a MoneyInput (I18N.md §3): parsing what people type, and formatting a stored
 * amount back into the field. Only the forms need this, so it's apart from format.ts and stays out
 * of the startup bundle.
 */
import { MINOR_DIGITS, type CurrencyCode, type Money } from '@/domain/money';
import { LOCALE } from './format';

const MINUS = '−';

function toMajor(m: Money): number {
  return m.minor / 10 ** MINOR_DIGITS[m.currency];
}

const amountFormatters = new Map<CurrencyCode, Intl.NumberFormat>();

/** An amount as it's typed into a MoneyInput: `4,50`, `1234,56` (no currency, no grouping). */
export function formatAmountInput(m: Money): string {
  let f = amountFormatters.get(m.currency);
  if (!f) {
    const digits = MINOR_DIGITS[m.currency];
    f = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      useGrouping: false,
    });
    amountFormatters.set(m.currency, f);
  }
  return f.format(toMajor(m)).replace('-', MINUS);
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
