import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const CACHE = process.env.CATALOG_CACHE ?? join(ROOT, '.cache/catalog');
export const OUT = join(ROOT, 'public/catalog/v1');
export const CURATED = join(ROOT, 'data/curated');
export const REPORT = join(CACHE, 'report.md');

export interface SourceLock {
  repo: string;
  commit: string;
  license: string;
}
export type SourceName = 'tcgdex' | 'ptcgDatabase' | 'pokeapi';

export const LOCK_FILE = join(ROOT, 'scripts/catalog/sources.lock.json');
export const readLock = (): Record<SourceName, SourceLock> =>
  JSON.parse(readFileSync(LOCK_FILE, 'utf8')) as Record<SourceName, SourceLock>;

/** Local checkouts; overridable to reuse existing clones (e.g. TCGDEX_DIR=/path/to/cards-database). */
export const dirs = {
  tcgdex: process.env.TCGDEX_DIR ?? join(CACHE, 'tcgdex'),
  ptcgDatabase: process.env.PTCG_DIR ?? join(CACHE, 'ptcg-database'),
  pokeapi: join(CACHE, 'pokeapi'),
  cardmarket: join(CACHE, 'cardmarket'),
  tcgdexAssets: join(CACHE, 'tcgdex-assets'),
};
