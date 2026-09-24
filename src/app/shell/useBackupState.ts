import { useDataVersion, useHoldingCount, useMeta, useSettings } from '@/db/core';
// The rule only, not the backup barrel: the shell stays out of the import pipeline's code.
import { backupState, type BackupState } from '@/domain/backup/reminder';
import { useNow } from '@/lib/useNow';

export interface BackupStatus extends BackupState {
  lastBackupAt?: string | undefined;
  now: number;
}

/** Whether a backup is due (DAT-04) and why; undefined while loading. */
export function useBackupState(): BackupStatus | undefined {
  const meta = useMeta();
  const settings = useSettings();
  const holdings = useHoldingCount();
  const dataVersion = useDataVersion();
  const now = useNow();
  if (holdings === undefined || dataVersion === undefined) return undefined;
  return {
    ...backupState({
      hasData: holdings > 0,
      lastBackupAt: meta?.lastBackupAt,
      backupDataVersion: meta?.backupDataVersion,
      dataVersion,
      remindAfterDays: settings.backup.remindAfterDays,
      installedAt: meta?.createdAt,
      now,
    }),
    lastBackupAt: meta?.lastBackupAt,
    now,
  };
}
