import type { CardLanguage } from '../../src/domain/catalog-types';
import type { LocalizedText, VariantDef } from '../../src/domain/catalog/schema';
import type { VariantKind } from '../../src/domain/catalog/vocab';
import type { RawVariant } from './tcgdex';

/**
 * TCGdex's detailed variants (`type` + `foil` + `stamp[]` + `size`) → Settr variants
 * (DATA_MODEL.md §2–§3). Ids read like the physical card: `normal`, `holo`, `reverse`, a foil
 * pattern (`reverse-pokeball`), a special finish (`holo-cosmos`), stamps and sizes appended
 * (`holo+set-logo+staff`, `lenticular+jumbo`). Unknown values stop the build (curate them here).
 *
 * Kinds decide what Master completion counts: `finish` and `pattern` are part of the set;
 * `stamp` covers every promotional print (stamps, Cosmos and league holos, jumbo cards), which
 * collectors keep outside the master set.
 */

const TYPES: Record<string, LocalizedText> = {
  normal: { de: 'Normal', en: 'Normal' },
  holo: { de: 'Holo', en: 'Holo' },
  reverse: { de: 'Reverse-Holo', en: 'Reverse Holo' },
  lenticular: { de: 'Lentikular', en: 'Lenticular' },
  metal: { de: 'Metallkarte', en: 'Metal Card' },
};
/** Card types that only come in promotional products (the 151 Ultra-Premium-Kollektion's metal Mew). */
const PROMO_TYPES = new Set(['lenticular', 'metal']);
/** Reverse-holo patterns (Erhabene Helden, MEGA Dream ex): each is a product of its own. */
const PATTERNS: Record<string, LocalizedText> = {
  pokeball: { de: 'Pokéball', en: 'Poké Ball' },
  masterball: { de: 'Meisterball', en: 'Master Ball' },
  loveball: { de: 'Sympaball', en: 'Love Ball' },
  quickball: { de: 'Flottball', en: 'Quick Ball' },
  duskball: { de: 'Finsterball', en: 'Dusk Ball' },
  friendball: { de: 'Freundesball', en: 'Friend Ball' },
  energy: { de: 'Energie', en: 'Energy' },
  'team-rocket': { de: 'Team Rocket', en: 'Team Rocket' },
};
/** Special finishes, named before the base ("Cosmos-Holo", "Liga-Reverse-Holo"); `promo` ones only come in promotional products. */
const FINISHES: Record<string, { prefix: LocalizedText; promo: boolean }> = {
  cosmos: { prefix: { de: 'Cosmos-', en: 'Cosmos ' }, promo: true },
  league: { prefix: { de: 'Liga-', en: 'League ' }, promo: true },
  tinsel: { prefix: { de: 'Tinsel-', en: 'Tinsel ' }, promo: true },
  galaxy: { prefix: { de: 'Galaxy-', en: 'Galaxy ' }, promo: true },
  'cracked-ice': { prefix: { de: 'Cracked-Ice-', en: 'Cracked Ice ' }, promo: true },
  gold: { prefix: { de: 'Gold-', en: 'Gold ' }, promo: false },
  // The Secret Rares of the Sword & Shield sets (Rainbow Rares).
  rainbow: { prefix: { de: 'Rainbow-', en: 'Rainbow ' }, promo: false },
};
const STAMPS: Record<string, LocalizedText> = {
  'set-logo': { de: 'Set-Logo', en: 'Set Logo' },
  staff: { de: 'Staff', en: 'Staff' },
  'player-rewards-program': { de: 'Play! Pokémon', en: 'Play! Pokémon' },
  'professor-program': { de: 'Professor-Programm', en: 'Professor Program' },
  'pokemon-center': { de: 'Pokémon Center', en: 'Pokémon Center' },
  gamestop: { de: 'GameStop', en: 'GameStop' },
  'eb-games': { de: 'EB Games', en: 'EB Games' },
  'regional-championships': { de: 'Regionalmeisterschaft', en: 'Regional Championships' },
  'gym-challenge': { de: 'Gym Challenge', en: 'Gym Challenge' },
  'ace-trainer': { de: 'Ace Trainer', en: 'Ace Trainer' },
  '25th-celebration': { de: '25 Jahre', en: '25th Celebration' },
  '30th-pokeday': { de: 'Pokémon Day (30 Jahre)', en: 'Pokémon Day (30th)' },
  'pokemon-day': { de: 'Pokémon Day', en: 'Pokémon Day' },
  'pokemon-together': { de: 'Pokémon Together', en: 'Pokémon Together' },
  horizons: { de: 'Pokémon Horizonte', en: 'Pokémon Horizons' },
  snowflake: { de: 'Schneeflocke', en: 'Snowflake' },
  'fossil-museum': { de: 'Fossilienmuseum', en: 'Fossil Museum' },
  'trick-or-trade': { de: 'Trick or Trade', en: 'Trick or Trade' },
  'poke-ball-league': { de: 'Liga (Pokéball)', en: 'League (Poké Ball)' },
  'great-ball-league': { de: 'Liga (Superball)', en: 'League (Great Ball)' },
  'ultra-ball-league': { de: 'Liga (Hyperball)', en: 'League (Ultra Ball)' },
  'illustration-contest-2022': {
    de: 'Illustrationswettbewerb 2022',
    en: 'Illustration Contest 2022',
  },
  'illustration-contest-2024': {
    de: 'Illustrationswettbewerb 2024',
    en: 'Illustration Contest 2024',
  },
  'asia-2023-24': { de: 'Asia 2023–24', en: 'Asia 2023–24' },
  'worlds-2022': { de: 'WM 2022', en: 'Worlds 2022' },
  'worlds-2023': { de: 'WM 2023', en: 'Worlds 2023' },
  'worlds-2024': { de: 'WM 2024', en: 'Worlds 2024' },
  'worlds-2025': { de: 'WM 2025', en: 'Worlds 2025' },
  'top-thirty-two': { de: 'Top 32', en: 'Top 32' },
  'top-sixteen': { de: 'Top 16', en: 'Top 16' },
  'top-eight': { de: 'Top 8', en: 'Top 8' },
  'quarter-finalist': { de: 'Viertelfinale', en: 'Quarter-Finalist' },
  'semi-finalist': { de: 'Halbfinale', en: 'Semi-Finalist' },
  finalist: { de: 'Finale', en: 'Finalist' },
  champion: { de: 'Champion', en: 'Champion' },
  winner: { de: 'Sieger', en: 'Winner' },
  // World Championship decks carry their player's name.
  'gabriel-fernandez': { de: 'Gabriel Fernández', en: 'Gabriel Fernández' },
  'jose-cruz-galindo-resendiz': {
    de: 'José Cruz Galindo Reséndiz',
    en: 'José Cruz Galindo Reséndiz',
  },
  'liao-fu-guan': { de: 'Liao Fu Guan', en: 'Liao Fu Guan' },
  'shao-tong-yen': { de: 'Shao Tong Yen', en: 'Shao Tong Yen' },
  pikachu: { de: 'Pikachu-Stempel', en: 'Pikachu Stamp' },
  'poketour-99': { de: 'PokéTour ’99', en: 'PokéTour ’99' },
};
const SIZES: Record<string, LocalizedText> = { jumbo: { de: 'Jumbo', en: 'Jumbo' } };

