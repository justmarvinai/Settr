import { Link } from '@tanstack/react-router';
import { DatabaseGlyph } from '@/components/ui/glyphs';
import { m } from '@/i18n';
import { formatRelative } from '@/i18n/format';
import { cn } from '@/components/ui/cn';
import { useBackupState } from './useBackupState';

/**
 * Backup status in the sidebar footer (DAT-04): amber once a backup is due, that is when the data
 * changed since the last one and it's older than the reminder interval (or 50 changes piled up).
 * A fresh install without data isn't nagged.
 */
export function BackupPill({
  expanded = false,
  onNavigate,
}: {
  expanded?: boolean;
  onNavigate?: () => void;
}) {
  const state = useBackupState();
  const due = state?.due ?? false;
  const last = state?.lastBackupAt;
  const now = state?.now ?? 0;

  return (
    <Link
      to="/settings/data"
      onClick={onNavigate}
      className={cn(
        'flex min-h-14 items-center gap-3 rounded-[16px] px-3 py-2 transition-[box-shadow] duration-(--dur-fast)',
        due
          ? 'bg-warn-soft text-warn hover:shadow-[inset_0_0_0_1.5px_var(--warn)]'
          : 'text-ink-muted hover:bg-hover hover:text-ink',
      )}
    >
      <DatabaseGlyph size={20} weight={due ? 'bold' : 'regular'} aria-hidden className="shrink-0" />
      <span className={cn('min-w-0 flex-col gap-0.5', expanded ? 'flex' : 'hidden lg:flex')}>
        <span className="type-ui">{due ? m.backup_pill_due() : m.backup_pill_label()}</span>
        <span className="type-label font-semibold">
          {last ? m.backup_pill_ago({ ago: formatRelative(last, now) }) : m.backup_pill_never()}
        </span>
      </span>
      {expanded ? null : (
        <span className="sr-only lg:hidden">
          {due ? m.backup_pill_due() : m.backup_pill_label()}
        </span>
      )}
    </Link>
  );
}
