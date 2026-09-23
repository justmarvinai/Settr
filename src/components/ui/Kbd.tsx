import type { ReactNode } from 'react';

/** Keyboard shortcut hint, e.g. `Strg K`. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[8px] bg-surface-1 px-1.5 py-1 font-mono text-[11px] font-semibold text-ink-muted shadow-[0_0_0_1px_var(--border)]">
      {children}
    </kbd>
  );
}
