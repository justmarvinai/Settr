import type { LoadedSet } from '@/catalog';
import {
  lotName,
  pickText,
  productNameIn,
  STANDARD_VARIANT,
  type CardSection,
  type CatalogCard,
  type CatalogImage,
  type CatalogProduct,
  type NameDisplay,
  type ShownName,
} from '@/domain/catalog';
import type { CardLanguage, ItemRef, Print } from '@/domain/catalog-types';
import type { CustomItem, Holding, ItemSnapshot } from '@/domain/schemas';

/**
 * What a lot is about, whether a catalog card, a sealed product or a custom item (CAT-08), in one
 * shape for the sheets and lists. Lots whose item left the catalog fall back to their snapshot.
 */
export interface ItemInfo {
  ref: ItemRef;
  custom: boolean;
  inCatalog: boolean;
  setId?: string | undefined;
  print?: Print | undefined;
  setName?: string | undefined;
  /** As printed, e.g. `150/128`. */
  number?: string | undefined;
  localId?: string | undefined;
  section?: CardSection | undefined;
  sort?: number | undefined;
  rarity?: string | undefined;
  languages: CardLanguage[];
  /** Card variants that exist (ids with labels); empty for sealed products. */
  variants: { id: string; label: string }[];
  productType?: string | undefined;
  name: (lang: CardLanguage, display?: NameDisplay) => ShownName;
  image: (lang: CardLanguage) => CatalogImage | undefined;
}

export const CUSTOM_PREFIX = 'custom:';
export const isCustomId = (id: string) => id.startsWith(CUSTOM_PREFIX);
export const customIdOf = (itemId: string) => itemId.slice(CUSTOM_PREFIX.length);

export function cardInfo(card: CatalogCard, loaded: LoadedSet): ItemInfo {
  const legend = new Map(loaded.variantsLegend.map((v) => [v.id, pickText(v.label)]));
  const set = loaded.sets.get(card.setId) ?? loaded.set;
  return {
    ref: { kind: 'card', id: card.id },
    custom: false,
    inCatalog: true,
    setId: card.setId,
    print: set.print,
    setName: pickText(set.name),
    number: card.printedNumber || card.localId,
    localId: card.localId,
    section: card.section,
    sort: card.sort,
    rarity: card.rarity,
    languages: card.languages,
    variants: card.variants.map((v) => ({ id: v.id, label: legend.get(v.id) ?? v.id })),
    name: (lang, display = 'copy') => lotName(card, lang, display),
    image: (lang) => card.images[lang],
  };
}

export function productInfo(product: CatalogProduct, setName?: string): ItemInfo {
  return {
    ref: { kind: 'sealed', id: product.id },
    custom: false,
    inCatalog: true,
    setId: product.setIds[0],
    print: product.print,
    setName,
    languages: product.languages,
    variants: [],
    productType: product.type,
    name: (lang) => productNameIn(product, lang),
    image: (lang) => product.images?.[lang] ?? Object.values(product.images ?? {})[0],
  };
}

export function customInfo(item: CustomItem): ItemInfo {
  const text = (lang: CardLanguage): ShownName => {
    const own = item.name[lang];
    if (own) return { text: own, lang, translated: false };
    const first = item.languages.find((l) => item.name[l]) ?? lang;
    return { text: item.name[first] ?? pickText(item.name), lang: first, translated: false };
  };
  return {
    ref: { kind: item.kind, id: `${CUSTOM_PREFIX}${item.id}` },
    custom: true,
    inCatalog: true,
    setId: item.setId,
    print: item.print,
    setName: item.setName,
    number: item.localId,
    localId: item.localId,
    rarity: item.rarity,
    languages: item.languages,
    variants:
      item.kind === 'card'
        ? (item.variants?.length ? item.variants : [STANDARD_VARIANT]).map((id) => ({
            id,
            label: id,
          }))
        : [],
    productType: item.productType,
    name: text,
    image: () => undefined,
  };
}

/** A lot whose item isn't in the catalog (any more): its snapshot is all there is. */
export function snapshotInfo(
  holding: Pick<Holding, 'item' | 'snapshot' | 'setId' | 'print' | 'language' | 'variant'>,
): ItemInfo {
  const { snapshot } = holding;
  return {
    ref: holding.item,
    custom: isCustomId(holding.item.id),
    inCatalog: false,
    setId: holding.setId,
    print: holding.print,
    setName: snapshot.setName,
    number: snapshot.localId,
    localId: snapshot.localId,
    languages: [holding.language],
    variants: holding.variant ? [{ id: holding.variant, label: holding.variant }] : [],
    name: () => ({ text: snapshot.name, lang: holding.language, translated: false }),
    image: () => undefined,
  };
}

/** Display snapshot written with every lot (DATA_MODEL.md §4.2). */
export function snapshotOf(info: ItemInfo, lang: CardLanguage): ItemSnapshot {
  const snapshot: ItemSnapshot = { name: info.name(lang).text };
  if (info.setName) snapshot.setName = info.setName;
  if (info.localId) snapshot.localId = info.localId;
  const image = info.image(lang)?.url;
  if (image) snapshot.image = image;
  return snapshot;
}

/** Languages to offer: the item's languages the user collects, plus `keep` (e.g. when editing). */
export function offeredLanguages(
  info: Pick<ItemInfo, 'languages'>,
  collected: readonly CardLanguage[],
  keep?: CardLanguage,
): CardLanguage[] {
  const mine = info.languages.filter((l) => collected.includes(l) || l === keep);
  return mine.length ? mine : [...info.languages];
}
