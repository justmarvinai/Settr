import {
  DotsThreeOutlineIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
} from '@phosphor-icons/react';
import { useMatches } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { db, updateSettings, useSettings } from '@/db';
import { applyDisplay, resolvedTheme } from '@/features/appearance';
import { m } from '@/i18n';
import { usePrivacy } from '../privacy';

const isApple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const pageTitleOf = (loaderData: unknown): string | undefined =>
  loaderData && typeof loaderData === 'object' && 'pageTitle' in loaderData
    ? String(loaderData.pageTitle)
    : undefined;

/**
 * Deepest route title (route `staticData.title`) for the toolbar. The document title prefers a
 * loader's `pageTitle` (a set, card or product name), so tabs and history read well.
 */
function usePageTitle(): string {
  const matches = useMatches().toReversed();
  const title =
    matches.find((match) => match.staticData.title)?.staticData.title?.() ?? m.app_name();
  const detail = matches.map((match) => pageTitleOf(match.loaderData)).find(Boolean);
  const documentTitle = detail ?? title;
  useEffect(() => {
    document.title =
      documentTitle === m.app_name() ? documentTitle : `${documentTitle} · ${m.app_name()}`;
  }, [documentTitle]);
  return title;
}

function ThemeToggle() {
  const settings = useSettings();
  const dark = resolvedTheme(settings.display.theme) === 'dark';
  const label = dark ? m.toolbar_theme_to_light() : m.toolbar_theme_to_dark();
  const toggle = () => {
    const display = { ...settings.display, theme: dark ? ('light' as const) : ('dark' as const) };
    applyDisplay(display); // instant; the stored setting follows
    void updateSettings(db, { display: { theme: display.theme } });
  };
  return (
    <IconButton className="max-md:hidden" label={label} onClick={toggle}>
      {dark ? <SunIcon size={20} aria-hidden /> : <MoonIcon size={20} aria-hidden />}
    </IconButton>
  );
}

function PrivacyToggle() {
  const { on, toggle } = usePrivacy();
  return (
    <IconButton
      label={on ? m.toolbar_privacy_show() : m.toolbar_privacy_hide()}
      aria-pressed={on}
      onClick={toggle}
    >
      {on ? <EyeSlashIcon size={20} aria-hidden /> : <EyeIcon size={20} aria-hidden />}
    </IconButton>
  );
}

/**
 * Floating glass toolbar: title · search (Strg K) · theme · privacy · ＋ Hinzufügen (UX_SPEC.md §3.2).
 * Phones: title · search · privacy · Mehr (§3.3); the theme lives in Einstellungen › Darstellung.
 */
export function Toolbar({
  onOpenSearch,
  onOpenMore,
}: {
  onOpenSearch: () => void;
  onOpenMore: () => void;
}) {
  const title = usePageTitle();
  return (
    <header className="glass sticky top-[max(12px,env(safe-area-inset-top))] z-30 flex h-16 items-center gap-1.5 rounded-toolbar pr-2.5 pl-4 sm:gap-2 sm:pl-5 md:gap-2.5 md:pl-6">
      <h1 className="type-h1 m-0 min-w-0 flex-1 truncate max-sm:text-[22px] max-sm:[font-stretch:112%]">
        {title}
      </h1>
      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden h-11 w-[340px] shrink items-center gap-2.5 rounded-pill bg-hover pr-2 pl-3.5 text-left type-small text-ink-muted transition-colors duration-(--dur-fast) hover:bg-hover-strong lg:flex"
      >
        <MagnifyingGlassIcon size={18} aria-hidden />
        <span className="flex-1 truncate">{m.toolbar_search()}</span>
        <Kbd>{isApple ? m.toolbar_shortcut_mac() : m.toolbar_shortcut_windows()}</Kbd>
      </button>
      <IconButton className="lg:hidden" label={m.toolbar_search_label()} onClick={onOpenSearch}>
        <MagnifyingGlassIcon size={20} aria-hidden />
      </IconButton>
      <ThemeToggle />
      <PrivacyToggle />
      <IconButton className="md:hidden" label={m.nav_more()} onClick={onOpenMore}>
        <DotsThreeOutlineIcon size={20} weight="fill" aria-hidden />
      </IconButton>
      <Button variant="primary" className="max-md:hidden" onClick={onOpenSearch}>
        <PlusIcon size={18} weight="bold" aria-hidden />
        {m.nav_add()}
      </Button>
    </header>
  );
}
