import { z } from 'zod';
import { CARD_LANGUAGES, CONDITIONS, type CardLanguage } from '../catalog-types';
import type { CatalogImage } from '../catalog/schema';
import { money, type Money } from '../money';
import type { Holding } from '../schemas/holding';
import { remaining } from '../schemas/holding';
import { remainingCost } from './lots';

/**
 * Sammlung › Karten / Sealed (COL-04, COL-05, UX_SPEC.md §4.6): the URL state and one pipeline
 * (filter → sort → group) shared by the grid and the table. Rows carry what the catalog knows about
 * a lot's item, resolved by the feature, so everything here stays pure.
 */

const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

export const COLLECTION_VIEWS = ['grid', 'table'] as const;
export type CollectionView = (typeof COLLECTION_VIEWS)[number];

export const LOT_SORTS = ['added', 'name', 'number', 'bought', 'cost', 'quantity'] as const;
export type LotSort = (typeof LOT_SORTS)[number];

export const LOT_GROUPS = ['set', 'language', 'rarity', 'location'] as const;
export type LotGroup = (typeof LOT_GROUPS)[number];

/** Location filter value for lots without a location. */
export const NO_LOCATION = 'none';

export const collectionSearchSchema = z.object({
  view: optional(z.enum(COLLECTION_VIEWS)),
  q: optional(z.string().max(80)),
  set: optional(z.string().max(80)),
  lang: optional(z.enum(CARD_LANGUAGES)),
  variant: optional(z.string().max(40)),
  cond: optional(z.enum(CONDITIONS)),
  graded: optional(z.enum(['yes', 'no'])),
  state: optional(z.enum(['sealed', 'damaged'])),
  tag: optional(z.string().max(80)),
  loc: optional(z.string().max(80)),
  from: optional(z.iso.date()),
  to: optional(z.iso.date()),
  sort: optional(z.enum(LOT_SORTS)),
  dir: optional(z.enum(['asc', 'desc'])),
  group: optional(z.enum(LOT_GROUPS)),
  /** Also show closed lots (everything sold, traded or opened). */
  closed: optional(z.boolean()),
});
export type CollectionSearch = z.infer<typeof collectionSearchSchema>;

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
  /** Position in set order (cards). */
  setSort?: number | undefined;
  rarity?: string | undefined;
  image?: CatalogImage | undefined;
  productType?: string | undefined;
  locationName?: string | undefined;
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
    collator.compare(a.setName ?? '', b.setName ?? '') ||
    (a.setSort ?? Number.MAX_SAFE_INTEGER) - (b.setSort ?? Number.MAX_SAFE_INTEGER) ||
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

export function sortRows(
  rows: readonly LotRow[],
  sort: LotSort = 'added',
  dir: 'asc' | 'desc' = defaultDirection(sort),
): LotRow[] {
  const compare = COMPARE[sort];
  const sign = dir === 'asc' ? 1 : -1;
  // Ties keep the newest lot first, so equal rows never jump around.
  return rows.toSorted(
    (a, b) => sign * compare(a, b) || b.holding.createdAt.localeCompare(a.holding.createdAt),
  );
}

export interface RowGroup {
  key: string;
  rows: LotRow[];
}

const GROUP_KEY: Record<LotGroup, (row: LotRow) => string> = {
  set: (row) => row.setId ?? '',
  language: (row) => row.holding.language,
  rarity: (row) => row.rarity ?? '',
  location: (row) => row.holding.location?.id ?? NO_LOCATION,
};

/** Groups in order of first appearance, so the sort decides which group comes first. */
export function groupRows(rows: readonly LotRow[], group: LotGroup): RowGroup[] {
  const groups = new Map<string, LotRow[]>();
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
