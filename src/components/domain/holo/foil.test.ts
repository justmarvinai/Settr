import { describe, expect, it } from 'vitest';
import { RARITY_IDS } from '@/domain/catalog';
import { FOIL_STYLES, foilOf } from './foil';

describe('foilOf', () => {
  it('maps every rarity of the vocabulary', () => {
    const mapped = Object.fromEntries(RARITY_IDS.map((rarity) => [rarity, foilOf(rarity)]));
    expect(mapped).toEqual({
      common: 'none',
      uncommon: 'none',
      rare: 'holo',
      'double-rare': 'rainbow',
      'ultra-rare': 'rainbow',
      'illustration-rare': 'etched',
      'special-illustration-rare': 'etched',
      'hyper-rare': 'gold',
      'pikachu-rare': 'fireworks',
      'futuristic-rare': 'metallic',
      'rgb-rare': 'spectral',
      'classic-collection': 'classic',
      'ace-spec-rare': 'rainbow',
      'shiny-rare': 'rainbow',
      promo: 'holo',
    });
  });

  it('gives no foil without a rarity or for one it does not know', () => {
    expect(foilOf(undefined)).toBe('none');
    expect(foilOf('')).toBe('none');
    expect(foilOf('mega-hyper-rare')).toBe('none');
    // Object.prototype keys are not rarities
    expect(foilOf('constructor')).toBe('none');
    expect(foilOf('toString')).toBe('none');
  });

  it('only returns known styles', () => {
    for (const rarity of RARITY_IDS) expect(FOIL_STYLES).toContain(foilOf(rarity));
  });
});
