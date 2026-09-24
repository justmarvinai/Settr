import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalogProductIds, emptySnapshot, filterGuide } from './filter';

/**
 * Writes `dist/catalog/v1/cm-prices.json` after `vite build` (PRC-09, DATA_SOURCES.md §8.3).
 *
 * - On Vercel (`VERCEL=1`, or `PRICE_GUIDE=download`) it downloads Cardmarket's price guide and
 *   keeps the catalog's products. The daily `price-guide.yml` job only calls a deploy hook, so
 *   the snapshot exists in the deployment and never in the public repository (ADR-029).
 * - `PRICE_GUIDE_FILE=<path>` reads a guide from disk instead (tests, local checks).
 * - Anywhere else, and whenever something fails, it writes an empty snapshot: a deploy never
 *   fails over the guide, and the app just shows no suggestions.
 */
const GUIDE_URL =
  'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json';
const CATALOG = join(process.cwd(), 'dist', 'catalog', 'v1');
const OUT = join(CATALOG, 'cm-prices.json');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function catalogIds(): Set<number> {
  const manifest = readJson(join(CATALOG, 'manifest.json')) as {
    files: { sets: Record<string, { path: string }>; sealed: { path: string } };
  };
  const cards = Object.values(manifest.files.sets).flatMap(
    (file) => (readJson(join(CATALOG, file.path)) as { cards?: unknown[] }).cards ?? [],
  );
  const sealed = readJson(join(CATALOG, manifest.files.sealed.path)) as { products?: unknown[] };
  return catalogProductIds({ cards, products: sealed.products ?? [] });
}

async function loadGuide(): Promise<unknown> {
  const file = process.env.PRICE_GUIDE_FILE;
  if (file) return readJson(file);
  const response = await fetch(GUIDE_URL, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Price guide download failed: HTTP ${response.status}`);
  return response.json();
}

async function main() {
  if (!existsSync(CATALOG)) {
    console.warn('[price-guide] no dist/catalog/v1: run after vite build');
    return;
  }
  const now = new Date().toISOString();
  const wanted =
    Boolean(process.env.PRICE_GUIDE_FILE) ||
    process.env.VERCEL === '1' ||
    process.env.PRICE_GUIDE === 'download';
  if (!wanted) {
    writeFileSync(OUT, `${JSON.stringify(emptySnapshot(now))}\n`);
    console.log('[price-guide] not a deployment build: wrote an empty snapshot');
    return;
  }
  try {
    const ids = catalogIds();
    const snapshot = filterGuide(await loadGuide(), ids, now);
    writeFileSync(OUT, `${JSON.stringify(snapshot)}\n`);
    console.log(
      `[price-guide] ${Object.keys(snapshot.prices).length} of ${ids.size} catalog products, guide of ${snapshot.guideCreatedAt ?? 'unknown date'}`,
    );
  } catch (error) {
    writeFileSync(OUT, `${JSON.stringify(emptySnapshot(now))}\n`);
    console.warn(`[price-guide] kept going without suggestions: ${String(error)}`);
  }
}

await main();
