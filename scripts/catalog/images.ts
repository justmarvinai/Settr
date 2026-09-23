import type { CardLanguage } from '../../src/domain/catalog-types';
import type { CatalogImage } from '../../src/domain/catalog/schema';
import type { BuiltCard, BuiltSet } from './build';
import type { PreviousCatalog } from './previous';
import { assetBase } from './tcgdex';

/** Languages TCGdex may hold pictures in, per print, best first. */
const POOL: Record<'intl' | 'asia', CardLanguage[]> = {
  intl: ['en', 'de', 'fr', 'it', 'es', 'pt'],
  asia: ['ja', 'zh-tw', 'zh-cn'],
};

/** GET (the body is dropped) with one retry on network errors. */
async function answers(url: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      await response.body?.cancel();
      return response.ok;
    } catch {
      // retry once on network errors
    }
  }
  return false;
}

/**
 * Asks TCGdex's image server whether a file exists, once per URL and eight at a time. TCGdex's
 * asset index (`datas.json`) lags behind new sets (its own API special-cases 30th), so the server
 * answer decides, not the index.
 */
function createChecker() {
  const results = new Map<string, Promise<boolean>>();
  const queue: (() => void)[] = [];
  let running = 0;
  let checked = 0;
  const check = (url: string): Promise<boolean> => {
    const known = results.get(url);
    if (known) return known;
    const result = new Promise<boolean>((resolve) => {
      const run = () => {
        running++;
        checked++;
        void answers(url).then((ok) => {
          running--;
          resolve(ok);
          queue.shift()?.();
        });
      };
      if (running < 8) run();
      else queue.push(run);
    });
    results.set(url, result);
    return result;
  };
  return { check, count: () => checked };
}

export interface ImageStats {
  /** Every picture was checked by a network build (this one or, carried over, the last one). */
  verified: boolean;
  checked: number;
  /** Offline: cards whose pictures came from the last network build. */
  carried: number;
  /** Per card language: exact · other language · counterpart · none. */
  coverage: Record<
    string,
    { exact: number; otherLanguage: number; counterpart: number; none: number }
  >;
  /** Set logos and symbols found. */
  logos: number;
  symbols: number;
}

/**
 * Picks the best picture per card language (DATA_SOURCES.md §5): the exact language, another
 * language of the same print, the counterpart from the other print, or nothing (placeholder).
 * With network, every URL must answer a GET. Offline, pictures and logos of the last network
 * build are kept; cards it didn't know get their exact-language candidate, unverified.
 */
export async function resolveImages(
  sets: BuiltSet[],
  previous: PreviousCatalog,
  options: { verify: boolean },
): Promise<ImageStats> {
  const cards = sets.flatMap((s) => s.cards);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const printOf = (card: BuiltCard) =>
    sets.find((s) => s.config.id === card.setId)?.config.print ?? 'intl';
  const checker = createChecker();
  const exists = (card: BuiltCard, lang: CardLanguage) =>
    checker.check(`${assetBase(lang, card.source.set, card.source.localId)}/low.webp`);
  const stats: ImageStats = {
    verified: options.verify,
    checked: 0,
    carried: 0,
    coverage: {},
    logos: 0,
    symbols: 0,
  };
  const count = (lang: CardLanguage, picked: CatalogImage | undefined) => {
    const bucket = (stats.coverage[lang] ??= {
      exact: 0,
      otherLanguage: 0,
      counterpart: 0,
      none: 0,
    });
    if (!picked) bucket.none++;
    else if (picked.counterpart) bucket.counterpart++;
    else if (picked.lang === lang) bucket.exact++;
    else bucket.otherLanguage++;
  };

  if (!options.verify) {
    const carried = previous.manifest?.imagesVerified ? previous.cards : null;
    for (const card of cards) {
      const before = carried?.get(card.id);
      if (before) {
        card.images = before.images;
        stats.carried++;
      } else {
        const own = POOL[printOf(card)];
        card.images = Object.fromEntries(
          card.languages
            .filter((lang) => own.includes(lang))
            .map((lang) => [
              lang,
              { url: assetBase(lang, card.source.set, card.source.localId), lang },
            ]),
        );
      }
      for (const lang of card.languages) count(lang, card.images[lang]);
    }
    stats.verified = carried !== null && stats.carried === cards.length;
    for (const set of sets) {
      const before = carried ? previous.sets.get(set.config.id) : undefined;
      if (before?.logo) set.summary.logo = before.logo;
      if (before?.symbol) set.summary.symbol = before.symbol;
      if (set.summary.logo) stats.logos++;
      if (set.summary.symbol) stats.symbols++;
    }
    return stats;
  }

  await Promise.all(
    cards.map(async (card) => {
      const own = POOL[printOf(card)];
      const images: Partial<Record<CardLanguage, CatalogImage>> = {};
      for (const lang of card.languages) {
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
        count(lang, picked);
        if (picked) images[lang] = picked;
      }
      card.images = images;
    }),
  );

  const base = 'https://assets.tcgdex.net';
  await Promise.all(
    sets.map(async (set) => {
      const { raw } = set;
      const logos: Partial<Record<CardLanguage, string>> = {};
      for (const lang of set.config.languages) {
        const url = `${base}/${lang}/${raw.serie.id}/${raw.id}/logo`;
        if (await checker.check(`${url}.webp`)) logos[lang] = url;
      }
      if (Object.keys(logos).length) {
        set.summary.logo = logos;
        stats.logos++;
      }
      const symbol = `${base}/univ/${raw.serie.id}/${raw.id}/symbol`;
      if (await checker.check(`${symbol}.webp`)) {
        set.summary.symbol = symbol;
        stats.symbols++;
      }
    }),
  );
  stats.checked = checker.count();
  return stats;
}
