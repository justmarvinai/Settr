import { describe, expect, it } from 'vitest';
import type { CatalogCard } from '../../src/domain/catalog';
import { matchCounterparts } from './crossprint';
import { fileNameFor, stableJson } from './emit';
import { deriveFromSpecies, parseJapaneseName, simplify, type SpeciesNames } from './names';

const species = new Map<number, SpeciesNames>([
  [
    25,
    {
      ja: 'ピカチュウ',
      'ja-kana': 'ピカチュウ',
      de: 'Pikachu',
      en: 'Pikachu',
      'zh-Hant': '皮卡丘',
      'zh-Hans': '皮卡丘',
    },
  ],
  [
    103,
    {
      ja: 'ナッシー',
      'ja-kana': 'ナッシー',
      de: 'Kokowei',
      en: 'Exeggutor',
      'zh-Hant': '椰蛋樹',
      'zh-Hans': '椰蛋树',
    },
  ],
  [
    658,
    {
      ja: 'ゲッコウガ',
      'ja-kana': 'ゲッコウガ',
      de: 'Quajutsu',
      en: 'Greninja',
      'zh-Hant': '甲賀忍蛙',
      'zh-Hans': '甲贺忍蛙',
    },
  ],
  [
    248,
    {
      ja: 'バンギラス',
      'ja-kana': 'バンギラス',
      de: 'Despotar',
      en: 'Tyranitar',
      'zh-Hant': '班基拉斯',
      'zh-Hans': '班基拉斯',
    },
  ],
]);

describe('Japanese card names', () => {
  it('splits region, species and suffix', () => {
    expect(parseJapaneseName('アローラ ナッシー')).toMatchObject({
      base: 'ナッシー',
      region: { de: 'Alola-' },
    });
    expect(parseJapaneseName('ピカチュウex')).toMatchObject({
      base: 'ピカチュウ',
      suffix: { en: ' ex' },
    });
    expect(parseJapaneseName('ゲッコウガBREAK')).toMatchObject({
      base: 'ゲッコウガ',
      suffix: { de: ' TURBO' },
    });
  });

  it('derives names only for plain species names', () => {
    expect(deriveFromSpecies('ピカチュウex', [25], species)).toEqual({
      de: 'Pikachu-ex',
      en: 'Pikachu ex',
      'zh-tw': '皮卡丘ex',
    });
    expect(deriveFromSpecies('アローラ ナッシー', [103], species)).toEqual({
      de: 'Alola-Kokowei',
      en: 'Alolan Exeggutor',
      'zh-tw': '阿羅拉 椰蛋樹',
    });
    expect(deriveFromSpecies('ゲッコウガBREAK', [658], species)?.de).toBe('Quajutsu TURBO');
    // "Dark Tyranitar" isn't species + suffix: it must come from a counterpart or curation.
    expect(deriveFromSpecies('わるいバンギラス', [248], species)).toBeNull();
    expect(deriveFromSpecies('ピカチュウ&ゼクロムGX', [25, 644], species)).toBeNull();
  });

  it('converts Traditional to Simplified Chinese', () => {
    expect(simplify('超夢ex')).toBe('超梦ex');
    expect(simplify('阿羅拉 椰蛋樹')).toBe('阿罗拉 椰蛋树');
  });
});

const card = (id: string, extra: Partial<CatalogCard>): CatalogCard => ({
  id,
  setId: id.split(':').slice(0, 2).join(':'),
  localId: id.split(':').at(-1) ?? '',
  printedNumber: '',
  section: 'main',
  sort: 1,
  name: { en: id },
  category: 'pokemon',
  variants: [{ id: 'std' }],
  languages: ['en'],
  images: {},
  ...extra,
});

describe('cross-print matching', () => {
  it('pairs same artwork, splits ties in number order and respects curation', () => {
    const intl = [
      card('intl:30th:001', { dexIds: [102], illustrator: 'Nelnal', sort: 1 }),
      card('intl:30th-c:019', {
        dexIds: [491, 488],
        illustrator: 'Shinji Higuchi + Noriko Takaya 樋口 真嗣',
        section: 'subset',
        sort: 16,
      }),
      card('intl:30th-c:020', {
        dexIds: [491, 488],
        illustrator: 'Shinji Higuchi',
        section: 'subset',
        sort: 17,
      }),
      card('intl:30th:128', { category: 'trainer', illustrator: 'Yuka Morii', sort: 128 }),
    ];
    const asia = [
      card('asia:M6a:001', { dexIds: [102], illustrator: 'Nelnal', sort: 1 }),
      card('asia:M6a:152', {
        dexIds: [491, 488],
        illustrator: 'Shinji Higuchi + Noriko Takaya',
        section: 'subset',
        sort: 152,
      }),
      card('asia:M6a:151', {
        dexIds: [491, 488],
        illustrator: 'Shinji Higuchi + Noriko Takaya',
        section: 'subset',
        sort: 151,
      }),
      card('asia:M6a:101', { category: 'trainer', illustrator: 'Yuka Morii', sort: 101 }),
    ];
    const pairs = matchCounterparts(asia, intl, new Map([['asia:M6a:101', 'intl:30th:128']]));
    expect(Object.fromEntries(pairs)).toEqual({
      'asia:M6a:001': 'intl:30th:001',
      'asia:M6a:151': 'intl:30th-c:019',
      'asia:M6a:152': 'intl:30th-c:020',
      'asia:M6a:101': 'intl:30th:128',
    });
  });
});

describe('output files', () => {
  it('writes one array element per line', () => {
    expect(stableJson({ a: [{ id: 1 }, { id: 2 }], b: ['x', 'y'] })).toBe(
      '{\n  "a": [\n    {"id":1},\n    {"id":2}\n  ],\n  "b": ["x","y"]\n}',
    );
  });

  it('turns set ids into safe file names', () => {
    expect(fileNameFor('intl:30th')).toBe('intl_30th.json');
    expect(fileNameFor('intl:sv03.5')).toBe('intl_sv03.5.json');
  });
});
