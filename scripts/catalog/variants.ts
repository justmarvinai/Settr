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
};
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
  gold: { prefix: { de: 'Gold-', en: 'Gold ' }, promo: false },
};
const STAMPS: Record<string, LocalizedText> = {
  'set-logo': { de: 'Set-Logo', en: 'Set Logo' },
  staff: { de: 'Staff', en: 'Staff' },
  'player-rewards-program': { de: 'Play! Pokémon', en: 'Play! Pokémon' },
  'pokemon-center': { de: 'Pokémon Center', en: 'Pokémon Center' },
  gamestop: { de: 'GameStop', en: 'GameStop' },
  'eb-games': { de: 'EB Games', en: 'EB Games' },
  'regional-championships': { de: 'Regionalmeisterschaft', en: 'Regional Championships' },
  'ace-trainer': { de: 'Ace Trainer', en: 'Ace Trainer' },
  '30th-pokeday': { de: 'Pokémon Day (30 Jahre)', en: 'Pokémon Day (30th)' },
  'trick-or-trade': { de: 'Trick or Trade', en: 'Trick or Trade' },
  'ultra-ball-league': { de: 'Liga (Hyperball)', en: 'League (Ultra Ball)' },
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

/** One TCGdex variant as a Settr variant definition. */
export function deriveVariant(raw: RawVariant, where: string): DerivedVariant {
  const type = raw.type ?? 'normal';
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
  if (extras.length || type === 'lenticular') kind = 'stamp';
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
