import type { ReactNode } from 'react';

/**
 * An empty page or list (UX_SPEC.md §6, DESIGN_SYSTEM.md §8): what's missing, how to start, and
 * the way there. No illustration, no exclamation marks.
 */
export function EmptyState({
  id,
  title,
  children,
  actions,
}: {
  /** Id of the heading, which names the section. */
  id: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="tile flex flex-col items-start gap-3 p-8">
      <h2 id={id} className="type-h2 m-0">
        {title}
      </h2>
      <p className="type-body m-0 max-w-[56ch] text-ink-muted">{children}</p>
      {actions ? <div className="flex flex-wrap gap-3 pt-2">{actions}</div> : null}
    </section>
  );
}
