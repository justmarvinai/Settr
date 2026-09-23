import type { ReactNode } from 'react';
import { Panel } from './Panel';

/** Placeholder for areas that later milestones build. Honest about what's missing, never a dead end. */
export function ComingSoon({
  badge,
  body,
  children,
}: {
  badge: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <Panel className="flex max-w-2xl flex-col gap-3">
      <span className="inline-flex w-fit items-center rounded-pill bg-accent-soft px-3 py-1 type-label text-accent-text">
        {badge}
      </span>
      <p className="type-body m-0 text-ink-muted">{body}</p>
      {children}
    </Panel>
  );
}
