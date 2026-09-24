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

export type Answer = 'yes' | 'no' | 'unknown';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET (the body is dropped). A success is a picture and a client error a missing one; rate limits
 * (429), timeouts and server errors are retried with backoff (1, 2, 4, 8 s, or the server's
 * Retry-After) and stay `unknown` if they never settle: one throttled run must not read as
 * hundreds of missing pictures (the 2026-09-24 sync lost half of them that way).
 */
export async function answers(
  url: string,
  get: (url: string) => Promise<Response> = (u) =>
    fetch(u, { signal: AbortSignal.timeout(15_000) }),
  wait: (ms: number) => Promise<unknown> = sleep,
): Promise<Answer> {
  for (let attempt = 0; attempt < 5; attempt++) {
    let retryAfter = 0;
    try {
      const response = await get(url);
      await response.body?.cancel();
      if (response.ok) return 'yes';
      const { status } = response;
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) return 'no';
      retryAfter = Number(response.headers.get('retry-after')) || 0;
    } catch {
      // network error or timeout: retry
    }
    if (attempt < 4) await wait(Math.min(Math.max(retryAfter * 1000, 1000 * 2 ** attempt), 30_000));
  }
  return 'unknown';
}

/**
 * Asks TCGdex's image server whether a file exists, once per URL and eight at a time. TCGdex's
 * asset index (`datas.json`) lags behind new sets (its own API special-cases 30th), so the server
 * answer decides, not the index. An answer that never settles counts as the last build's: a URL it
 * used is taken for existing.
 */
export function createChecker(knownGood: ReadonlySet<string> = new Set()) {
  const results = new Map<string, Promise<boolean>>();
  const queue: (() => void)[] = [];
  let running = 0;
  let checked = 0;
  let inconclusive = 0;
  const check = (url: string): Promise<boolean> => {
    const known = results.get(url);
    if (known) return known;
    const result = new Promise<boolean>((resolve) => {
      const run = () => {
        running++;
        checked++;
        void answers(url).then((answer) => {
          running--;
          if (answer === 'unknown') inconclusive++;
          resolve(answer === 'yes' || (answer === 'unknown' && knownGood.has(url)));
          queue.shift()?.();
        });
      };
      if (running < 8) run();
      else queue.push(run);
    });
    results.set(url, result);
    return result;
  };
  return { check, count: () => checked, inconclusive: () => inconclusive };
}

export interface ImageStats {
  /** Every picture was checked by a network build (this one or, carried over, the last one). */
  verified: boolean;
  checked: number;
  /** Checks that never got an answer (rate limits, server errors); the last build's pictures stood in. */
  inconclusive: number;
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
  // The files the last network build found, to stand in for checks that never get an answer.
  const knownGood = new Set<string>();
  if (previous.manifest?.imagesVerified) {
    for (const card of previous.cards.values())
      for (const image of Object.values(card.images))
        if (image) knownGood.add(`${image.url}/low.webp`);
    for (const set of previous.sets.values()) {
      for (const logo of Object.values(set.logo ?? {})) if (logo) knownGood.add(`${logo}.webp`);
      if (set.symbol) knownGood.add(`${set.symbol}.webp`);
    }
  }
  const checker = createChecker(knownGood);
  const exists = (card: BuiltCard, lang: CardLanguage) =>
    checker.check(`${assetBase(lang, card.source.set, card.source.localId)}/low.webp`);
  // A gallery's pictures may sit in its main set's folder (SetConfig.picturesIn).
  const elsewhere = new Map(
    sets.flatMap((s) =>
      s.config.picturesIn ? [[s.config.id, { ...s.raw, id: s.config.picturesIn }] as const] : [],
    ),
  );
  const stats: ImageStats = {
    verified: options.verify,
    checked: 0,
    inconclusive: 0,
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
    // Per card: a card the last build knew keeps its pictures (checked, if that build was),
    // one it didn't gets its exact-language candidate until the next network build.
    const carried = previous.cards;
    for (const card of cards) {
      const before = carried.get(card.id);
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
    stats.verified = previous.manifest?.imagesVerified === true && stats.carried === cards.length;
    for (const set of sets) {
      const before = previous.sets.get(set.config.id);
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
        const folder = picked ? undefined : elsewhere.get(card.setId);
        for (const candidate of folder ? [lang, ...own.filter((l) => l !== lang)] : []) {
          if (!folder) break;
          const url = assetBase(candidate, folder, card.source.localId);
          if (await checker.check(`${url}/low.webp`)) {
            picked = { url, lang: candidate };
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
        // A donor card with the same artwork (ADR-051): a Scarlet & Violet reprint, say.
        const donor = picked ? undefined : card.source.donor;
        for (const candidate of donor ? POOL.intl : []) {
          if (!donor) break;
          const url = assetBase(candidate, donor.set, donor.localId);
          if (await checker.check(`${url}/low.webp`)) {
            picked = { url, lang: candidate, counterpart: true };
            break;
          }
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
  stats.inconclusive = checker.inconclusive();
  return stats;
}
