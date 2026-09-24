import { MINOR_DIGITS, type Money } from './money';

/**
 * CSV for spreadsheets (DAT-03, IMPORT_EXPORT.md §6). Not a backup format: it isn't lossless.
 * - *Excel (Deutschland)*: `;`, decimal comma, `dd.mm.yyyy`, UTF-8 with BOM (Excel then reads
 *   umlauts right).
 * - *International*: `,`, decimal point, ISO dates, no BOM.
 * Text cells that a spreadsheet would run as a formula (`= + - @`, tab, CR) get a leading `'`;
 * numbers are written as numbers.
 */

export const CSV_DIALECTS = ['excel-de', 'international'] as const;
export type CsvDialect = (typeof CSV_DIALECTS)[number];

export type CsvCell =
  | string
  | number
  | { money: Money }
  /** An ISO date, `YYYY-MM-DD`. */
  | { date: string }
  | null
  | undefined;

interface DialectRules {
  delimiter: string;
  decimal: string;
  bom: boolean;
  date: (iso: string) => string;
}

const RULES: Record<CsvDialect, DialectRules> = {
  'excel-de': {
    delimiter: ';',
    decimal: ',',
    bom: true,
    date: (iso) => {
      const [y, m, d] = iso.split('-');
      return y && m && d ? `${d}.${m}.${y}` : iso;
    },
  },
  international: { delimiter: ',', decimal: '.', bom: false, date: (iso) => iso },
};

const FORMULA_START = /^[=+\-@\t\r]/;

/** Minor units as a plain decimal number, e.g. 3490 → `34.90` (the dialect swaps the point). */
export function decimalOf({ minor, currency }: Money): string {
  const digits = MINOR_DIGITS[currency];
  if (digits === 0) return String(minor);
  const sign = minor < 0 ? '-' : '';
  const abs = String(Math.abs(minor)).padStart(digits + 1, '0');
  return `${sign}${abs.slice(0, -digits)}.${abs.slice(-digits)}`;
}

function numberText(value: number): string {
  // No exponent notation for the sizes a collection has; round away float noise.
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 1e6) / 1e6);
}

function cellText(cell: CsvCell, rules: DialectRules): { text: string; numeric: boolean } {
  if (cell === null || cell === undefined) return { text: '', numeric: false };
  if (typeof cell === 'number') {
    return { text: numberText(cell).replace('.', rules.decimal), numeric: true };
  }
  if (typeof cell === 'string') {
    return { text: FORMULA_START.test(cell) ? `'${cell}` : cell, numeric: false };
  }
  if ('money' in cell)
    return { text: decimalOf(cell.money).replace('.', rules.decimal), numeric: true };
  return { text: rules.date(cell.date), numeric: false };
}

function quote(text: string, rules: DialectRules): string {
  const needs =
    text.includes(rules.delimiter) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r') ||
    text !== text.trim();
  return needs ? `"${text.replaceAll('"', '""')}"` : text;
}

/** A whole CSV file as text: header row, then one line per row, CRLF line ends (RFC 4180). */
export function toCsv(
  header: readonly string[],
  rows: readonly (readonly CsvCell[])[],
  dialect: CsvDialect,
): string {
  const rules = RULES[dialect];
  const line = (cells: readonly CsvCell[]) =>
    cells
      .map((cell) => {
        const { text, numeric } = cellText(cell, rules);
        // A decimal comma in the Excel dialect never meets its `;` delimiter, but quote anyway if
        // a dialect ever makes them collide.
        return numeric && !text.includes(rules.delimiter) ? text : quote(text, rules);
      })
      .join(rules.delimiter);
  const body = [line(header), ...rows.map(line)].join('\r\n');
  return `${rules.bom ? '﻿' : ''}${body}\r\n`;
}
