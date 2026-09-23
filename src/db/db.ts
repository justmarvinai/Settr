import { Dexie, type EntityTable } from 'dexie';
import type {
  CustomItem,
  Holding,
  Location,
  PriceEntry,
  PriceLatest,
  Tag,
  Tombstone,
  WishlistItem,
} from '@/domain/schemas';

/** Rows of the `kv` table: settings, meta, session state, per-device UI prefs (DATA_MODEL.md §5.9). */
export interface KvRow {
  key: string;
  value: unknown;
}

/** Local photos (I-12), downscaled before storing. */
export interface MediaRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  bytes: number;
}

export const SCHEMA_VERSION = 1;

/**
 * The only IndexedDB access in the app (ARCHITECTURE.md §4.1). Every schema change bumps the version
 * with an upgrade function, a backup migration, a fixture and a round-trip test (CLAUDE.md rule 2).
 */
export class SettrDB extends Dexie {
  declare holdings: EntityTable<Holding, 'id'>;
  declare prices: EntityTable<PriceEntry, 'id'>;
  declare priceLatest: EntityTable<PriceLatest, 'seriesKey'>;
  declare wishlist: EntityTable<WishlistItem, 'id'>;
  declare tags: EntityTable<Tag, 'id'>;
  declare locations: EntityTable<Location, 'id'>;
  declare customItems: EntityTable<CustomItem, 'id'>;
  declare media: EntityTable<MediaRow, 'id'>;
  declare kv: EntityTable<KvRow, 'key'>;
  declare tombstones: EntityTable<Tombstone, 'id'>;

  constructor(name = 'settr') {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      holdings:
        'id, item.id, setId, print, language, [item.id+language], location.id, *tags, acquisition.date, updatedAt',
      prices: 'id, seriesKey, [seriesKey+date], item.id, date, updatedAt',
      priceLatest: 'seriesKey, date',
      wishlist: 'id, item.id, updatedAt',
      tags: 'id, &name',
      locations: 'id, parentId',
      customItems: 'id, kind, setId',
      media: 'id',
      kv: 'key',
      tombstones: 'id, table, deletedAt',
    });
  }
}
