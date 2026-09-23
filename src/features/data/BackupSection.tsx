import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { manifestQuery } from '@/catalog';
import { Button } from '@/components/ui/Button';
import { toastManager } from '@/components/ui/Toasts';
import { backupFileName, createBackup, db, recordBackup, useMeta } from '@/db';
import { m } from '@/i18n';
import { formatDate, formatRelative } from '@/i18n/format';
import { download, saveFile } from './save-file';

/**
 * DAT-01 lite (M3): the full backup as one download, so nothing entered during development can be
 * lost. Import and merge follow in M5 (IMPORT_EXPORT.md §3, §4).
 */
export function BackupSection() {
  const meta = useMeta();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const last = meta?.lastBackupAt;

  const exportBackup = async () => {
    setBusy(true);
    try {
      // Only on export: the page itself must not need the catalog (offline, it may not be cached).
      const catalogVersion = await queryClient.ensureQueryData(manifestQuery).then(
        (manifest) => manifest.catalogVersion,
        () => null,
      );
      const envelope = await createBackup(db, {
        appVersion: import.meta.env.VITE_APP_VERSION,
        catalogVersion,
      });
      const name = backupFileName();
      const blob = new Blob([JSON.stringify(envelope)], { type: 'application/json' });
      const result = await saveFile(blob, name);
      if (result === 'cancelled') return;
      await recordBackup(db, envelope);
      // A cancelled Save-As dialog can't be seen from the page, so offer to save again.
      toastManager.add({
        title: result === 'shared' ? m.toast_backup_shared() : m.toast_backup_started(),
        description: name,
        timeout: 8000,
        actionProps: {
          children: m.toast_backup_again(),
          onClick: () => download(blob, name),
        },
      });
    } catch (error) {
      toastManager.add({
        title: m.toast_failed({ reason: error instanceof Error ? error.message : String(error) }),
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="type-body m-0 text-ink-muted">{m.settings_data_backup_intro()}</p>
      <p className="type-ui m-0" data-testid="backup-status">
        {last
          ? m.settings_data_backup_last({
              ago: formatRelative(last),
              date: formatDate(new Date(last)),
            })
          : m.settings_data_backup_never()}
      </p>
      <Button
        variant="primary"
        className="w-fit"
        disabled={busy}
        onClick={() => void exportBackup()}
      >
        {m.settings_data_backup_action()}
      </Button>
      <p className="type-small m-0 text-ink-subtle">{m.settings_data_backup_import_later()}</p>
    </div>
  );
}
