import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { XIcon } from '@phosphor-icons/react';
import type { ComponentProps, ReactNode } from 'react';
import { m } from '@/i18n';
import { cn } from './cn';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  /** What gets focus on open (Base UI: an element, true = first focusable, false = nothing). */
  initialFocus?: ComponentProps<typeof BaseDialog.Popup>['initialFocus'];
}

/** Centered modal on a thick glass panel. Base UI handles the focus trap, Esc and focus return. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  initialFocus,
}: DialogProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="ui-backdrop" />
        <BaseDialog.Popup
          initialFocus={initialFocus}
          className={cn('ui-dialog glass-thick', className)}
        >
          <div className="flex items-start justify-between gap-4">
            <BaseDialog.Title className="type-h2 m-0">{title}</BaseDialog.Title>
            <BaseDialog.Close
              aria-label={m.dialog_close()}
              className="-mt-1.5 -mr-1.5 inline-flex size-11 items-center justify-center rounded-pill text-ink-muted hover:bg-hover hover:text-ink"
            >
              <XIcon size={20} weight="bold" aria-hidden />
            </BaseDialog.Close>
          </div>
          {description ? (
            <BaseDialog.Description className="type-body mt-2 text-ink-muted">
              {description}
            </BaseDialog.Description>
          ) : null}
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
