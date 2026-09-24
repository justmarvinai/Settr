import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as OpenCC from 'opencc-js';
import { dirs, readLock } from './paths';

/** PokéAPI language ids (languages.csv). */
const POKEAPI_LANGS = { 'ja-kana': 1, 'zh-Hant': 4, de: 6, en: 9, ja: 11, 'zh-Hans': 12 } as const;
export type SpeciesLang = keyof typeof POKEAPI_LANGS;
export type SpeciesNames = Partial<Record<SpeciesLang, string>>;

/** Species names by national dex number (search aliases and derived names, DATA_SOURCES.md §4). */
export function loadSpeciesNames(): Map<number, SpeciesNames> {
  const commit = readLock().pokeapi.commit.slice(0, 12);
  const csv = readFileSync(join(dirs.pokeapi, `${commit}-pokemon_species_names.csv`), 'utf8');
  const byId = new Map<number, string>(Object.entries(POKEAPI_LANGS).map(([k, v]) => [v, k]));
  const species = new Map<number, SpeciesNames>();
  for (const line of csv.split('\n').slice(1)) {
    const [id, langId, name] = line.split(',');
    const lang = byId.get(Number(langId)) as SpeciesLang | undefined;
    if (!id || !lang || !name) continue;
    const entry = species.get(Number(id)) ?? {};
    entry[lang] = name.trim();
    species.set(Number(id), entry);
  }
  return species;
}

const REGIONS: { ja: string; de: string; en: string; 'zh-Hant': string }[] = [
  { ja: 'アローラ', de: 'Alola-', en: 'Alolan ', 'zh-Hant': '阿羅拉 ' },
  { ja: 'ガラル', de: 'Galar-', en: 'Galarian ', 'zh-Hant': '伽勒爾 ' },
  { ja: 'ヒスイ', de: 'Hisui-', en: 'Hisuian ', 'zh-Hant': '洗翠 ' },
  { ja: 'パルデア', de: 'Paldea-', en: 'Paldean ', 'zh-Hant': '帕底亞 ' },
];
/** Card-name suffixes as German and English cards print them (TCGdex DE: "Quajutsu TURBO"). */
const SUFFIXES: { ja: string; de: string; en: string }[] = [
  { ja: 'VSTAR', de: '-VSTAR', en: ' VSTAR' },
  { ja: 'VMAX', de: '-VMAX', en: ' VMAX' },
  { ja: 'BREAK', de: ' TURBO', en: ' BREAK' },
  { ja: 'LEGEND', de: '-LEGENDE', en: ' LEGEND' },
  { ja: 'ex', de: '-ex', en: ' ex' },
  { ja: 'EX', de: '-EX', en: ' EX' },
  { ja: 'GX', de: '-GX', en: ' GX' },
  { ja: 'V', de: '-V', en: ' V' },
];

/** Mega Evolution: "メガリザードンXex" → "Mega-Glurak X-ex" / "Mega Charizard X ex". */
const MEGA = { ja: 'メガ', de: 'Mega-', en: 'Mega ', 'zh-Hant': '超級' } as const;

export interface ParsedName {
  region?: (typeof REGIONS)[number] | typeof MEGA;
  base: string;
  /** Mega X/Y forms, printed after the species ("Mega-Glurak X-ex"). */
  form?: 'X' | 'Y';
  suffix?: (typeof SUFFIXES)[number];
}

/**
 * Splits a Japanese card name into regional (or Mega) prefix, species part, Mega form and
 * suffix. With `mega`, a leading メガ is read as Mega Evolution (メガニウム is a species).
 */
export function parseJapaneseName(name: string, mega = false): ParsedName {
  let rest = name.trim();
  const region =
    mega && rest.startsWith(MEGA.ja) ? MEGA : REGIONS.find((r) => rest.startsWith(r.ja));
  if (region) rest = rest.slice(region.ja.length).trim();
  const suffix = SUFFIXES.find((s) => rest.endsWith(s.ja) && rest.length > s.ja.length);
  if (suffix) rest = rest.slice(0, -suffix.ja.length).trim();
  const form = mega && /^.+[XY]$/.test(rest) ? (rest.slice(-1) as 'X' | 'Y') : undefined;
  return { region, base: form ? rest.slice(0, -1) : rest, ...(form ? { form } : {}), suffix };
}

/**
 * Derives German, English and Traditional Chinese names for a Japanese Pokémon card from PokéAPI,
 * but only when the Japanese name is exactly [region] + species + [suffix]. Anything else (e.g.
 * わるいバンギラス, エリカのプリン) must come from a counterpart or the curated overlay.
 */
export function deriveFromSpecies(
  jaName: string,
  dexIds: number[] | undefined,
  species: Map<number, SpeciesNames>,
): { de: string; en: string; 'zh-tw': string } | null {
  if (dexIds?.length !== 1) return null;
  const names = species.get(dexIds[0] as number);
  if (!names?.de || !names.en || !names['zh-Hant']) return null;
  const isSpecies = (p: ParsedName) => p.base === names.ja || p.base === names['ja-kana'];
  const parsed = [parseJapaneseName(jaName), parseJapaneseName(jaName, true)].find(isSpecies);
  if (!parsed) return null;
  const { region, suffix } = parsed;
  const form = parsed.form ? ` ${parsed.form}` : '';
  return {
    de: `${region?.de ?? ''}${names.de}${form}${suffix?.de ?? ''}`,
    en: `${region?.en ?? ''}${names.en}${form}${suffix?.en ?? ''}`,
    'zh-tw': `${region?.['zh-Hant'] ?? ''}${names['zh-Hant']}${parsed.form ?? ''}${suffix?.ja ?? ''}`,
  };
}

const toSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' });

/** Simplified Chinese from Traditional (Taiwan) text; used for SC card names (ADR-021). */
export function simplify(traditional: string): string {
  return toSimplified(traditional);
}

/** All names of a species in every script, for search aliases (US-05). */
export function speciesAliases(
  dexIds: number[] | undefined,
  species: Map<number, SpeciesNames>,
): string[] {
  const out = new Set<string>();
  for (const id of dexIds ?? [])
    for (const name of Object.values(species.get(id) ?? {})) if (name) out.add(name);
  return [...out];
}
