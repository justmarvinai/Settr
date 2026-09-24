import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  canonicalJson,
  cardmarketOverridesSchema,
  countsOf,
  type BackupData,
  type BackupEnvelope,
  type BackupMedia,
} from '@/domain/backup';
import { nowIso } from '@/domain/ids';
import { resolveSettings, SCHEMA_VERSION } from '@/domain/schemas';
import { sha256Hex } from '@/lib/hash';
import type { MediaRow, SettrDB } from './db';
import { ensureMeta, getDataVersion, markBackupDone } from './repositories/meta';

/**
 * Full backup (IMPORT_EXPORT.md §2, §3): one JSON envelope with every user table, the settings and
 * the user's Cardmarket corrections. Derived tables (priceLatest), per-device UI prefs and the price
 * session stay out.
 */

export const OVERRIDES_KEY = 'overrides:cardmarket';

/** The tables a backup holds, besides `kv` (settings, overrides). */
export function userTables(db: SettrDB) {
  return [
    db.holdings,
    db.prices,
    db.wishlist,
    db.tags,
    db.locations,
    db.customItems,
    db.media,
    db.tombstones,
  ];
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function fromBase64(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function toBackupMedia({ blob, ...rest }: MediaRow): Promise<BackupMedia> {
  return { ...rest, base64: await toBase64(blob) };
}

export function toMediaRow({ base64, ...rest }: BackupMedia): MediaRow {
  return { ...rest, blob: fromBase64(base64, rest.mime) };
}

/**
 * Every user table, the settings and the overrides, read in one read-only transaction so they're a
 * consistent snapshot, with the change counter they were read at. Without media the photos table
 * reads as empty.
 */
export async function readUserState(
  db: SettrDB,
  { includesMedia = true }: { includesMedia?: boolean } = {},
): Promise<{ data: BackupData; dataVersion: number }> {
  const read = await db.transaction('r', [...userTables(db), db.kv], async () => ({
    holdings: await db.holdings.toArray(),
    prices: await db.prices.toArray(),
    wishlist: await db.wishlist.toArray(),
    tags: await db.tags.toArray(),
    locations: await db.locations.toArray(),
    customItems: await db.customItems.toArray(),
    media: includesMedia ? await db.media.toArray() : [],
    tombstones: await db.tombstones.toArray(),
    settings: (await db.kv.get('settings'))?.value,
    cardmarket: (await db.kv.get(OVERRIDES_KEY))?.value,
    dataVersion: await getDataVersion(db),
  }));
  // Outside the transaction: reading a blob isn't an IndexedDB request and would end it.
  const media: BackupMedia[] = [];
  for (const row of read.media) media.push(await toBackupMedia(row));
  const overrides = cardmarketOverridesSchema.safeParse(read.cardmarket ?? {});
  return {
    data: {
      holdings: read.holdings,
      prices: read.prices,
      wishlist: read.wishlist,
      tags: read.tags,
      locations: read.locations,
      customItems: read.customItems,
      media,
      settings: resolveSettings(read.settings),
      overrides: { cardmarket: overrides.success ? overrides.data : {} },
      tombstones: read.tombstones,
    },
    dataVersion: read.dataVersion,
  };
}

export async function readUserData(
  db: SettrDB,
  options: { includesMedia?: boolean } = {},
): Promise<BackupData> {
  return (await readUserState(db, options)).data;
}

export interface BackupOptions {
  appVersion: string;
  catalogVersion: string | null;
  includesMedia?: boolean;
  now?: Date;
}

/** Wraps data in the backup envelope with counts and the checksum over its canonical JSON. */
export async function envelopeOf(
  data: BackupData,
  installId: string,
  options: BackupOptions,
): Promise<BackupEnvelope> {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    app: { name: 'Settr', version: options.appVersion, catalogVersion: options.catalogVersion },
    exportedAt: nowIso(options.now),
    installId,
    options: { includesMedia: options.includesMedia ?? true },
    counts: countsOf(data),
    checksum: { algorithm: 'SHA-256', value: await sha256Hex(canonicalJson(data)) },
    data,
  };
}

export async function createBackup(db: SettrDB, options: BackupOptions): Promise<BackupEnvelope> {
  const includesMedia = options.includesMedia ?? true;
  const meta = await ensureMeta(db);
  const data = await readUserData(db, { includesMedia });
  return envelopeOf(data, meta.installId, { ...options, includesMedia });
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `settr-backup-2026-09-23-1012.settr.json` (local time). */
export function backupFileName(now: Date = new Date()): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `settr-backup-${date}-${pad(now.getHours())}${pad(now.getMinutes())}.settr.json`;
}

/**
 * Marks the backup as done once its download has started (IMPORT_EXPORT.md §3 step 6), with the
 * change counter at that moment, so reminders count the changes since (DAT-04).
 */
export async function recordBackup(db: SettrDB, envelope: BackupEnvelope): Promise<void> {
  await markBackupDone(db, envelope.exportedAt, await getDataVersion(db));
}
