/**
 * Controlled vocabularies of the catalog (DATA_MODEL.md §4.1). The pipeline maps upstream values
 * (TCGdex English terms) onto these ids and rejects anything unknown; the app tolerates unknown ids
 * (an older app can meet a newer catalog) and shows them as they are.
 */

/** Card sections in display order. `subset` = e.g. the Classic Collection, `energy` = set energies. */
export const CARD_SECTIONS = ['main', 'secret', 'subset', 'energy', 'promo'] as const;
export type CardSection = (typeof CARD_SECTIONS)[number];

export const CARD_CATEGORIES = ['pokemon', 'trainer', 'energy'] as const;
export type CardCategory = (typeof CARD_CATEGORIES)[number];

export const RARITY_IDS = [
  'common',
  'uncommon',
  'rare',
  'double-rare',
  'ultra-rare',
  'illustration-rare',
  'mega-attack-rare',
  'special-illustration-rare',
  'hyper-rare',
  'mega-hyper-rare',
  'pikachu-rare',
  'futuristic-rare',
  'rgb-rare',
  'classic-collection',
  'ace-spec-rare',
  'shiny-rare',
  'promo',
] as const;
export type RarityId = (typeof RARITY_IDS)[number];

/** Abbreviation shown on tiles. */
export const RARITY_ABBR: Record<RarityId, string> = {
  common: 'C',
  uncommon: 'U',
  rare: 'R',
  'double-rare': 'RR',
  'ultra-rare': 'UR',
  'illustration-rare': 'IR',
  'mega-attack-rare': 'MAR',
  'special-illustration-rare': 'SIR',
  'hyper-rare': 'HR',
  'mega-hyper-rare': 'MHR',
  'pikachu-rare': 'PR',
  'futuristic-rare': 'FUR',
  'rgb-rare': 'RGB',
  'classic-collection': 'CC',
  'ace-spec-rare': 'ACE',
  'shiny-rare': 'S',
  promo: 'PR',
};

export const ENERGY_TYPES = [
  'grass',
  'fire',
  'water',
  'lightning',
  'psychic',
  'fighting',
  'darkness',
  'metal',
  'dragon',
  'fairy',
  'colorless',
] as const;
export type EnergyType = (typeof ENERGY_TYPES)[number];

export const STAGES = [
  'basic',
  'stage1',
  'stage2',
  'mega',
  'break',
  'vmax',
  'vstar',
  'legend',
  'level-up',
  'restored',
  'baby',
  'v-union',
] as const;
export type StageId = (typeof STAGES)[number];

export const TRAINER_TYPES = [
  'item',
  'supporter',
  'stadium',
  'tool',
  'ace-spec',
  'technical-machine',
] as const;
export type TrainerType = (typeof TRAINER_TYPES)[number];

export const ENERGY_KINDS = ['basic', 'special'] as const;
export type EnergyKind = (typeof ENERGY_KINDS)[number];

/** Where a name comes from. Everything but `official` is shown as "übersetzt" (DATA_MODEL.md §4.1). */
export const NAME_SOURCES = [
  'official',
  'curated',
  'derived-pokeapi',
  'derived-crossprint',
  'derived-script',
] as const;
export type NameSource = (typeof NAME_SOURCES)[number];

export const VARIANT_KINDS = ['finish', 'pattern', 'stamp', 'edition'] as const;
export type VariantKind = (typeof VARIANT_KINDS)[number];

/** The single variant of cards that exist in exactly one physical version (all of 30 Jahre). */
export const STANDARD_VARIANT = 'std';

export const PRODUCT_TYPES = [
  'booster-pack',
  'sleeved-booster',
  'booster-display',
  'half-display',
  'etb',
  'pc-etb',
  'booster-bundle',
  'blister-1',
  'blister-2',
  'blister-3',
  'checklane-blister',
  'collection',
  'premium-collection',
  'ultra-premium-collection',
  'special-collection',
  'figure-collection',
  'tin',
  'mini-tin',
  'build-and-battle',
  'deck',
  'binder-collection',
  'poster-collection',
  'sticker-collection',
  'ex-box',
  'jp-box',
  'jp-special-set',
  'card-set',
  'coin-set',
  'other',
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_EXCLUSIVES = ['pokemon-center', 'retailer', 'event', 'lottery'] as const;
export type ProductExclusive = (typeof PRODUCT_EXCLUSIVES)[number];
