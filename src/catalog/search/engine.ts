import MiniSearch, { type AsPlainObject } from 'minisearch';
import type { CatalogSetSummary, SearchDoc } from '@/domain/catalog';
import type { CardLanguage, Print } from '@/domain/catalog-types';
import {
  canonicalNumber,
  indexTerms,
  isCjkTerm,
  isLatinWord,
  isNumberTerm,
  numberTerms,
  queryTerms,
  usesPrefixSearch,
} from './normalize';
import { parseQuery, rarityAbbreviations, type QueryFilters } from './query';

/**
 * Catalog search (ARCHITECTURE.md §7): MiniSearch over the slim global search index with Settr's
 * normalization, card numbers and filters. Pure TypeScript: the search worker hosts one engine per
 * catalog version, and it runs on the main thread where workers are missing.
 */

export interface SearchOptions {
  kind?: SearchDoc['kind'];
  /** Exact set ids; subsets aren't added (unlike `set:` in the query). */
  setIds?: readonly string[];
  /** Docs available in at least one of these languages. */
  languages?: readonly CardLanguage[];
  print?: Print;
  rarities?: readonly string[];
  types?: readonly string[];
  /** Card categories (`pokemon`, `trainer`, `energy`) or product types (`etb`, `mini-tin`). */
  categories?: readonly string[];
  /** Maximum number of results (default 50); 0 = all. */
  limit?: number;
}

export interface SearchResult {
  id: string;
  kind: SearchDoc['kind'];
  /** Relevance, higher is better; 0 when the query has no free text. */
  score: number;
  doc: SearchDoc;
}

export interface SearchEngine {
  /**
   * Parses `query` (see parseQuery) and returns the best matches first; equal scores keep catalog
   * order. Filters in the query and in `options` all apply; empty option lists filter nothing.
   * Without free text every doc passing the filters is listed in catalog order, and a query with
   * neither text nor filters returns []. `owned:` counts as a filter but is left to the caller,
   * who then wants `limit: 0`.
   */
  search(query: string, options?: SearchOptions): SearchResult[];
  /** Number of indexed docs. */
  readonly size: number;
}

interface Entry {
  readonly doc: SearchDoc;
  /** Position of the doc's set in the manifest; unknown sets come last. */
  readonly setRank: number;
  /** The forms its printed number is found by (see numberTerms). */
  readonly numbers: readonly string[];
}

type Check = (entry: Entry) => boolean;

/**
 * Index fields and boosts (ARCHITECTURE.md §7). Names are split by script: CJK bigrams and
 * unigrams would otherwise lengthen the name field, and BM25 would rank the sealed
 * "Glurak-Figuren-Geschenkbox" above the card Glurak with its Japanese and Chinese names.
 */
const FIELDS = ['names', 'cjkNames', 'number', 'set', 'illustrator', 'rarity'] as const;
type Field = (typeof FIELDS)[number];
const BOOST: Record<Field, number> = {
  names: 3,
  cjkNames: 3,
  number: 3,
  set: 2,
  illustrator: 1,
  rarity: 1,
};

const DEFAULT_LIMIT = 50;
const FUZZY_MIN_LENGTH = 4;
/** Version of MiniSearch's serialized index format (toJSON/loadJS) that buildIndex writes. */
const SERIALIZATION_VERSION = 2;
const KIND_ORDER: Record<SearchDoc['kind'], number> = { card: 0, sealed: 1 };
const collator = new Intl.Collator('de', { numeric: true });

function compareStrings(a: string, b: string): number {
  return Number(a > b) - Number(a < b);
}

/** Catalog order: set (manifest order), cards before sealed, then set order or name. */
function compareEntries(a: Entry, b: Entry): number {
  return (
    a.setRank - b.setRank ||
    compareStrings(a.doc.setId, b.doc.setId) ||
    KIND_ORDER[a.doc.kind] - KIND_ORDER[b.doc.kind] ||
    (a.doc.sort ?? 0) - (b.doc.sort ?? 0) ||
    collator.compare(a.doc.name, b.doc.name) ||
    compareStrings(a.doc.id, b.doc.id)
  );
}

/** Caches a term list per raw text: names, illustrators and rarities repeat across sets. */
function memoize<T>(compute: (text: string) => T): (text: string) => T {
  const cache = new Map<string, T>();
  return (text) => {
    let value = cache.get(text);
    if (value === undefined) {
      value = compute(text);
      cache.set(text, value);
    }
    return value;
  };
}

interface NameTerms {
  readonly words: readonly string[];
  readonly cjk: readonly string[];
}

function nameIndexTerms(name: string): NameTerms {
  const words: string[] = [];
  const cjk: string[] = [];
  for (const term of indexTerms(name)) (isCjkTerm(term) ? cjk : words).push(term);
  return { words, cjk };
}

/** Set names in every language plus the set code (`30C`, `M6a`). */
function setIndexTerms(set: CatalogSetSummary): string[] {
  return indexTerms([...Object.values(set.name), set.code].join('\n'));
}

