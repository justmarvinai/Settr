import * as fc from 'fast-check';
import type { BackupMedia, BackupTables } from '@/domain/backup';
import { newId } from '@/domain/ids';
import { cardSeriesKey } from '@/domain/series';
import type {
  CustomItem,
  Holding,
  Location,
  PriceEntry,
  Tag,
  Tombstone,
  WishlistItem,
} from '@/domain/schemas';

/**
 * Valid user records with sensible defaults (QUALITY.md §2.2), and fast-check arbitraries for whole
 * datasets (round-trip and merge properties).
 */

const T0 = '2026-09-01T10:00:00.000Z';

export function holding(patch: Partial<Holding> = {}): Holding {
  return {
    id: newId(),
    createdAt: T0,
    updatedAt: T0,
    item: { kind: 'card', id: 'intl:30th:025' },
    setId: 'intl:30th',
    print: 'intl',
    snapshot: { name: 'Pikachu', setName: '30 Jahre', localId: '025' },
    language: 'de',
    variant: 'normal',
    condition: 'NM',
    quantity: 1,
    acquisition: {
      type: 'purchase',
      date: '2026-09-01',
      priceTotal: { minor: 450, currency: 'EUR' },
    },
    disposals: [],
    tags: [],
    mediaIds: [],
    ...patch,
  };
}

export function price(patch: Partial<PriceEntry> = {}): PriceEntry {
  const item = patch.item ?? { kind: 'card', id: 'intl:30th:025' };
  const language = patch.language ?? 'de';
  const variant = patch.variant ?? 'normal';
  return {
    id: newId(),
    createdAt: T0,
    updatedAt: T0,
    seriesKey: cardSeriesKey(item.id, language, variant, 'raw'),
    item,
    language,
    variant,
    grade: 'raw',
    snapshot: { name: 'Pikachu', setName: '30 Jahre', localId: '025' },
    date: '2026-09-01',
    price: { minor: 50, currency: 'EUR' },
    priceType: 'from',
    source: 'cardmarket',
    origin: 'manual',
    ...patch,
  };
}

export function tag(name: string, patch: Partial<Tag> = {}): Tag {
  return { id: newId(), createdAt: T0, updatedAt: T0, name, ...patch };
}

export function location(name: string, patch: Partial<Location> = {}): Location {
  return {
    id: newId(),
    createdAt: T0,
    updatedAt: T0,
    name,
    kind: 'binder',
    layout: { columns: 3, rows: 3 },
    ...patch,
  };
}

export function customItem(patch: Partial<CustomItem> = {}): CustomItem {
  return {
    id: newId(),
    createdAt: T0,
    updatedAt: T0,
    kind: 'card',
    name: { de: 'Promo-Pikachu' },
    languages: ['de'],
    ...patch,
  };
}

export function wishlistItem(patch: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: newId(),
    createdAt: T0,
    updatedAt: T0,
    item: { kind: 'card', id: 'intl:30th:150' },
    snapshot: { name: 'Pikachu-ex' },
    priority: 2,
    ...patch,
  };
}

export function media(patch: Partial<BackupMedia> = {}): BackupMedia {
  return {
    id: newId(),
    createdAt: T0,
    updatedAt: T0,
    mime: 'image/webp',
    width: 2,
    height: 3,
    bytes: 4,
    base64: 'AQID+g==',
    ...patch,
  };
}

export function tombstone(id: string, table: string, deletedAt = T0): Tombstone {
  return { id, table, deletedAt };
}

// ─── Arbitraries ────────────────────────────────────────────────────────────────────────────────

const uuid = fc.uuid({ version: 7 });
const timestamp = fc
  .integer({ min: Date.parse('2026-01-01T00:00:00Z'), max: Date.parse('2026-09-20T00:00:00Z') })
  .map((ms) => new Date(ms).toISOString());
const day = fc.integer({ min: 0, max: 200 }).map((n) => {
  const date = new Date(Date.UTC(2026, 0, 1 + n));
  return date.toISOString().slice(0, 10);
});
const text = fc.string({ minLength: 1, maxLength: 12 });
const cents = fc
  .integer({ min: 0, max: 500_000 })
  .map((minor) => ({ minor, currency: 'EUR' as const }));
