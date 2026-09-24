import { useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/FormControls';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { updateSettings, useDataVersion, useMeta, useSettings, useUserCounts, db } from '@/db';
import { m } from '@/i18n';
import { formatDate, formatRelative } from '@/i18n/format';
import { exportBackup, toastFailure } from './export';
import { counted } from './labels';

const REMIND_OPTIONS = [3, 7, 14, 30] as const;

/**
 * Backup (DAT-01, DAT-04): the last backup and the changes since, the export (photos optional once
 * there are any), and when to be reminded.
 */
export function BackupSection() {
  const id = useId();
  const meta = useMeta();
  const settings = useSettings();
  const version = useDataVersion();
  const counts = useUserCounts();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [includesMedia, setIncludesMedia] = useState(true);
  const last = meta?.lastBackupAt;
  const photos = counts?.media ?? 0;
  const changes =
    last && meta.backupDataVersion !== undefined && version !== undefined
      ? version - meta.backupDataVersion
      : undefined;
  const days = settings.backup.remindAfterDays;
  // A value set elsewhere (a backup's settings) stays selectable.
  const options = [...new Set<number>([...REMIND_OPTIONS, days])].toSorted((a, b) => a - b);

  const run = async () => {
    setBusy(true);
    await exportBackup(queryClient, { includesMedia: photos === 0 || includesMedia });
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="type-body m-0 text-ink-muted">{m.settings_data_backup_intro()}</p>
      <div className="flex flex-col gap-1">
        <p className="type-ui m-0" data-testid="backup-status">
          {last
            ? m.settings_data_backup_last({
                ago: formatRelative(last),
                date: formatDate(new Date(last)),
              })
            : m.settings_data_backup_never()}
        </p>
        {changes ? (
          <p className="type-small m-0 text-ink-muted">
            {m.settings_data_backup_changes(counted(changes))}
          </p>
        ) : null}
      </div>
      {photos > 0 ? (
        <label className="grid cursor-pointer grid-cols-[auto_1fr] items-start gap-x-3 gap-y-0.5">
          <Checkbox checked={includesMedia} onCheckedChange={setIncludesMedia} />
          <span className="type-ui text-ink">{m.settings_data_backup_media()}</span>
          <span className="type-small col-start-2 text-ink-muted">
            {m.settings_data_backup_media_hint(counted(photos))}
          </span>
        </label>
      ) : null}
      <Button variant="primary" className="w-fit" disabled={busy} onClick={() => void run()}>
        {m.settings_data_backup_action()}
      </Button>
      <div className="flex flex-col gap-2.5 border-t border-line pt-5">
        <label htmlFor={`${id}-remind`} className="flex flex-col gap-1">
          <span className="type-ui text-ink">{m.settings_data_remind()}</span>
          <span className="type-small text-ink-muted">{m.settings_data_remind_hint()}</span>
        </label>
        <div className="sm:w-72">
          <NativeSelect
            id={`${id}-remind`}
            value={String(days)}
            onChange={(event) => {
              const next = Number(event.target.value);
              updateSettings(db, { backup: { remindAfterDays: next } }).catch(toastFailure);
            }}
          >
            {options.map((n) => (
              <option key={n} value={n}>
                {m.settings_data_remind_after(counted(n))}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </div>
  );
}
