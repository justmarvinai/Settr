import type { CardLanguage } from '../../src/domain/catalog-types';
import type {
  CatalogCard,
  CatalogSetSummary,
  LocalizedText,
} from '../../src/domain/catalog/schema';
import { STANDARD_VARIANT, type NameSource } from '../../src/domain/catalog/vocab';
import {
  CATALOG_SETS,
  JAPANESE_ENERGY_CODES,
  JAPANESE_RARITY_MARKS,
  type ExtraCards,
  type SetConfig,
} from './config';
import type { CardOverlay } from './curated';
import { matchCounterparts } from './crossprint';
import { deriveFromSpecies, simplify, type SpeciesNames } from './names';
import { loadTcgdexSet, type RawCard, type RawSet } from './tcgdex';
import {
  ENERGY_ORDER,
  mapCategory,
  mapEnergyKind,
  mapRarity,
  mapStage,
  mapTrainerType,
  mapTypes,
} from './vocab-map';

export interface BuiltCard extends CatalogCard {
  /**
   * Pipeline-only: where the card came from (for images and reports). `cardmarket` is TCGdex's
   * product id; for Asian prints it may be the Japanese or the Simplified Chinese product, so
   * cardmarket.ts sorts it into `refs.cardmarket.byLanguage`.
   */
  source: { set: RawSet; localId: string; raw: RawCard; cardmarket?: number };
}

export interface BuiltSet {
  config: SetConfig;
  summary: CatalogSetSummary;
  raw: RawSet;
  cards: BuiltCard[];
}

export interface BuildInputs {
  species: Map<number, SpeciesNames>;
  overlays: Map<string, Map<string, CardOverlay>>;
  traditionalChinese: Map<string, Map<string, string>>;
}

export interface BuildProblems {
  errors: string[];
  warnings: string[];
}

const numeric = (localId: string) => (/^\d+$/.test(localId) ? Number(localId) : null);

function energyTypeOf(localId: string, raw: RawCard): string | undefined {
  if (JAPANESE_ENERGY_CODES[localId]) return JAPANESE_ENERGY_CODES[localId];
  const en = raw.name.en?.toLowerCase() ?? '';
  return ENERGY_ORDER.find((type) => en.includes(type));
}

function pickNames(raw: RawCard, languages: readonly CardLanguage[]): LocalizedText {
  const names: LocalizedText = {};
  for (const lang of languages) {
    const value = raw.name[lang]?.trim();
    if (value) names[lang] = value;
  }
  return names;
}

