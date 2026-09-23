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

export interface ParsedName {
  region?: (typeof REGIONS)[number];
  base: string;
  suffix?: (typeof SUFFIXES)[number];
}

/** Splits a Japanese card name into regional prefix, species part and suffix. */
export function parseJapaneseName(name: string): ParsedName {
  let rest = name.trim();
  const region = REGIONS.find((r) => rest.startsWith(r.ja));
  if (region) rest = rest.slice(region.ja.length).trim();
  const suffix = SUFFIXES.find((s) => rest.endsWith(s.ja) && rest.length > s.ja.length);
  if (suffix) rest = rest.slice(0, -suffix.ja.length).trim();
  return { region, base: rest, suffix };
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
  const parsed = parseJapaneseName(jaName);
  if (parsed.base !== names.ja && parsed.base !== names['ja-kana']) return null;
  const region = parsed.region;
  const suffix = parsed.suffix;
  return {
    de: `${region?.de ?? ''}${names.de}${suffix?.de ?? ''}`,
    en: `${region?.en ?? ''}${names.en}${suffix?.en ?? ''}`,
    'zh-tw': `${region?.['zh-Hant'] ?? ''}${names['zh-Hant']}${suffix?.ja ?? ''}`,
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
