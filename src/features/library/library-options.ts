import { PRODUCT_TYPES, RARITY_IDS } from '@/domain/catalog';
import {
  CARD_LANGUAGES,
  CONDITIONS,
  type CardLanguage,
  type Condition,
} from '@/domain/catalog-types';
import {
  NO_LOCATION,
  type CollectionSearch,
  type LotFilter,
  type LotGroup,
  type LotSort,
  type RowGroup,
} from '@/domain/collection';
import { remaining, type Location, type Tag } from '@/domain/schemas';
import { conditionLabel, sealedStateLabel } from '@/i18n/collection-labels';
import { languageLabel, m, productTypeLabel, rarityLabel } from '@/i18n';
import { formatDate } from '@/i18n/format';
import type { LibraryKind, LibraryRow } from '@/features/collection';

/** What each library offers (UX_SPEC.md §4.6); sealed lots have no number, rarity or condition. */
const PRICE_SORTS: readonly LotSort[] = ['value', 'unitValue', 'pl', 'plRatio', 'priceDate'];

export const LIBRARY_SORTS: Record<LibraryKind, readonly LotSort[]> = {
  card: ['added', 'name', 'number', 'bought', 'cost', 'quantity', ...PRICE_SORTS],
  sealed: ['added', 'name', 'bought', 'cost', 'quantity', ...PRICE_SORTS],
};

export const LIBRARY_GROUPS: Record<LibraryKind, readonly LotGroup[]> = {
  card: ['set', 'language', 'rarity', 'location'],
  sealed: ['set', 'language', 'type', 'location'],
};

export const SORT_LABELS: Record<LotSort, () => string> = {
  added: m.library_sort_added,
  name: m.library_sort_name,
  number: m.library_sort_number,
  bought: m.library_sort_bought,
  cost: m.library_sort_cost,
  quantity: m.library_sort_quantity,
  unitValue: m.library_sort_unit_value,
  value: m.library_sort_value,
  pl: m.library_sort_pl,
  plRatio: m.library_sort_pl_ratio,
  priceDate: m.library_sort_price_date,
};

export const GROUP_LABELS: Record<LotGroup, () => string> = {
  set: m.library_group_set,
  language: m.library_group_language,
  rarity: m.library_group_rarity,
  type: m.library_group_type,
  location: m.library_group_location,
};

/** The URL's filters that apply to this library; others (a card filter on Sealed) are ignored. */
export function filterOf(s: CollectionSearch, kind: LibraryKind): LotFilter {
  const common: LotFilter = {
    q: s.q,
    set: s.set,
    lang: s.lang,
    tag: s.tag,
    loc: s.loc,
    from: s.from,
    to: s.to,
    closed: s.closed,
    priced: s.priced,
    stale: s.stale,
    pl: s.pl,
  };
  return kind === 'card'
    ? { ...common, rarity: s.rarity, variant: s.variant, cond: s.cond, graded: s.graded }
    : { ...common, type: s.type, state: s.state };
}

/** Every filter key cleared: view, sort and grouping stay. */
export const NO_FILTERS: Partial<CollectionSearch> = {
  q: undefined,
  set: undefined,
  lang: undefined,
  rarity: undefined,
  variant: undefined,
  cond: undefined,
  graded: undefined,
  type: undefined,
  state: undefined,
  tag: undefined,
  loc: undefined,
  from: undefined,
  to: undefined,
  closed: undefined,
  priced: undefined,
  stale: undefined,
  pl: undefined,
};

const KNOWN_RARITIES = /* @__PURE__ */ new Set<string>(RARITY_IDS);

export interface Named {
  id: string;
  name: string;
}

/** The values the collection actually has, so the filter sheet never offers an empty choice. */
export interface FilterOptions {
  sets: Named[];
  languages: CardLanguage[];
  rarities: string[];
  variants: Named[];
  conditions: Condition[];
  types: string[];
  tags: Named[];
  /** Used locations, plus "Ohne Lagerort" when some lots have none. */
  locations: Named[];
  graded: boolean;
  /** Closed lots (everything sold, traded or opened). */
  closed: number;
  /** Open lots with and without a price, with a stale one, in profit and at a loss. */
  priced: number;
  unpriced: number;
  stale: number;
  gains: number;
  losses: number;
}

