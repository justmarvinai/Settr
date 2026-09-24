import { UploadSimpleIcon } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { Dialog } from '@/components/ui/Dialog';
import { Checkbox, Disclosure } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { toastManager } from '@/components/ui/Toasts';
import {
  DataChangedError,
  db,
  importBackup,
  previewMerge,
  restoreSnapshot,
  snapshotDb,
  useMeta,
  useUserCounts,
  type ImportMode,
} from '@/db';
import { mergeTotals, type BackupRead, type MergePlan } from '@/domain/backup';
import { m } from '@/i18n';
import { formatCount, formatDateTime, formatRelative } from '@/i18n/format';
import { appInfo, toastFailure } from './export';
import { counted, countsSummary, issueText, liveRecords } from './labels';
import { readBackupFile, type BackupFileResult } from './read-backup';

interface Picked {
  name: string;
  backup: BackupRead;
}

type ReadError = Extract<BackupFileResult, { ok: false }>['error'];

function errorText(error: ReadError): string {
  if (error.kind === 'too-large') return m.import_error_too_large();
  if (error.kind === 'syntax') {
    return m.import_error_syntax({
      line: formatCount(error.line),
      column: formatCount(error.column),
    });
  }
  if (error.kind === 'not-backup') return m.import_error_not_backup();
  if (error.kind === 'encrypted') return m.import_error_encrypted();
  if (error.kind === 'newer') {
    return error.appVersion
      ? m.import_error_newer_version({ version: error.appVersion })
      : m.import_error_newer();
  }
  if (error.kind === 'damaged') return m.import_error_damaged({ detail: error.detail });
  return m.import_error_unreadable({ reason: error.message });
}

/** Undo for an import or a restore: puts the snapshot back (after snapshotting the present). */
export async function undoWith(
  snapshotId: string,
  queryClient: ReturnType<typeof useQueryClient>,
  title: string,
): Promise<void> {
  try {
    await restoreSnapshot(db, snapshotDb, snapshotId, await appInfo(queryClient));
    toastManager.add({ title, timeout: 5000 });
  } catch (error) {
    toastFailure(error);
  }
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
      <dt className="type-small w-28 shrink-0 text-ink-muted">{label}</dt>
      <dd className="type-small m-0 min-w-0 flex-1 text-ink">{children}</dd>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="type-small flex flex-col gap-2 rounded-[14px] bg-warn-soft px-4 py-3 text-ink">
      {children}
    </div>
  );
}

function MergeSummary({ plan }: { plan: MergePlan | null }) {
  if (!plan) {
    return (
      <p className="type-small m-0 text-ink-muted" aria-busy="true">
        {m.import_merge_calculating()}
      </p>
    );
  }
  const totals = mergeTotals(plan);
  const folded = plan.remapped.tags + plan.remapped.locations;
  const stats = [
    [m.import_merge_new(), totals.added],
    [m.import_merge_updated(), totals.updated],
    [m.import_merge_deleted(), totals.deleted],
    [m.import_merge_unchanged(), totals.unchanged],
  ] as const;
  return (
    <div className="flex flex-col gap-2">
      <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="merge-summary">
        {stats.map(([label, value]) => (
          <div key={label} className="flex flex-col rounded-[14px] bg-hover px-3 py-2">
            <dt className="type-label text-ink-muted">{label}</dt>
            <dd className="type-h3 m-0 tabular-nums">{formatCount(value)}</dd>
          </div>
        ))}
      </dl>
      {totals.kept ? (
        <p className="type-small m-0 text-ink-muted">{m.import_merge_kept(counted(totals.kept))}</p>
      ) : null}
      {totals.skipped ? (
        <p className="type-small m-0 text-ink-muted">
          {m.import_merge_skipped(counted(totals.skipped))}
        </p>
      ) : null}
      {folded ? (
        <p className="type-small m-0 text-ink-muted">{m.import_merge_folded(counted(folded))}</p>
      ) : null}
      {plan.renamed ? (
        <p className="type-small m-0 text-ink-muted">
          {m.import_merge_renamed(counted(plan.renamed))}
        </p>
      ) : null}
    </div>
  );
}

