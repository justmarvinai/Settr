import { useMatches } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import {
  CloudSlashGlyph,
  DotsThreeOutlineGlyph,
  EyeGlyph,
  EyeSlashGlyph,
  MagnifyingGlassGlyph,
  MoonGlyph,
  PlusGlyph,
  SunGlyph,
} from '@/components/ui/glyphs';
import { Kbd } from '@/components/ui/Kbd';
import { useSettings } from '@/db/core';
import { changeDisplay, resolvedTheme } from '@/features/appearance';
import { m } from '@/i18n';
import { isApple } from '@/lib/platform';
import { useOnline } from '@/lib/useOnline';
import { usePrivacy } from '../privacy';

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
    // Instant; the stored setting follows (and a late older read can't switch it back).
    void changeDisplay(settings.display, { theme: dark ? 'light' : 'dark' });
  };
  return (
    <IconButton className="max-md:hidden" label={label} onClick={toggle}>
      {dark ? <SunGlyph size={20} aria-hidden /> : <MoonGlyph size={20} aria-hidden />}
    </IconButton>
  );
}

/** "Offline · alles funktioniert" (UX_SPEC.md §6): everything but uncached pictures keeps working. */
function OfflinePill() {
  const online = useOnline();
  return (
    <output className="shrink-0">
      {online ? null : (
        <span className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-hover px-3 type-small font-semibold text-ink-muted">
          <CloudSlashGlyph size={16} aria-hidden />
          <span className="max-sm:sr-only">{m.offline_pill()}</span>
          <span aria-hidden className="sm:hidden">
            {m.offline_short()}
          </span>
        </span>
      )}
    </output>
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
      {on ? <EyeSlashGlyph size={20} aria-hidden /> : <EyeGlyph size={20} aria-hidden />}
    </IconButton>
  );
}

/**
 * Floating glass toolbar: title · search (Strg K) · theme · privacy · ＋ Hinzufügen (UX_SPEC.md §3.2).
 * Phones: title · search · privacy · Mehr (§3.3); the theme lives in Einstellungen › Darstellung.
 */
export function Toolbar({
  onOpenSearch,
  onAdd,
  onOpenMore,
}: {
  onOpenSearch: () => void;
  onAdd: () => void;
  onOpenMore: () => void;
}) {
  const title = usePageTitle();
  return (
    <header className="glass sticky top-[max(12px,env(safe-area-inset-top))] z-30 flex h-16 items-center gap-1.5 rounded-toolbar pr-2.5 pl-4 sm:gap-2 sm:pl-5 md:gap-2.5 md:pl-6">
      <h1 className="type-h1 m-0 min-w-0 flex-1 truncate max-sm:text-[22px] max-sm:[font-stretch:112%]">
        {title}
      </h1>
      <OfflinePill />
      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden h-11 w-[340px] shrink items-center gap-2.5 rounded-pill bg-hover pr-2 pl-3.5 text-left type-small text-ink-muted transition-colors duration-(--dur-fast) hover:bg-hover-strong lg:flex"
      >
        <MagnifyingGlassGlyph size={18} aria-hidden />
        <span className="flex-1 truncate">{m.toolbar_search()}</span>
        <Kbd>{isApple ? m.toolbar_shortcut_mac() : m.toolbar_shortcut_windows()}</Kbd>
      </button>
      <IconButton className="lg:hidden" label={m.toolbar_search_label()} onClick={onOpenSearch}>
        <MagnifyingGlassGlyph size={20} aria-hidden />
      </IconButton>
      <ThemeToggle />
      <PrivacyToggle />
      <IconButton className="md:hidden" label={m.nav_more()} onClick={onOpenMore}>
        <DotsThreeOutlineGlyph size={20} aria-hidden />
      </IconButton>
      <Button variant="primary" className="max-md:hidden" onClick={onAdd}>
        <PlusGlyph size={18} aria-hidden />
        {m.nav_add()}
      </Button>
    </header>
  );
}
