import { CaretDownIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { cn } from './cn';
import type { Option } from './types';

/**
 * Filter select drawn as a pill (direction D). A native <select>, so keyboard, screen readers and
 * the phone's own picker work without extra code. `placeholder` is what the pill shows while the
 * first option ("all") is chosen, e.g. the filter's name; the list keeps the full option labels.
 * A chosen filter shows its value in the accent tint.
 */
export function Select<T extends string>({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  icon,
  className,
}: {
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: readonly Option<T>[];
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
}) {
  const isDefault = options[0]?.value === value;
  const shown = (isDefault && placeholder) || options.find((o) => o.value === value)?.label;
  return (
    <label
      className={cn(
        'relative inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-pill pr-9 pl-4 type-ui text-[14px] whitespace-nowrap transition-colors duration-(--dur-fast) focus-within:shadow-[inset_0_0_0_2px_var(--accent)]',
        isDefault
          ? 'bg-hover text-ink hover:bg-hover-strong'
          : 'bg-accent-soft text-accent-text hover:bg-hover-strong',
        className,
      )}
    >
      {icon ? (
        <span aria-hidden className="-ml-0.5 flex">
          {icon}
        </span>
      ) : null}
      <span aria-hidden className="max-w-[14rem] truncate">
        {shown}
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => {
          const next = options.find((o) => o.value === event.target.value);
          if (next) onValueChange(next.value);
        }}
        className="absolute inset-0 cursor-pointer appearance-none rounded-pill opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <CaretDownIcon
        size={14}
        weight="bold"
        aria-hidden
        className="pointer-events-none absolute right-3.5 text-current opacity-70"
      />
    </label>
  );
}
