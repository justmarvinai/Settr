import {
  planMerge,
  readBackup,
  type BackupData,
  type BackupReadError,
  type MergePlan,
} from '@/domain/backup';
import { newId, nowIso } from '@/domain/ids';
import { sha256Hex } from '@/lib/hash';
import {
  envelopeOf,
  OVERRIDES_KEY,
  readUserData,
  readUserState,
  toMediaRow,
  userTables,
} from './backup';
import type { SettrDB } from './db';
import {
  bumpDataVersion,
  ensureMeta,
  getDataVersion,
  markBackupDone,
  markImportDone,
} from './repositories/meta';
import { rebuildPriceLatest } from './repositories/prices';
import {
  addSnapshot,
  clearSnapshots,
  getSnapshot,
  type SnapshotDB,
  type SnapshotReason,
} from './snapshots';

/**
 * Import (IMPORT_EXPORT.md §4, §5): replace or merge, always after a safety snapshot, in one
 * read-write transaction that rolls back completely on any failure. Nothing is written when the
 * data changed between the snapshot and the write.
 */

export type ImportMode = 'replace' | 'merge';

export interface AppInfo {
  appVersion: string;
  catalogVersion: string | null;
}

/** Something else wrote while the import was being prepared; try again (nothing was written). */
export class DataChangedError extends Error {
  constructor() {
    super('Data changed while the import was being prepared');
    this.name = 'DataChangedError';
  }
}

export class SnapshotUnreadableError extends Error {
  readonly reason: BackupReadError | 'missing';
  constructor(reason: BackupReadError | 'missing') {
    super('Snapshot unreadable');
    this.name = 'SnapshotUnreadableError';
    this.reason = reason;
  }
}

/** Keys that point at this device's series and selection; they don't survive a replace. */
const SESSION_KEYS = ['priceSession', 'ui:session.selection'];

function writeScope(db: SettrDB) {
  return [...userTables(db), db.priceLatest, db.kv];
}

async function assertUnchanged(db: SettrDB, expected: number | undefined): Promise<void> {
  if (expected !== undefined && (await getDataVersion(db)) !== expected) {
    throw new DataChangedError();
  }
}

/** Replaces all user data with `data` (settings and overrides included). */
async function writeReplace(db: SettrDB, data: BackupData, expected?: number): Promise<number> {
  return db.transaction('rw', writeScope(db), async () => {
    await assertUnchanged(db, expected);
    for (const table of userTables(db)) await table.clear();
    await db.holdings.bulkPut(data.holdings);
    await db.prices.bulkPut(data.prices);
    await db.wishlist.bulkPut(data.wishlist);
    await db.tags.bulkPut(data.tags);
    await db.locations.bulkPut(data.locations);
    await db.customItems.bulkPut(data.customItems);
    await db.media.bulkPut(data.media.map(toMediaRow));
    await db.tombstones.bulkPut(data.tombstones);
    await db.kv.put({ key: 'settings', value: data.settings });
    await db.kv.put({ key: OVERRIDES_KEY, value: data.overrides.cardmarket });
    await db.kv.bulkDelete(SESSION_KEYS);
    await rebuildPriceLatest(db);
    await markImportDone(db);
    return bumpDataVersion(db);
  });
}

async function writeMerge(
  db: SettrDB,
  plan: MergePlan,
  incoming: BackupData,
  local: BackupData,
  settingsFromBackup: boolean,
  expected: number,
): Promise<void> {
  await db.transaction('rw', writeScope(db), async () => {
    await assertUnchanged(db, expected);
    await db.holdings.bulkDelete(plan.holdings.remove);
    await db.holdings.bulkPut(plan.holdings.put);
    await db.prices.bulkDelete(plan.prices.remove);
    await db.prices.bulkPut(plan.prices.put);
    await db.wishlist.bulkDelete(plan.wishlist.remove);
    await db.wishlist.bulkPut(plan.wishlist.put);
    // Tag names are a unique index: take the changed tags out first, so a rename and a new tag
    // with the old name can be written in any order.
    await db.tags.bulkDelete([...plan.tags.remove, ...plan.tags.put.map((t) => t.id)]);
    await db.tags.bulkPut(plan.tags.put);
    await db.locations.bulkDelete(plan.locations.remove);
    await db.locations.bulkPut(plan.locations.put);
    await db.customItems.bulkDelete(plan.customItems.remove);
    await db.customItems.bulkPut(plan.customItems.put);
    await db.media.bulkDelete(plan.media.remove);
    await db.media.bulkPut(plan.media.put.map(toMediaRow));
    await db.tombstones.clear();
    await db.tombstones.bulkPut(plan.tombstones);
    if (settingsFromBackup) await db.kv.put({ key: 'settings', value: incoming.settings });
    // Corrections from both; this device's win where both corrected the same product.
    await db.kv.put({
      key: OVERRIDES_KEY,
      value: { ...incoming.overrides.cardmarket, ...local.overrides.cardmarket },
    });
    await rebuildPriceLatest(db);
    await markImportDone(db);
    await bumpDataVersion(db);
  });
}