export function filterOptions(
  rows: readonly LibraryRow[],
  tags: readonly Tag[],
  locations: readonly Location[],
): FilterOptions {
  const sets = new Map<string, string>();
  const languages = new Set<string>();
  const rarities = new Set<string>();
  const variants = new Map<string, string>();
  const conditions = new Set<string>();
  const types = new Set<string>();
  const tagIds = new Set<string>();
  const locationIds = new Set<string>();
  let graded = false;
  let closed = 0;
  let priced = 0;
  let stale = 0;
  let gains = 0;
  let losses = 0;
  for (const row of rows) {
    const h = row.holding;
    if (row.setId && !sets.has(row.setId)) sets.set(row.setId, row.setName ?? row.setId);
    languages.add(h.language);
    if (row.rarity) rarities.add(row.rarity);
    if (h.variant) variants.set(h.variant, row.variantLabel ?? h.variant);
    if (h.condition) conditions.add(h.condition);
    if (row.productType) types.add(row.productType);
    for (const tag of h.tags) tagIds.add(tag);
    locationIds.add(h.location?.id ?? NO_LOCATION);
    if (h.grading) graded = true;
    if (remaining(h) <= 0) {
      closed += 1;
      continue;
    }
    if (row.value?.unit) priced += 1;
    if (row.value?.stale) stale += 1;
    const pl = row.value?.pl?.minor ?? 0;
    if (pl > 0) gains += 1;
    if (pl < 0) losses += 1;
  }
  const collator = new Intl.Collator('de');
  const usedLocations: Named[] = locations
    .filter((l) => locationIds.has(l.id))
    .map((l) => ({ id: l.id, name: l.name }));
  if (locationIds.has(NO_LOCATION)) {
    usedLocations.push({ id: NO_LOCATION, name: m.library_filter_no_location() });
  }
  return {
    sets: [...sets].map(([id, name]) => ({ id, name })),
    languages: CARD_LANGUAGES.filter((l) => languages.has(l)),
    rarities: [
      ...RARITY_IDS.filter((r) => rarities.has(r)),
      ...[...rarities]
        .filter((r) => !KNOWN_RARITIES.has(r))
        .toSorted((a, b) => collator.compare(a, b)),
    ],
    variants: [...variants]
      .map(([id, name]) => ({ id, name }))
      .toSorted((a, b) => collator.compare(a.name, b.name)),
    conditions: CONDITIONS.filter((c) => conditions.has(c)),
    types: [...types].toSorted((a, b) =>
      collator.compare(productTypeLabel(a), productTypeLabel(b)),
    ),
    tags: tags.filter((t) => tagIds.has(t.id)).map((t) => ({ id: t.id, name: t.name })),
    locations: usedLocations,
    graded,
    closed,
    priced,
    unpriced: rows.length - closed - priced,
    stale,
    gains,
    losses,
  };
}

export interface FilterChip {
  key: string;
  text: string;
  clear: Partial<CollectionSearch>;
}

const nameIn = (list: readonly Named[], id: string) => list.find((n) => n.id === id)?.name ?? id;

