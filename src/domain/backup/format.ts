import { z } from 'zod';
import {
  isoTimestampSchema,
  uuidV7Schema,
  type CustomItem,
  type Holding,
  type Location,
  type PriceEntry,
  type Settings,
  type Tag,
  type Tombstone,
  type WishlistItem,
} from '../schemas';

/**
 * The full backup, `*.settr.json` (IMPORT_EXPORT.md §2): one envelope with every user table, the
 * settings and the user's Cardmarket corrections. Derived tables (priceLatest), per-device UI prefs
 * and the price session stay out.
 */

export const BACKUP_FORMAT = 'settr-backup';
/** A future password-protected backup (I-17); recognized so it can be refused clearly. */
export const BACKUP_FORMAT_ENCRYPTED = 'settr-backup-encrypted';
export const BACKUP_FORMAT_VERSION = 1;
/** Import size cap (QUALITY.md §6): parsing a bigger file would stall a phone. */
export const MAX_BACKUP_BYTES = 200 * 1024 * 1024;

/** Tables with records, in the order they're exported, counted and shown. */
export const RECORD_TABLES = [
  'holdings',
  'prices',
  'wishlist',
  'tags',
  'locations',
  'customItems',
  'media',
  'tombstones',
] as const;
export type RecordTable = (typeof RECORD_TABLES)[number];

/** A local photo with its bytes as base64 (+33 %). */
export const backupMediaSchema = z.object({
  id: uuidV7Schema,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  mime: z.string().regex(/^image\/[\w.+-]+$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
  base64: z.string(),
});
export type BackupMedia = z.infer<typeof backupMediaSchema>;

/** User corrections of Cardmarket product ids (kv `overrides:cardmarket`): item key → idProduct. */
export const cardmarketOverridesSchema = z.record(z.string(), z.number().int().positive());
export type CardmarketOverrides = z.infer<typeof cardmarketOverridesSchema>;

export interface BackupData {
  holdings: Holding[];
  prices: PriceEntry[];
  wishlist: WishlistItem[];
  tags: Tag[];
  locations: Location[];
  customItems: CustomItem[];
  media: BackupMedia[];
  settings: Settings;
  overrides: { cardmarket: CardmarketOverrides };
  tombstones: Tombstone[];
}

/** Record tables only (merge works on these; settings and overrides have their own rules). */
export type BackupTables = Pick<BackupData, RecordTable>;

export type BackupCounts = Record<RecordTable, number>;

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  schemaVersion: number;
  app: { name: 'Settr'; version: string; catalogVersion: string | null };
  exportedAt: string;
  /** The device and browser profile the backup came from (merge tie-breaks, "this device"). */
  installId: string;
  options: { includesMedia: boolean };
  counts: BackupCounts;
  checksum: { algorithm: 'SHA-256'; value: string };
  data: BackupData;
}

export function countsOf(data: BackupTables): BackupCounts {
  return {
    holdings: data.holdings.length,
    prices: data.prices.length,
    wishlist: data.wishlist.length,
    tags: data.tags.length,
    locations: data.locations.length,
    customItems: data.customItems.length,
    media: data.media.length,
    tombstones: data.tombstones.length,
  };
}

export function emptyTables(): BackupTables {
  return {
    holdings: [],
    prices: [],
    wishlist: [],
    tags: [],
    locations: [],
    customItems: [],
    media: [],
    tombstones: [],
  };
}
