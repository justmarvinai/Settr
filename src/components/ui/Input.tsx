import { Field } from '@base-ui/react/field';
import { Input as BaseInput } from '@base-ui/react/input';
import type { ComponentProps } from 'react';
import { cn } from './cn';

/** 48 px tall (touch-friendly), inset ring instead of a border, accent ring on focus, loss ring when invalid. */
export const inputClass =
  'h-12 w-full min-w-0 rounded-input bg-surface-1 px-4 type-ui text-ink shadow-[inset_0_0_0_1.5px_var(--border-strong)] transition-shadow duration-(--dur-fast) placeholder:text-ink-subtle hover:shadow-[inset_0_0_0_1.5px_var(--text-subtle)] focus-visible:shadow-[inset_0_0_0_2px_var(--accent)] focus-visible:outline-none data-invalid:shadow-[inset_0_0_0_2px_var(--loss)] disabled:opacity-50';

export type InputProps = ComponentProps<typeof BaseInput>;

export function Input({ className, ...props }: InputProps) {
  return <BaseInput className={cn(inputClass, className)} {...props} />;
}

/**
 * Labeled text field. Base UI Field wires the label, hint (aria-describedby) and invalid state. The
 * error comes from the form library (TanStack Form, M3), so it's shown whenever it's set.
 */
export function TextField({
  label,
  hint,
  error,
  className,
  ...inputProps
}: InputProps & { label: string; hint?: string; error?: string }) {
  return (
    <Field.Root invalid={Boolean(error)} className={cn('flex flex-col gap-2', className)}>
      <Field.Label className="type-ui text-ink">{label}</Field.Label>
      <Input {...inputProps} />
      {hint ? (
        <Field.Description className="type-small text-ink-muted">{hint}</Field.Description>
      ) : null}
      {error ? (
        <Field.Error match className="type-small text-loss">
          {error}
        </Field.Error>
      ) : null}
    </Field.Root>
  );
}
