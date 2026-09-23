import { cn } from '@/components/ui/cn';
import type { VizColor } from './TimeChart';

/**
 * A donut of shares (DESIGN_SYSTEM.md §9), drawn with stroke dashes on one circle per slice. The
 * owner lists the slices with their amounts beside it, so nothing depends on color alone.
 */

export interface DonutSlice {
  key: string;
  value: number;
  color: VizColor;
}

const STROKE: Record<VizColor, string> = {
  1: 'stroke-viz-1',
  2: 'stroke-viz-2',
  3: 'stroke-viz-3',
  4: 'stroke-viz-4',
  5: 'stroke-viz-5',
  6: 'stroke-viz-6',
  7: 'stroke-viz-7',
  8: 'stroke-viz-8',
  neutral: 'stroke-ink-subtle',
};

const R = 40;
const C = 2 * Math.PI * R;
/** A hairline gap between slices, so neighbors read apart even in similar hues. */
const GAP = 1.5;

export function Donut({
  slices,
  size = 132,
  className,
}: {
  slices: readonly DonutSlice[];
  size?: number;
  className?: string;
}) {
  const total = slices.reduce((n, s) => n + Math.max(0, s.value), 0);
  let offset = 0;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      className={cn('shrink-0 -rotate-90', className)}
    >
      <circle cx={50} cy={50} r={R} fill="none" className="stroke-hover" strokeWidth={14} />
      {total > 0
        ? slices.map((slice) => {
            const length = (Math.max(0, slice.value) / total) * C;
            const dash = Math.max(0, length - (slices.length > 1 ? GAP : 0));
            const circle = (
              <circle
                key={slice.key}
                cx={50}
                cy={50}
                r={R}
                fill="none"
                className={STROKE[slice.color]}
                strokeWidth={14}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return circle;
          })
        : null}
    </svg>
  );
}
