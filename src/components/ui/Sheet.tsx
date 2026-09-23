import { Drawer } from '@base-ui/react/drawer';
import { XIcon } from '@phosphor-icons/react';
import { m } from '@/i18n';
import { cn } from './cn';
import type { DialogProps } from './Dialog';

interface SheetProps extends DialogProps {
  side?: 'bottom' | 'right';
}

/** Bottom sheet on phones, side sheet on desktop. Swipe to dismiss in the sheet's direction. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  side = 'bottom',
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
            className={cn(
              'ui-sheet glass-thick',
              side === 'bottom' ? 'ui-sheet-bottom' : 'ui-sheet-right',
              className,
            )}
          >
            <Drawer.Content>
              <div className="flex items-start justify-between gap-4">
                <Drawer.Title className="type-h2 m-0">{title}</Drawer.Title>
                <Drawer.Close
                  aria-label={m.dialog_close()}
                  className="-mt-1.5 -mr-1.5 inline-flex size-11 items-center justify-center rounded-pill text-ink-muted hover:bg-hover hover:text-ink"
                >
                  <XIcon size={20} weight="bold" aria-hidden />
                </Drawer.Close>
              </div>
              {description ? (
                <Drawer.Description className="type-body mt-2 text-ink-muted">
                  {description}
                </Drawer.Description>
              ) : null}
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
