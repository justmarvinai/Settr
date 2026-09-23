import { Switch as BaseSwitch } from '@base-ui/react/switch';

/** On/off switch with a visible label and optional hint. */
export function Switch({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <label htmlFor={id} className="flex flex-col gap-1">
        <span className="type-ui text-ink">{label}</span>
        {hint ? <span className="type-small text-ink-muted">{hint}</span> : null}
      </label>
      <BaseSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-pill bg-hover-strong p-0.5 transition-colors duration-(--dur-fast) data-checked:bg-accent"
      >
        <BaseSwitch.Thumb className="size-6 rounded-pill bg-surface-1 shadow-sm transition-transform duration-(--dur-fast) data-checked:translate-x-5" />
      </BaseSwitch.Root>
    </div>
  );
}
