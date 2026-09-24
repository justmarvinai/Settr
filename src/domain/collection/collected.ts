import type { CardLanguage } from '../catalog-types';
import { remaining, type Holding } from '../schemas';

export interface CollectedSet {
  /** The set chunk (a subset counts towards its main set). */
  setId: string;
  language: CardLanguage;
  /** Open card lots in this set and language. */
  lots: number;
}

/**
 * The sets and card languages you collect, most open card lots first: the rows of Übersicht's set
 * progress, the sidebar's sets and the rings on Katalog › Sets. `chunkOf` maps a subset to the set
 * chunk that holds it.
 */
export function collectedSets(
  holdings: readonly Holding[],
  chunkOf: (setId: string) => string,
): CollectedSet[] {
  const counts = new Map<string, CollectedSet>();
  for (const h of holdings) {
    if (h.item.kind !== 'card' || !h.setId || remaining(h) <= 0) continue;
    const setId = chunkOf(h.setId);
    const key = `${setId}|${h.language}`;
    const entry = counts.get(key);
    if (entry) entry.lots += 1;
    else counts.set(key, { setId, language: h.language, lots: 1 });
  }
  return [...counts.values()].toSorted(
    (a, b) =>
      b.lots - a.lots || a.setId.localeCompare(b.setId) || a.language.localeCompare(b.language),
  );
}
