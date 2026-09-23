import { CaretDownIcon } from '@phosphor-icons/react';
import type { ComponentProps } from 'react';
import { cn } from './cn';
import { inputClass } from './Input';

/**
 * Form select (48 px, like inputs). Native, so keyboards, screen readers and the phone's own picker
 * work without extra code; filters use the pill-shaped Select instead.
 */
export function NativeSelect({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select className={cn(inputClass, 'appearance-none pr-10', className)} {...props}>
        {children}
      </select>
      <CaretDownIcon
        size={16}
        weight="bold"
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-muted"
      />
    </div>
  );
}
