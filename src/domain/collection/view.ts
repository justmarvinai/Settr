import type { CardLanguage } from '../catalog-types';
import type { CatalogImage } from '../catalog/schema';
import { money, type Money } from '../money';
import type { Holding } from '../schemas/holding';
import { remaining } from '../schemas/holding';
import { remainingCost } from './lots';
import { NO_LOCATION, type CollectionSearch, type LotGroup, type LotSort } from './search';

/**
 * Sammlung › Karten / Sealed (COL-04, COL-05, UX_SPEC.md §4.6): one pipeline (filter → sort →
 * group) shared by the grid and the table. Rows carry what the catalog knows about a lot's item,
 * resolved by the feature, so everything here stays pure.
 */

export interface LotRow {
  holding: Holding;
  /** Display name (per the name settings) and the language it's written in. */
  name: string;
  nameLang: CardLanguage;
  /** Every name of the item, for the text filter. */
  searchText: string;
  setId?: string | undefined;
  setName?: string | undefined;
  /** As printed, e.g. `025/128`. */
  number?: string | undefined;
  /** Position in catalog order: sets in manifest order, then set order (cards). */
  setSort?: number | undefined;
  rarity?: string | undefined;
  image?: CatalogImage | undefined;
  productType?: string | undefined;
  /** "VaultX 9er · Seite 4 · Platz 7" */
  locationText?: string | undefined;
  /** False when the catalog no longer has the item (the lot shows its snapshot). */
  inCatalog: boolean;
}

export type LotFilter = Omit<CollectionSearch, 'view' | 'sort' | 'dir' | 'group'>;

const fold = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** The lot's acquisition date, or the day it was entered. */
export function boughtOn(h: Pick<Holding, 'acquisition' | 'createdAt'>): string {
  return h.acquisition.date ?? h.createdAt.slice(0, 10);
}

export function matchesFilter(row: LotRow, filter: LotFilter): boolean {
  const h = row.holding;
  if (!filter.closed && remaining(h) <= 0) return false;
  if (filter.set && row.setId !== filter.set) return false;
  if (filter.lang && h.language !== filter.lang) return false;
  if (filter.variant && h.variant !== filter.variant) return false;
  if (filter.cond && h.condition !== filter.cond) return false;
  if (filter.rarity && row.rarity !== filter.rarity) return false;
  if (filter.type && row.productType !== filter.type) return false;
  if (filter.graded === 'yes' && !h.grading) return false;
  if (filter.graded === 'no' && h.grading) return false;
  if (filter.state && (h.sealedState ?? 'sealed') !== filter.state) return false;
  if (filter.tag && !h.tags.includes(filter.tag)) return false;
  if (filter.loc === NO_LOCATION) {
    if (h.location) return false;
  } else if (filter.loc && h.location?.id !== filter.loc) {
    return false;
  }
  const bought = boughtOn(h);
  if (filter.from && bought < filter.from) return false;
  if (filter.to && bought > filter.to) return false;
  if (filter.q) {
    const q = fold(filter.q.replace(/^#/, ''));
    const number = (row.number ?? '').toLowerCase();
    const numberHit = /^\d+$/.test(q)
      ? Number(number.split('/')[0]) === Number(q)
      : number.startsWith(q);
    if (!numberHit && !fold(`${row.searchText} ${row.setName ?? ''}`).includes(q)) return false;
  }
  return true;
}

const collator = /* @__PURE__ */ new Intl.Collator('de', { numeric: true });

const COMPARE: Record<LotSort, (a: LotRow, b: LotRow) => number> = {
  added: (a, b) => a.holding.createdAt.localeCompare(b.holding.createdAt),
  name: (a, b) => collator.compare(a.name, b.name),
  number: (a, b) =>
    (a.setSort ?? Number.MAX_SAFE_INTEGER) - (b.setSort ?? Number.MAX_SAFE_INTEGER) ||
    collator.compare(a.setName ?? '', b.setName ?? '') ||
    collator.compare(a.number ?? '', b.number ?? ''),
  bought: (a, b) => boughtOn(a.holding).localeCompare(boughtOn(b.holding)),
  cost: (a, b) => unitCostMinor(a) - unitCostMinor(b),
  quantity: (a, b) => remaining(a.holding) - remaining(b.holding),
};

/** Remaining cost per remaining unit, for sorting; unknown costs sort as lowest. */
function unitCostMinor(row: LotRow): number {
  const left = remaining(row.holding);
  const cost = remainingCost(row.holding);
  return cost && left > 0 ? cost.minor / left : -1;
}

/** Newest first by default; names and numbers A→Z. */
export function defaultDirection(sort: LotSort): 'asc' | 'desc' {
  return sort === 'name' || sort === 'number' ? 'asc' : 'desc';
}

export function sortRows<T extends LotRow>(
  rows: readonly T[],
  sort: LotSort = 'added',
  dir: 'asc' | 'desc' = defaultDirection(sort),
): T[] {
  const compare = COMPARE[sort];
  const sign = dir === 'asc' ? 1 : -1;
  // Ties keep the newest lot first, so equal rows never jump around.
  return rows.toSorted(
    (a, b) => sign * compare(a, b) || b.holding.createdAt.localeCompare(a.holding.createdAt),
  );
}

export interface RowGroup<T extends LotRow = LotRow> {
  key: string;
  rows: T[];
}

const GROUP_KEY: Record<LotGroup, (row: LotRow) => string> = {
  // Custom items without a catalog set group by the set name they were given.
  set: (row) => row.setId ?? `name:${row.setName ?? ''}`,
  language: (row) => row.holding.language,
  rarity: (row) => row.rarity ?? '',
  type: (row) => row.productType ?? '',
  location: (row) => row.holding.location?.id ?? NO_LOCATION,
};

/** Groups in order of first appearance, so the sort decides which group comes first. */
export function groupRows<T extends LotRow>(rows: readonly T[], group: LotGroup): RowGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = GROUP_KEY[group](row);
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return [...groups].map(([key, list]) => ({ key, rows: list }));
}

export interface CollectionSummary {
  /** Lots shown. */
  lots: number;
  /** Copies held. */
  copies: number;
  /** Distinct items (cards or products). */
  items: number;
  /** Cost of the copies held, where known (DATA_MODEL.md §6.4 "invested"). */
  invested: Money;
  /** Lots without a known cost. */
  unknownCost: number;
}

export function summarize(rows: readonly LotRow[]): CollectionSummary {
  let copies = 0;
  let invested = 0;
  let unknownCost = 0;
  const items = new Set<string>();
  for (const row of rows) {
    const h = row.holding;
    copies += remaining(h);
    items.add(h.item.id);
    const cost = remainingCost(h);
    if (cost) invested += cost.minor;
    else unknownCost += 1;
  }
  return { lots: rows.length, copies, items: items.size, invested: money(invested), unknownCost };
}
