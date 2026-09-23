import { Outlet } from '@tanstack/react-router';
import { SectionNav } from '@/components/ui/SectionNav';
import { m } from '@/i18n';

/** Einstellungen (APP-07): section list + content. Pills on phones, a side list on desktop. */
export function SettingsLayout() {
  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,760px)]">
      <SectionNav
        vertical
        label={m.settings_sections_label()}
        items={[
          { to: '/settings', label: m.settings_section_general(), exact: true },
          { to: '/settings/appearance', label: m.settings_section_appearance() },
          { to: '/settings/prices', label: m.settings_section_prices() },
          { to: '/settings/locations', label: m.settings_section_locations() },
          { to: '/settings/data', label: m.settings_section_data() },
          { to: '/settings/about', label: m.settings_section_about() },
        ]}
      />
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
