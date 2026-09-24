/**
 * When a backup is due (DAT-04, IMPORT_EXPORT.md §8): there's data, it changed since the last backup,
 * and that backup is older than the reminder interval (default 7 days), or 50 changes have piled up.
 * Without any backup yet, data is due at once (the pill turns amber); the reminder toast waits until
 * the install is a day old or 50 changes piled up, so a first session isn't interrupted. Pure: the
 * shell passes the counters and the clock.
 */

export const REMIND_AFTER_CHANGES = 50;
const DAY_MS = 86_400_000;

export interface BackupDueInput {
  /** Lots exist (the collection is what's worth saving). */
  hasData: boolean;
  lastBackupAt?: string | undefined;
  /** The change counter when that backup was made; unknown for backups made before it was kept. */
  backupDataVersion?: number | undefined;
  /** The change counter now (kv `dataVersion`). */
  dataVersion: number;
  remindAfterDays: number;
  /** When this install began (meta `createdAt`). */
  installedAt?: string | undefined;
  now: number;
}

export interface BackupState {
  /** A backup is due: the pill turns amber. */
  due: boolean;
  /** Worth a reminder toast (at most once a day). */
  remind: boolean;
  /** Changes since the last backup, when known. */
  changes?: number | undefined;
}

export function backupState(input: BackupDueInput): BackupState {
  const { hasData, lastBackupAt, backupDataVersion, dataVersion, remindAfterDays, now } = input;
  if (!lastBackupAt) {
    const settled = !input.installedAt || now - Date.parse(input.installedAt) > DAY_MS;
    return {
      due: hasData,
      remind: hasData && (settled || dataVersion >= REMIND_AFTER_CHANGES),
      changes: hasData ? dataVersion : undefined,
    };
  }
  const changes =
    backupDataVersion === undefined ? undefined : Math.max(0, dataVersion - backupDataVersion);
  // A backup from before the counter was kept: assume something changed since.
  const changed = changes === undefined ? dataVersion > 0 : changes > 0;
  if (!hasData || !changed) return { due: false, remind: false, changes };
  const old = now - Date.parse(lastBackupAt) > remindAfterDays * DAY_MS;
  const due = old || (changes ?? 0) >= REMIND_AFTER_CHANGES;
  return { due, remind: due, changes };
}
