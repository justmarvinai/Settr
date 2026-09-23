import { DatabaseIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { useHoldingCount, useMeta, useSettings } from '@/db';
import { m } from '@/i18n';
import { formatRelative } from '@/i18n/format';
import { cn } from '@/components/ui/cn';
import { useNow } from '@/lib/useNow';

const DAY_MS = 86_400_000;

/**
 * Backup status in the sidebar footer (DAT-04). Amber once a backup is due, but only when there's
 * data worth backing up, so a fresh install isn't nagged.
 */
export function BackupPill({
  expanded = false,
  onNavigate,
}: {
  expanded?: boolean;
  onNavigate?: () => void;
}) {
  const meta = useMeta();
  const settings = useSettings();
  const holdings = useHoldingCount() ?? 0;
  const now = useNow();
  const last = meta?.lastBackupAt;
  const due =
    holdings > 0 &&
    (!last || now - new Date(last).getTime() > settings.backup.remindAfterDays * DAY_MS);

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
      <DatabaseIcon size={20} weight={due ? 'bold' : 'regular'} aria-hidden className="shrink-0" />
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
