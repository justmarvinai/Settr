import { useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { ToastViewport } from '@/components/ui/Toasts';
import { m } from '@/i18n';
import { inDialog, isPlain, isTyping } from '@/lib/keys';
import { useSheets } from '@/lib/sheets';
import { setShortcutsOpen, showShortcuts, useShortcuts } from '@/lib/shortcuts';
import { useKeySequence } from '@/lib/useKeySequence';
import { usePrivacy } from '../privacy';
import { BackupReminder } from './BackupReminder';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { Toolbar } from './Toolbar';

// Loaded on first use: the palette grows with the catalog search (M2) and isn't needed for first paint.
const SearchDialog = lazy(() => import('./SearchDialog'));
const MoreSheet = lazy(() => import('./MoreSheet'));
const ShortcutsDialog = lazy(() => import('./ShortcutsDialog'));
// The add/edit sheets and their forms load when a page first asks for one.
const CollectionSheets = lazy(() => import('./CollectionSheets'));

export type SearchMode = 'go' | 'add';

/**
 * Global layout (UX_SPEC.md §3): floating glass sidebar/rail, floating toolbar, content that scrolls
 * beneath the chrome, and the phone tab bar.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoaded, setSearchLoaded] = useState(false); // stays mounted after first use (exit animation, focus return)
  const [searchMode, setSearchMode] = useState<SearchMode>('go');
  const openSearch = (mode: SearchMode = 'go') => {
    setSearchMode(mode);
    setSearchLoaded(true);
    setSearchOpen(true);
  };
  const sheetRequested = useSheets((state) => state.request !== null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreLoaded, setMoreLoaded] = useState(false);
  const openMore = () => {
    setMoreLoaded(true);
    setMoreOpen(true);
  };
  const shortcuts = useShortcuts();

  // G then O / S / K / P / F / E goes to a main area (UX_SPEC.md §7).
  const navigate = useNavigate();
  useKeySequence('g', {
    o: () => void navigate({ to: '/' }),
    s: () => void navigate({ to: '/collection' }),
    k: () => void navigate({ to: '/catalog' }),
    p: () => void navigate({ to: '/prices' }),
    f: () => void navigate({ to: '/portfolio' }),
    e: () => void navigate({ to: '/settings' }),
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchMode('go');
        setSearchLoaded(true);
        setSearchOpen(true);
        return;
      }
      // Single keys (UX_SPEC.md §7): quiet while typing, inside dialogs and after a page used them.
      if (!isPlain(event) || event.defaultPrevented || isTyping(event.target)) return;
      if (inDialog(event.target) || useSheets.getState().open) return;
      const key = event.key.toLowerCase();
      if (key === '/' || key === '?') {
        event.preventDefault();
        if (key === '/') {
          setSearchMode('go');
          setSearchLoaded(true);
          setSearchOpen(true);
        } else {
          showShortcuts();
        }
      } else if (key === 'h') {
        event.preventDefault();
        usePrivacy.getState().toggle();
      } else if (key === 'n') {
        // N adds: pages handle it for a focused card first, else the add palette.
        event.preventDefault();
        setSearchMode('add');
        setSearchLoaded(true);
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">
        {m.app_skip_to_content()}
      </a>
      <div
        aria-hidden
        className="ambient -top-40 -left-44 h-[640px] w-[780px] bg-[var(--ambient-1)]"
      />
      <div
        aria-hidden
        className="ambient -right-40 top-[45%] h-[560px] w-[640px] bg-[var(--ambient-2)]"
      />
      <Sidebar />
      <div className="relative z-10 px-3 md:pl-[88px] lg:pl-[260px]">
        <div className="mx-auto max-w-[1440px] pt-3">
          <Toolbar
            onOpenSearch={() => openSearch('go')}
            onAdd={() => openSearch('add')}
            onOpenMore={openMore}
          />
          <main id="main" tabIndex={-1} className="pt-5 pb-32 outline-none md:pb-8">
            {children}
          </main>
        </div>
      </div>
      <TabBar onAdd={() => openSearch('add')} />
      <Suspense fallback={null}>
        {searchLoaded ? (
          <SearchDialog
            open={searchOpen}
            onOpenChange={setSearchOpen}
            mode={searchMode}
            onShowShortcuts={showShortcuts}
          />
        ) : null}
        {sheetRequested ? <CollectionSheets /> : null}
        {moreLoaded ? <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} /> : null}
        {shortcuts.requested ? (
          <ShortcutsDialog open={shortcuts.open} onOpenChange={setShortcutsOpen} />
        ) : null}
      </Suspense>
      <ToastViewport />
      <BackupReminder />
    </>
  );
}