/** The rarity id's words plus its abbreviations: `special illustration rare sir sar`. */
function rarityIndexTerms(rarity: string): string[] {
  const abbreviations = rarityAbbreviations(rarity).map((abbr) => abbr.toLowerCase());
  return [...new Set([...indexTerms(rarity), ...abbreviations])];
}

function union(lists: readonly (readonly string[])[]): readonly string[] {
  if (lists.length === 1) return lists[0] ?? [];
  const terms = new Set<string>();
  for (const list of lists) for (const term of list) terms.add(term);
  return [...terms];
}

/**
 * Writes the index in MiniSearch's serialized form for MiniSearch.loadJS. MiniSearch's add()
 * walks its radix tree once per term and document; this inserts every distinct term once, which
 * keeps 20 000 docs well under a second. Each field holds a term at most once per doc.
 */
function buildIndex(
  entries: readonly Entry[],
  termsOf: (entry: Entry) => Record<Field, readonly string[]>,
): AsPlainObject {
  // Term → doc ids (short ids, ascending) per field id.
  const postings = new Map<string, (number[] | undefined)[]>();
  const documentIds: Record<string, string> = {};
  const fieldLength: Record<string, number[]> = {};
  const totals = FIELDS.map(() => 0);
  const counts = FIELDS.map(() => 0);

  for (const [shortId, entry] of entries.entries()) {
    documentIds[shortId] = entry.doc.id;
    const terms = termsOf(entry);
    const lengths: number[] = [];
    for (const [fieldId, field] of FIELDS.entries()) {
      const list = terms[field];
      lengths.push(list.length);
      if (list.length === 0) continue;
      totals[fieldId] = (totals[fieldId] ?? 0) + list.length;
      counts[fieldId] = (counts[fieldId] ?? 0) + 1;
      for (const term of list) {
        let byField = postings.get(term);
        if (!byField) {
          byField = [];
          postings.set(term, byField);
        }
        (byField[fieldId] ??= []).push(shortId);
      }
    }
    fieldLength[shortId] = lengths;
  }

  const index: AsPlainObject['index'] = [];
  for (const [term, byField] of postings) {
    const data: Record<string, Record<string, number>> = {};
    for (const [fieldId, ids] of byField.entries()) {
      if (!ids) continue;
      const frequencies: Record<string, number> = {};
      for (const id of ids) frequencies[id] = 1;
      data[fieldId] = frequencies;
    }
    index.push([term, data]);
  }

  return {
    documentCount: entries.length,
    nextId: entries.length,
    documentIds,
    fieldIds: Object.fromEntries(FIELDS.map((field, fieldId) => [field, fieldId])),
    fieldLength,
    // Averaged over the docs that have the field: sealed products have no number or illustrator.
    averageFieldLength: totals.map((total, fieldId) => total / Math.max(1, counts[fieldId] ?? 0)),
    storedFields: {},
    dirtCount: 0,
    index,
    serializationVersion: SERIALIZATION_VERSION,
  };
}

/** Lowercased set code or id → the set ids it selects; a main set brings its subsets. */
function buildSetKeys(
  sets: readonly CatalogSetSummary[],
  entries: readonly Entry[],
): Map<string, Set<string>> {
  const keys = new Map<string, Set<string>>();
  const add = (key: string, ids: readonly string[]) => {
    const selected = keys.get(key) ?? new Set<string>();
    for (const id of ids) selected.add(id);
    keys.set(key, selected);
  };
  for (const set of sets) {
    const ids = [set.id, ...sets.filter((s) => s.parentSetId === set.id).map((s) => s.id)];
    add(set.id.toLowerCase(), ids);
    if (set.code) add(set.code.toLowerCase(), ids);
  }
  // Docs of sets missing from the manifest are still found by their set id.
  for (const { doc, setRank } of entries) {
    if (setRank === sets.length) add(doc.setId.toLowerCase(), [doc.setId]);
  }
  return keys;
}

function nonEmptySet<T>(values: readonly T[] | undefined): ReadonlySet<T> | undefined {
  return values && values.length > 0 ? new Set(values) : undefined;
}

/** One predicate for all filters of the query and the options, or undefined if there are none. */
function compileFilter(
  filters: QueryFilters,
  options: SearchOptions,
  setKeys: ReadonlyMap<string, ReadonlySet<string>>,
): Check | undefined {
  const checks: Check[] = [];
  const { kind, print } = options;
  if (kind) checks.push((e) => e.doc.kind === kind);
  if (print) checks.push((e) => e.doc.print === print);
  const setIds = nonEmptySet(options.setIds);
  if (setIds) checks.push((e) => setIds.has(e.doc.setId));
  if (filters.set && filters.set.length > 0) {
    // An unknown code selects nothing: `set:xyz` is an empty result, not an ignored filter.
    const selected = new Set(filters.set.flatMap((key) => [...(setKeys.get(key) ?? [])]));
    checks.push((e) => selected.has(e.doc.setId));
  }
  for (const languages of [nonEmptySet(options.languages), nonEmptySet(filters.lang)]) {
    if (languages) checks.push((e) => e.doc.languages.some((lang) => languages.has(lang)));
  }
  for (const rarities of [nonEmptySet(options.rarities), nonEmptySet(filters.rarity)]) {
    if (rarities) checks.push((e) => e.doc.rarity !== undefined && rarities.has(e.doc.rarity));
  }
  const types = nonEmptySet(options.types);
  if (types) checks.push((e) => e.doc.types?.some((type) => types.has(type)) ?? false);
  const categories = nonEmptySet(options.categories);
  if (categories) {
    checks.push((e) => e.doc.category !== undefined && categories.has(e.doc.category));
  }
  if (filters.number !== undefined) {
    const number = canonicalNumber(filters.number);
    checks.push((e) => e.numbers.includes(number));
  }
  if (checks.length === 0) return undefined;
  return (entry) => checks.every((check) => check(entry));
}

