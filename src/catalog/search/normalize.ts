/**
 * Text normalization and tokenization for catalog search (ARCHITECTURE.md §7). Documents and
 * queries run through the same pipeline, so whatever is typed matches what was indexed. Pure
 * TypeScript: runs in the search worker, on the main thread and in Node tests alike.
 */

/** How German umlauts are folded: `fold` → plain vowel (ü → u), `expand` → vowel + e (ü → ue). */
export type UmlautMode = 'fold' | 'expand';

/** `index` also emits each CJK run's last character, for one-character queries (see tokenize). */
export type TokenizeMode = 'index' | 'query';

const UMLAUT_EXPANSIONS: Readonly<Record<string, string>> = { ä: 'ae', ö: 'oe', ü: 'ue' };
/** Latin letters that Unicode decomposition leaves alone. */
const LATIN_SPECIALS: Readonly<Record<string, string>> = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ı: 'i',
};

const UMLAUTS = /[äöü]/g;
/** Latin-1 Supplement, Latin Extended-A/B and Latin Extended Additional. */
const LATIN_EXTENDED = /[\u00C0-\u024F\u1E00-\u1EFF]/g;
/** Combining diacritics (Latin, Greek, Cyrillic); kana voicing marks live elsewhere. */
const COMBINING_MARKS = /[\u0300-\u036F]/g;
const KATAKANA = /[\u30A1-\u30F6\u30FD\u30FE]/g;
/** Katakana sits 0x60 code points above its hiragana counterpart. */
const KANA_OFFSET = 0x60;
const APOSTROPHES = /['`\u2018\u2019\u02BC]/g;
const HYPHENS = /[-\u2010-\u2015\u2212]/g;
const WHITESPACE = /\s+/g;
/** Raw text that has an umlaut form worth indexing (precomposed or combining diaeresis). */
const HAS_UMLAUT = /[äöüÄÖÜ]|\u0308/;

/** Han, hiragana and katakana, plus ー and 〆, which Unicode files under the Common script. */
const CJK_CHARS = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\u3006\\u30FC';
const CJK_RUNS = new RegExp(`([${CJK_CHARS}]+)`, 'u');
const CJK_START = new RegExp(`^[${CJK_CHARS}]`, 'u');
/** Words; parts joined by `/` stay together for printed numbers such as `025/128`. */
const WORDS = /[\p{L}\p{M}\p{N}]+(?:\/[\p{L}\p{M}\p{N}]+)*/gu;
const DIGIT = /\p{Nd}/u;
const SINGLE_CHAR = /^.$/su;
const LATIN_WORD = /^[a-z]+$/;
const PLAIN_NUMBER = /^[\da-z]+(?:\/[\da-z]+)?$/i;
const LEADING_ZEROS = /^([a-z]*)0+(?=\d)/;

function foldLatin(char: string): string {
  return LATIN_SPECIALS[char] ?? char.normalize('NFD').replace(COMBINING_MARKS, '');
}

function toHiragana(char: string): string {
  return String.fromCharCode(char.charCodeAt(0) - KANA_OFFSET);
}

function expandUmlaut(char: string): string {
  return UMLAUT_EXPANSIONS[char] ?? char;
}

/**
 * Normalizes text for matching: Unicode NFKC (full-width → ASCII, half-width kana → full-width),
 * lowercase, Latin diacritics folded (é → e, ß → ss), katakana folded to hiragana, apostrophes
 * dropped and hyphens turned into spaces, so "Pikachu-ex" = "pikachu ex" and "Erika's" =
 * "erikas". Umlauts become the plain vowel, or vowel + e with `umlauts: 'expand'`.
 */
export function normalizeText(text: string, umlauts: UmlautMode = 'fold'): string {
  let result = text.normalize('NFKC').toLowerCase();
  if (umlauts === 'expand') result = result.replace(UMLAUTS, expandUmlaut);
  return result
    .replace(LATIN_EXTENDED, foldLatin)
    .replace(COMBINING_MARKS, '')
    .replace(KATAKANA, toHiragana)
    .replace(APOSTROPHES, '')
    .replace(HYPHENS, ' ')
    .replace(WHITESPACE, ' ')
    .trim();
}

function addWords(segment: string, tokens: Set<string>): void {
  for (const [word] of segment.matchAll(WORDS)) {
    const parts = word.split('/');
    // Only numbers keep their slash: "taiwan/hongkong" is two words, "tg05/tg30" one number.
    if (parts.length === 1 || parts.every((part) => DIGIT.test(part))) tokens.add(word);
    else for (const part of parts) tokens.add(part);
  }
}

function addCjk(run: string, mode: TokenizeMode, tokens: Set<string>): void {
  let previous = '';
  let bigrams = 0;
  for (const char of run) {
    if (previous) {
      tokens.add(previous + char);
      bigrams += 1;
    }
    previous = char;
  }
  // The run's last character starts no bigram; a query only needs it when it is the whole run.
  if (mode === 'index' || bigrams === 0) tokens.add(previous);
}

/**
 * Splits normalized text (see {@link normalizeText}) into unique search terms. Latin and digit
 * text becomes words; CJK runs become overlapping character bigrams, which work without a
 * dictionary in every browser. For one-character queries the index adds each run's last
 * character: every character then starts a bigram or is a unigram, so a prefix search for it
 * finds every doc that contains it (see {@link usesPrefixSearch}). A query only has unigrams
 * where a run is one character long. Mixed text splits at script boundaries: "ぴかちゅうex" →
 * ぴか, かち, ちゅ, ゅう (+ う in the index), ex.
 */
export function tokenize(text: string, mode: TokenizeMode = 'index'): string[] {
  const tokens = new Set<string>();
  // split() with a capturing group alternates: other text at even indexes, CJK runs at odd ones.
  for (const [i, segment] of text.split(CJK_RUNS).entries()) {
    if (!segment) continue;
    if (i % 2 === 1) addCjk(segment, mode, tokens);
    else addWords(segment, tokens);
  }
  return [...tokens];
}

/**
 * Terms to index for a raw field value. Text with umlauts is indexed both folded and expanded,
 * so "Knöspi" is found by "knospi", "knoespi" and "knöspi" alike.
 */
export function indexTerms(text: string): string[] {
  const terms = tokenize(normalizeText(text));
  if (!HAS_UMLAUT.test(text)) return terms;
  return [...new Set([...terms, ...tokenize(normalizeText(text, 'expand'))])];
}

/** Terms to search for a raw query text (umlauts folded, which the index always contains). */
export function queryTerms(text: string): string[] {
  return tokenize(normalizeText(text), 'query');
}

/** True for CJK terms: bigrams and single characters. */
export function isCjkTerm(term: string): boolean {
  return CJK_START.test(term);
}

/**
 * Query terms matched by prefix: words, numbers and single CJK characters (which then find the
 * bigrams they start). CJK bigrams match exactly.
 */
export function usesPrefixSearch(term: string): boolean {
  return !isCjkTerm(term) || SINGLE_CHAR.test(term);
}

/** True for terms made of Latin letters only; only those get typo tolerance. */
export function isLatinWord(term: string): boolean {
  return LATIN_WORD.test(term);
}

/** True for terms with a digit: the only ones an exact card-number match ranks first. */
export function isNumberTerm(term: string): boolean {
  return DIGIT.test(term);
}

/** A printed number in one piece: `025 / 128` → `025/128`, `TG05` → `tg05`. */
function compactNumber(value: string): string {
  // Nearly every printed number is plain ASCII, which needs no Unicode normalization.
  if (PLAIN_NUMBER.test(value)) return value.toLowerCase();
  return normalizeText(value).replace(WHITESPACE, '');
}

function stripZeros(compact: string): string {
  return compact
    .split('/')
    .map((part) => part.replace(LEADING_ZEROS, '$1'))
    .join('/');
}

/** A card number without leading zeros in any part: `025/128` → `25/128`, `TG05` → `tg5`. */
export function canonicalNumber(value: string): string {
  return stripZeros(compactNumber(value));
}

/**
 * Every form a printed card number is found by: as printed, without leading zeros, and its first
 * part alone. `025/128` → 025/128, 25/128, 025, 25; `4/102` → 4/102, 4.
 */
export function numberTerms(printed: string): string[] {
  const full = compactNumber(printed);
  if (!full) return [];
  const head = full.split('/')[0] ?? full;
  return [...new Set([full, stripZeros(full), head, stripZeros(head)].filter(Boolean))];
}
