import type { RarityId } from '@/domain/catalog';

/**
 * The foil the holo viewer lays over a card (DSN-01, DESIGN_SYSTEM.md §7, signature moment 2).
 * Pure TypeScript, so the card page can pick the style without loading the viewer; each style's
 * look lives in holo.css, which ships with the lazy HoloCard chunk.
 */
export const FOIL_STYLES = [
  'none',
  'holo',
  'rainbow',
  'etched',
  'fireworks',
  'metallic',
  'gold',
  'spectral',
  'classic',
] as const;
export type FoilStyle = (typeof FOIL_STYLES)[number];

/** Every rarity needs a decision here: a new id in the vocabulary fails the type check. */
const FOIL_BY_RARITY: Record<RarityId, FoilStyle> = {
  common: 'none',
  uncommon: 'none',
  rare: 'holo',
  'holo-rare': 'holo',
  promo: 'holo',
  'double-rare': 'rainbow',
  'ultra-rare': 'rainbow',
  'ace-spec-rare': 'rainbow',
  'shiny-rare': 'rainbow',
  'shiny-ultra-rare': 'rainbow',
  'shiny-rare-v': 'rainbow',
  'shiny-rare-vmax': 'rainbow',
  'holo-rare-v': 'rainbow',
  'holo-rare-vmax': 'rainbow',
  'holo-rare-vstar': 'rainbow',
  'secret-rare': 'rainbow',
  'radiant-rare': 'etched',
  'amazing-rare': 'spectral',
  'black-white-rare': 'metallic',
  'illustration-rare': 'etched',
  'mega-attack-rare': 'etched',
  'special-illustration-rare': 'etched',
  'pikachu-rare': 'fireworks',
  'futuristic-rare': 'metallic',
  'hyper-rare': 'gold',
  'mega-hyper-rare': 'gold',
  'rgb-rare': 'spectral',
  'classic-collection': 'classic',
};

function isRarityId(value: string): value is RarityId {
  return Object.hasOwn(FOIL_BY_RARITY, value);
}

/** The foil for a catalog rarity id. Unknown ids (a newer catalog) and no rarity get none. */
export function foilOf(rarity: string | undefined): FoilStyle {
  return rarity !== undefined && isRarityId(rarity) ? FOIL_BY_RARITY[rarity] : 'none';
}
