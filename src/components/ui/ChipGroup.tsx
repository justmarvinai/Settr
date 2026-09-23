import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import type { Option } from './types';

/** Multi-select chips (e.g. card languages). Each chip is a toggle button with aria-pressed. */
export function ChipGroup<T extends string>({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: readonly T[];
  onValueChange: (value: T[]) => void;
  options: readonly Option<T>[];
}) {
  return (
    <ToggleGroup
      aria-label={label}
      multiple
      value={[...value]}
      onValueChange={(v) => onValueChange(v)}
      className="flex flex-wrap gap-2"
    >
      {options.map((o) => (
        <Toggle
          key={o.value}
          value={o.value}
          className="h-10 rounded-pill px-4 type-ui text-ink-muted shadow-[inset_0_0_0_1.5px_var(--border-strong)] transition-colors duration-(--dur-fast) hover:text-ink data-pressed:bg-accent-soft data-pressed:text-accent-text data-pressed:shadow-none"
        >
          {o.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
