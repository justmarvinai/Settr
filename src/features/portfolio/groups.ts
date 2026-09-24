import { chunkSetId, pickText, type CatalogManifest } from '@/domain/catalog';
import type { LibraryRow } from '@/features/collection';
import { languageLabel, m, rarityLabel } from '@/i18n';
import type { AllocationView, PerformanceView } from '@/domain/valuation/portfolio-search';

/**
 * How the Portfolio page groups lots (UX_SPEC.md §4.11): by category (cards, graded, sealed), set
 * chunk, card language or rarity. A key is stable; its label is for people.
 */
export interface Grouping {
  keyOf: (row: LibraryRow) => string;
  labelOf: (key: string) => string;
}

const CUSTOM = 'custom';
const NONE = 'none';

/** The set chunk a lot belongs to (a main set with its subsets), as the catalog files are cut. */
export function setKeyOf(row: LibraryRow, manifest: CatalogManifest): string {
  if (row.info.custom) return CUSTOM;
  return row.setId ? chunkSetId(row.setId, manifest.sets) : NONE;
}

export function setLabelOf(key: string, manifest: CatalogManifest, rows: readonly LibraryRow[]) {
  if (key === CUSTOM) return m.portfolio_custom();
  if (key === NONE) return m.portfolio_no_set();
  const set = manifest.sets.find((s) => s.id === key);
  if (set) return pickText(set.name);
  // A set that left the catalog: the lots' snapshots still name it.
  return rows.find((r) => setKeyOf(r, manifest) === key)?.setName ?? key;
}

export function grouping(
  view: AllocationView | PerformanceView,
  manifest: CatalogManifest,
  rows: readonly LibraryRow[],
): Grouping {
  if (view === 'category') {
    const labels: Record<string, () => string> = {
      singles: m.overview_alloc_singles,
      graded: m.overview_alloc_graded,
      sealed: m.overview_alloc_sealed,
    };
    return {
      keyOf: (row) =>
        row.holding.item.kind === 'sealed' ? 'sealed' : row.holding.grading ? 'graded' : 'singles',
      labelOf: (key) => labels[key]?.() ?? key,
    };
  }
  if (view === 'set') {
    return {
      keyOf: (row) => setKeyOf(row, manifest),
      labelOf: (key) => setLabelOf(key, manifest, rows),
    };
  }
  if (view === 'language') {
    return {
      keyOf: (row) => row.holding.language,
      labelOf: (key) => {
        const row = rows.find((r) => r.holding.language === key);
        return row ? languageLabel(row.holding.language) : key;
      },
    };
  }
  return {
    keyOf: (row) => (row.holding.item.kind === 'sealed' ? 'sealed' : (row.rarity ?? NONE)),
    labelOf: (key) =>
      key === 'sealed'
        ? m.overview_alloc_sealed()
        : key === NONE
          ? m.portfolio_no_rarity()
          : rarityLabel(key),
  };
}