function known<T>(table: Record<string, T>, value: string, what: string, where: string): T {
  if (!(value in table))
    throw new Error(
      `${where}: unknown variant ${what} "${value}". Add it to scripts/catalog/variants.ts.`,
    );
  return table[value] as T;
}

const join = (parts: LocalizedText[]): LocalizedText => ({
  de: parts.map((p) => p.de).join(' · '),
  en: parts.map((p) => p.en).join(' · '),
});

export interface DerivedVariant extends VariantDef {
  /** Order within a card: finishes, then patterns, then promotional prints. */
  rank: number;
}

const FINISH_ORDER = ['normal', 'holo', 'reverse'];

/**
 * A non-holo print of a card the booster packs only carry as a holo (a Rare): TCGplayer's "Deck
 * Exclusives", from the Build & Battle Boxes. Promotional, so outside the master set.
 */
const DECK_PRINT: DerivedVariant = {
  id: 'normal+deck',
  kind: 'stamp',
  label: { de: 'Nicht-Holo (Deck)', en: 'Non-Holo (Deck)' },
  rank: 100,
};

/**
 * The other way round: a holo print of a card the booster packs carry as a non-holo (a Common,
 * or a Rare before Scarlet & Violet), from a blister or a collection box. Outside the master set.
 */
const PROMO_HOLO: DerivedVariant = {
  id: 'holo+promo',
  kind: 'stamp',
  label: { de: 'Holo (Promo)', en: 'Holo (Promo)' },
  rank: 101,
};

