import type { CatalogCard } from '../../src/domain/catalog/schema';

/**
 * Pairs Asian-print cards with the international card showing the same artwork (JP M6a 001 ↔
 * 30th 001): same category, same Pokédex numbers and the same (first) illustrator. Ties, like the
 * two halves of Darkrai & Cresselia LEGEND, pair up in number order. Curated counterparts win.
 */
const illustrator = (c: CatalogCard) =>
  (c.illustrator ?? '')
    .split('+')[0]
    ?.replace(/[^\p{Script=Latin}\d .'-]/gu, '')
    .trim()
    .toLowerCase() ?? '';
const key = (c: CatalogCard) => `${c.category}|${(c.dexIds ?? []).join(',')}|${illustrator(c)}`;
const bySort = (x: CatalogCard, y: CatalogCard) => x.sort - y.sort;

export function matchCounterparts(
  asia: readonly CatalogCard[],
  intl: readonly CatalogCard[],
  curated: ReadonlyMap<string, string>,
): Map<string, string> {
  const intlByKey = new Map<string, CatalogCard[]>();
  for (const card of intl) {
    if (!card.dexIds?.length || !card.illustrator) continue;
    intlByKey.set(key(card), [...(intlByKey.get(key(card)) ?? []), card]);
  }
  const asiaByKey = new Map<string, CatalogCard[]>();
  for (const card of asia) {
    if (curated.has(card.id) || !card.dexIds?.length || !card.illustrator) continue;
    asiaByKey.set(key(card), [...(asiaByKey.get(key(card)) ?? []), card]);
  }

  const pairs = new Map<string, string>(curated);
  for (const [k, asiaCards] of asiaByKey) {
    const intlCards = [...(intlByKey.get(k) ?? [])].filter(
      (c) => ![...pairs.values()].includes(c.id),
    );
    if (intlCards.length === 0) continue;
    // Classic Collection reprints pair with the international subset, the rest with the main set.
    const bySubset = (subset: boolean) =>
      intlCards.filter((c) => (c.section === 'subset') === subset);
    for (const subset of [true, false]) {
      const a = asiaCards.filter((c) => (c.section === 'subset') === subset).toSorted(bySort);
      const b = bySubset(subset).toSorted(bySort);
      if (a.length !== b.length) continue; // ambiguous: leave to curation
      a.forEach((card, i) => pairs.set(card.id, (b[i] as CatalogCard).id));
    }
  }
  return pairs;
}
