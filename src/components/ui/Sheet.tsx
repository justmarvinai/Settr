import { Drawer } from '@base-ui/react/drawer';
import type { ComponentProps } from 'react';
import { XIcon } from '@phosphor-icons/react';
import { m } from '@/i18n';
import { cn } from './cn';
import type { DialogProps } from './Dialog';

interface SheetProps extends DialogProps {
  side?: 'bottom' | 'right';
  /** What gets focus on open (Base UI: an element, true = first focusable, false = nothing). */
  initialFocus?: ComponentProps<typeof Drawer.Popup>['initialFocus'];
  /** The content brings its own bottom edge, e.g. a sticky footer with the form's buttons. */
  flush?: boolean;
}

/**
 * Bottom sheet on phones, side sheet on desktop. Swipe to dismiss in the sheet's direction. The
 * title row stays in place while the content scrolls.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  side = 'bottom',
  initialFocus,
  flush = false,
}: SheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      swipeDirection={side === 'bottom' ? 'down' : 'right'}
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="ui-backdrop" />
        <Drawer.Viewport>
          <Drawer.Popup
            initialFocus={initialFocus}
            className={cn(
              'ui-sheet glass-thick',
              side === 'bottom' ? 'ui-sheet-bottom' : 'ui-sheet-right',
              className,
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6">
              <Drawer.Title className="type-h2 m-0">{title}</Drawer.Title>
              <Drawer.Close
                aria-label={m.dialog_close()}
                className="-mt-1.5 -mr-1.5 inline-flex size-11 items-center justify-center rounded-pill text-ink-muted hover:bg-hover hover:text-ink"
              >
                <XIcon size={20} weight="bold" aria-hidden />
              </Drawer.Close>
            </div>
            {description ? (
              <Drawer.Description className="type-body mt-2 px-6 text-ink-muted">
                {description}
              </Drawer.Description>
            ) : null}
            <Drawer.Content
              className={cn(
                'min-h-0 flex-1 overflow-y-auto overscroll-contain px-6',
                !flush && 'pb-[max(24px,env(safe-area-inset-bottom))]',
              )}
            >
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
