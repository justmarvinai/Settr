import { Link } from '@tanstack/react-router';
import { PlusGlyph } from '@/components/ui/glyphs';
import { m } from '@/i18n';
import { TAB_ITEMS, type NavItem } from './nav';

function TabLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.exact ?? false }}
      className="flex h-14 w-16 flex-col items-center justify-center gap-1 rounded-[18px] text-[10px] font-bold text-ink-muted hover:text-ink data-[status=active]:text-accent-text"
    >
      <Icon size={22} aria-hidden />
      {item.label()}
    </Link>
  );
}

/** Floating glass pill tab bar on phones, with the center ＋ (UX_SPEC.md §3.3). */
export function TabBar({ onAdd }: { onAdd: () => void }) {
  const [first, second, ...rest] = TAB_ITEMS;
  return (
    <nav
      aria-label={m.nav_main_label()}
      className="glass fixed inset-x-3.5 bottom-[max(16px,env(safe-area-inset-bottom))] z-40 flex h-[70px] items-center justify-around rounded-pill px-1.5 md:hidden"
    >
      {first ? <TabLink item={first} /> : null}
      {second ? <TabLink item={second} /> : null}
      <button
        type="button"
        onClick={onAdd}
        aria-label={m.nav_add()}
        className="inline-flex size-14 items-center justify-center rounded-pill bg-accent text-accent-contrast shadow-[0_10px_24px_-10px_oklch(0_0_0/0.45)]"
      >
        <PlusGlyph size={24} aria-hidden />
      </button>
      {rest.map((item) => (
        <TabLink key={item.to} item={item} />
      ))}
    </nav>
  );
}
