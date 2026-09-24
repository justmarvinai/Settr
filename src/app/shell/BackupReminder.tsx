import { useQueryClient } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { toastManager } from '@/components/ui/Toasts';
import { db, getRemindedOn, setRemindedOn, useHoldingCount } from '@/db/core';
import { todayIso } from '@/domain/ids';
import { m } from '@/i18n';
import { formatCount, formatRelative } from '@/i18n/format';
import { requestPersistence, requestPersistenceOnce } from '@/lib/storage';
import { useBackupState } from './useBackupState';

/** Settles startup first (the update prompt, the page's own loading) before reminding. */
const DELAY_MS = 4000;

/**
 * Backup reminder (DAT-04, IMPORT_EXPORT.md §8): once a backup is due, a toast offers to save one
 * now, at most once a day per device and never on the Daten page itself. Also asks for persistent
 * storage once there's data, and again when Settr gets installed as an app.
 */
export function BackupReminder() {
  const state = useBackupState();
  const holdings = useHoldingCount() ?? 0;
  const path = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();
  const shown = useRef(false);
  const remind = state?.remind ?? false;
  const onDataPage = path === '/settings/data';

  useEffect(() => {
    if (holdings > 0) void requestPersistenceOnce();
  }, [holdings]);

  useEffect(() => {
    const onInstalled = () => void requestPersistence();
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  const lastBackupAt = state?.lastBackupAt;
  const changes = state?.changes;

  // Waits for a quiet moment: every change (and page) restarts the delay.
  useEffect(() => {
    if (!remind || onDataPage || shown.current) return undefined;
    const timer = setTimeout(() => {
      void (async () => {
        const today = todayIso();
        if (shown.current || (await getRemindedOn(db)) === today) return;
        shown.current = true;
        await setRemindedOn(db, today);
        const id = toastManager.add({
          title: lastBackupAt
            ? m.reminder_title({ ago: formatRelative(lastBackupAt) })
            : m.reminder_title_never(),
          ...(changes
            ? { description: m.reminder_changes({ n: changes, count: formatCount(changes) }) }
            : {}),
          timeout: 12_000,
          actionProps: {
            children: m.reminder_action(),
            onClick: () => {
              toastManager.close(id);
              // The export code loads only when it's used: the shell stays small.
              void import('@/features/data').then(({ exportBackup }) => exportBackup(queryClient));
            },
          },
        });
      })();
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [remind, onDataPage, lastBackupAt, changes, queryClient]);

  return null;
}
