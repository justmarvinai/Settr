import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { getSnapshot, snapshotDb, type SnapshotInfo } from '@/db';
import { m } from '@/i18n';
import { formatDateTime } from '@/i18n/format';
import { toastFailure } from './export';
import { undoWith } from './ImportSection';
import { countsSummary } from './labels';
import { download } from './save-file';

const pad = (n: number) => String(n).padStart(2, '0');

/** `settr-sicherung-2026-09-24-1012.settr.json`, named by when the snapshot was taken. */
function snapshotFileName(createdAt: string): string {
  const at = new Date(createdAt);
  const date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  return `settr-sicherung-${date}-${pad(at.getHours())}${pad(at.getMinutes())}.settr.json`;
}

function titleOf(snapshot: SnapshotInfo): string {
  if (snapshot.reason === 'restore') return m.snapshot_before_restore();
  return snapshot.label
    ? m.snapshot_before_import_file({ file: snapshot.label })
    : m.snapshot_before_import();
}

async function save(snapshot: SnapshotInfo) {
  try {
    const row = await getSnapshot(snapshotDb, snapshot.id);
    if (!row) throw new Error(m.snapshot_unreadable());
    download(new Blob([row.json], { type: 'application/json' }), snapshotFileName(row.createdAt));
  } catch (error) {
    toastFailure(error);
  }
}

/**
 * Sicherungen vor Importen (IMPORT_EXPORT.md §4 step 8): the last three states before an import or a
 * restore, to put back (itself undoable) or to download as a backup file.
 */
export function SnapshotsSection({ snapshots }: { snapshots: readonly SnapshotInfo[] }) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<SnapshotInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const restore = async (snapshot: SnapshotInfo) => {
    setBusy(true);
    await undoWith(
      snapshot.id,
      queryClient,
      m.toast_snapshot_restored({ date: formatDateTime(snapshot.createdAt) }),
    );
    setBusy(false);
    setConfirm(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="type-body m-0 text-ink-muted">{m.settings_data_snapshots_intro()}</p>
      <ul
        className="m-0 flex list-none flex-col gap-2 p-0"
        aria-label={m.settings_data_snapshots()}
      >
        {snapshots.map((snapshot) => (
          <li
            key={snapshot.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[16px] bg-hover px-4 py-3"
          >
            <div className="flex min-w-0 flex-1 basis-56 flex-col">
              <span className="type-ui truncate text-ink">{titleOf(snapshot)}</span>
              <span className="type-small text-ink-muted">
                {[
                  formatDateTime(snapshot.createdAt),
                  countsSummary(snapshot.counts) || m.import_empty(),
                ].join(' · ')}
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => void save(snapshot)}>
              {m.snapshot_download()}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirm(snapshot)}>
              {m.snapshot_restore()}
            </Button>
          </li>
        ))}
      </ul>
      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={m.snapshot_restore_title()}
        description={
          confirm ? m.snapshot_restore_body({ date: formatDateTime(confirm.createdAt) }) : undefined
        }
      >
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            {m.bulk_cancel()}
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => {
              if (confirm) void restore(confirm);
            }}
          >
            {m.snapshot_restore()}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
