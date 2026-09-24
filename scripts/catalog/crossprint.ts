import type { CatalogCard } from '../../src/domain/catalog/schema';

/**
 * Pairs Asian-print cards with the international card showing the same artwork (JP M6a 001 ↔
 * 30th 001): same category, same Pokédex numbers and the same (first) illustrator. Ties, like the
 * two halves of Darkrai & Cresselia LEGEND or a Pokémon's ex, full art and gold print by one
 * artist, pair up in number order. Trainers and special Energy have no Pokédex numbers, so they
 * pair by trainer type (or energy kind), illustrator and whether they are numbered or secret (a
 * Supporter and its full art are often by one artist), and only when that is unique on both
 * sides: two Items by one artist stay for curation, because the two prints order them
 * differently. Curated counterparts win.
 */
const illustrator = (c: CatalogCard) =>
  (c.illustrator ?? '')
    .split('+')[0]
    ?.replace(/[^\p{Script=Latin}\d .'-]/gu, '')
    .trim()
    .toLowerCase() ?? '';

/** Matching key, and whether ties may pair in number order. */
function keyOf(c: CatalogCard): { key: string; ordered: boolean } | null {
  if (!c.illustrator || !illustrator(c)) return null;
  if (c.category === 'pokemon')
    return c.dexIds?.length
      ? { key: `pokemon|${c.dexIds.join(',')}|${illustrator(c)}`, ordered: true }
      : null;
  const tier = c.section === 'main' ? 'main' : 'other';
  if (c.category === 'trainer')
    return { key: `trainer|${c.trainerType ?? ''}|${illustrator(c)}|${tier}`, ordered: false };
  if (c.energyKind === 'special')
    return { key: `energy|special|${illustrator(c)}|${tier}`, ordered: false };
  return null; // basic Energy: curated `namesFrom`
}

const bySort = (x: CatalogCard, y: CatalogCard) => x.sort - y.sort;

/** Cards by matching key (curated ones skipped). */
function group(cards: readonly CatalogCard[], skip?: ReadonlyMap<string, string>) {
  const map = new Map<string, { ordered: boolean; cards: CatalogCard[] }>();
  for (const card of cards) {
    const k = skip?.has(card.id) ? null : keyOf(card);
    if (!k) continue;
    const entry = map.get(k.key) ?? { ordered: k.ordered, cards: [] };
    entry.cards.push(card);
    map.set(k.key, entry);
  }
  return map;
}

export function matchCounterparts(
  asia: readonly CatalogCard[],
  intl: readonly CatalogCard[],
  curated: ReadonlyMap<string, string>,
): Map<string, string> {
  const intlByKey = group(intl);
  const asiaByKey = group(asia, curated);

  const pairs = new Map<string, string>(curated);
  const taken = new Set(curated.values());
  for (const [k, { ordered, cards: asiaCards }] of asiaByKey) {
    const intlCards = (intlByKey.get(k)?.cards ?? []).filter((c) => !taken.has(c.id));
    if (intlCards.length === 0) continue;
    // Classic Collection reprints pair with the international subset, the rest with the main set.
    for (const subset of [true, false]) {
      const a = asiaCards.filter((c) => (c.section === 'subset') === subset).toSorted(bySort);
      const b = intlCards.filter((c) => (c.section === 'subset') === subset).toSorted(bySort);
      if (a.length === 0 || a.length !== b.length) continue; // ambiguous: leave to curation
      if (!ordered && a.length > 1) continue;
      a.forEach((card, i) => {
        const partner = b[i] as CatalogCard;
        pairs.set(card.id, partner.id);
        taken.add(partner.id);
      });
    }
  }
  return pairs;
}
