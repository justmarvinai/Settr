import { toastManager } from '@/components/ui/Toasts';
import { m } from '@/i18n';

/** Undo window (UX_SPEC.md §6): every create, update, delete and bulk action can be taken back. */
const UNDO_MS = 8000;

export function toastError(error: unknown): void {
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
