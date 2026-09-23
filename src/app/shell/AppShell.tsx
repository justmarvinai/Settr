import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { ToastViewport } from '@/components/ui/Toasts';
import { m } from '@/i18n';
import { isTyping } from '@/lib/keys';
import { useSheets } from '@/lib/sheets';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { Toolbar } from './Toolbar';

// Loaded on first use: the palette grows with the catalog search (M2) and isn't needed for first paint.
const SearchDialog = lazy(() => import('./SearchDialog'));
const MoreSheet = lazy(() => import('./MoreSheet'));
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchMode('go');
        setSearchLoaded(true);
        setSearchOpen(true);
        return;
      }
      // N adds (UX_SPEC.md §7): pages handle it for a focused card first, else the add palette.
      const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
      if (
        plain &&
        event.key.toLowerCase() === 'n' &&
        !event.defaultPrevented &&
        !isTyping(event.target)
      ) {
        if (useSheets.getState().open) return;
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
          <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} mode={searchMode} />
        ) : null}
        {sheetRequested ? <CollectionSheets /> : null}
        {moreLoaded ? <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} /> : null}
      </Suspense>
      <ToastViewport />
    </>
  );
}
