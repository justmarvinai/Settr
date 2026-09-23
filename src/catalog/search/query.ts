import { CARD_LANGUAGES, type CardLanguage } from '@/domain/catalog-types';
import { RARITY_ABBR, RARITY_IDS, type RarityId } from '@/domain/catalog/vocab';

/**
 * Power-user query syntax (ARCHITECTURE.md §7): `set:30c`, `lang:ja`, `rarity:sar`, `#025` and
 * `owned:yes|no` next to free text. Keys are case-insensitive, `set`, `lang` and `rarity` take
 * comma lists (`lang:ja,de`), and repeating a key adds values. A token with an unknown key or an
 * unusable value stays in the free text; a known key without a value (still being typed) is
 * dropped.
 */

export interface QueryFilters {
  /** Set codes or set ids, lowercased (`30c`, `intl:30th-c`); the engine resolves them. */
  set?: string[];
  lang?: CardLanguage[];
  /** Rarity ids; abbreviations (`sir`, `sar`) are already resolved. */
  rarity?: string[];
  /** Card number as typed after `#` (`025`, `4/102`); the last one wins. */
  number?: string;
  /** Not applied by the search engine: the caller filters with the user's holdings. */
  owned?: 'yes' | 'no';
}

export interface ParsedQuery {
  /** The free text: every token that isn't a filter, joined by single spaces. */
  text: string;
  filters: QueryFilters;
}

/** Japanese names of the same rarities: Special Art Rare, Art Rare, Super Rare. */
const JAPANESE_RARITY_ABBR: Partial<Record<RarityId, readonly string[]>> = {
  'special-illustration-rare': ['SAR'],
  'illustration-rare': ['AR'],
  'ultra-rare': ['SR'],
};

function isRarityId(value: string): value is RarityId {
  return (RARITY_IDS as readonly string[]).includes(value);
}

/** Abbreviations a rarity goes by: the tile abbreviation, then Japanese names (`SIR`, `SAR`). */
export function rarityAbbreviations(rarity: string): string[] {
  if (!isRarityId(rarity)) return [];
  return [RARITY_ABBR[rarity], ...(JAPANESE_RARITY_ABBR[rarity] ?? [])];
}

/** Lowercased id or abbreviation → rarity ids (`pr` is both the Pikachu rare and promos). */
const RARITIES = new Map<string, RarityId[]>();
for (const id of RARITY_IDS) {
  for (const key of [id, ...rarityAbbreviations(id)].map((k) => k.toLowerCase())) {
    RARITIES.set(key, [...(RARITIES.get(key) ?? []), id]);
  }
}

const LANGUAGES = new Map<string, readonly CardLanguage[]>([
  ...CARD_LANGUAGES.map((lang) => [lang, [lang]] as const),
  ['jp', ['ja']],
  ['zh', ['zh-cn', 'zh-tw']],
  ['cn', ['zh-cn']],
  ['sc', ['zh-cn']],
  ['chs', ['zh-cn']],
  ['zh-hans', ['zh-cn']],
  ['tw', ['zh-tw']],
  ['tc', ['zh-tw']],
  ['cht', ['zh-tw']],
  ['zh-hant', ['zh-tw']],
  ['kr', ['ko']],
]);

const OWNED = new Map<string, 'yes' | 'no'>([
  ['yes', 'yes'],
  ['ja', 'yes'],
  ['y', 'yes'],
  ['true', 'yes'],
  ['1', 'yes'],
  ['no', 'no'],
  ['nein', 'no'],
  ['n', 'no'],
  ['false', 'no'],
  ['0', 'no'],
]);

const KEY_VALUE = /^([a-z]+):(.*)$/i;

/** Every value mapped through `lookup`, or undefined as soon as one is unknown. */
function resolveAll<T>(
  values: readonly string[],
  lookup: ReadonlyMap<string, readonly T[]>,
): T[] | undefined {
  const resolved: T[] = [];
  for (const value of values) {
    const found = lookup.get(value);
    if (!found) return undefined;
    resolved.push(...found);
  }
  return resolved;
}

function merge<T>(existing: readonly T[] | undefined, added: readonly T[]): T[] {
  return [...new Set([...(existing ?? []), ...added])];
}

/** Applies `key:value` to `filters`; false when the token is free text after all. */
function applyFilter(filters: QueryFilters, key: string, value: string): boolean {
  const values = value.toLowerCase().split(',').filter(Boolean);
  switch (key) {
    case 'set': {
      if (values.length > 0) filters.set = merge(filters.set, values);
      return true;
    }
    case 'lang': {
      const langs = resolveAll(values, LANGUAGES);
      if (!langs) return false;
      if (langs.length > 0) filters.lang = merge(filters.lang, langs);
      return true;
    }
    case 'rarity': {
      const rarities = resolveAll(values, RARITIES);
      if (!rarities) return false;
      if (rarities.length > 0) filters.rarity = merge(filters.rarity, rarities);
      return true;
    }
    case 'owned': {
      const owned = OWNED.get(value.toLowerCase());
      if (owned) filters.owned = owned;
      return owned !== undefined || value === '';
    }
    default:
      return false;
  }
}

/** Splits a search input into free text and filters. */
export function parseQuery(input: string): ParsedQuery {
  const words: string[] = [];
  const filters: QueryFilters = {};
  // NFKC first, so a Japanese keyboard's ＃ and ： work too.
  for (const token of input.normalize('NFKC').split(/\s+/)) {
    if (!token) continue;
    if (token.startsWith('#')) {
      if (token.length > 1) filters.number = token.slice(1);
      continue;
    }
    const [, key = '', value = ''] = KEY_VALUE.exec(token) ?? [];
    if (key && applyFilter(filters, key.toLowerCase(), value)) continue;
    words.push(token);
  }
  return { text: words.join(' '), filters };
}