const cardId = fc.constantFrom('intl:30th:025', 'intl:30th:150', 'asia:M6a:017', 'intl:30th-c:004');
const language = fc.constantFrom('de' as const, 'en' as const, 'ja' as const, 'zh-tw' as const);
const base = fc.record({ id: uuid, createdAt: timestamp, updatedAt: timestamp });

export const holdingArb: fc.Arbitrary<Holding> = fc
  .record(
    {
      base,
      itemId: cardId,
      language,
      quantity: fc.integer({ min: 1, max: 6 }),
      bought: day,
      paid: cents,
      note: text,
      sold: fc.integer({ min: 0, max: 6 }),
    },
    { requiredKeys: ['base', 'itemId', 'language', 'quantity', 'sold'] },
  )
  .map(({ base: b, itemId, language: lang, quantity, bought, paid, note, sold }) => {
    const h: Holding = {
      ...b,
      item: { kind: 'card', id: itemId },
      setId: itemId.split(':').slice(0, 2).join(':'),
      snapshot: { name: itemId },
      language: lang,
      variant: 'normal',
      condition: 'NM',
      quantity,
      acquisition: {
        type: 'purchase',
        ...(bought ? { date: bought } : {}),
        ...(paid ? { priceTotal: paid } : {}),
      },
      disposals:
        sold > 0 && bought
          ? [{ id: newId(), type: 'sale', date: bought, quantity: Math.min(sold, quantity) }]
          : [],
      tags: [],
      mediaIds: [],
      ...(note ? { note } : {}),
    };
    return h;
  });

export const priceArb: fc.Arbitrary<PriceEntry> = fc
  .record({ base, itemId: cardId, language, date: day, amount: cents, guide: fc.boolean() })
  .map(({ base: b, itemId, language: lang, date, amount, guide }) => ({
    ...b,
    seriesKey: cardSeriesKey(itemId, lang, 'normal', 'raw'),
    item: { kind: 'card', id: itemId },
    language: lang,
    variant: 'normal',
    grade: 'raw',
    snapshot: { name: itemId },
    date,
    price: amount,
    priceType: guide ? 'trend' : 'from',
    source: 'cardmarket',
    origin: guide ? 'guide' : 'manual',
  }));

export const tagArb: fc.Arbitrary<Tag> = fc
  .record({ base, name: text })
  .map(({ base: b, name }) => ({ ...b, name }));

export const locationArb: fc.Arbitrary<Location> = fc
  .record({ base, name: text, pages: fc.integer({ min: 1, max: 40 }) })
  .map(({ base: b, name, pages }) => ({
    ...b,
    name,
    kind: 'binder',
    layout: { columns: 3, rows: 3 },
    pages,
  }));

export const customItemArb: fc.Arbitrary<CustomItem> = fc
  .record({ base, name: text })
  .map(({ base: b, name }) => ({ ...b, kind: 'card', name: { de: name }, languages: ['de'] }));

/** A consistent dataset: unique ids, unique tag names, lots tagged and placed with its own ones. */
export const tablesArb: fc.Arbitrary<BackupTables> = fc
  .record({
    holdings: fc.uniqueArray(holdingArb, { selector: (h) => h.id, maxLength: 8 }),
    prices: fc.uniqueArray(priceArb, { selector: (p) => p.id, maxLength: 8 }),
    tags: fc.uniqueArray(tagArb, {
      selector: (t) => t.name.trim().toLocaleLowerCase('de'),
      maxLength: 4,
    }),
    locations: fc.uniqueArray(locationArb, { selector: (l) => l.id, maxLength: 3 }),
    customItems: fc.uniqueArray(customItemArb, { selector: (c) => c.id, maxLength: 2 }),
    deleted: fc.uniqueArray(fc.tuple(uuid, timestamp), { selector: ([id]) => id, maxLength: 3 }),
  })
  .map(({ holdings, prices, tags, locations, customItems, deleted }) => ({
    holdings: holdings.map((h, i) => ({
      ...h,
      tags: tags.length ? [tags[i % tags.length]!.id] : [],
      ...(locations.length ? { location: { id: locations[i % locations.length]!.id } } : {}),
    })),
    prices,
    wishlist: [],
    tags: tags.filter((t, i, all) => all.findIndex((u) => u.id === t.id) === i),
    locations,
    customItems,
    media: [],
    tombstones: deleted.map(([id, at]) => tombstone(id, 'holdings', at)),
  }));
