import type { ReactNode } from 'react';
import { cn } from './cn';

/** Solid content surface (tile). Glass is for chrome only (DESIGN_SYSTEM.md §4). */
export function Panel({
  className,
  children,
  as: As = 'section',
  ...rest
}: {
  className?: string;
  children?: ReactNode;
  as?: 'section' | 'div' | 'article';
  'aria-labelledby'?: string;
}) {
  return (
    <As className={cn('tile p-6', className)} {...rest}>
      {children}
    </As>
  );
}
