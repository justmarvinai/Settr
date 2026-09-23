import { useSuspenseQueries } from '@tanstack/react-query';
import { sealedQuery, setQuery, useManifest, type LoadedSealed, type LoadedSet } from '@/catalog';
import { useCustomItems, useHoldings, useLatestPrices, useLocations, useSettings } from '@/db';
import { chunkSetId, pickText, type CatalogManifest, type NameDisplay } from '@/domain/catalog';
import type { LotRow } from '@/domain/collection';
import { todayIso } from '@/domain/ids';
import type { CustomItem, Holding, Location, PriceLatest } from '@/domain/schemas';
import { seriesKeyOf } from '@/domain/series';
import { valueLot, type ValuationOptions } from '@/domain/valuation';
import {
  cardInfo,
  customIdOf,
  customInfo,
  isCustomId,
  locationText,
  productInfo,
  snapshotInfo,
  type ItemInfo,
} from '@/features/collection';

/** A lot as Sammlung › Karten / Sealed shows it (COL-04, COL-05). */
export interface LibraryRow extends LotRow {
  info: ItemInfo;
  /** The set page the item lives on (a subset's main set), for links; catalog cards only. */
  pageSetId?: string | undefined;
  variantLabel?: string | undefined;
}

export type LibraryKind = 'card' | 'sealed';

interface Context {
  manifest: CatalogManifest;
  sets: ReadonlyMap<string, LoadedSet>;
  /** Card id → position in its chunk's set order. */
  order: ReadonlyMap<string, number>;
  sealed: LoadedSealed | undefined;
  custom: ReadonlyMap<string, CustomItem>;
  locations: readonly Location[];
  display: NameDisplay;
  latest: ReadonlyMap<string, PriceLatest> | undefined;
  valuation: ValuationOptions;
}

/** Room per set in the catalog-wide sort key (a chunk holds a few hundred cards). */
const SET_STRIDE = 100_000;

/** Set chunks the card lots need, in a stable order (query keys). */
function chunksOf(lots: readonly Holding[], manifest: CatalogManifest): string[] {
  const ids = new Set<string>();
  for (const h of lots) {
    if (!h.setId || isCustomId(h.item.id)) continue;
    const chunk = chunkSetId(h.setId, manifest.sets);
    if (manifest.files.sets[chunk]) ids.add(chunk);
  }
  return [...ids].toSorted();
}

function resolve(h: Holding, ctx: Context): { info: ItemInfo; names: string[]; sort?: number } {
  if (isCustomId(h.item.id)) {
    const item = ctx.custom.get(customIdOf(h.item.id));
    return item
      ? { info: customInfo(item), names: Object.values(item.name) }
      : { info: snapshotInfo(h), names: [h.snapshot.name] };
  }
  if (h.item.kind === 'sealed') {
    const product = ctx.sealed?.byId.get(h.item.id);
    if (!product) return { info: snapshotInfo(h), names: [h.snapshot.name] };
    const set = ctx.manifest.sets.find((s) => s.id === product.setIds[0]);
    return {
      info: productInfo(product, set ? pickText(set.name) : undefined),
      names: Object.values(product.name),
    };
  }
  const loaded = h.setId ? ctx.sets.get(chunkSetId(h.setId, ctx.manifest.sets)) : undefined;
  const card = loaded?.byId.get(h.item.id);
  if (!loaded || !card) return { info: snapshotInfo(h), names: [h.snapshot.name] };
  const rank = ctx.manifest.sets.findIndex((s) => s.id === loaded.set.id);
  return {
    info: cardInfo(card, loaded),
    names: Object.values(card.name),
    sort: rank * SET_STRIDE + (ctx.order.get(card.id) ?? 0),
  };
}

function rowOf(h: Holding, ctx: Context): LibraryRow {
  const { info, names, sort } = resolve(h, ctx);
  const name = info.name(h.language, ctx.display);
  const pageSetId =
    info.inCatalog && !info.custom && info.setId
      ? chunkSetId(info.setId, ctx.manifest.sets)
      : undefined;
  return {
    holding: h,
    info,
    name: name.text,
    nameLang: name.lang,
    searchText: names.join(' '),
    setId: info.setId,
    setName: info.setName,
    number: info.number,
    setSort: sort,
    rarity: info.rarity,
    image: info.image(h.language),
    productType: info.productType,
    locationText: locationText(h.location, ctx.locations),
    inCatalog: info.inCatalog,
    pageSetId,
    variantLabel: h.variant
      ? (info.variants.find((v) => v.id === h.variant)?.label ?? h.variant)
      : undefined,
    value: ctx.latest ? valueLot(h, ctx.latest.get(seriesKeyOf(h)), ctx.valuation) : undefined,
  };
}

/**
 * Every lot of one kind (open and closed) with what the catalog, the custom items and the lot's
 * snapshot know about it, and its value today (DATA_MODEL.md §6.3); undefined while the collection
 * loads. Suspends while set chunks load.
 */
export function useLibraryRows(kind: LibraryKind): LibraryRow[] | undefined {
  const holdings = useHoldings();
  const latest = useLatestPrices();
  const customItems = useCustomItems();
  const locations = useLocations();
  const settings = useSettings();
  const manifest = useManifest();
  const lots = holdings?.filter((h) => h.item.kind === kind);
  const chunks = kind === 'card' ? chunksOf(lots ?? [], manifest) : [];
  const loadedSets = useSuspenseQueries({
    queries: chunks.map((id) => setQuery(manifest, id)),
  }).map((result) => result.data);
  const sealedQueries: ReturnType<typeof sealedQuery>[] =
    kind === 'sealed' ? [sealedQuery(manifest)] : [];
  const sealed = useSuspenseQueries({ queries: sealedQueries })[0]?.data;
  if (!lots || !customItems || !locations) return undefined;

  const order = new Map<string, number>();
  for (const loaded of loadedSets) loaded.cards.forEach((card, index) => order.set(card.id, index));
  const ctx: Context = {
    manifest,
    sets: new Map(loadedSets.map((loaded) => [loaded.set.id, loaded])),
    order,
    sealed,
    custom: new Map(customItems.map((item) => [item.id, item])),
    locations,
    display: settings.nameDisplay,
    latest,
    valuation: {
      today: todayIso(),
      staleAfterDays: settings.price.staleAfterDays,
      unpriced: settings.price.unpriced,
    },
  };
  return lots.map((h) => rowOf(h, ctx));
}
