import { Menu as BaseMenu } from '@base-ui/react/menu';
import { CheckIcon, DotsThreeIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { cn } from './cn';

export interface MenuAction {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  /** Destructive actions (Löschen) read in the loss color, after a separator. */
  danger?: boolean;
  disabled?: boolean;
}

/**
 * Context menu behind a ⋯ button (UX_SPEC.md §4.4: Bearbeiten, Verkaufen…, Duplizieren, Löschen).
 * Base UI handles focus, arrow keys, typeahead and Esc.
 */
export function ActionMenu({
  label,
  actions,
  className,
}: {
  label: string;
  actions: readonly MenuAction[];
  className?: string;
}) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-muted transition-colors duration-(--dur-fast) hover:bg-hover hover:text-ink data-popup-open:bg-hover data-popup-open:text-ink',
          className,
        )}
      >
        <DotsThreeIcon size={22} weight="bold" aria-hidden />
      </BaseMenu.Trigger>
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={6} align="end" className="ui-menu-positioner">
          <BaseMenu.Popup className="ui-menu glass-thick">
            {actions.map((action, index) => (
              <div key={action.label}>
                {action.danger && index > 0 ? (
                  <BaseMenu.Separator className="mx-2 my-1 h-px bg-line" />
                ) : null}
                <BaseMenu.Item
                  disabled={action.disabled ?? false}
                  onClick={action.onSelect}
                  className={cn(
                    'flex min-h-11 cursor-default items-center gap-3 rounded-[12px] px-3 type-ui text-[15px] outline-none data-disabled:opacity-40 data-highlighted:bg-hover-strong',
                    action.danger ? 'text-loss' : 'text-ink',
                  )}
                >
                  {action.icon ? (
                    <span aria-hidden className="flex text-current opacity-80">
                      {action.icon}
                    </span>
                  ) : null}
                  {action.label}
                </BaseMenu.Item>
              </div>
            ))}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

export interface CheckOption {
  value: string;
  label: string;
  checked: boolean;
}

/**
 * A menu of on/off choices behind an icon button, e.g. the table's columns. It stays open while
 * choices change; Base UI handles focus, arrow keys and Esc.
 */
export function CheckMenu({
  label,
  icon,
  options,
  onToggle,
  className,
}: {
  label: string;
  icon: ReactNode;
  options: readonly CheckOption[];
  onToggle: (value: string, checked: boolean) => void;
  className?: string;
}) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-muted transition-colors duration-(--dur-fast) hover:bg-hover hover:text-ink data-popup-open:bg-hover data-popup-open:text-ink',
          className,
        )}
      >
        {icon}
      </BaseMenu.Trigger>
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={6} align="end" className="ui-menu-positioner">
          <BaseMenu.Popup className="ui-menu glass-thick">
            {options.map((option) => (
              <BaseMenu.CheckboxItem
                key={option.value}
                checked={option.checked}
                onCheckedChange={(checked) => onToggle(option.value, checked)}
                className="flex min-h-11 cursor-default items-center gap-3 rounded-[12px] px-3 type-ui text-[15px] text-ink outline-none data-highlighted:bg-hover-strong"
              >
                <span
                  aria-hidden
                  className={cn(
                    'inline-flex size-5 shrink-0 items-center justify-center rounded-[6px]',
                    option.checked
                      ? 'bg-accent text-accent-contrast'
                      : 'shadow-[inset_0_0_0_1.5px_var(--border-strong)]',
                  )}
                >
                  <BaseMenu.CheckboxItemIndicator>
                    <CheckIcon size={14} weight="bold" />
                  </BaseMenu.CheckboxItemIndicator>
                </span>
                {option.label}
              </BaseMenu.CheckboxItem>
            ))}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