/** Active filters as removable chips in the filter bar (UX_SPEC.md §4.6). */
export function filterChips(
  filter: LotFilter,
  options: FilterOptions,
  tags: readonly Tag[],
  locations: readonly Location[],
): FilterChip[] {
  const chips: FilterChip[] = [];
  const add = (key: string, label: string, value: string, clear: Partial<CollectionSearch>) =>
    chips.push({ key, text: m.library_chip({ label, value }), clear });
  if (filter.set) {
    add('set', m.library_filter_set(), nameIn(options.sets, filter.set), { set: undefined });
  }
  if (filter.lang) {
    add('lang', m.holding_language(), languageLabel(filter.lang), { lang: undefined });
  }
  if (filter.rarity) {
    add('rarity', m.catalog_filter_rarity(), rarityLabel(filter.rarity), { rarity: undefined });
  }
  if (filter.variant) {
    add('variant', m.holding_variant(), nameIn(options.variants, filter.variant), {
      variant: undefined,
    });
  }
  if (filter.cond) {
    add('cond', m.holding_condition(), conditionLabel(filter.cond), { cond: undefined });
  }
  if (filter.graded) {
    add(
      'graded',
      m.library_filter_graded(),
      filter.graded === 'yes' ? m.library_filter_graded_yes() : m.library_filter_graded_no(),
      { graded: undefined },
    );
  }
  if (filter.type) {
    add('type', m.catalog_filter_product_type(), productTypeLabel(filter.type), {
      type: undefined,
    });
  }
  if (filter.state) {
    add('state', m.holding_state(), sealedStateLabel(filter.state), { state: undefined });
  }
  if (filter.tag) {
    const tag = tags.find((t) => t.id === filter.tag)?.name ?? filter.tag;
    add('tag', m.library_filter_tag(), tag, { tag: undefined });
  }
  if (filter.loc) {
    const where =
      filter.loc === NO_LOCATION
        ? m.library_filter_no_location()
        : (locations.find((l) => l.id === filter.loc)?.name ?? filter.loc);
    add('loc', m.holding_location(), where, { loc: undefined });
  }
  if (filter.from) {
    chips.push({
      key: 'from',
      text: m.library_chip_from({ date: formatDate(filter.from) }),
      clear: { from: undefined },
    });
  }
  if (filter.to) {
    chips.push({
      key: 'to',
      text: m.library_chip_to({ date: formatDate(filter.to) }),
      clear: { to: undefined },
    });
  }
  if (filter.priced) {
    add(
      'priced',
      m.library_filter_priced(),
      filter.priced === 'yes' ? m.library_filter_priced_yes() : m.library_filter_priced_no(),
      { priced: undefined },
    );
  }
  if (filter.stale) {
    chips.push({ key: 'stale', text: m.library_chip_stale(), clear: { stale: undefined } });
  }
  if (filter.pl) {
    add(
      'pl',
      m.library_filter_pl(),
      filter.pl === 'gain' ? m.library_filter_pl_gain() : m.library_filter_pl_loss(),
      { pl: undefined },
    );
  }
  if (filter.closed) {
    chips.push({ key: 'closed', text: m.library_chip_closed(), clear: { closed: undefined } });
  }
  return chips;
}

/** Heading of a group (UX_SPEC.md §4.6 "Group by"). */
export function groupTitle(
  group: LotGroup,
  key: string,
  rows: readonly LibraryRow[],
  locations: readonly Location[],
): string {
  const titles: Record<LotGroup, () => string> = {
    set: () =>
      key.startsWith('name:')
        ? key.slice('name:'.length) || m.library_group_no_set()
        : (rows[0]?.setName ?? key),
    language: () => languageLabel(key),
    rarity: () => (key ? rarityLabel(key) : m.library_group_no_rarity()),
    type: () => (key ? productTypeLabel(key) : m.library_group_no_type()),
    location: () =>
      key === NO_LOCATION
        ? m.library_filter_no_location()
        : (locations.find((l) => l.id === key)?.name ?? key),
  };
  return titles[group]();
}

/** Position in a list, with anything unknown or empty after the known values. */
const rankIn = (list: readonly string[], key: string) => {
  const index = list.indexOf(key);
  return index < 0 ? list.length : index;
};

/**
 * Groups in their dimension's own order (sets as in the catalog, rarities from common up,
 * languages as everywhere else, locations as sorted in Einstellungen), "without" groups last. The
 * lots inside each group keep the chosen sort.
 */
export function orderGroups(
  groups: readonly RowGroup<LibraryRow>[],
  group: LotGroup,
  locations: readonly Location[],
): RowGroup<LibraryRow>[] {
  const locationIds = locations.map((l) => l.id);
  const rank: Record<LotGroup, (g: RowGroup<LibraryRow>) => number> = {
    set: (g) => Math.min(...g.rows.map((row) => row.setSort ?? Number.MAX_SAFE_INTEGER)),
    language: (g) => rankIn(CARD_LANGUAGES, g.key),
    rarity: (g) => rankIn(RARITY_IDS, g.key),
    type: (g) => rankIn(PRODUCT_TYPES, g.key),
    location: (g) => rankIn(locationIds, g.key),
  };
  return groups.toSorted((a, b) => rank[group](a) - rank[group](b) || a.key.localeCompare(b.key));
}
