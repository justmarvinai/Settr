import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { dirs } from './paths';

/** The subset of TCGdex's card model (interfaces.d.ts) the pipeline reads. */
export interface RawVariant {
  type?: string;
  foil?: string;
  stamp?: string[];
  languages?: string[];
  thirdParty?: { cardmarket?: number; tcgplayer?: number };
}
export interface RawCard {
  name: Record<string, string | undefined>;
  illustrator?: string;
  rarity?: string;
  category: 'Pokemon' | 'Trainer' | 'Energy';
  dexId?: number[];
  hp?: number;
  types?: string[];
  stage?: string;
  suffix?: string;
  trainerType?: string;
  energyType?: string;
  variants?: RawVariant[] | Record<string, boolean>;
  set: RawSet;
}
export interface RawSet {
  id: string;
  name: Record<string, string | undefined>;
  serie: { id: string; name: Record<string, string | undefined> };
  cardCount: { official: number };
  releaseDate: string | Record<string, string | undefined>;
  abbreviations?: { official?: string };
}

export interface SourceSet {
  pool: 'data' | 'data-asia';
  /** Folder names inside the pool, e.g. `Mega Evolution` / `30th Celebration`. */
  serie: string;
  set: string;
}

const importDefault = async <T>(file: string): Promise<T> =>
  ((await import(pathToFileURL(file).href)) as { default: T }).default;

/** Imports every card file of a TCGdex set (TypeScript, run through tsx). */
export async function loadTcgdexSet(
  source: SourceSet,
): Promise<{ set: RawSet; cards: Map<string, RawCard> }> {
  const base = join(dirs.tcgdex, source.pool, source.serie);
  const set = await importDefault<RawSet>(join(base, `${source.set}.ts`));
  const cards = new Map<string, RawCard>();
  const files = readdirSync(join(base, source.set))
    .filter((f) => f.endsWith('.ts'))
    .toSorted();
  for (const file of files)
    cards.set(file.slice(0, -3), await importDefault<RawCard>(join(base, source.set, file)));
  return { set, cards };
}

/** TCGdex asset path segments (`https://assets.tcgdex.net/{lang}/{serieId}/{setId}/{localId}`). */
export function assetBase(lang: string, set: RawSet, localId: string): string {
  return `https://assets.tcgdex.net/${lang}/${set.serie.id}/${set.id}/${localId}`;
}
