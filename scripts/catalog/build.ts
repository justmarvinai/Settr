import type { CardLanguage } from '../../src/domain/catalog-types';
import type {
  CardVariant,
  CatalogCard,
  CatalogSetSummary,
  LocalizedText,
  VariantDef,
} from '../../src/domain/catalog/schema';
import { STANDARD_VARIANT, type NameSource, type RarityId } from '../../src/domain/catalog/vocab';
import {
  CATALOG_SETS,
  JAPANESE_ENERGY_CODES,
  JAPANESE_RARITY_MARKS,
  SPECIAL_RARITY_MARKS,
  type ExtraCards,
  type SetConfig,
} from './config';
import type { CardOverlay, JapaneseName } from './curated';
import { matchCounterparts } from './crossprint';
import { deriveFromSpecies, simplify, type SpeciesNames } from './names';
import {
  loadTcgdexSet,
  type RawCard,
  type RawSet,
  type RawVariant,
  type SourceSet,
} from './tcgdex';
import { deriveVariant, isPlainVariant, variantLanguages } from './variants';
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
   * Pipeline-only: where the card came from (for images and reports). `variants` holds TCGdex's
   * Cardmarket product per Settr variant; for Asian prints it may be the Japanese or the
   * Simplified Chinese product, so cardmarket.ts sorts it into `refs.cardmarket.byLanguage`.
   */
  source: {
    set: RawSet;
    localId: string;
    raw: RawCard;
    variants: { id: string; cardmarket?: number }[];
    /** A donor card with the same artwork (its pictures stand in when the card has none). */
    donor?: { set: RawSet; localId: string };
  };
}

export interface BuiltSet {
  config: SetConfig;
  summary: CatalogSetSummary;
  raw: RawSet;
  cards: BuiltCard[];
  /** Every variant its cards use (the chunk's `variantsLegend`). */
  legend: Map<string, VariantDef>;
}