/** Saves the current state as a snapshot; returns it with what was read. */
async function snapshotNow(
  db: SettrDB,
  snaps: SnapshotDB,
  reason: SnapshotReason,
  label: string | undefined,
  app: AppInfo,
) {
  const meta = await ensureMeta(db);
  const state = await readUserState(db);
  const envelope = await envelopeOf(state.data, meta.installId, { ...app, includesMedia: true });
  const json = JSON.stringify(envelope);
  const id = newId();
  await addSnapshot(snaps, {
    id,
    createdAt: envelope.exportedAt,
    reason,
    label,
    counts: envelope.counts,
    bytes: new Blob([json]).size,
    json,
  });
  return { id, state, installId: meta.installId };
}

/** What a merge would do with this device's current data (the preview, §4 step 6). */
export async function previewMerge(
  db: SettrDB,
  incoming: { data: BackupData; installId?: string | undefined },
): Promise<MergePlan> {
  const meta = await ensureMeta(db);
  const local = await readUserData(db);
  return planMerge(
    { tables: local, installId: meta.installId },
    { tables: incoming.data, installId: incoming.installId ?? '' },
  );
}

export interface ImportRequest {
  mode: ImportMode;
  data: BackupData;
  /** The backup's device (merge tie-breaks). */
  installId?: string | undefined;
  /** When the backup was made: after a replace, it's this data's latest backup. */
  exportedAt?: string | undefined;
  /** Merge: take the backup's settings instead of keeping this device's. */
  settingsFromBackup?: boolean;
  /** The file's name, shown with the snapshot. */
  label?: string | undefined;
  app: AppInfo;
}

export interface ImportOutcome {
  /** The snapshot of the data before the import (undo). */
  snapshotId: string;
  /** The merge as written (recomputed from the snapshot's data). */
  plan?: MergePlan;
}

export async function importBackup(
  db: SettrDB,
  snaps: SnapshotDB,
  request: ImportRequest,
): Promise<ImportOutcome> {
  const snapshot = await snapshotNow(db, snaps, 'import', request.label, request.app);
  const { data: local, dataVersion } = snapshot.state;
  if (request.mode === 'replace') {
    const version = await writeReplace(db, request.data, dataVersion);
    // The file holds exactly this data: it counts as its latest backup (no reminder right away).
    await markBackupDone(db, request.exportedAt ?? nowIso(), version);
    return { snapshotId: snapshot.id };
  }
  const plan = planMerge(
    { tables: local, installId: snapshot.installId },
    { tables: request.data, installId: request.installId ?? '' },
  );
  await writeMerge(db, plan, request.data, local, request.settingsFromBackup ?? false, dataVersion);
  return { snapshotId: snapshot.id, plan };
}

/**
 * Puts a snapshot's state back (undo an import). The current state is saved first, so this can be
 * undone as well. Returns the id of that new snapshot.
 */
export async function restoreSnapshot(
  db: SettrDB,
  snaps: SnapshotDB,
  id: string,
  app: AppInfo,
): Promise<{ snapshotId: string }> {
  const row = await getSnapshot(snaps, id);
  if (!row) throw new SnapshotUnreadableError('missing');
  // Through the import pipeline: a snapshot from an older schema is migrated like any backup.
  const read = await readBackup(row.json, sha256Hex);
  if (!read.ok) throw new SnapshotUnreadableError(read.error);
  const current = await snapshotNow(db, snaps, 'restore', undefined, app);
  await writeReplace(db, read.backup.data, current.state.dataVersion);
  return { snapshotId: current.id };
}

/**
 * Deletes all data on this device (DAT-09): the collection, prices, tags, Lagerorte, own items,
 * settings, device preferences and the safety snapshots. The catalog and app files stay cached.
 */
export async function wipeAll(db: SettrDB, snaps: SnapshotDB): Promise<void> {
  await db.transaction('rw', writeScope(db), async () => {
    for (const table of [...userTables(db), db.priceLatest]) await table.clear();
    // The change counter only ever grows: caches keyed on it must not see an old number again.
    await db.kv.where('key').notEqual('dataVersion').delete();
    await bumpDataVersion(db);
  });
  await clearSnapshots(snaps);
}
