import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { cn } from './cn';
import type { Option } from './types';

const item =
  'inline-flex h-10 min-w-12 cursor-default items-center justify-center rounded-pill px-4 type-ui whitespace-nowrap transition-colors duration-(--dur-fast) data-checked:bg-ink data-checked:text-canvas';

/**
 * Single choice drawn as pills; the chosen option is the monochrome ink pill of direction D
 * (DESIGN_SYSTEM.md §1.2). `track` joins up to ~4 short options in one pill; `chips` wraps, for more
 * or longer options (e.g. five card languages on a phone).
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  onValueChange,
  options,
  variant = 'track',
  className,
}: {
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: readonly Option<T>[];
  variant?: 'track' | 'chips';
  className?: string;
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(v) => onValueChange(v)}
      className={cn(
        variant === 'track'
          ? 'inline-flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-pill bg-hover p-1'
          : 'flex flex-wrap gap-2',
        className,
      )}
    >
      {options.map((o) => (
        <Radio.Root
          key={o.value}
          value={o.value}
          className={cn(
            item,
            // In a track the pills keep their width and the track scrolls: a shrunken pill's
            // label would spill over its neighbour and take its taps.
            variant === 'track'
              ? 'shrink-0 text-ink-muted hover:text-ink'
              : 'text-ink-muted shadow-[inset_0_0_0_1.5px_var(--border-strong)] hover:text-ink data-checked:shadow-none',
          )}
        >
          {o.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