function toCard(
  config: SetConfig,
  raw: RawCard,
  rawSet: RawSet,
  localId: string,
  overlay: CardOverlay | undefined,
  extra: ExtraCards | undefined,
  problems: BuildProblems,
): BuiltCard {
  const where = `${config.id} ${extra ? `${extra.idPrefix}:` : ''}${localId}`;
  const section = extra?.section ?? config.section(localId);
  const category = mapCategory(raw.category);
  const n = numeric(localId);
  const energyType = category === 'energy' ? energyTypeOf(localId, raw) : undefined;

  const printedNumber =
    overlay?.printedNumber ??
    (n !== null && config.printedTotal && !extra
      ? `${localId}/${config.printedTotal}`
      : JAPANESE_ENERGY_CODES[localId]
        ? ''
        : localId);
  const sort =
    overlay?.sort ??
    (section === 'energy' && energyType
      ? 2000 + ENERGY_ORDER.indexOf(energyType as never)
      : (n ?? 1000 + ['R', 'G', 'B'].indexOf(localId)));

  const rarity = config.forceRarity ?? mapRarity(raw.rarity, where) ?? undefined;
  const cardmarketIds = new Set<number>();
  const tcgplayerIds = new Set<number>();
  for (const variant of Array.isArray(raw.variants) ? raw.variants : []) {
    if (variant.thirdParty?.cardmarket) cardmarketIds.add(variant.thirdParty.cardmarket);
    if (variant.thirdParty?.tcgplayer) tcgplayerIds.add(variant.thirdParty.tcgplayer);
  }
  if (cardmarketIds.size > 1)
    problems.errors.push(
      `${where}: several Cardmarket products (${[...cardmarketIds].join(', ')}) for one variant`,
    );
  const cardmarket = [...cardmarketIds][0];

  const name = { ...pickNames(raw, config.languages), ...overlay?.name };
  const card: BuiltCard = {
    id: `${extra?.idPrefix ?? config.id}:${localId}`,
    setId: config.id,
    localId,
    printedNumber,
    section,
    sort,
    name,
    category,
    ...(rarity ? { rarity } : {}),
    // Only the Japanese marks are verified; ZH marks stay unknown until a source confirms them.
    ...(config.japaneseRarityMarks
      ? { printedRarity: { ja: (rarity && JAPANESE_RARITY_MARKS[rarity]) ?? null } }
      : {}),
    ...(mapTypes(raw.types, where)
      ? { types: mapTypes(raw.types, where) }
      : energyType && category === 'energy'
        ? { types: [energyType] }
        : {}),
    ...(raw.hp ? { hp: raw.hp } : {}),
    ...(mapStage(raw.stage, where) ? { stage: mapStage(raw.stage, where) } : {}),
    ...(mapTrainerType(raw.trainerType, where)
      ? { trainerType: mapTrainerType(raw.trainerType, where) }
      : {}),
    ...(mapEnergyKind(raw.energyType, where)
      ? { energyKind: mapEnergyKind(raw.energyType, where) }
      : {}),
    ...(raw.dexId?.length ? { dexIds: raw.dexId } : {}),
    ...(raw.illustrator?.trim() ? { illustrator: raw.illustrator.trim() } : {}),
    // 30 Jahre: every card is foil and exists exactly once, whatever TCGdex calls it (DATA_MODEL.md §2).
    variants: [
      {
        id: STANDARD_VARIANT,
        ...((cardmarket && config.print === 'intl') || tcgplayerIds.size
          ? {
              refs: {
                ...(cardmarket && config.print === 'intl'
                  ? { cardmarket: { default: cardmarket } }
                  : {}),
                ...(tcgplayerIds.size ? { tcgplayer: [...tcgplayerIds][0] } : {}),
              },
            }
          : {}),
      },
    ],
    languages: [...config.languages],
    images: {},
    refs: { tcgdex: `${rawSet.id}-${localId}` },
    source: { set: rawSet, localId, raw, ...(cardmarket ? { cardmarket } : {}) },
  };
  return card;
}

function releaseDates(config: SetConfig, raw: RawSet): Partial<Record<CardLanguage, string>> {
  if (config.releaseDates) return config.releaseDates;
  const out: Partial<Record<CardLanguage, string>> = {};
  for (const lang of config.languages) {
    const date = typeof raw.releaseDate === 'string' ? raw.releaseDate : raw.releaseDate[lang];
    if (date) out[lang] = date;
  }
  return out;
}

/** Loads and normalizes every configured set (DATA_SOURCES.md §6.2 steps 2–4). */
export async function buildSets(inputs: BuildInputs, problems: BuildProblems): Promise<BuiltSet[]> {
  const sets: BuiltSet[] = [];
  for (const config of CATALOG_SETS) {
    const { set: raw, cards: rawCards } = await loadTcgdexSet(config.source);
    if (rawCards.size !== config.expectedCards) {
      problems.errors.push(
        `${config.id}: expected ${config.expectedCards} cards upstream, found ${rawCards.size}`,
      );
    }
    const overlays = inputs.overlays.get(config.id) ?? new Map<string, CardOverlay>();
    for (const localId of overlays.keys()) {
      if (!rawCards.has(localId))
        problems.errors.push(`${config.id}: curated overlay for unknown card ${localId}`);
    }
    const cards = [...rawCards].map(([localId, rawCard]) =>
      toCard(config, rawCard, raw, localId, overlays.get(localId), undefined, problems),
    );
    for (const extra of config.extras ?? []) {
      const { set: extraSet, cards: extraCards } = await loadTcgdexSet(extra.source);
      for (const localId of extra.localIds) {
        const rawCard = extraCards.get(localId);
        if (!rawCard)
          problems.errors.push(`${config.id}: extra card ${extraSet.id}/${localId} not found`);
        else cards.push(toCard(config, rawCard, extraSet, localId, undefined, extra, problems));
      }
    }
    const name: LocalizedText = {
      ...pickNames({ name: raw.name } as RawCard, config.languages),
      ...config.name,
    };
    const summary: CatalogSetSummary = {
      id: config.id,
      print: config.print,
      series: config.series,
      kind: config.kind,
      ...(config.parentSetId ? { parentSetId: config.parentSetId } : {}),
      name,
      ...(config.code ? { code: config.code } : {}),
      languages: [...config.languages],
      releaseDates: releaseDates(config, raw),
      counts: { official: raw.cardCount.official, total: cards.length },
      ...(config.sectionNames ? { sectionNames: config.sectionNames } : {}),
    };
    sets.push({ config, summary, raw, cards });
  }
  applyAsianNames(sets, inputs, problems);
  return sets;
}