export interface BuildInputs {
  species: Map<number, SpeciesNames>;
  overlays: Map<string, Map<string, CardOverlay>>;
  /** Official Traditional Chinese names per PTCG-database folder (`SetConfig.traditionalChinese`). */
  traditionalChinese: Map<string, Map<string, string>>;
  /** International cards outside the catalog that lend Asian cards their names (ADR-051). */
  donors: Map<string, Donor[]>;
  /** Curated Japanese names (data/curated/names): the card to take names from, or the names. */
  japaneseNames: Map<string, JapaneseName>;
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

const STANDARD_DEF: VariantDef = {
  id: STANDARD_VARIANT,
  kind: 'finish',
  label: { de: 'Standard', en: 'Standard' },
};

const rawVariants = (raw: RawCard): RawVariant[] =>
  Array.isArray(raw.variants)
    ? raw.variants
    : Object.entries(raw.variants ?? {})
        .filter(([, present]) => present)
        .map(([type]) => ({ type }));

interface CardVariants {
  variants: CardVariant[];
  source: BuiltCard['source']['variants'];
  defs: VariantDef[];
}

/**
 * The card's physical variants. `single` sets (30 Jahre) get one `std` variant with the card's
 * only Cardmarket product; `detailed` sets get TCGdex's variants (variants.ts), each with its own
 * product. International products are final here; Asian ones are sorted by language later.
 */
function cardVariants(
  config: SetConfig,
  raw: RawCard,
  languages: readonly CardLanguage[],
  where: string,
  problems: BuildProblems,
): CardVariants {
  const list = rawVariants(raw);
  if (config.variants === 'single' || list.length === 0) {
    const cardmarketIds = new Set<number>();
    const tcgplayerIds = new Set<number>();
    for (const variant of list) {
      if (variant.thirdParty?.cardmarket) cardmarketIds.add(variant.thirdParty.cardmarket);
      if (variant.thirdParty?.tcgplayer) tcgplayerIds.add(variant.thirdParty.tcgplayer);
    }
    if (cardmarketIds.size > 1)
      problems.errors.push(
        `${where}: several Cardmarket products (${[...cardmarketIds].join(', ')}) for one variant`,
      );
    if (config.variants !== 'single') problems.warnings.push(`${where}: no variants upstream`);
    const cardmarket = [...cardmarketIds][0];
    const tcgplayer = [...tcgplayerIds][0];
    const refs = {
      ...(cardmarket && config.print === 'intl' ? { cardmarket: { default: cardmarket } } : {}),
      ...(tcgplayer ? { tcgplayer } : {}),
    };
    return {
      variants: [{ id: STANDARD_VARIANT, ...(Object.keys(refs).length ? { refs } : {}) }],
      source: [{ id: STANDARD_VARIANT, ...(cardmarket ? { cardmarket } : {}) }],
      defs: [STANDARD_DEF],
    };
  }

  const byId = new Map<
    string,
    { def: ReturnType<typeof deriveVariant>; raw: RawVariant; langs?: CardLanguage[] }
  >();
  // In a numbered set, a plain non-holo next to a plain holo is a deck exclusive (variants.ts).
  const deckPrint =
    config.printedTotal !== undefined &&
    list.some((v) => v.type === 'holo' && isPlainVariant(v)) &&
    list.some((v) => (v.type ?? 'normal') === 'normal' && isPlainVariant(v));
  for (const variant of list) {
    const def = deriveVariant(variant, where, { deckPrint });
    const langs = variantLanguages(variant, languages);
    if (langs && langs.length === 0) continue; // only in languages Settr doesn't carry
    const seen = byId.get(def.id);
    if (!seen) {
      byId.set(def.id, { def, raw: variant, ...(langs ? { langs } : {}) });
      continue;
    }
    const a = seen.raw.thirdParty?.cardmarket;
    const b = variant.thirdParty?.cardmarket;
    if (a && b && a !== b)
      problems.warnings.push(`${where}: variant ${def.id} listed twice (Cardmarket ${a}, ${b})`);
    if (seen.langs && langs) seen.langs = [...new Set([...seen.langs, ...langs])];
    else delete seen.langs;
  }
  const ordered = [...byId.values()].toSorted((x, y) => x.def.rank - y.def.rank);
  return {
    variants: ordered.map(({ def, raw: variant, langs }) => {
      const cardmarket = variant.thirdParty?.cardmarket;
      const tcgplayer = variant.thirdParty?.tcgplayer;
      const refs = {
        ...(cardmarket && config.print === 'intl' ? { cardmarket: { default: cardmarket } } : {}),
        ...(tcgplayer ? { tcgplayer } : {}),
      };
      return {
        id: def.id,
        ...(langs ? { languages: langs } : {}),
        ...(Object.keys(refs).length ? { refs } : {}),
      };
    }),
    source: ordered.map(({ def, raw: variant }) => ({
      id: def.id,
      ...(variant.thirdParty?.cardmarket ? { cardmarket: variant.thirdParty.cardmarket } : {}),
    })),
    defs: ordered.map(({ def: { id, kind, label } }) => ({ id, kind, label })),
  };
}

/** The Japanese mark printed on a card of this rarity, or null when none is printed. */
function printedMark(config: SetConfig, rarity: RarityId | undefined): string | null {
  if (!rarity) return null;
  if (config.rarityMarks === 'special' && !SPECIAL_RARITY_MARKS.includes(rarity)) return null;
  return JAPANESE_RARITY_MARKS[rarity] ?? null;
}

function toCard(
  config: SetConfig,
  raw: RawCard,
  rawSet: RawSet,
  localId: string,
  overlay: CardOverlay | undefined,
  extra: ExtraCards | undefined,
  legend: Map<string, VariantDef>,
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

  const rarity =
    config.forceRarity ??
    (raw.rarity ? config.rarities?.[raw.rarity] : undefined) ??
    mapRarity(raw.rarity, where) ??
    undefined;
  const languages = overlay?.languages ?? config.languages;
  const variants = cardVariants(config, raw, languages, where, problems);
  for (const def of variants.defs) if (!legend.has(def.id)) legend.set(def.id, def);

  const name: LocalizedText = { ...pickNames(raw, config.languages), ...overlay?.name };
  const nameSource: Partial<Record<CardLanguage, NameSource>> = {};
  // International cards TCGdex has no name for (e.g. MEP promos without German data).
  for (const [lang, value] of Object.entries(overlay?.curatedName ?? {}) as [
    CardLanguage,
    string,
  ][]) {
    if (config.print !== 'intl' || name[lang]) continue;
    name[lang] = value;
    nameSource[lang] = 'curated';
  }
  const card: BuiltCard = {
    id: `${extra?.idPrefix ?? config.id}:${localId}`,
    setId: config.id,
    localId,
    printedNumber,
    section,
    sort,
    name,
    ...(Object.keys(nameSource).length ? { nameSource } : {}),
    category,
    ...(rarity ? { rarity } : {}),
    // Only the Japanese marks are verified; ZH marks stay unknown until a source confirms them.
    ...(config.rarityMarks ? { printedRarity: { ja: printedMark(config, rarity) } } : {}),
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
    variants: variants.variants,
    languages: [...languages],
    images: {},
    refs: { tcgdex: `${rawSet.id}-${localId}` },
    source: { set: rawSet, localId, raw, variants: variants.source },
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
    const legend = new Map<string, VariantDef>();
    const cards = [...rawCards].map(([localId, rawCard]) =>
      toCard(config, rawCard, raw, localId, overlays.get(localId), undefined, legend, problems),
    );
    for (const extra of config.extras ?? []) {
      const { set: extraSet, cards: extraCards } = await loadTcgdexSet(extra.source);
      for (const localId of extra.localIds) {
        const rawCard = extraCards.get(localId);
        if (!rawCard)
          problems.errors.push(`${config.id}: extra card ${extraSet.id}/${localId} not found`);
        else
          cards.push(
            toCard(config, rawCard, extraSet, localId, undefined, extra, legend, problems),
          );
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
    sets.push({ config, summary, raw, cards, legend });
  }
  applyAsianNames(sets, inputs, problems);
  return sets;
}

function setSource(card: BuiltCard, lang: CardLanguage, source: NameSource) {
  if (source === 'official') return;
  card.nameSource = { ...card.nameSource, [lang]: source };
}

/** A card of the name-donor series (config.ts `NAME_DONORS`), reduced to what matching needs. */
export interface Donor {
  name: { de: string; en: string };
  set: RawSet;
  localId: string;
}

/**
 * Same artwork, in any print: Pokémon by Pokédex numbers, HP and illustrator; Trainers by type
 * and illustrator; special Energy by illustrator. Read from TCGdex's raw card on both sides.
 */
export function artworkKey(raw: RawCard): string | null {
  const artist = (raw.illustrator ?? '')
    .split('+')[0]
    ?.replace(/[^\p{Script=Latin}\d .'-]/gu, '')
    .trim()
    .toLowerCase();
  if (!artist) return null;
  if (raw.category === 'Pokemon')
    return raw.dexId?.length ? `P|${raw.dexId.join(',')}|${raw.hp ?? ''}|${artist}` : null;
  if (raw.category === 'Trainer') return `T|${raw.trainerType ?? ''}|${artist}`;
  return raw.energyType === 'Special' ? `E|${artist}` : null;
}

/** Donor cards by artwork key (every international set of the donor series). */
export async function loadDonors(
  series: readonly SourceSet[],
  load: (
    pool: SourceSet['pool'],
    serie: string,
  ) => Promise<{ set: RawSet; cards: Map<string, RawCard> }[]>,
): Promise<Map<string, Donor[]>> {
  const byKey = new Map<string, Donor[]>();
  for (const { pool, serie } of series)
    for (const { set, cards } of await load(pool, serie))
      for (const [localId, raw] of cards) {
        const key = artworkKey(raw);
        const de = raw.name.de?.trim();
        const en = raw.name.en?.trim();
        if (!key || !de || !en) continue;
        byKey.set(key, [...(byKey.get(key) ?? []), { name: { de, en }, set, localId }]);
      }
  return byKey;
}

/** The donors' shared names, or null when they disagree (e.g. two Items by one artist). */
function agreedNames(donors: readonly Donor[] | undefined): Donor | null {
  const first = donors?.[0];
  if (!first) return null;
  return donors.every((d) => d.name.de === first.name.de && d.name.en === first.name.en)
    ? first
    : null;
}

/**
 * Names for Asian-print cards (ADR-021, ADR-026, ADR-051): JA official; ZH-TW official from the
 * TW site (or the identical JA name's TW name, or derived from PokéAPI); ZH-CN converted from
 * ZH-TW. DE/EN, in this order: curated; the international counterpart (same artwork, in the
 * catalog); `namesFrom`; a donor card with the same artwork outside the catalog; another card
 * with the same Japanese name; the curated Japanese-name dictionary; PokéAPI. Everything but
 * the curated `name` is shown as "übersetzt".
 */
function applyAsianNames(sets: BuiltSet[], inputs: BuildInputs, problems: BuildProblems) {
  const all = sets.flatMap((s) => s.cards);
  const byId = new Map(all.map((c) => [c.id, c]));
  const asia = sets.filter((s) => s.config.print === 'asia');
  const pending: { card: BuiltCard; overlay: CardOverlay | undefined }[] = [];

  for (const set of asia) {
    const overlays = inputs.overlays.get(set.config.id) ?? new Map<string, CardOverlay>();
    const curatedPairs = new Map<string, string>();
    for (const card of set.cards) {
      const counterpart = overlays.get(card.localId)?.counterpart;
      if (counterpart) curatedPairs.set(card.id, counterpart);
    }
    const partners = new Set(set.config.counterpartSets ?? []);
    const intl = all.filter((c) => partners.has(c.setId));
    const pairs = matchCounterparts(set.cards, intl, curatedPairs);
    const tc =
      inputs.traditionalChinese.get(set.config.traditionalChinese ?? set.raw.id) ??
      new Map<string, string>();
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

      // Traditional Chinese (only where the set has it)
      if (card.languages.includes('zh-tw') || card.languages.includes('zh-cn')) {
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
      }

      // Simplified Chinese: no open source exists (R2.8), so it's converted from Traditional.
      if (card.languages.includes('zh-cn')) {
        if (overlay?.curatedName?.['zh-cn']) {
          card.name['zh-cn'] = overlay.curatedName['zh-cn'];
          setSource(card, 'zh-cn', 'curated');
        } else if (card.name['zh-tw']) {
          card.name['zh-cn'] = simplify(card.name['zh-tw']);
          setSource(card, 'zh-cn', 'derived-script');
        }
      }

      // German and English display names: curated, the counterpart, namesFrom, a donor
      const partnerId = pairs.get(card.id) ?? overlay?.namesFrom;
      const partner = partnerId ? byId.get(partnerId) : undefined;
      if (partnerId && !partner)
        problems.errors.push(`${where}: counterpart ${partnerId} not in the catalog`);
      if (pairs.has(card.id) && partner) {
        card.counterparts = [partner.id];
        card.counterpartSets = [partner.setId];
        if (!partner.counterparts?.includes(card.id)) {
          partner.counterparts = [...(partner.counterparts ?? []), card.id];
          partner.counterpartSets = [...(partner.counterpartSets ?? []), card.setId];
        }
      }
      // A donor must fit the Japanese name: the plain species name when PokéAPI can derive it
      // (a Team Rocket's Nidorina by the same artist isn't ニドリーナ), and an owner's
      // Pokémon ("Erika's Oddish") only for an owner's Japanese name (エリカの…).
      const key = partner ? null : artworkKey(card.source.raw);
      const candidate = key ? agreedNames(inputs.donors.get(key)) : null;
      const fits = (d: Donor) =>
        (!derived || (d.name.de === derived.de && d.name.en === derived.en)) &&
        (!d.name.en.includes("'s") || ja.includes('の'));
      const donor = candidate && fits(candidate) ? candidate : null;
      if (donor) card.source.donor = { set: donor.set, localId: donor.localId };
      for (const lang of ['de', 'en'] as const) {
        if (overlay?.curatedName?.[lang]) {
          card.name[lang] = overlay.curatedName[lang];
          setSource(card, lang, 'curated');
        } else if (partner?.name[lang]) {
          card.name[lang] = partner.name[lang];
          setSource(card, lang, 'derived-crossprint');
        } else if (donor) {
          card.name[lang] = donor.name[lang];
          setSource(card, lang, 'derived-crossprint');
        }
      }
      if (!card.name.de || !card.name.en) pending.push({ card, overlay });
    }
  }

  // Second pass: the same Japanese name elsewhere, the curated dictionary, then PokéAPI.
  const byJapanese = new Map<string, LocalizedText>();
  for (const card of asia.flatMap((s) => s.cards))
    if (card.name.ja && card.name.de && card.name.en && !byJapanese.has(card.name.ja))
      byJapanese.set(card.name.ja, card.name);
  for (const { card } of pending) {
    const where = `${card.id} (${card.name.ja ?? '?'})`;
    const ja = card.name.ja ?? '';
    const known = byJapanese.get(ja);
    const listed = inputs.japaneseNames.get(ja);
    const listedFrom = listed?.from ? byId.get(listed.from) : undefined;
    if (listed?.from && !listedFrom)
      problems.errors.push(
        `${where}: data/curated/names ${ja} → ${listed.from} not in the catalog`,
      );
    const derived = deriveFromSpecies(ja, card.dexIds, inputs.species);
    for (const lang of ['de', 'en'] as const) {
      if (card.name[lang]) continue;
      const value = known?.[lang] ?? listedFrom?.name[lang] ?? listed?.[lang];
      if (value) {
        card.name[lang] = value;
        setSource(card, lang, known || listedFrom ? 'derived-crossprint' : 'curated');
      } else if (derived) {
        card.name[lang] = derived[lang];
        setSource(card, lang, 'derived-pokeapi');
      } else
        problems.errors.push(
          `${where}: no ${lang} name (add a counterpart, curatedName or a data/curated/names entry)`,
        );
    }
  }
}
