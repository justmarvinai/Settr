import type {
  CardCategory,
  EnergyKind,
  EnergyType,
  RarityId,
  StageId,
  TrainerType,
} from '../../src/domain/catalog/vocab';

/** TCGdex English values → Settr vocabulary ids. Unknown values stop the build (curate them). */
const RARITY: Record<string, RarityId | null> = {
  None: null,
  Common: 'common',
  Uncommon: 'uncommon',
  Rare: 'rare',
  'Double rare': 'double-rare',
  'Ultra Rare': 'ultra-rare',
  'Illustration rare': 'illustration-rare',
  'Special illustration rare': 'special-illustration-rare',
  'Hyper rare': 'hyper-rare',
  'Pikachu Rare': 'pikachu-rare',
  'Futuristic Rare': 'futuristic-rare',
  'RGB Rare': 'rgb-rare',
  'Classic Collection': 'classic-collection',
  'ACE SPEC Rare': 'ace-spec-rare',
  'Shiny rare': 'shiny-rare',
  Promo: 'promo',
};
const TYPES: Record<string, EnergyType> = {
  Grass: 'grass',
  Fire: 'fire',
  Water: 'water',
  Lightning: 'lightning',
  Psychic: 'psychic',
  Fighting: 'fighting',
  Darkness: 'darkness',
  Metal: 'metal',
  Dragon: 'dragon',
  Fairy: 'fairy',
  Colorless: 'colorless',
};
const STAGE: Record<string, StageId> = {
  Basic: 'basic',
  Stage1: 'stage1',
  Stage2: 'stage2',
  MEGA: 'mega',
  BREAK: 'break',
  VMAX: 'vmax',
  VSTAR: 'vstar',
  LEGEND: 'legend',
  'LEVEL-UP': 'level-up',
  RESTORED: 'restored',
  Baby: 'baby',
  'V-UNION': 'v-union',
};
const TRAINER: Record<string, TrainerType> = {
  Item: 'item',
  Supporter: 'supporter',
  Stadium: 'stadium',
  Tool: 'tool',
  'Ace Spec': 'ace-spec',
  'Technical Machine': 'technical-machine',
};
const ENERGY_KIND: Record<string, EnergyKind> = { Normal: 'basic', Special: 'special' };

function lookup<T>(table: Record<string, T>, value: string, what: string, where: string): T {
  if (!(value in table))
    throw new Error(
      `${where}: unknown ${what} "${value}". Add it to scripts/catalog/vocab-map.ts.`,
    );
  return table[value] as T;
}

export const mapRarity = (v: string | undefined, where: string) =>
  v === undefined ? null : lookup(RARITY, v, 'rarity', where);
export const mapTypes = (v: string[] | undefined, where: string) =>
  v?.map((t) => lookup(TYPES, t, 'type', where));
export const mapStage = (v: string | undefined, where: string) =>
  v === undefined ? undefined : lookup(STAGE, v, 'stage', where);
export const mapTrainerType = (v: string | undefined, where: string) =>
  v === undefined ? undefined : lookup(TRAINER, v, 'trainer type', where);
export const mapEnergyKind = (v: string | undefined, where: string) =>
  v === undefined ? undefined : lookup(ENERGY_KIND, v, 'energy type', where);
const CATEGORY: Record<'Pokemon' | 'Trainer' | 'Energy', CardCategory> = {
  Pokemon: 'pokemon',
  Trainer: 'trainer',
  Energy: 'energy',
};
export const mapCategory = (v: 'Pokemon' | 'Trainer' | 'Energy'): CardCategory => CATEGORY[v];

/** Energy type order used for sorting energies within a set. */
export const ENERGY_ORDER: readonly EnergyType[] = [
  'grass',
  'fire',
  'water',
  'lightning',
  'psychic',
  'fighting',
  'darkness',
  'metal',
];
