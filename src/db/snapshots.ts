import { Dexie, type EntityTable } from 'dexie';
import type { BackupCounts } from '@/domain/backup';

/**
 * Safety snapshots (IMPORT_EXPORT.md §1.4, §4 step 8): before an import replaces or merges data, the
 * current state is saved as a full backup in its own IndexedDB database, `settr-snapshots`, so it
 * survives whatever happens to the main one. The last three are kept.
 */

export type SnapshotReason = 'import' | 'restore';

export interface SnapshotRow {
  /** UUIDv7, so ids sort by time. */
  id: string;
  createdAt: string;
  /** What came next: an import (merge or replace) or a restore of an older snapshot. */
  reason: SnapshotReason;
  /** The imported file's name, for the list. */
  label?: string | undefined;
  counts: BackupCounts;
  /** Size of the JSON text. */
  bytes: number;
  /** The state as a backup envelope (`*.settr.json` content). */
  json: string;
}

export type SnapshotInfo = Omit<SnapshotRow, 'json'>;

export const KEEP_SNAPSHOTS = 3;

export class SnapshotDB extends Dexie {
  declare snapshots: EntityTable<SnapshotRow, 'id'>;

  constructor(name = 'settr-snapshots') {
    super(name);
    this.version(1).stores({ snapshots: 'id, createdAt' });
  }
}

export const snapshotDb = new SnapshotDB();

/** Adds a snapshot and drops all but the newest KEEP_SNAPSHOTS. */
export async function addSnapshot(snaps: SnapshotDB, row: SnapshotRow): Promise<void> {
  await snaps.transaction('rw', snaps.snapshots, async () => {
    await snaps.snapshots.add(row);
    // UUIDv7 keys sort by creation, even within one millisecond.
    const newestFirst = (await snaps.snapshots.toCollection().primaryKeys()).toReversed();
    const old = newestFirst.slice(KEEP_SNAPSHOTS);
    if (old.length) await snaps.snapshots.bulkDelete(old);
  });
}

/** Newest first, without their (possibly large) JSON. */
export async function listSnapshots(snaps: SnapshotDB): Promise<SnapshotInfo[]> {
  const rows = await snaps.snapshots.toArray();
  return rows.toReversed().map(({ json: _json, ...info }) => info);
}

export async function getSnapshot(snaps: SnapshotDB, id: string): Promise<SnapshotRow | undefined> {
  return snaps.snapshots.get(id);
}

export async function clearSnapshots(snaps: SnapshotDB): Promise<void> {
  await snaps.snapshots.clear();
}
