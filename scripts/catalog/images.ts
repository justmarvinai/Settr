import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CardLanguage } from '../../src/domain/catalog-types';
import type { CatalogImage } from '../../src/domain/catalog/schema';
import type { BuiltCard, BuiltSet } from './build';
import { dirs } from './paths';
import { assetBase } from './tcgdex';

type Datas = Record<string, Record<string, Record<string, Record<string, unknown>>>>;

/** TCGdex's asset index (`datas.json`: lang → serie → set → card/logo). Only available with network. */
export function loadAssetIndex(): Datas | null {
  const file = join(dirs.tcgdexAssets, 'datas.json');
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Datas) : null;
}

/** Languages TCGdex may hold pictures in, per print, best first. */
const POOL: Record<'intl' | 'asia', CardLanguage[]> = {
  intl: ['en', 'de', 'fr', 'it', 'es', 'pt'],
  asia: ['ja', 'zh-tw'],
};

async function isReachable(url: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`${url}/low.webp`, { signal: AbortSignal.timeout(15_000) });
      await response.body?.cancel();
      return response.ok;
    } catch {
      // retry once on network errors
    }
  }
  return false;
}

export interface ImageStats {
  verified: boolean;
  checked: number;
  /** Per card language: exact · other language · counterpart · none. */
  coverage: Record<
    string,
    { exact: number; otherLanguage: number; counterpart: number; none: number }
  >;
}

/**
 * Picks the best picture per card language (DATA_SOURCES.md §5): the exact language, another
 * language of the same print, the counterpart from the other print, or nothing (placeholder).
 * With the asset index, a URL must be listed there and answer a GET; offline, only the exact
 * language is emitted, unverified.
 */
export async function resolveImages(
  sets: BuiltSet[],
  index: Datas | null,
  options: { verify: boolean },
): Promise<ImageStats> {
  const cards = sets.flatMap((s) => s.cards);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const printOf = (card: BuiltCard) =>
    sets.find((s) => s.config.id === card.setId)?.config.print ?? 'intl';
  const reachable = new Map<string, Promise<boolean>>();
  let checked = 0;
  const queue: (() => void)[] = [];
  let running = 0;
  const limited = (url: string) =>
    new Promise<boolean>((resolve) => {
      const run = () => {
        running++;
        checked++;
        void isReachable(url).then((ok) => {
          running--;
          resolve(ok);
          queue.shift()?.();
        });
      };
      if (running < 8) run();
      else queue.push(run);
    });
  const exists = (card: BuiltCard, lang: CardLanguage): Promise<boolean> => {
    const { set, localId } = card.source;
    if (!index) return Promise.resolve(false);
    if (!index[lang]?.[set.serie.id]?.[set.id]?.[localId]) return Promise.resolve(false);
    if (!options.verify) return Promise.resolve(true);
    const url = assetBase(lang, set, localId);
    if (!reachable.has(url)) reachable.set(url, limited(url));
    return reachable.get(url) as Promise<boolean>;
  };

  const stats: ImageStats = {
    verified: Boolean(index) && options.verify,
    checked: 0,
    coverage: {},
  };
  await Promise.all(
    cards.map(async (card) => {
      const own = POOL[printOf(card)];
      const images: Partial<Record<CardLanguage, CatalogImage>> = {};
      for (const lang of card.languages) {
        const bucket = (stats.coverage[lang] ??= {
          exact: 0,
          otherLanguage: 0,
          counterpart: 0,
          none: 0,
        });
        if (!index) {
          // Offline build: the exact-language candidate only, verified later in CI.
          if (own.includes(lang))
            images[lang] = { url: assetBase(lang, card.source.set, card.source.localId), lang };
          continue;
        }
        let picked: CatalogImage | undefined;
        for (const candidate of [lang, ...own.filter((l) => l !== lang)]) {
          if (await exists(card, candidate)) {
            picked = {
              url: assetBase(candidate, card.source.set, card.source.localId),
              lang: candidate,
            };
            break;
          }
        }
        for (const partnerId of picked ? [] : (card.counterparts ?? [])) {
          const partner = byId.get(partnerId);
          if (!partner) continue;
          for (const candidate of POOL[printOf(partner)]) {
            if (await exists(partner, candidate)) {
              picked = {
                url: assetBase(candidate, partner.source.set, partner.source.localId),
                lang: candidate,
                counterpart: true,
              };
              break;
            }
          }
          if (picked) break;
        }
        if (!picked) bucket.none++;
        else if (picked.counterpart) bucket.counterpart++;
        else if (picked.lang === lang) bucket.exact++;
        else bucket.otherLanguage++;
        if (picked) images[lang] = picked;
      }
      card.images = images;
    }),
  );
  stats.checked = checked;

  for (const set of sets) {
    const { raw } = set;
    const logos: Partial<Record<CardLanguage, string>> = {};
    for (const lang of set.config.languages) {
      if (index?.[lang]?.[raw.serie.id]?.[raw.id]?.logo)
        logos[lang] = `https://assets.tcgdex.net/${lang}/${raw.serie.id}/${raw.id}/logo`;
    }
    if (Object.keys(logos).length) set.summary.logo = logos;
    if (index?.univ?.[raw.serie.id]?.[raw.id]?.symbol)
      set.summary.symbol = `https://assets.tcgdex.net/univ/${raw.serie.id}/${raw.id}/symbol`;
  }
  return stats;
}
