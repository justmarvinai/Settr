import { Outlet, useLocation } from '@tanstack/react-router';
import { SectionNav } from '@/components/ui/SectionNav';
import { m } from '@/i18n';

const TAB_PATHS = new Set(['/catalog', '/catalog/cards', '/catalog/sealed']);

/**
 * Katalog with its three views, Sets | Karten | Sealed (UX_SPEC.md §2.1). Detail pages (a set, a
 * card, a product) are full pages without the tabs.
 */
export function CatalogLayout() {
  const pathname = useLocation({ select: (location) => location.pathname.replace(/\/$/, '') });
  return (
    <div className="flex flex-col gap-5">
      {TAB_PATHS.has(pathname) ? (
        <SectionNav
          label={m.catalog_tabs_label()}
          items={[
            { to: '/catalog', label: m.catalog_tab_sets(), exact: true },
            { to: '/catalog/cards', label: m.catalog_tab_cards() },
            { to: '/catalog/sealed', label: m.catalog_tab_sealed(), exact: true },
          ]}
        />
      ) : null}
      <Outlet />
    </div>
  );
}