function ImportPreview({ picked, onDone }: { picked: Picked; onDone: () => void }) {
  const { backup, name } = picked;
  const { header } = backup;
  const meta = useMeta();
  const local = useUserCounts();
  const queryClient = useQueryClient();
  const hasLocal = local ? liveRecords(local) > 0 : false;
  const [choice, setChoice] = useState<ImportMode | null>(null);
  const mode: ImportMode = hasLocal ? (choice ?? 'merge') : 'replace';
  const [plan, setPlan] = useState<MergePlan | null>(null);
  const [settingsFromBackup, setSettingsFromBackup] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== 'merge') return undefined;
    let active = true;
    previewMerge(db, { data: backup.data, installId: header.installId }).then((next) => {
      if (active) setPlan(next);
    }, toastFailure);
    return () => {
      active = false;
    };
  }, [mode, backup, header.installId]);

  const submit = async () => {
    setBusy(true);
    try {
      const outcome = await importBackup(db, snapshotDb, {
        mode,
        data: backup.data,
        installId: header.installId,
        exportedAt: header.exportedAt,
        settingsFromBackup,
        label: name,
        app: await appInfo(queryClient),
      });
      onDone();
      const totals = outcome.plan ? mergeTotals(outcome.plan) : undefined;
      const id = toastManager.add({
        title: m.toast_import_done(),
        description: totals
          ? m.toast_import_merged({
              added: formatCount(totals.added),
              updated: formatCount(totals.updated),
              deleted: formatCount(totals.deleted),
            })
          : countsSummary(backup.counts) || m.import_empty(),
        timeout: 15_000,
        actionProps: {
          children: m.toast_undo(),
          onClick: () => {
            toastManager.close(id);
            void undoWith(outcome.snapshotId, queryClient, m.toast_import_undone());
          },
        },
      });
    } catch (error) {
      setBusy(false);
      if (error instanceof DataChangedError) {
        toastManager.add({ title: m.import_error_changed(), type: 'error' });
      } else {
        toastFailure(error);
      }
    }
  };

  const shown = backup.issues.map(issueText);
  const more = backup.invalid - shown.length;

  return (
    <div className="mt-4 flex flex-col gap-5">
      <dl className="m-0 flex flex-col gap-1.5">
        <Fact label={m.import_made()}>
          {header.exportedAt
            ? m.import_made_value({
                date: formatDateTime(header.exportedAt),
                ago: formatRelative(header.exportedAt),
              })
            : '—'}
        </Fact>
        <Fact label={m.import_app()}>{header.appVersion ?? '—'}</Fact>
        <Fact label={m.import_device()}>
          {header.installId && header.installId === meta?.installId
            ? m.import_device_this()
            : m.import_device_other()}
        </Fact>
        <Fact label={m.import_checksum()}>
          <span className={cn(backup.checksum === 'mismatch' && 'font-bold text-warn')}>
            {backup.checksum === 'ok'
              ? m.import_checksum_ok()
              : backup.checksum === 'mismatch'
                ? m.import_checksum_mismatch()
                : m.import_checksum_missing()}
          </span>
        </Fact>
        <Fact label={m.import_contents()}>{countsSummary(backup.counts) || m.import_empty()}</Fact>
      </dl>

      {backup.checksum === 'mismatch' ? <Notice>{m.import_checksum_mismatch_hint()}</Notice> : null}
      {backup.invalid ? (
        <Notice>
          <span className="font-bold">{m.import_invalid(counted(backup.invalid))}</span>
          <Disclosure label={m.import_invalid_details()}>
            <ul className="m-0 flex max-h-48 list-none flex-col gap-1.5 overflow-y-auto p-0">
              {shown.map((issue, i) => (
                // oxlint-disable-next-line react/no-array-index-key -- issues have no id of their own
                <li key={i} className="flex flex-col">
                  <span className="font-bold">{issue.where}</span>
                  <span className="text-ink-muted">{issue.what}</span>
                </li>
              ))}
              {more > 0 ? <li>{m.import_issues_more(counted(more))}</li> : null}
            </ul>
          </Disclosure>
        </Notice>
      ) : null}
      {backup.settingsReset ? (
        <p className="type-small m-0 text-ink-muted">{m.import_settings_reset()}</p>
      ) : null}

      {hasLocal && local ? (
        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <SegmentedControl<ImportMode>
            label={m.import_mode()}
            value={mode}
            onValueChange={setChoice}
            options={[
              { value: 'merge', label: m.import_mode_merge() },
              { value: 'replace', label: m.import_mode_replace() },
            ]}
          />
          <p className="type-small m-0 text-ink-muted">
            {mode === 'merge' ? m.import_mode_merge_hint() : m.import_mode_replace_hint()}
          </p>
          {mode === 'merge' ? (
            <>
              <MergeSummary plan={plan} />
              <label className="grid cursor-pointer grid-cols-[auto_1fr] items-start gap-x-3 gap-y-0.5 pt-1">
                <Checkbox checked={settingsFromBackup} onCheckedChange={setSettingsFromBackup} />
                <span className="type-ui text-ink">{m.import_settings_from_backup()}</span>
                <span className="type-small col-start-2 text-ink-muted">
                  {m.import_settings_from_backup_hint()}
                </span>
              </label>
            </>
          ) : (
            <Notice>
              <span>{m.import_local({ summary: countsSummary(local) })}</span>
              <span className="font-bold">{m.import_replace_warning()}</span>
            </Notice>
          )}
        </div>
      ) : (
        <p className="type-small m-0 border-t border-line pt-5 text-ink-muted">
          {m.import_local_empty()}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          {m.bulk_cancel()}
        </Button>
        <Button
          variant="primary"
          disabled={busy || !local || (mode === 'merge' && !plan)}
          onClick={() => void submit()}
        >
          {busy
            ? m.import_running()
            : !hasLocal
              ? m.import_submit()
              : mode === 'merge'
                ? m.import_mode_merge()
                : m.import_mode_replace()}
        </Button>
      </div>
    </div>
  );
}

/**
 * Backup einspielen (DAT-02, IMPORT_EXPORT.md §4): a file by button or drag and drop is read in a
 * worker, then previewed; merge or replace follow after a safety snapshot, with Rückgängig.
 */
export function ImportSection() {
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [dragging, setDragging] = useState(false);

  const read = async (file: File) => {
    setError(null);
    setReading(true);
    const result = await readBackupFile(file);
    setReading(false);
    if (result.ok) setPicked({ name: file.name, backup: result.backup });
    else setError(errorText(result.error));
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="type-body m-0 text-ink-muted">{m.settings_data_import_intro()}</p>
      <div
        data-testid="import-drop"
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-[18px] border-2 border-dashed px-5 py-4 transition-colors duration-(--dur-fast)',
          // Touch screens don't drag files: just the button there.
          'pointer-coarse:border-0 pointer-coarse:p-0',
          dragging ? 'border-accent bg-hover' : 'border-line',
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const [file] = event.dataTransfer.files;
          if (file) void read(file);
        }}
      >
        <UploadSimpleIcon
          size={22}
          weight="bold"
          aria-hidden
          className="shrink-0 text-ink-muted pointer-coarse:hidden"
        />
        <span className="type-ui text-ink-muted pointer-coarse:hidden">
          {m.settings_data_import_drop()}
        </span>
        <Button variant="outline" disabled={reading} onClick={() => input.current?.click()}>
          {m.settings_data_import_pick()}
        </Button>
        <output className="type-small text-ink-muted">
          {reading ? m.settings_data_import_reading() : null}
        </output>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          onChange={(event) => {
            const [file] = event.target.files ?? [];
            event.target.value = '';
            if (file) void read(file);
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="type-body m-0 text-loss">
          {error}
        </p>
      ) : null}
      <Dialog
        open={picked !== null}
        onOpenChange={(open) => {
          if (!open) setPicked(null);
        }}
        title={m.import_title()}
        description={picked?.name}
      >
        {picked ? <ImportPreview picked={picked} onDone={() => setPicked(null)} /> : null}
      </Dialog>
    </div>
  );
}
