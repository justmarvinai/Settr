import { Outlet } from '@tanstack/react-router';
import { SectionNav } from '@/components/ui/SectionNav';
import { m } from '@/i18n';

/** Sammlung with its two libraries, Karten and Sealed (UX_SPEC.md §2.2). */
export function CollectionLayout() {
  return (
    <div className="flex flex-col gap-4">
      <SectionNav
        label={m.collection_tabs_label()}
        items={[
          { to: '/collection/cards', label: m.collection_tab_cards() },
          { to: '/collection/sealed', label: m.collection_tab_sealed() },
        ]}
      />
      <Outlet />
    </div>
  );
}
