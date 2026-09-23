import { describe, expect, it } from 'vitest';
import { parseQuery, rarityAbbreviations } from './query';

describe('parseQuery', () => {
  it('keeps plain text as it is, with whitespace collapsed', () => {
    expect(parseQuery('  Pikachu   ex ')).toEqual({ text: 'Pikachu ex', filters: {} });
    expect(parseQuery('')).toEqual({ text: '', filters: {} });
  });

  it('reads set, lang, rarity, number and owned filters next to free text', () => {
    expect(parseQuery('set:30c pikachu lang:ja rarity:sar #025 owned:yes')).toEqual({
      text: 'pikachu',
      filters: {
        set: ['30c'],
        lang: ['ja'],
        rarity: ['special-illustration-rare'],
        number: '025',
        owned: 'yes',
      },
    });
    expect(parseQuery('#4/102').filters.number).toBe('4/102');
    expect(parseQuery('set:intl:30th-c').filters.set).toEqual(['intl:30th-c']);
  });

  it('matches keys and values case-insensitively', () => {
    expect(parseQuery('SET:30C Lang:JA RARITY:SIR').filters).toEqual({
      set: ['30c'],
      lang: ['ja'],
      rarity: ['special-illustration-rare'],
    });
  });

  it('maps rarity abbreviations (tile and Japanese) and full ids to rarity ids', () => {
    expect(parseQuery('rarity:sir').filters.rarity).toEqual(['special-illustration-rare']);
    expect(parseQuery('rarity:ar').filters.rarity).toEqual(['illustration-rare']);
    expect(parseQuery('rarity:double-rare').filters.rarity).toEqual(['double-rare']);
    // PR is the Pikachu rare's and the promos' abbreviation alike.
    expect(parseQuery('rarity:pr').filters.rarity).toEqual(['pikachu-rare', 'promo']);
  });

  it('maps language aliases', () => {
    expect(parseQuery('lang:jp').filters.lang).toEqual(['ja']);
    expect(parseQuery('lang:zh').filters.lang).toEqual(['zh-cn', 'zh-tw']);
    expect(parseQuery('lang:tc').filters.lang).toEqual(['zh-tw']);
  });

  it('adds up repeated keys and comma lists', () => {
    expect(parseQuery('set:30c set:m6a lang:ja,de rarity:sir,ir rarity:ir').filters).toEqual({
      set: ['30c', 'm6a'],
      lang: ['ja', 'de'],
      rarity: ['special-illustration-rare', 'illustration-rare'],
    });
  });

  it('keeps the last number and owned value', () => {
    expect(parseQuery('#025 #026 owned:yes owned:nein').filters).toEqual({
      number: '026',
      owned: 'no',
    });
  });

  it('leaves unknown keys and unusable values in the free text', () => {
    expect(parseQuery('foo:bar pikachu')).toEqual({ text: 'foo:bar pikachu', filters: {} });
    expect(parseQuery('lang:xx rarity:shiny-legendary owned:maybe')).toEqual({
      text: 'lang:xx rarity:shiny-legendary owned:maybe',
      filters: {},
    });
    expect(parseQuery('Type: Null')).toEqual({ text: 'Type: Null', filters: {} });
  });

  it('drops a known key or # without a value while it is being typed', () => {
    expect(parseQuery('pikachu set:')).toEqual({ text: 'pikachu', filters: {} });
    expect(parseQuery('pikachu lang: #')).toEqual({ text: 'pikachu', filters: {} });
  });

  it('understands full-width input from Japanese keyboards', () => {
    expect(parseQuery('ｓｅｔ：ｍ６ａ　＃０２５')).toEqual({
      text: '',
      filters: { set: ['m6a'], number: '025' },
    });
  });
});

describe('rarityAbbreviations', () => {
  it('lists the tile abbreviation first, then Japanese names', () => {
    expect(rarityAbbreviations('special-illustration-rare')).toEqual(['SIR', 'SAR']);
    expect(rarityAbbreviations('common')).toEqual(['C']);
    expect(rarityAbbreviations('not-a-rarity')).toEqual([]);
  });
});
