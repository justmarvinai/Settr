import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from './cn';

/** Pill buttons (direction D). Color is information: only `primary` uses the accent. */
export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-pill font-extrabold transition-[background-color,box-shadow,color] duration-(--dur-fast) disabled:cursor-not-allowed disabled:opacity-50 data-disabled:cursor-not-allowed data-disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-accent-contrast hover:shadow-[inset_0_0_0_100px_oklch(0.5_0_0/0.16)]',
        quiet: 'bg-hover text-ink hover:bg-hover-strong',
        outline:
          'text-ink shadow-[inset_0_0_0_1.5px_var(--border-strong)] hover:shadow-[inset_0_0_0_1.5px_var(--text-subtle)]',
        ghost: 'text-ink-muted hover:bg-hover hover:text-ink',
      },
      size: {
        sm: 'h-9 px-3.5 text-[14px]',
        md: 'h-11 px-[18px] text-[15px]',
        lg: 'h-12 px-6 text-[16px]',
      },
    },
    defaultVariants: { variant: 'quiet', size: 'md' },
  },
);

export type ButtonProps = ComponentProps<typeof BaseButton> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <BaseButton className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export type IconButtonProps = ComponentProps<typeof BaseButton> & { label: string };

/** Round 44 px icon button; `label` is required because the button has no visible text. */
export function IconButton({ className, label, ...props }: IconButtonProps) {
  return (
    <BaseButton
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-pill bg-hover text-ink transition-colors duration-(--dur-fast) hover:bg-hover-strong',
        className,
      )}
      {...props}
    />
  );
}
