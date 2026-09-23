import { nowIso } from '@/domain/ids';
import { resolveSettings } from '@/domain/schemas';
import { SCHEMA_VERSION, type SettrDB } from './db';
import { ensureMeta, markBackupDone } from './repositories/meta';

/**
 * Full backup (IMPORT_EXPORT.md §2): one JSON envelope with every user table, the settings and the
 * user's Cardmarket corrections. Derived tables (priceLatest) and per-device UI prefs stay out.
 * M3 ships the export (DAT-01 lite); import, merge and snapshots follow in M5.
 */

export const BACKUP_FORMAT = 'settr-backup';
export const BACKUP_FORMAT_VERSION = 1;

const TABLES = [
  'holdings',
  'prices',
  'wishlist',
  'tags',
  'locations',
  'customItems',
  'media',
  'tombstones',
] as const;
type Table = (typeof TABLES)[number];

export interface BackupMedia {
  id: string;
  createdAt: string;
  updatedAt: string;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  base64: string;
}

export interface BackupData {
  holdings: unknown[];
  prices: unknown[];
  wishlist: unknown[];
  tags: unknown[];
  locations: unknown[];
  customItems: unknown[];
  media: BackupMedia[];
  settings: unknown;
  overrides: { cardmarket: unknown };
  tombstones: unknown[];
}

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  schemaVersion: number;
  app: { name: 'Settr'; version: string; catalogVersion: string | null };
  exportedAt: string;
  installId: string;
  options: { includesMedia: boolean };
  counts: Record<Table, number>;
  checksum: { algorithm: 'SHA-256'; value: string };
  data: BackupData;
}

/** JSON with object keys sorted at every level and no whitespace (the checksum's input). */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return entry;
    return Object.fromEntries(
      Object.entries(entry).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
  });
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export interface BackupOptions {
  appVersion: string;
  catalogVersion: string | null;
  includesMedia?: boolean;
  now?: Date;
}

/** Reads every table in one read-only transaction, so the backup is a consistent snapshot. */
export async function createBackup(db: SettrDB, options: BackupOptions): Promise<BackupEnvelope> {
  const includesMedia = options.includesMedia ?? true;
  const meta = await ensureMeta(db);
  const snapshot = await db.transaction('r', [...TABLES.map((t) => db[t]), db.kv], async () => ({
    holdings: await db.holdings.toArray(),
    prices: await db.prices.toArray(),
    wishlist: await db.wishlist.toArray(),
    tags: await db.tags.toArray(),
    locations: await db.locations.toArray(),
    customItems: await db.customItems.toArray(),
    media: includesMedia ? await db.media.toArray() : [],
    tombstones: await db.tombstones.toArray(),
    settings: (await db.kv.get('settings'))?.value,
    cardmarket: (await db.kv.get('overrides:cardmarket'))?.value,
  }));

  const media: BackupMedia[] = [];
  for (const { blob, ...rest } of snapshot.media) {
    media.push({ ...rest, base64: await toBase64(blob) });
  }
  const data: BackupData = {
    holdings: snapshot.holdings,
    prices: snapshot.prices,
    wishlist: snapshot.wishlist,
    tags: snapshot.tags,
    locations: snapshot.locations,
    customItems: snapshot.customItems,
    media,
    settings: resolveSettings(snapshot.settings),
    overrides: { cardmarket: snapshot.cardmarket ?? {} },
    tombstones: snapshot.tombstones,
  };
  const counts: Record<Table, number> = {
    holdings: data.holdings.length,
    prices: data.prices.length,
    wishlist: data.wishlist.length,
    tags: data.tags.length,
    locations: data.locations.length,
    customItems: data.customItems.length,
    media: data.media.length,
    tombstones: data.tombstones.length,
  };
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    app: { name: 'Settr', version: options.appVersion, catalogVersion: options.catalogVersion },
    exportedAt: nowIso(options.now),
    installId: meta.installId,
    options: { includesMedia },
    counts,
    checksum: { algorithm: 'SHA-256', value: await sha256Hex(canonicalJson(data)) },
    data,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `settr-backup-2026-09-23-1012.settr.json` (local time). */
export function backupFileName(now: Date = new Date()): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `settr-backup-${date}-${pad(now.getHours())}${pad(now.getMinutes())}.settr.json`;
}

/** Marks the backup as done once its download has started (IMPORT_EXPORT.md §3 step 6). */
export async function recordBackup(db: SettrDB, envelope: BackupEnvelope): Promise<void> {
  await markBackupDone(db, envelope.exportedAt);
}
