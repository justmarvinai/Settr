import { Toast } from '@base-ui/react/toast';
import { XIcon } from '@phosphor-icons/react';
import { m } from '@/i18n';

/** App-wide toast queue, usable outside React (e.g. the service-worker update prompt). */
export const toastManager = Toast.createToastManager();

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      swipeDirection={['down', 'right']}
      className="ui-toast glass-thick"
    >
      <Toast.Content className="flex items-center gap-3 py-2 pr-2 pl-5">
        <span aria-hidden className="size-2 shrink-0 rounded-pill bg-gain" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Toast.Title className="type-ui text-ink" />
          <Toast.Description className="type-small text-ink-muted" />
        </div>
        <Toast.Action className="h-10 shrink-0 rounded-pill px-4 type-ui text-ink shadow-[inset_0_0_0_1.5px_var(--border-strong)] hover:shadow-[inset_0_0_0_1.5px_var(--text-subtle)]" />
        <Toast.Close
          aria-label={m.dialog_close()}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-pill text-ink-muted hover:bg-hover hover:text-ink"
        >
          <XIcon size={18} weight="bold" aria-hidden />
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}

/** Renders queued toasts bottom-center, above the phone tab bar. */
export function ToastViewport() {
  return (
    <Toast.Portal>
      <Toast.Viewport className="ui-toast-viewport">
        <ToastList />
      </Toast.Viewport>
    </Toast.Portal>
  );
}

export const ToastProvider = Toast.Provider;
