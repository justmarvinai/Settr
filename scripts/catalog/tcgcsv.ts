import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CardLanguage } from '../../src/domain/catalog-types';
import type { CatalogImage, CatalogProduct } from '../../src/domain/catalog';
import type { BuiltSet } from './build';
import { download } from './fetch';
import type { createChecker } from './images';
import { dirs } from './paths';
import type { PreviousCatalog } from './previous';

/**
 * TCGCSV (tcgcsv.com) mirrors TCGplayer's catalog as static JSON. The pipeline uses it for the
 * pictures of EN and JP sealed products (DATA_SOURCES.md §4); the app loads them through the
 * same-origin proxy /img/tcgp (ARCHITECTURE.md §8.3). Build step only, never at runtime.
 */
export interface TcgcsvGroup {
  groupId: number;
  name: string;
  abbreviation?: string;
  categoryId: number;
}

export interface TcgcsvProduct {
  productId: number;
  name: string;
  groupId: number;
  extendedData?: { name: string; value: string }[];
}

export interface TcgplayerReport {
  groups: TcgcsvGroup[];
  /** Products without a card number: sealed, to curate `refs.tcgplayer`. */
  sealedCandidates: TcgcsvProduct[];
  images: { curated: number; found: number; missing: string[] };
}

const CDN = 'https://tcgplayer-cdn.tcgplayer.com/product';
const readResults = <T>(file: string) =>
  (JSON.parse(readFileSync(file, 'utf8')) as { results: T[] }).results;

/** Downloads the groups of the configured categories and the products of the matching groups. */
export async function loadTcgcsv(sets: BuiltSet[]): Promise<Omit<TcgplayerReport, 'images'>> {
  mkdirSync(dirs.tcgcsv, { recursive: true });
  const groups: TcgcsvGroup[] = [];
  const products: TcgcsvProduct[] = [];
  const wanted = sets.flatMap((s) => (s.config.tcgplayer ? [s.config.tcgplayer] : []));
  for (const category of new Set(wanted.map((w) => w.category))) {
    const file = join(dirs.tcgcsv, `groups-${category}.json`);
    await download(`https://tcgcsv.com/tcgplayer/${category}/groups`, file);
    const inCategory = wanted.filter((w) => w.category === category);
    const ids = new Set(inCategory.flatMap((w) => (w.groupId ? [w.groupId] : [])));
    const fragments = inCategory.flatMap((w) => (w.groupName ? [w.groupName.toLowerCase()] : []));
    for (const group of readResults<TcgcsvGroup>(file)) {
      const name = group.name.toLowerCase();
      if (!ids.has(group.groupId) && !fragments.some((f) => name.includes(f))) continue;
      groups.push({ ...group, categoryId: category });
      const productsFile = join(dirs.tcgcsv, `products-${group.groupId}.json`);
      await download(
        `https://tcgcsv.com/tcgplayer/${category}/${group.groupId}/products`,
        productsFile,
      );
      products.push(...readResults<TcgcsvProduct>(productsFile));
    }
  }
  const sealedCandidates = products.filter(
    (p) => !p.extendedData?.some((d) => d.name === 'Number'),
  );
  return { groups, sealedCandidates };
}

/**
 * Pictures of curated products with a TCGplayer id: the English packaging for international
 * products (shown for DE too, marked as another language), the Japanese one for JP products.
 * Both sizes the app uses must answer. Offline, the last network build's pictures are kept.
 */
export async function resolveProductImages(
  products: CatalogProduct[],
  previous: PreviousCatalog,
  checker: ReturnType<typeof createChecker> | null,
): Promise<TcgplayerReport['images']> {
  const stats: TcgplayerReport['images'] = { curated: 0, found: 0, missing: [] };
  await Promise.all(
    products.map(async (product) => {
      const id = product.refs?.tcgplayer;
      if (!id) return;
      stats.curated++;
      if (!checker) {
        const before = previous.manifest?.imagesVerified
          ? previous.products.get(product.id)?.images
          : undefined;
        if (before) product.images = before;
        if (product.images) stats.found++;
        return;
      }
      const url = `${CDN}/${id}`;
      const [small, large] = await Promise.all([
        checker.check(`${url}_400w.jpg`),
        checker.check(`${url}_in_1000x1000.jpg`),
      ]);
      if (!small || !large) {
        stats.missing.push(`${product.id} (${id})`);
        return;
      }
      const lang: CardLanguage = product.print === 'intl' ? 'en' : 'ja';
      const images: Partial<Record<CardLanguage, CatalogImage>> = {};
      for (const productLang of product.languages)
        if (product.print === 'intl' || productLang === 'ja') images[productLang] = { url, lang };
      if (Object.keys(images).length) {
        product.images = images;
        stats.found++;
      }
    }),
  );
  return stats;
}
