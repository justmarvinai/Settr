import { describe, expect, it } from 'vitest';
import { meetsCondition } from './catalog-types';
import { isUuidV7, newId, todayIso } from './ids';
import { cardSeriesKey, gradeKey, sealedSeriesKey } from './series';

describe('series keys (DATA_MODEL.md §6.1)', () => {
  it('builds grade keys', () => {
    expect(gradeKey()).toBe('raw');
    expect(gradeKey({ company: 'PSA', grade: '10' })).toBe('psa-10');
    expect(gradeKey({ company: 'BGS', grade: '9.5' })).toBe('bgs-9.5');
    expect(gradeKey({ company: 'CGC', grade: '10', qualifier: 'Pristine' })).toBe(
      'cgc-10-pristine',
    );
    expect(gradeKey({ company: 'other', companyName: 'Gräder Nord', grade: '9' })).toBe(
      'grader-nord-9',
    );
    expect(gradeKey({ company: 'PSA', grade: '★' })).toBe('psa-2605'); // symbols-only grades stay distinct
  });

  it('includes the language in every key (R2.6)', () => {
    expect(cardSeriesKey('intl:30th:150', 'de', 'std', 'raw')).toBe(
      'card|intl:30th:150|de|std|raw',
    );
    expect(cardSeriesKey('intl:30th:150', 'en', 'std', 'raw')).not.toBe(
      cardSeriesKey('intl:30th:150', 'de', 'std', 'raw'),
    );
    expect(sealedSeriesKey('intl:30th-etb', 'de')).toBe('sealed|intl:30th-etb|de');
  });
});

describe('conditions', () => {
  it('knows what "Near Mint or better" means (R2.2)', () => {
    expect(meetsCondition('MT', 'NM')).toBe(true);
    expect(meetsCondition('NM', 'NM')).toBe(true);
    expect(meetsCondition('EX', 'NM')).toBe(false);
    expect(meetsCondition('PO', 'NM')).toBe(false);
  });
});

describe('ids', () => {
  it('creates time-sortable UUIDv7s', () => {
    const a = newId();
    const b = newId();
    expect(isUuidV7(a)).toBe(true);
    expect(a < b).toBe(true);
    expect(isUuidV7('0192f1c3-7b2a-4c0e-9d3f-5a1e2b3c4d5e')).toBe(false);
  });

  it('formats local calendar dates', () => {
    expect(todayIso(new Date(2026, 8, 3, 23, 30))).toBe('2026-09-03');
  });
});