function toResult(entry: Entry, score: number): SearchResult {
  return { id: entry.doc.id, kind: entry.doc.kind, score, doc: entry.doc };
}

function resolveLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  return limit > 0 ? limit : Infinity;
}

// Query-time MiniSearch hooks. The engine hands MiniSearch finished terms joined by spaces.
function splitTerms(text: string): string[] {
  return text.split(' ');
}

function keepTerm(term: string): string {
  return term;
}

/** One typo allowed in Latin words from four letters on ("glurk" → Glurak). */
function fuzziness(term: string): number | false {
  return isLatinWord(term) && term.length >= FUZZY_MIN_LENGTH ? 1 : false;
}

/** Builds the index for `docs` (the search-index.json docs); `sets` are the manifest's sets. */
export function createSearchEngine(
  docs: readonly SearchDoc[],
  sets: readonly CatalogSetSummary[],
): SearchEngine {
  const setRanks = new Map(sets.map((set, position) => [set.id, position] as const));
  const byId = new Map<string, Entry>();
  for (const doc of docs) {
    if (byId.has(doc.id)) continue;
    const setRank = setRanks.get(doc.setId) ?? sets.length;
    byId.set(doc.id, { doc, setRank, numbers: doc.number ? numberTerms(doc.number) : [] });
  }
  const entries = [...byId.values()];
  const ordered = entries.toSorted(compareEntries);
  const setKeys = buildSetKeys(sets, entries);

  const setTerms = new Map(sets.map((set) => [set.id, setIndexTerms(set)] as const));
  const nameTerms = memoize(nameIndexTerms);
  const illustratorTerms = memoize(indexTerms);
  const rarityTerms = memoize(rarityIndexTerms);
  const termsOf = ({ doc, numbers }: Entry): Record<Field, readonly string[]> => {
    const names = (doc.names.includes(doc.name) ? doc.names : [doc.name, ...doc.names]).map(
      nameTerms,
    );
    return {
      names: union(names.map((name) => name.words)),
      cjkNames: union(names.map((name) => name.cjk)),
      number: numbers,
      set: setTerms.get(doc.setId) ?? [],
      illustrator: doc.illustrator ? illustratorTerms(doc.illustrator) : [],
      rarity: doc.rarity ? rarityTerms(doc.rarity) : [],
    };
  };

  const index = MiniSearch.loadJS<Entry>(buildIndex(entries, termsOf), {
    fields: [...FIELDS],
    autoVacuum: false,
    searchOptions: {
      boost: BOOST,
      combineWith: 'AND',
      prefix: usesPrefixSearch,
      fuzzy: fuzziness,
      tokenize: splitTerms,
      processTerm: keepTerm,
    },
  });

  function rank(
    terms: readonly string[],
    accept: Check | undefined,
    limit: number,
  ): SearchResult[] {
    const numbers = terms.filter(isNumberTerm);
    const hits: { entry: Entry; score: number; exactNumber: boolean }[] = [];
    let best = 0;
    for (const hit of index.search(terms.join(' '))) {
      const id: unknown = hit.id;
      const entry = typeof id === 'string' ? byId.get(id) : undefined;
      if (!entry || (accept && !accept(entry))) continue;
      const exactNumber = numbers.some((term) => hit.match[term]?.includes('number'));
      hits.push({ entry, score: hit.score, exactNumber });
      best = Math.max(best, hit.score);
    }
    // An exact card number outranks everything else: `4` lists 4/102 before 40–49 and 400.
    return hits
      .map((hit) => ({ entry: hit.entry, score: hit.exactNumber ? hit.score + best : hit.score }))
      .toSorted((a, b) => b.score - a.score || compareEntries(a.entry, b.entry))
      .slice(0, limit)
      .map((hit) => toResult(hit.entry, hit.score));
  }

  return {
    size: entries.length,
    search(query, options = {}) {
      const { text, filters } = parseQuery(query);
      const accept = compileFilter(filters, options, setKeys);
      const limit = resolveLimit(options.limit);
      const terms = queryTerms(text);
      if (terms.length > 0) return rank(terms, accept, limit);
      if (!accept && filters.owned === undefined) return [];
      const results: SearchResult[] = [];
      for (const entry of ordered) {
        if (results.length >= limit) break;
        if (!accept || accept(entry)) results.push(toResult(entry, 0));
      }
      return results;
    },
  };
}
