import { cn } from '@/components/ui/cn';

/**
 * Set progress as a ring (DSN-03, DESIGN_SYSTEM.md §7 moment 4). The arc draws in when it first
 * shows and eases to new values; at 100 % it turns to foil with one sweep, and `celebrate` adds
 * the set-complete moment (a lift and a glow). All of it is CSS, off under reduced motion. The
 * number next to it carries the meaning, so the ring is decorative unless it gets a `label`.
 */
export function SetProgressRing({
  value,
  size = 40,
  thickness,
  label,
  celebrate = false,
  className,
}: {
  /** 0 to 1. */
  value: number;
  size?: number;
  thickness?: number;
  label?: string;
  celebrate?: boolean;
  className?: string;
}) {
  const share = Math.min(1, Math.max(0, value));
  return (
    <span
      className={cn('progress-ring-wrap', className)}
      data-celebrate={celebrate || undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span
        className="progress-ring"
        data-complete={share >= 1 || undefined}
        style={{
          '--ring-value': share,
          '--ring-size': `${size}px`,
          '--ring-thickness': `${thickness ?? Math.max(3, Math.round(size / 9))}px`,
        }}
      />
    </span>
  );
}
