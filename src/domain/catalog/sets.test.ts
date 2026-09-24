import { describe, expect, it } from 'vitest';
import type { CatalogSetSummary } from './schema';
import {
  chunkSetId,
  compareCards,
  groupBySeries,
  isTranslatedName,
  pickText,
  printsOf,
  textIn,
} from './sets';

const set = (id: string, extra: Partial<CatalogSetSummary> = {}): CatalogSetSummary => ({
  id,
  print: 'intl',
  series: { id: 'mega-evolution', name: { de: 'Mega-Entwicklung' } },
  kind: 'main',
  name: { de: id },
  languages: ['de'],
  releaseDates: { de: '2026-09-16' },
  counts: { official: 1, total: 1 },
  ...extra,
});

describe('catalog helpers', () => {
  it('picks German first, then English, then any language', () => {
    expect(pickText({ en: 'Pikachu', de: 'Pikachu DE' })).toBe('Pikachu DE');
    expect(pickText({ ja: 'ピカチュウ', en: 'Pikachu' })).toBe('Pikachu');
    expect(pickText({ ja: 'ピカチュウ' })).toBe('ピカチュウ');
    expect(textIn({ ja: 'ピカチュウ', de: 'Pikachu' }, 'ja')).toBe('ピカチュウ');
    expect(pickText(undefined)).toBe('');
  });

  it('flags translated names', () => {
    expect(isTranslatedName({ nameSource: { de: 'derived-crossprint' } }, 'de')).toBe(true);
    expect(isTranslatedName({ nameSource: { de: 'derived-crossprint' } }, 'ja')).toBe(false);
    expect(isTranslatedName({}, 'de')).toBe(false);
  });

  it('orders cards by section, then number', () => {
    const cards = [
      { section: 'energy' as const, sort: 2000 },
      { section: 'subset' as const, sort: 1 },
      { section: 'main' as const, sort: 25 },
      { section: 'secret' as const, sort: 129 },
      { section: 'main' as const, sort: 3 },
    ];
    expect(cards.toSorted(compareCards).map((c) => `${c.section}:${c.sort}`)).toEqual([
      'main:3',
      'main:25',
      'secret:129',
      'subset:1',
      'energy:2000',
    ]);
  });

  it('finds the chunk of a subset and groups main sets by series', () => {
    const sets = [
      set('intl:30th'),
      set('intl:30th-c', { kind: 'subset', parentSetId: 'intl:30th' }),
      set('intl:me01', { releaseDates: { de: '2025-09-26' } }),
    ];
    expect(chunkSetId('intl:30th-c', sets)).toBe('intl:30th');
    expect(chunkSetId('intl:30th', sets)).toBe('intl:30th');
    const groups = groupBySeries(sets);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.sets.map((s) => s.id)).toEqual(['intl:30th', 'intl:me01']);
  });
});

describe('printsOf', () => {
  const me01 = set('intl:me01', { otherPrint: 'asia:M1L', otherPrints: ['asia:M1L', 'asia:M1S'] });
  const m1l = set('asia:M1L', { print: 'asia', otherPrint: 'intl:me01' });
  const m1s = set('asia:M1S', { print: 'asia', otherPrint: 'intl:me01' });
  const sets = [m1s, me01, m1l, set('intl:30th', { otherPrint: 'asia:M6a' })];
  const ids = (s: CatalogSetSummary) => printsOf(s, sets).map((p) => p.id);

  it('lists every print of the expansion, the other Japanese half included', () => {
    expect(ids(me01)).toEqual(['intl:me01', 'asia:M1S', 'asia:M1L']);
    expect(ids(m1l)).toEqual(['intl:me01', 'asia:M1S', 'asia:M1L']);
    expect(ids(set('intl:solo'))).toEqual(['intl:solo']);
  });
});
