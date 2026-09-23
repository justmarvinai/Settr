import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import type { ReactNode } from 'react';
import type { Option } from './types';

/** Tabs with an ink underline indicator. */
export function Tabs<T extends string>({
  label,
  value,
  onValueChange,
  tabs,
  children,
}: {
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  tabs: readonly Option<T>[];
  children?: ReactNode;
}) {
  return (
    <BaseTabs.Root value={value} onValueChange={(v: T) => onValueChange(v)}>
      <BaseTabs.List aria-label={label} className="relative flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <BaseTabs.Tab
            key={t.value}
            value={t.value}
            className="h-11 px-3 type-ui text-ink-muted hover:text-ink data-active:text-ink"
          >
            {t.label}
          </BaseTabs.Tab>
        ))}
        <BaseTabs.Indicator className="absolute bottom-0 left-(--active-tab-left) h-0.5 w-(--active-tab-width) rounded-pill bg-ink transition-[left,width] duration-(--dur-base)" />
      </BaseTabs.List>
      {children}
    </BaseTabs.Root>
  );
}

export const TabPanel = BaseTabs.Panel;
