import { describe, expect, it } from 'vitest';
import {
  canonicalNumber,
  indexTerms,
  isCjkTerm,
  isLatinWord,
  isNumberTerm,
  normalizeText,
  numberTerms,
  queryTerms,
  tokenize,
  usesPrefixSearch,
} from './normalize';

describe('normalizeText', () => {
  it('applies NFKC: full-width Latin and digits become ASCII, half-width kana full-width', () => {
    expect(normalizeText('ＰＩＫＡＣＨＵ ０２５／１２８')).toBe('pikachu 025/128');
    expect(normalizeText('ﾋﾟｶﾁｭｳ')).toBe('ぴかちゅう');
    expect(normalizeText(`Pikachu${String.fromCodePoint(0x3000)}ex`)).toBe('pikachu ex');
  });

  it('folds diacritics and letters without a decomposition', () => {
    expect(normalizeText('Pokémon Flabébé')).toBe('pokemon flabebe');
    expect(normalizeText('Straße')).toBe('strasse');
    expect(normalizeText('İstanbul Œuvre Ørn')).toBe('istanbul oeuvre orn');
  });

  it('folds umlauts to the plain vowel, or expands them to vowel + e', () => {
    expect(normalizeText('Knöspi')).toBe('knospi');
    expect(normalizeText('Knöspi'.normalize('NFD'))).toBe('knospi');
    expect(normalizeText('Knöspi', 'expand')).toBe('knoespi');
    expect(normalizeText('Knöspi'.normalize('NFD'), 'expand')).toBe('knoespi');
    expect(normalizeText('ÜBER Äpfel', 'expand')).toBe('ueber aepfel');
  });

  it('folds katakana to hiragana', () => {
    expect(normalizeText('ピカチュウ')).toBe('ぴかちゅう');
    expect(normalizeText('ぴかちゅう')).toBe('ぴかちゅう');
    expect(normalizeText('リザードン')).toBe('りざーどん');
    expect(normalizeText('噴火龍')).toBe('噴火龍');
  });

  it('turns hyphens into spaces, so "-ex" and " ex" are the same', () => {
    expect(normalizeText('Pikachu-ex')).toBe('pikachu ex');
    expect(normalizeText('Pikachu ex')).toBe('pikachu ex');
    expect(normalizeText('Pikachu-EX')).toBe('pikachu ex');
    expect(normalizeText('Hisui-Zorua')).toBe('hisui zorua');
    expect(normalizeText('Vol. 1–3')).toBe('vol. 1 3');
    // An "ex" inside a word stays.
    expect(normalizeText('Zurrokex')).toBe('zurrokex');
  });

  it('drops apostrophes and collapses whitespace', () => {
    expect(normalizeText("  Erika's   Jigglypuff ")).toBe('erikas jigglypuff');
    expect(normalizeText('Erika’s')).toBe('erikas');
  });

  it('is idempotent', () => {
    for (const text of [
      'Knöspi',
      'ﾋﾟｶﾁｭｳex',
      'M Guardevoir-EX',
      'Straße 025/128',
      '基本【惡】能量',
    ]) {
      const once = normalizeText(text);
      expect(normalizeText(once)).toBe(once);
    }
  });
});

