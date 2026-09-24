import { Link } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { GearSixGlyph } from '@/components/ui/glyphs';
import { Logo } from '@/components/ui/Logo';
import { m } from '@/i18n';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { BackupPill } from './BackupPill';
import { NAV_ITEMS, SIDE_ITEM_CLASS as itemClass, type NavItem } from './nav';

// The sets you collect, with their rings: loaded after the shell (it reads set chunks).
const SidebarSets = lazy(() => import('./SidebarSets'));

function SideLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <Link to={item.to} activeOptions={{ exact: item.exact ?? false }} className={itemClass}>
      <Icon size={22} aria-hidden className="shrink-0" />
      <span className="max-lg:sr-only">{item.label()}</span>
    </Link>
  );
}

/**
 * Floating glass sidebar (direction D, UX_SPEC.md §3.2): 236 px on desktop, a 64 px icon rail on
 * tablets, hidden on phones (tab bar instead).
 */
export function Sidebar() {
  const shown = useMediaQuery('(min-width: 48rem)');
  return (
    <nav
      aria-label={m.nav_main_label()}
      className="glass fixed top-3 bottom-3 left-3 z-40 hidden w-16 flex-col gap-1 rounded-sidebar px-2 pt-4 pb-3 md:flex lg:w-[236px] lg:px-3"
    >
      <Link
        to="/"
        aria-label={m.nav_home_label()}
        className="mb-5 flex items-center gap-3 rounded-[14px] px-2 py-1 max-lg:justify-center max-lg:px-0"
      >
        <Logo />
        <span className="hidden flex-col gap-1.5 lg:flex">
          <span className="text-[25px] leading-none font-black tracking-[-0.035em] text-ink [font-stretch:125%]">
            {m.app_name()}
          </span>
          <span className="type-label font-semibold text-ink-subtle">{m.app_tagline()}</span>
        </span>
      </Link>
      {NAV_ITEMS.map((item) => (
        <SideLink key={item.to} item={item} />
      ))}
      {shown ? (
        <Suspense fallback={null}>
          <SidebarSets />
        </Suspense>
      ) : null}
      <div className="mt-auto flex flex-col gap-1.5">
        <BackupPill />
        <Link to="/settings" className={itemClass}>
          <GearSixGlyph size={22} aria-hidden className="shrink-0" />
          <span className="max-lg:sr-only">{m.nav_settings()}</span>
        </Link>
      </div>
    </nav>
  );
}