/** Neither a foil pattern nor a stamp or special size. */
export const isPlainVariant = (raw: RawVariant) => !raw.foil && !raw.stamp?.length && !raw.size;

export interface DeriveOptions {
  /** The card's plain non-holo is a deck exclusive (see DECK_PRINT). */
  deckPrint?: boolean;
  /** The card's plain holo is a promotional print (see PROMO_HOLO). */
  promoHolo?: boolean;
  /**
   * The card ships with another set (an extra, e.g. the basic Energy of Karmesin & Purpur): its
   * pattern prints came later with other products, so they count as promotional here.
   */
  extra?: boolean;
}

/**
 * One TCGdex variant as a Settr variant definition. `subtype` (the Base Set's print runs) is left
 * to the set's configuration (`printRun`, build.ts) and not part of the id.
 */
export function deriveVariant(
  raw: RawVariant,
  where: string,
  options: DeriveOptions = {},
): DerivedVariant {
  const type = raw.type ?? 'normal';
  if (options.deckPrint && type === 'normal' && isPlainVariant(raw)) return { ...DECK_PRINT };
  if (options.promoHolo && type === 'holo' && isPlainVariant(raw)) return { ...PROMO_HOLO };
  const base = known(TYPES, type, 'type', where);
  let id = type;
  let label: LocalizedText = base;
  let kind: VariantKind = 'finish';
  let rank = FINISH_ORDER.includes(type) ? FINISH_ORDER.indexOf(type) : FINISH_ORDER.length;

  if (raw.foil) {
    id = `${type}-${raw.foil}`;
    if (type === 'reverse' && raw.foil in PATTERNS) {
      label = {
        de: `${base.de} ${PATTERNS[raw.foil]?.de}`,
        en: `${PATTERNS[raw.foil]?.en} ${base.en}`,
      };
      kind = 'pattern';
      rank = 10 + Object.keys(PATTERNS).indexOf(raw.foil);
    } else {
      const finish = known(FINISHES, raw.foil, 'foil', where);
      label = { de: `${finish.prefix.de}${base.de}`, en: `${finish.prefix.en}${base.en}` };
      if (finish.promo) kind = 'stamp';
      rank = 5;
    }
  }
  const extras: LocalizedText[] = [];
  for (const stamp of raw.stamp ?? []) {
    extras.push(known(STAMPS, stamp, 'stamp', where));
    id += `+${stamp}`;
  }
  if (raw.size) {
    extras.push(known(SIZES, raw.size, 'size', where));
    id += `+${raw.size}`;
  }
  if (extras.length || PROMO_TYPES.has(type) || (options.extra && kind === 'pattern'))
    kind = 'stamp';
  if (kind === 'stamp') rank = 100 + rank;
  return { id, kind, label: extras.length ? join([label, ...extras]) : label, rank };
}

/** Restricts a variant to the card languages TCGdex lists for it (none listed = all). */
export function variantLanguages(
  raw: RawVariant,
  cardLanguages: readonly CardLanguage[],
): CardLanguage[] | undefined {
  if (!raw.languages?.length) return undefined;
  return cardLanguages.filter((lang) => raw.languages?.includes(lang));
}
