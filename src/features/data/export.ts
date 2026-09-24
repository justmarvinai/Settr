import type { QueryClient } from '@tanstack/react-query';
import { manifestQuery } from '@/catalog';
import { toastManager } from '@/components/ui/Toasts';
import { backupFileName, createBackup, db, recordBackup } from '@/db';
import { m } from '@/i18n';
import { toastError } from '@/features/collection';
import { download, saveFile } from './save-file';

/** The app and catalog versions a backup or snapshot records. */
export async function appInfo(queryClient: QueryClient) {
  // Only when needed: the Daten page itself must work without the catalog (offline).
  const catalogVersion = await queryClient.ensureQueryData(manifestQuery).then(
    (manifest) => manifest.catalogVersion,
    () => null,
  );
  return { appVersion: import.meta.env.VITE_APP_VERSION, catalogVersion };
}

/** An error as a toast; a full disk gets its own (features/collection). */
export function toastFailure(error: unknown): void {
  toastError(error);
}

/**
 * Backup exportieren (DAT-01, IMPORT_EXPORT.md §3): the full backup as a download (a share sheet on
 * phones). Marks the backup as done once the download starts; a cancelled Save-As dialog can't be
 * seen from the page, so the toast offers to save again. Returns false when nothing was saved.
 */
export async function exportBackup(
  queryClient: QueryClient,
  { includesMedia = true }: { includesMedia?: boolean } = {},
): Promise<boolean> {
  try {
    const envelope = await createBackup(db, { ...(await appInfo(queryClient)), includesMedia });
    const name = backupFileName();
    const blob = new Blob([JSON.stringify(envelope)], { type: 'application/json' });
    const result = await saveFile(blob, name);
    if (result === 'cancelled') return false;
    await recordBackup(db, envelope);
    toastManager.add({
      title: result === 'shared' ? m.toast_backup_shared() : m.toast_backup_started(),
      description: name,
      timeout: 8000,
      actionProps: { children: m.toast_backup_again(), onClick: () => download(blob, name) },
    });
    return true;
  } catch (error) {
    toastFailure(error);
    return false;
  }
}
