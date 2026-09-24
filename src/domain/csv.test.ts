import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decimalOf, toCsv } from './csv';
import { money } from './money';

describe('toCsv', () => {
  it('writes Excel (Deutschland): BOM, semicolons, decimal commas, German dates', () => {
    const csv = toCsv(
      ['Name', 'Menge', 'Preis', 'Datum'],
      [
        ['Pikachu', 2, { money: money(3490) }, { date: '2026-09-23' }],
        ['Glurak; 1. Edition', 1, { money: money(-5) }, null],
      ],
      'excel-de',
    );
    expect(csv).toBe(
      '﻿Name;Menge;Preis;Datum\r\n' +
        'Pikachu;2;34,90;23.09.2026\r\n' +
        '"Glurak; 1. Edition";1;-0,05;\r\n',
    );
  });

  it('writes International: commas, decimal points, ISO dates, no BOM', () => {
    const csv = toCsv(
      ['Name', 'Preis', 'Datum', 'Anteil'],
      [['Pika, "ex"', { money: money(123_456) }, { date: '2026-09-23' }, 14.6]],
      'international',
    );
    expect(csv).toBe('Name,Preis,Datum,Anteil\r\n"Pika, ""ex""",1234.56,2026-09-23,14.6\r\n');
  });

  it('defuses cells a spreadsheet would run as formulas, but not numbers', () => {
    const csv = toCsv(['a', 'b', 'c', 'd', 'e'], [['=1+1', '+49', '-x', '@SUM', -3]], 'excel-de');
    expect(csv.split('\r\n')[1]).toBe("'=1+1;'+49;'-x;'@SUM;-3");
  });

  it('quotes line breaks and outer spaces', () => {
    expect(toCsv(['x'], [['a\nb'], [' lead']], 'international')).toBe('x\r\n"a\nb"\r\n" lead"\r\n');
  });

  it('writes money in each currency’s minor digits', () => {
    expect(decimalOf(money(0))).toBe('0.00');
    expect(decimalOf(money(7))).toBe('0.07');
    expect(decimalOf(money(-1234))).toBe('-12.34');
    expect(decimalOf(money(1500, 'JPY'))).toBe('1500');
  });

  it('decimalOf reads back as the same amount', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1e12, max: 1e12 }), (minor) => {
        expect(Math.round(Number(decimalOf(money(minor))) * 100)).toBe(minor);
      }),
    );
  });
});