function setSource(card: BuiltCard, lang: CardLanguage, source: NameSource) {
  if (source === 'official') return;
  card.nameSource = { ...card.nameSource, [lang]: source };
}

/**
 * Names for Asian-print cards (ADR-021, ADR-026): JA official; ZH-TW official from the TW site
 * (or the identical JA name's TW name, or derived from PokéAPI); ZH-CN converted from ZH-TW;
 * DE/EN from the international counterpart, PokéAPI or the curated overlay ("übersetzt").
 */
function applyAsianNames(sets: BuiltSet[], inputs: BuildInputs, problems: BuildProblems) {
  const all = sets.flatMap((s) => s.cards);
  const byId = new Map(all.map((c) => [c.id, c]));
  const intl = all.filter(
    (c) => sets.find((s) => s.config.id === c.setId)?.config.print === 'intl',
  );

  for (const set of sets.filter((s) => s.config.print === 'asia')) {
    const overlays = inputs.overlays.get(set.config.id) ?? new Map<string, CardOverlay>();
    const curatedPairs = new Map<string, string>();
    for (const card of set.cards) {
      const counterpart = overlays.get(card.localId)?.counterpart;
      if (counterpart) curatedPairs.set(card.id, counterpart);
    }
    const pairs = matchCounterparts(set.cards, intl, curatedPairs);
    const tc = inputs.traditionalChinese.get(set.raw.id) ?? new Map<string, string>();
    const tcByJapanese = new Map<string, string>();
    for (const card of set.cards) {
      const ja = card.name.ja;
      const zh = tc.get(card.localId);
      if (ja && zh && !tcByJapanese.has(ja)) tcByJapanese.set(ja, zh);
    }

    for (const card of set.cards) {
      const overlay = overlays.get(card.localId);
      const where = `${card.id} (${card.name.ja ?? '?'})`;
      const ja = card.name.ja;
      if (!ja) {
        problems.errors.push(`${where}: no Japanese name`);
        continue;
      }
      const derived = deriveFromSpecies(ja, card.dexIds, inputs.species);

      // Traditional Chinese
      const tw = tc.get(card.localId) ?? tcByJapanese.get(ja);
      if (tw) card.name['zh-tw'] = tw;
      else if (overlay?.curatedName?.['zh-tw']) {
        card.name['zh-tw'] = overlay.curatedName['zh-tw'];
        setSource(card, 'zh-tw', 'curated');
      } else if (derived) {
        card.name['zh-tw'] = derived['zh-tw'];
        setSource(card, 'zh-tw', 'derived-pokeapi');
      } else
        problems.errors.push(`${where}: no Traditional Chinese name (curate curatedName.zh-tw)`);

      // Simplified Chinese: no open source exists (R2.8), so it's converted from Traditional.
      if (overlay?.curatedName?.['zh-cn']) {
        card.name['zh-cn'] = overlay.curatedName['zh-cn'];
        setSource(card, 'zh-cn', 'curated');
      } else if (card.name['zh-tw']) {
        card.name['zh-cn'] = simplify(card.name['zh-tw']);
        setSource(card, 'zh-cn', 'derived-script');
      }

      // German and English display names
      const partnerId = pairs.get(card.id) ?? overlay?.namesFrom;
      const partner = partnerId ? byId.get(partnerId) : undefined;
      if (partnerId && !partner)
        problems.errors.push(`${where}: counterpart ${partnerId} not in the catalog`);
      if (pairs.has(card.id) && partner) {
        card.counterparts = [partner.id];
        partner.counterparts = [...new Set([...(partner.counterparts ?? []), card.id])];
      }
      for (const lang of ['de', 'en'] as const) {
        if (overlay?.curatedName?.[lang]) {
          card.name[lang] = overlay.curatedName[lang];
          setSource(card, lang, 'curated');
        } else if (partner?.name[lang]) {
          card.name[lang] = partner.name[lang];
          setSource(card, lang, 'derived-crossprint');
        } else if (derived) {
          card.name[lang] = derived[lang];
          setSource(card, lang, 'derived-pokeapi');
        } else problems.errors.push(`${where}: no ${lang} name (add a counterpart or curatedName)`);
      }
    }
  }
}
