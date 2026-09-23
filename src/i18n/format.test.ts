import { describe, expect, it } from 'vitest';
import { money } from '@/domain/money';
import {
  formatBytes,
  formatCount,
  formatDate,
  formatDelta,
  formatMoney,
  formatPercent,
  formatRelative,
} from './format';
import { formatAmountInput, parseMoneyInput } from './money-input';

const NBSP = ' ';

describe('formatMoney / formatDelta', () => {
  it('formats German euros with a non-breaking space', () => {
    expect(formatMoney(money(123456))).toBe(`1.234,56${NBSP}€`);
    expect(formatMoney(money(0))).toBe(`0,00${NBSP}€`);
  });
  it('uses a true minus sign', () => {
    expect(formatMoney(money(-1230))).toBe(`−12,30${NBSP}€`);
    expect(formatDelta(money(-1230))).toBe(`−12,30${NBSP}€`);
  });
  it('signs deltas except zero', () => {
    expect(formatDelta(money(1230))).toBe(`+12,30${NBSP}€`);
    expect(formatDelta(money(0))).toBe(`0,00${NBSP}€`);
  });
  it('formats JPY without decimals', () => {
    expect(formatMoney(money(7200, 'JPY'))).toBe(`7.200${NBSP}¥`);
  });
});

describe('formatPercent', () => {
  it('formats ratios with one decimal and a sign', () => {
    expect(formatPercent(0.146)).toBe(`+14,6${NBSP}%`);
    expect(formatPercent(-0.081)).toBe(`−8,1${NBSP}%`);
  });
  it('shows a dash for undefined values', () => {
    expect(formatPercent(undefined)).toBe('—');
    expect(formatPercent(Number.NaN)).toBe('—');
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('dates and counts', () => {
  it('formats ISO dates as German dates without time-zone shifts', () => {
    expect(formatDate('2026-09-23')).toBe('23.09.2026');
  });
  it('formats relative days', () => {
    const now = new Date(2026, 8, 23, 15, 0);
    expect(formatRelative('2026-09-23', now)).toBe('heute');
    expect(formatRelative('2026-09-22', now)).toBe('gestern');
    expect(formatRelative('2026-09-11', now)).toBe('vor 12 Tagen');
    expect(formatRelative(new Date(2026, 5, 20), now)).toBe('vor 3 Monaten');
  });
  it('formats counts and bytes', () => {
    expect(formatCount(1234)).toBe('1.234');
    expect(formatBytes(740_000)).toBe('740 kB');
    expect(formatBytes(12_400_000)).toBe('12,4 MB');
    expect(formatBytes(512)).toBe('512 Byte');
  });
});

describe('parseMoneyInput (I18N.md §3 table)', () => {
  const ok: Array<[string, number]> = [
    ['4,5', 450],
    ['4,50', 450],
    ['4,50 €', 450],
    ['1.234,56', 123456],
    ['1.234', 123400],
    ['4.5', 450],
    ['4.50', 450],
    ['1,234.56', 123456],
    ['0', 0],
    ['34,9', 3490],
    ['94,90', 9490],
    ['1.234.567,89', 123456789],
    [',5', 50],
    ['€ 12', 1200],
  ];
  it.each(ok)('parses %s → %i', (input, minor) => {
    expect(parseMoneyInput(input)).toEqual({ ok: true, minor });
  });

  it('rejects negatives, empties and garbage', () => {
    expect(parseMoneyInput('-3')).toEqual({ ok: false, error: 'negative' });
    expect(parseMoneyInput('−3')).toEqual({ ok: false, error: 'negative' });
    expect(parseMoneyInput('  ')).toEqual({ ok: false, error: 'empty' });
    expect(parseMoneyInput('abc')).toEqual({ ok: false, error: 'invalid' });
    expect(parseMoneyInput('1,2,3')).toEqual({ ok: false, error: 'invalid' });
    expect(parseMoneyInput('4,555')).toEqual({ ok: false, error: 'too-many-decimals' });
    expect(parseMoneyInput('1.23.4')).toEqual({ ok: false, error: 'invalid' });
  });

  it('allows no decimals for JPY', () => {
    expect(parseMoneyInput('7.200', 'JPY')).toEqual({ ok: true, minor: 7200 });
    expect(parseMoneyInput('72,5', 'JPY')).toEqual({ ok: false, error: 'too-many-decimals' });
  });
});

describe('formatAmountInput', () => {
  it('writes amounts the way they are typed, and they parse back', () => {
    expect(formatAmountInput({ minor: 450, currency: 'EUR' })).toBe('4,50');
    expect(formatAmountInput({ minor: 123456, currency: 'EUR' })).toBe('1234,56');
    expect(formatAmountInput({ minor: 500, currency: 'JPY' })).toBe('500');
    for (const minor of [0, 1, 99, 450, 123456, 99999999]) {
      expect(parseMoneyInput(formatAmountInput({ minor, currency: 'EUR' }))).toEqual({
        ok: true,
        minor,
      });
    }
  });
});
