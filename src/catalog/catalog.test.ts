import { describe, expect, it } from 'vitest';
import type { CatalogCard } from '@/domain/catalog';
import { cardmarketProductId, cardmarketSearchUrl, cardmarketUrl } from './cardmarket';
import { imageCrossOrigin, imageSrc, setArtSrc } from './images';

const intl: Pick<CatalogCard, 'variants'> = {
  variants: [{ id: 'std', refs: { cardmarket: { default: 907757 } } }],
};
const asia: Pick<CatalogCard, 'variants'> = {
  variants: [{ id: 'std', refs: { cardmarket: { byLanguage: { ja: 907789, 'zh-cn': 908203 } } } }],
};

describe('Cardmarket links (PRC-06)', () => {
  it('uses the international product for every language of the print', () => {
    expect(cardmarketProductId(intl, 'std', 'de')).toBe(907757);
    expect(cardmarketProductId(intl, 'std', 'en')).toBe(907757);
  });

  it('keeps Japanese and Simplified Chinese products apart; Traditional Chinese uses the JP one', () => {
    expect(cardmarketProductId(asia, 'std', 'ja')).toBe(907789);
    expect(cardmarketProductId(asia, 'std', 'zh-cn')).toBe(908203);
    expect(cardmarketProductId(asia, 'std', 'zh-tw')).toBe(907789);
    expect(cardmarketProductId(asia, 'other-variant', 'ja')).toBeUndefined();
  });

  it('builds the verified link: language, German sellers, Near Mint or better', () => {
    expect(cardmarketUrl(907757, { language: 'de' })).toBe(
      'https://www.cardmarket.com/de/Pokemon/Products?idProduct=907757&language=3&sellerCountry=7&minCondition=2',
    );
    const tc = new URL(cardmarketUrl(907789, { language: 'zh-tw', minCondition: 'EX' }));
    expect(tc.searchParams.get('language')).toBe('11');
    expect(tc.searchParams.get('minCondition')).toBe('3');
    expect(new URL(cardmarketUrl(1)).searchParams.has('language')).toBe(false);
  });

  it('falls back to a search', () => {
    expect(cardmarketSearchUrl('Pikachu ex 150/128')).toBe(
      'https://www.cardmarket.com/de/Pokemon/Products/Search?searchString=Pikachu+ex+150%2F128',
    );
  });
});

describe('picture URLs (ARCHITECTURE.md §8.3)', () => {
  it('asks TCGdex for WebP in two sizes, loaded in CORS mode', () => {
    const image = { url: 'https://assets.tcgdex.net/de/me/30th/150', lang: 'de' } as const;
    expect(imageSrc(image, 'small')).toBe('https://assets.tcgdex.net/de/me/30th/150/low.webp');
    expect(imageSrc(image, 'large')).toBe('https://assets.tcgdex.net/de/me/30th/150/high.webp');
    expect(imageCrossOrigin(imageSrc(image, 'small'))).toBe('anonymous');
  });

  it('routes TCGplayer pictures through the same-origin proxy', () => {
    const image = {
      url: 'https://tcgplayer-cdn.tcgplayer.com/product/704143',
      lang: 'en',
    } as const;
    expect(imageSrc(image, 'small')).toBe('/img/tcgp/product/704143_400w.jpg');
    expect(imageSrc(image, 'large')).toBe('/img/tcgp/product/704143_in_1000x1000.jpg');
    expect(imageCrossOrigin(imageSrc(image, 'small'))).toBeUndefined();
  });

  it('adds the extension to set logos and symbols', () => {
    expect(setArtSrc('https://assets.tcgdex.net/univ/me/30th/symbol')).toBe(
      'https://assets.tcgdex.net/univ/me/30th/symbol.webp',
    );
  });
});
