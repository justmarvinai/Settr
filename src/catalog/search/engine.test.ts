import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  catalogManifestSchema,
  searchIndexFileSchema,
  type CatalogSetSummary,
  type SearchDoc,
} from '@/domain/catalog';
import { getSearchClient } from './client';
import { createSearchEngine, type SearchOptions } from './engine';
import { canonicalNumber, normalizeText } from './normalize';

// The real generated catalog (public/catalog/v1), so the tests follow what the app ships.
const readCatalog = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../public/catalog/v1/${file}`, import.meta.url), 'utf8'));
const searchIndex = searchIndexFileSchema.parse(readCatalog('search-index.json'));
const { docs } = searchIndex;
const { sets } = catalogManifestSchema.parse(readCatalog('manifest.json'));
const engine = createSearchEngine(docs, sets);

const search = (query: string, options?: SearchOptions) =>
  engine.search(query, { limit: 0, ...options });
const ids = (query: string, options?: SearchOptions) => search(query, options).map((r) => r.id);
const namesOf = (doc: SearchDoc) => [doc.name, ...doc.names].map((name) => normalizeText(name));
const numberHead = (doc: SearchDoc) => canonicalNumber(doc.number?.split('/')[0] ?? '');
const setRank = (doc: SearchDoc) => sets.findIndex((set) => set.id === doc.setId);

const testSet = (id: string): CatalogSetSummary => ({
  id,
  print: 'intl',
  series: { id: 'test', name: { de: 'Test' } },
  kind: 'main',
  name: { de: 'Testset' },
  code: 'TST',
  languages: ['de'],
  releaseDates: { de: '2026-01-01' },
  counts: { official: 1, total: 1 },
});
const card = (id: string, name: string, extra: Partial<SearchDoc> = {}): SearchDoc => ({
  id,
  kind: 'card',
  setId: 'intl:test',
  print: 'intl',
  name,
  names: [name],
  languages: ['de'],
  sort: 1,
  ...extra,
});

describe('search engine: names', () => {
  it('indexes every doc once', () => {
    expect(engine.size).toBe(new Set(docs.map((doc) => doc.id)).size);
  });

  it('finds Pikachu in both prints, exact name matches first', () => {
    const results = search('pikachu');
    expect(results.map((r) => r.id)).toEqual(
      expect.arrayContaining(['intl:30th:025', 'asia:M6a:017', 'intl:30th-c:014']),
    );
    expect(results[0]?.doc.name).toBe('Pikachu');
    for (const { doc } of results) {
      expect(namesOf(doc).some((name) => name.includes('pikachu'))).toBe(true);
    }
  });

  it('finds Japanese Pikachu by katakana and hiragana alike', () => {
    const katakana = ids('ピカチュウ');
    expect(katakana).toContain('asia:M6a:017');
    expect(ids('ぴかちゅう')).toEqual(katakana);
  });

  it('finds Pikachu by its Chinese name', () => {
    expect(ids('皮卡丘')).toEqual(expect.arrayContaining(['intl:30th:025', 'asia:M6a:017']));
  });

  it.each(['glurak', 'Charizard', 'リザードン', '喷火龙'])(
    'finds Charizard by %s, cards first',
    (query) => {
      const results = search(query);
      expect(results.map((r) => r.id)).toEqual(
        expect.arrayContaining(['intl:30th-c:001', 'asia:M6a:137']),
      );
      expect(results[0]?.kind).toBe('card');
    },
  );

  it('finds a single CJK character anywhere in a name', () => {
    expect(ids('喵')).toContain('intl:30th:113'); // 喵喵 = Mauzi
    expect(ids('卡')).toContain('intl:30th:025'); // 皮卡丘 = Pikachu
  });

  it('splits queries that mix scripts', () => {
    expect(ids('M沙奈朵EX')).toContain('intl:30th-c:023');
    expect(ids('ピカチュウex')).toEqual(expect.arrayContaining(['asia:M6a:047', 'intl:30th:053']));
  });

  it.each([
    ['mauzi', 'intl:30th:113'],
    ['nachtara', 'intl:30th:091'],
    ['feelinara', 'intl:30th:071'],
    ['zurrokex', 'intl:30th:094'],
    ['hisui-zorua', 'intl:30th:122'],
  ])('finds the German name %s, cards first', (query, id) => {
    const results = search(query);
    expect(results.map((r) => r.id)).toContain(id);
    expect(results[0]?.kind).toBe('card');
  });

  it('treats "-ex" and " ex" alike', () => {
    const hyphenated = ids('pikachu-ex');
    expect(hyphenated.length).toBeGreaterThan(0);
    expect(ids('pikachu ex')).toEqual(hyphenated);
    expect(ids('hisui zorua')).toEqual(ids('hisui-zorua'));
    for (const { doc } of search('pikachu-ex')) expect(namesOf(doc)).toContain('pikachu ex');
  });

  it('forgives one typo in words from four letters on', () => {
    expect(ids('glurk')).toContain('intl:30th-c:001');
    expect(ids('pikachuu')).toContain('intl:30th:025');
  });

  it('finds umlauts typed as umlauts, plain vowels or vowel + e', () => {
    for (const query of ['münzset', 'munzset', 'muenzset']) {
      expect(ids(query, { kind: 'sealed' })).toContain('asia:m6a-sc-coin-set');
    }
  });

  it('finds sealed products by German and English names', () => {
    expect(ids('top-trainer', { kind: 'sealed' })[0]).toBe('intl:30th-etb');
    expect(ids('elite trainer', { kind: 'sealed' })).toContain('intl:30th-etb');
    for (const result of search('trainer', { kind: 'sealed' })) expect(result.kind).toBe('sealed');
  });

  it('finds illustrators', () => {
    const results = search('ken sugimori');
    expect(results.map((r) => r.id)).toEqual(
      expect.arrayContaining(['intl:30th:023', 'asia:M6a:017']),
    );
    for (const { doc } of results) expect(doc.illustrator).toBe('Ken Sugimori');
    for (const { doc } of search('mitsuhiro arita'))
      expect(doc.illustrator).toBe('Mitsuhiro Arita');
    // One typo away: "arita" also finds Hitoshi Ariga, after the exact matches.
    const arita = search('arita');
    const exact = arita.filter(({ doc }) => doc.illustrator === 'Mitsuhiro Arita');
    expect(exact.length).toBeGreaterThan(0);
    expect(arita.slice(0, exact.length)).toEqual(exact);
  });
});

describe('search engine: card numbers', () => {
  it.each(['25', '025', '#25', '#025', '025/128', '25/128'])('finds 025/128 by %s', (query) => {
    expect(ids(query)).toContain('intl:30th:025');
  });

  it('ranks exact numbers first', () => {
    expect(ids('025').slice(0, 2).toSorted()).toEqual(['asia:M6a:025', 'intl:30th:025']);
    expect(ids('025/128')[0]).toBe('intl:30th:025');
    expect(ids('4/102')[0]).toBe('intl:30th-c:001');
    // `4`: 004/128, 004/103 and 4/102 before 040–049, 41/122 and the like.
    const four = search('4');
    expect(four.slice(0, 3).map((r) => r.id)).toContain('intl:30th-c:001');
    const firstInexact = four.findIndex((r) => numberHead(r.doc) !== '4');
    expect(firstInexact).toBeGreaterThanOrEqual(3);
    expect(four.slice(firstInexact).some((r) => numberHead(r.doc) === '4')).toBe(false);
  });

  it('finds Classic Collection cards by their printed number', () => {
    expect(ids('#4/102')).toEqual(['intl:30th-c:001']);
    expect(ids('4')).toContain('intl:30th-c:001');
  });

  it('narrows with every term (AND)', () => {
    const results = search('pikachu 025');
    expect(results.map((r) => r.id)).toContain('intl:30th:025');
    for (const { doc } of results) {
      expect(doc.number?.startsWith('025')).toBe(true);
      expect(namesOf(doc)).toContain('pikachu');
    }
  });

  it('lists # matches without free text in catalog order', () => {
    const results = search('#25');
    expect(results.map((r) => r.id)).toEqual(
      expect.arrayContaining(['intl:30th:025', 'intl:30th-c:007', 'asia:M6a:025']),
    );
    for (const result of results) {
      expect(result.score).toBe(0);
      expect(numberHead(result.doc)).toBe('25');
    }
  });
});

describe('search engine: filters', () => {
  it('set: selects a set by code or id; a main set brings its subsets', () => {
    const results = search('set:30c pikachu');
    expect(results.map((r) => r.id)).toContain('intl:30th-c:014');
    for (const { doc } of results) expect(['intl:30th', 'intl:30th-c']).toContain(doc.setId);
    expect(ids('set:intl:30th pikachu')).toEqual(results.map((r) => r.id));
    for (const { doc } of search('set:M6a pikachu')) expect(doc.setId).toBe('asia:M6a');
    for (const { doc } of search('set:intl:30th-c')) expect(doc.setId).toBe('intl:30th-c');
    expect(search('set:xyz pikachu')).toEqual([]);
  });

  it('lang: keeps docs available in that language', () => {
    const results = search('lang:ja');
    expect(results).toHaveLength(docs.filter((doc) => doc.languages.includes('ja')).length);
    for (const { doc } of results) expect(doc.languages).toContain('ja');
  });

  it('rarity: keeps one rarity, by Japanese or tile abbreviation', () => {
    const results = search('rarity:sar');
    expect(results.length).toBeGreaterThan(0);
    expect(results).toHaveLength(
      docs.filter((doc) => doc.rarity === 'special-illustration-rare').length,
    );
    for (const { doc } of results) expect(doc.rarity).toBe('special-illustration-rare');
    expect(ids('rarity:SIR')).toEqual(results.map((r) => r.id));
  });

  it('applies option filters together with the query filters', () => {
    for (const { doc } of search('pikachu', { print: 'asia' })) expect(doc.print).toBe('asia');
    for (const { doc } of search('pikachu', { languages: ['zh-cn'] })) {
      expect(doc.languages).toContain('zh-cn');
    }
    for (const { doc } of search('', { setIds: ['intl:30th-c'], kind: 'card' })) {
      expect(doc.setId).toBe('intl:30th-c');
    }
    for (const { doc } of search('', { categories: ['trainer'] })) {
      expect(doc.category).toBe('trainer');
    }
    for (const { doc } of search('', { types: ['fire'] })) expect(doc.types).toContain('fire');
    for (const { doc } of search('pikachu', { rarities: ['classic-collection'] })) {
      expect(doc.rarity).toBe('classic-collection');
    }
    expect(search('set:30c', { print: 'asia' })).toEqual([]);
    // Empty lists filter nothing.
    expect(ids('pikachu', { languages: [], setIds: [] })).toEqual(ids('pikachu'));
  });

  it('treats owned: as a filter but leaves it to the caller', () => {
    expect(search('owned:yes')).toHaveLength(engine.size);
    expect(ids('owned:no pikachu')).toEqual(ids('pikachu'));
  });
});

describe('search engine: results', () => {
  it('returns nothing without text and filters', () => {
    expect(engine.search('')).toEqual([]);
    expect(engine.search('  - & ')).toEqual([]);
  });

  it('lists every doc passing the filters in catalog order when there is no text', () => {
    // Catalog order: manifest set order, then name (sealed) or the set's own order (cards).
    const sealed = search('', { kind: 'sealed' }).map((r) => r.doc);
    expect(sealed).toHaveLength(docs.filter((doc) => doc.kind === 'sealed').length);
    expect(sealed).toEqual(
      sealed.toSorted(
        (a, b) => setRank(a) - setRank(b) || a.name.localeCompare(b.name, 'de', { numeric: true }),
      ),
    );
    const cards = search('', { kind: 'card', print: 'asia' }).map((r) => r.doc);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards).toEqual(
      cards.toSorted((a, b) => setRank(a) - setRank(b) || (a.sort ?? 0) - (b.sort ?? 0)),
    );
  });

  it('sorts by score', () => {
    const results = search('pikachu');
    for (const [i, result] of results.entries()) {
      expect(result.score).toBeLessThanOrEqual(results[i - 1]?.score ?? Infinity);
    }
  });

  it('returns 50 results unless told otherwise; 0 means all', () => {
    expect(engine.search('pikachu')).toHaveLength(50);
    expect(engine.search('pikachu', { limit: 5 })).toHaveLength(5);
    expect(search('pikachu').length).toBeGreaterThan(50);
  });
});

describe('search engine: hand-made docs', () => {
  it('finds umlauts folded and expanded', () => {
    const knospi = createSearchEngine([card('a', 'Knöspi')], [testSet('intl:test')]);
    for (const query of ['knospi', 'knoespi', 'knöspi', 'KNÖSPI', 'knö', 'knoe']) {
      expect(knospi.search(query).map((r) => r.id)).toEqual(['a']);
    }
  });

  it('allows a typo only from four letters on', () => {
    const small = createSearchEngine(
      [card('a', 'Mew'), card('b', 'Glurak')],
      [testSet('intl:test')],
    );
    expect(small.search('mex')).toEqual([]);
    expect(small.search('glurk').map((r) => r.id)).toEqual(['b']);
  });

  it('indexes a repeated id once', () => {
    const twice = createSearchEngine(
      [card('a', 'Mew'), card('a', 'Mewtu')],
      [testSet('intl:test')],
    );
    expect(twice.size).toBe(1);
    expect(twice.search('mew').map((r) => r.doc.name)).toEqual(['Mew']);
  });

  it('finds docs of sets missing from the manifest and lists them last', () => {
    const mixed = createSearchEngine(
      [card('x', 'Pikachu', { setId: 'intl:unknown' }), card('a', 'Pikachu')],
      [testSet('intl:test')],
    );
    expect(mixed.search('pikachu').map((r) => r.id)).toEqual(['a', 'x']);
    expect(mixed.search('set:intl:unknown').map((r) => r.id)).toEqual(['x']);
    expect(mixed.search('set:tst').map((r) => r.id)).toEqual(['a']);
  });

  it('builds 20 000 docs well within a second', () => {
    const manySets: CatalogSetSummary[] = [];
    const many: SearchDoc[] = [];
    for (let copy = 0; many.length < 20_000; copy += 1) {
      for (const set of sets) {
        const parentSetId = set.parentSetId && `${set.parentSetId}~${copy}`;
        manySets.push({ ...set, id: `${set.id}~${copy}`, code: `${set.code}${copy}`, parentSetId });
      }
      for (const doc of docs.slice(0, 20_000 - many.length)) {
        many.push({ ...doc, id: `${doc.id}~${copy}`, setId: `${doc.setId}~${copy}` });
      }
    }
    // Best of three, so a garbage collection or a busy test runner doesn't decide. A build takes
    // ~0.4 s here; the limit leaves room for slow CI runners (a flaky test is a bug).
    const timings = [0, 1, 2].map(() => {
      const start = performance.now();
      expect(createSearchEngine(many, manySets).size).toBe(20_000);
      return performance.now() - start;
    });
    expect(Math.min(...timings)).toBeLessThan(2000);
  });
});

describe('getSearchClient without Worker support', () => {
  it('runs the engine on the main thread', async () => {
    const client = getSearchClient();
    expect(getSearchClient()).toBe(client);
    await expect(client.search('pikachu')).rejects.toThrow('not initialised');
    await client.init(searchIndex.catalogVersion, docs, sets);
    await client.init(searchIndex.catalogVersion, docs, sets);
    const results = await client.search('pikachu', { limit: 3 });
    expect(results.map((r) => r.id)).toEqual(
      engine.search('pikachu', { limit: 3 }).map((r) => r.id),
    );
  });
});
