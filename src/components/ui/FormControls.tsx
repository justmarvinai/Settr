import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Collapsible } from '@base-ui/react/collapsible';
import { NumberField } from '@base-ui/react/number-field';
import { CaretRightIcon, CheckIcon, MinusIcon, PlusIcon } from '@phosphor-icons/react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from './cn';
import { Input, inputClass, type InputProps } from './Input';

/**
 * Form building blocks for the add/edit sheets (UX_SPEC.md §4.7): 48 px controls, visible labels,
 * hints and errors wired with aria-describedby, and tokens only.
 */

/** A labeled row. Pass `htmlFor` for inputs; groups (chips, radios) name themselves via `label`. */
export function FormRow({
  label,
  htmlFor,
  hint,
  error,
  describedBy,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | undefined;
  /** Id for the hint/error text, so the control can reference it. */
  describedBy?: string;
  children: ReactNode;
  className?: string;
}) {
  const Label = htmlFor ? 'label' : 'span';
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label {...(htmlFor ? { htmlFor } : {})} className="type-ui text-ink">
        {label}
      </Label>
      {children}
      {error ? (
        <span id={describedBy} role="alert" className="type-small text-loss">
          {error}
        </span>
      ) : hint ? (
        <span id={describedBy} className="type-small text-ink-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** Money amount as typed (`4,5`, `4,50 €`); parsing happens in i18n/format.ts. EUR only (Q6.1). */
export function MoneyInput({ className, ...props }: InputProps) {
  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        className={cn('pr-10 font-mono tabular-nums', className)}
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 type-ui text-ink-muted"
      >
        €
      </span>
    </div>
  );
}

/** Whole number with − / + buttons (44 px targets); the field can also be typed into. */
export function NumberStepper({
  id,
  label,
  value,
  onValueChange,
  min = 1,
  max = 999,
  decrementLabel,
  incrementLabel,
}: {
  id?: string;
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  decrementLabel: string;
  incrementLabel: string;
}) {
  const button =
    'inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-ink hover:bg-hover disabled:opacity-40';
  return (
    <NumberField.Root
      id={id}
      value={value}
      min={min}
      max={max}
      step={1}
      onValueChange={(next) => onValueChange(next ?? min)}
    >
      <NumberField.Group className="inline-flex h-12 w-fit items-center gap-0.5 rounded-input bg-surface-1 p-0.5 shadow-[inset_0_0_0_1.5px_var(--border-strong)] focus-within:shadow-[inset_0_0_0_2px_var(--accent)]">
        <NumberField.Decrement aria-label={decrementLabel} className={button}>
          <MinusIcon size={18} weight="bold" aria-hidden />
        </NumberField.Decrement>
        <NumberField.Input
          aria-label={label}
          className="h-full w-14 bg-transparent text-center font-mono text-[16px] font-semibold text-ink tabular-nums outline-none"
        />
        <NumberField.Increment aria-label={incrementLabel} className={button}>
          <PlusIcon size={18} weight="bold" aria-hidden />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  );
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(inputClass, 'h-auto min-h-24 py-3', className)} {...props} />;
}

/** "Mehr Details" and similar: a button that shows or hides a panel. */
export function Disclosure({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <Collapsible.Root defaultOpen={defaultOpen} className="flex flex-col">
      <Collapsible.Trigger className="group -mx-2 flex h-11 w-fit items-center gap-2 rounded-pill px-2 type-ui text-ink hover:bg-hover">
        <CaretRightIcon
          size={16}
          weight="bold"
          aria-hidden
          className="transition-transform duration-(--dur-fast) group-data-[panel-open]:rotate-90"
        />
        {label}
      </Collapsible.Trigger>
      <Collapsible.Panel className="flex flex-col gap-5 pt-3">{children}</Collapsible.Panel>
    </Collapsible.Root>
  );
}

/** Square check box; wrap it in a label or give it `label` (aria-label). */
export function Checkbox({
  checked,
  indeterminate,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <BaseCheckbox.Root
      checked={checked}
      indeterminate={indeterminate ?? false}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-surface-1 shadow-[inset_0_0_0_1.5px_var(--border-strong)] transition-colors duration-(--dur-fast) data-checked:bg-accent data-checked:shadow-none data-indeterminate:bg-accent data-indeterminate:shadow-none',
        className,
      )}
    >
      <BaseCheckbox.Indicator className="flex text-accent-contrast">
        {indeterminate ? (
          <MinusIcon size={14} weight="bold" aria-hidden />
        ) : (
          <CheckIcon size={14} weight="bold" aria-hidden />
        )}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