describe('tokenize', () => {
  it('splits Latin text into words and keeps printed numbers whole', () => {
    expect(tokenize(normalizeText('Pikachu & Zekrom GX 025/128'))).toEqual([
      'pikachu',
      'zekrom',
      'gx',
      '025/128',
    ]);
    expect(tokenize(normalizeText('Booster (Taiwan/Hongkong) TG05/TG30'))).toEqual([
      'booster',
      'taiwan',
      'hongkong',
      'tg05/tg30',
    ]);
  });

  it('turns CJK runs into bigrams; the index adds each run’s last character', () => {
    expect(tokenize('ぴかちゅう')).toEqual(['ぴか', 'かち', 'ちゅ', 'ゅう', 'う']);
    expect(tokenize('ぴかちゅう', 'query')).toEqual(['ぴか', 'かち', 'ちゅ', 'ゅう']);
    expect(tokenize('皮卡丘')).toEqual(['皮卡', '卡丘', '丘']);
    expect(tokenize('喵', 'query')).toEqual(['喵']);
    expect(tokenize('喵喵')).toEqual(['喵喵', '喵']);
  });

  it('splits mixed scripts at script boundaries', () => {
    expect(tokenize(normalizeText('ピカチュウex'), 'query')).toEqual([
      'ぴか',
      'かち',
      'ちゅ',
      'ゅう',
      'ex',
    ]);
    expect(tokenize(normalizeText('M沙奈朵EX'), 'query')).toEqual(['m', '沙奈', '奈朵', 'ex']);
    expect(tokenize(normalizeText('30周年庆典'))).toEqual(['30', '周年', '年庆', '庆典', '典']);
    // The katakana middle dot separates words; the prolonged sound mark belongs to them.
    expect(tokenize(normalizeText('エーフィ・ブラッキー'), 'query')).toEqual([
      'えー',
      'ーふ',
      'ふぃ',
      'ぶら',
      'らっ',
      'っき',
      'きー',
    ]);
  });

  it('lets a single CJK character find every doc containing it by prefix search', () => {
    const indexed = tokenize('ぴかちゅう');
    for (const char of 'ぴかちゅう')
      expect(indexed.some((term) => term.startsWith(char))).toBe(true);
    expect(usesPrefixSearch('ぴ')).toBe(true);
    expect(usesPrefixSearch('ぴか')).toBe(false);
    expect(usesPrefixSearch('pika')).toBe(true);
    expect(usesPrefixSearch('025')).toBe(true);
  });

  it('classifies terms', () => {
    expect(isCjkTerm('ぴか')).toBe(true);
    expect(isCjkTerm('pikachu')).toBe(false);
    expect(isLatinWord('glurak')).toBe(true);
    expect(isLatinWord('30th')).toBe(false);
    expect(isNumberTerm('025/128')).toBe(true);
    expect(isNumberTerm('pikachu')).toBe(false);
  });
});

describe('indexTerms and queryTerms', () => {
  it('index umlauts both folded and expanded, so every spelling finds the name', () => {
    const indexed = indexTerms('Knöspi');
    expect(indexed).toEqual(['knospi', 'knoespi']);
    for (const query of ['knospi', 'knoespi', 'knöspi', 'KNÖSPI', 'Knöspi'.normalize('NFD')]) {
      expect(indexed).toEqual(expect.arrayContaining(queryTerms(query)));
    }
    expect(indexTerms('Münzset 30th')).toEqual(['munzset', '30th', 'muenzset']);
  });

  it('match katakana queries against hiragana and vice versa', () => {
    expect(queryTerms('ピカチュウ')).toEqual(queryTerms('ぴかちゅう'));
    expect(indexTerms('ピカチュウ')).toEqual(expect.arrayContaining(queryTerms('ぴかちゅう')));
  });
});

describe('card numbers', () => {
  it('lists every form a printed number is found by', () => {
    expect(numberTerms('025/128')).toEqual(['025/128', '25/128', '025', '25']);
    expect(numberTerms('4/102')).toEqual(['4/102', '4']);
    expect(numberTerms('009')).toEqual(['009', '9']);
    expect(numberTerms('TG05/TG30')).toEqual(['tg05/tg30', 'tg5/tg30', 'tg05', 'tg5']);
    expect(numberTerms('B')).toEqual(['b']);
    expect(numberTerms('')).toEqual([]);
    expect(numberTerms('０２５／１２８')).toEqual(numberTerms('025/128'));
  });

  it('drops leading zeros for comparisons', () => {
    expect(canonicalNumber('025')).toBe('25');
    expect(canonicalNumber('004/128')).toBe('4/128');
    expect(canonicalNumber('000')).toBe('0');
    expect(canonicalNumber('TG05')).toBe('tg5');
  });
});
