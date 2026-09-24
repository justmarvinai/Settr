import { toastManager } from '@/components/ui/Toasts';
import { m } from '@/i18n';

/** Undo window (UX_SPEC.md §6): every create, update, delete and bulk action can be taken back. */
const UNDO_MS = 8000;

/** The browser refused to store more (Dexie wraps it with the same name, keeping the cause). */
export function isQuotaError(error: unknown): boolean {
  for (let e = error, depth = 0; e && depth < 3; depth++) {
    if (e instanceof Error || e instanceof DOMException) {
      if (e.name === 'QuotaExceededError') return true;
      e = 'inner' in e ? e.inner : e.cause;
    } else {
      return false;
    }
  }
  return false;
}

export function toastError(error: unknown): void {
  if (isQuotaError(error)) {
    // Storage pressure (UX_SPEC.md §6): nothing more can be saved; a backup and room come first.
    toastManager.add({
      title: m.toast_quota_title(),
      description: m.toast_quota_body(),
      type: 'error',
      timeout: 0,
      actionProps: {
        children: m.toast_quota_action(),
        onClick: () => window.location.assign('/settings/data'),
      },
    });
    return;
  }
  const reason = error instanceof Error ? error.message : String(error);
  toastManager.add({ title: m.toast_failed({ reason }), type: 'error', timeout: UNDO_MS });
}

/** A toast with Rückgängig, backed by the inverse operation. */
export function toastWithUndo(
  title: string,
  undo: () => Promise<unknown>,
  description?: string,
): void {
  const id = toastManager.add({
    title,
    ...(description ? { description } : {}),
    timeout: UNDO_MS,
    actionProps: {
      children: m.toast_undo(),
      onClick: () => {
        toastManager.close(id);
        undo().then(() => toastManager.add({ title: m.toast_undone(), timeout: 3000 }), toastError);
      },
    },
  });
}
