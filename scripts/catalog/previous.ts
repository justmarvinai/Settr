import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  catalogManifestSchema,
  type CatalogCard,
  type CatalogManifest,
  type CatalogSetFile,
  type CatalogSetSummary,
} from '../../src/domain/catalog';
import { OUT } from './paths';

/**
 * The catalog that is in public/catalog/v1 before a build. Offline builds can't reach Cardmarket
 * or TCGdex's image server, so they keep what the last network build (CI) found, per card id.
 */
export interface PreviousCatalog {
  manifest: CatalogManifest | null;
  cards: Map<string, CatalogCard>;
  sets: Map<string, CatalogSetSummary>;
}

export function loadPrevious(): PreviousCatalog {
  const previous: PreviousCatalog = { manifest: null, cards: new Map(), sets: new Map() };
  const manifestFile = join(OUT, 'manifest.json');
  if (!existsSync(manifestFile)) return previous;
  previous.manifest =
    catalogManifestSchema.safeParse(JSON.parse(readFileSync(manifestFile, 'utf8'))).data ?? null;
  for (const set of previous.manifest?.sets ?? []) previous.sets.set(set.id, set);
  for (const ref of Object.values(previous.manifest?.files.sets ?? {})) {
    const file = join(OUT, ref.path);
    if (!existsSync(file)) continue;
    for (const card of (JSON.parse(readFileSync(file, 'utf8')) as CatalogSetFile).cards)
      previous.cards.set(card.id, card);
  }
  return previous;
}
