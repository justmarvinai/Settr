import { describe, expect, it } from 'vitest';
import type { CatalogCard } from '@/domain/catalog';
import { pickLanguage, visibleLanguages, cardName, otherNames } from '@/domain/catalog';

const card: Pick<CatalogCard, 'name' | 'nameSource' | 'languages'> = {
  name: {
    ja: 'ピカチュウex',
    'zh-tw': '皮卡丘ex',
    'zh-cn': '皮卡丘ex',
    de: 'Pikachu-ex',
    en: 'Pikachu ex',
  },
  nameSource: { 'zh-cn': 'derived-script', de: 'derived-crossprint', en: 'derived-crossprint' },
  languages: ['ja', 'zh-cn', 'zh-tw'],
};

describe('card names (I18N.md §1)', () => {
  it('shows German in the catalog by default, marked when translated', () => {
    expect(cardName(card, 'ja', 'german')).toEqual({
      text: 'Pikachu-ex',
      lang: 'de',
      translated: true,
    });
  });

  it('shows the printed name in card mode', () => {
    expect(cardName(card, 'ja', 'card')).toEqual({
      text: 'ピカチュウex',
      lang: 'ja',
      translated: false,
    });
    expect(cardName(card, 'zh-cn', 'card').translated).toBe(true);
    expect(cardName(card, 'zh-tw', 'card').translated).toBe(false);
  });

  it('lists each other name once', () => {
    expect(otherNames(card, 'zh-cn').map((n) => n.text)).toEqual(['Pikachu-ex', 'ピカチュウex']);
  });
});

describe('starting language of a catalog page', () => {
  const settings = { defaultCardLanguage: 'de' as const, cardLanguages: ['de', 'ja'] as const };

  it('prefers the URL, then the default language, then the user’s languages', () => {
    expect(pickLanguage('en', ['de', 'en'], { ...settings, cardLanguages: ['de', 'ja'] })).toBe(
      'en',
    );
    expect(
      pickLanguage(undefined, ['de', 'en'], { ...settings, cardLanguages: ['de', 'ja'] }),
    ).toBe('de');
    expect(
      pickLanguage(undefined, ['ja', 'zh-cn'], { ...settings, cardLanguages: ['de', 'ja'] }),
    ).toBe('ja');
    expect(pickLanguage('fr', ['ja', 'zh-cn'], { ...settings, cardLanguages: ['de'] })).toBe('ja');
  });

  it('keeps every language when the user collects none of the set’s', () => {
    expect(visibleLanguages(['ja', 'zh-cn'], { cardLanguages: ['de'] })).toEqual(['ja', 'zh-cn']);
    expect(visibleLanguages(['ja', 'zh-cn'], { cardLanguages: ['zh-cn'] })).toEqual(['zh-cn']);
  });
});
