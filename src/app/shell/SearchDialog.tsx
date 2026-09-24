import { Autocomplete } from '@base-ui/react/autocomplete';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import {
  ArrowRightIcon,
  DownloadSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyboardIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  UploadSimpleIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, type NavigateOptions } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { useManifest } from '@/catalog';
import { useCatalogSearch } from '@/catalog/useCatalogSearch';
import { CardImage } from '@/components/domain/CardImage';
import { ProductImage } from '@/components/domain/ProductImage';
import { useCustomItems, useOwnedItemIds, useSettings } from '@/db';
import { changeDisplay, resolvedTheme } from '@/features/appearance';
import { exportBackup } from '@/features/data';
import { pickText } from '@/domain/catalog';
import { languageCode, m, printLabel, productTypeLabel, rarityLabel } from '@/i18n';
import { openSheet } from '@/lib/sheets';
import { usePrivacy } from '../privacy';
import type { SearchMode } from './AppShell';

interface PaletteGroup {
  value: PaletteItem['group'];
  label: string;
  items: PaletteItem[];
}

interface PaletteItem {
  id: string;
  group: 'cards' | 'sealed' | 'custom' | 'sets' | 'actions' | 'pages';
  title: string;
  meta?: string;
  visual?: 'card' | 'product';
  image?: Parameters<typeof CardImage>[0]['image'];
  productType?: string;
  /** Where the item lives (a card's set chunk), for the add sheet. */
  setId?: string;
  target: NavigateOptions;
  /** An action instead of a place (Backup exportieren). */
  run?: () => void;
  icon?: Icon;
}

const PAGES: { label: () => string; target: NavigateOptions }[] = [
  { label: m.nav_overview, target: { to: '/' } },
  { label: m.nav_collection, target: { to: '/collection/cards' } },
  { label: m.nav_catalog, target: { to: '/catalog' } },
  { label: m.search_page_cards, target: { to: '/catalog/cards' } },
  { label: m.search_page_sealed, target: { to: '/catalog/sealed' } },
  { label: m.nav_prices, target: { to: '/prices' } },
  { label: m.nav_portfolio, target: { to: '/portfolio' } },
  { label: m.nav_settings, target: { to: '/settings' } },
  { label: m.search_page_appearance, target: { to: '/settings/appearance' } },
  { label: m.search_page_data, target: { to: '/settings/data' } },
];

/** A command (UX_SPEC.md §7), found by its name or these words. */
interface Action {
  id: string;
  label: string;
  meta?: string;
  words: string[];
  icon: Icon;
  /** Shown only when the query asks for it (one per set would crowd the empty palette). */
  onQueryOnly?: boolean;
  run?: () => void;
  target?: NavigateOptions;
}

const QUICK_WORDS = ['schnellerfassung', 'schnell', 'erfassung', 'quick', 'nummer'];

const fold = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();

/**
 * Search and command palette (APP-05, UX_SPEC.md §7): cards and sealed products from the catalog
 * search worker, sets from the manifest and the app's pages, in one list driven by ↑ ↓ ⏎. Base UI's
 * inline Autocomplete provides the combobox semantics. Loaded on first use; the search index loads
 * with the first query.
 */
export default function SearchDialog({
  open,
  onOpenChange,
  mode = 'go',
  onShowShortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `add`: picking a card or product opens its add sheet (＋ Hinzufügen, UX_SPEC.md §3.3). */
  mode?: SearchMode;
  /** Opens the shortcut cheat sheet (the palette's *Tastenkürzel*). */
  onShowShortcuts: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const manifest = useManifest();
  const customItems = useCustomItems();
  const [query, setQuery] = useState('');
  /** A pick that opens a page sends focus to it, not back to where the palette opened (a field). */
  const navigated = useRef(false);
  const adding = mode === 'add';
  const settings = useSettings();
  const privacy = usePrivacy();
  const dark = resolvedTheme(settings.display.theme) === 'dark';
  const text = query.trim();
  const owned = useOwnedItemIds();
  // Cards and products are searched apart, so a name many cards share (Glurak) leaves room for
  // its sealed products.
  const searching = open && text.length > 0;
  const cards = useCatalogSearch(text, { kind: 'card', limit: 6 }, searching, owned);
  const sealed = useCatalogSearch(text, { kind: 'sealed', limit: 4 }, searching, owned);
  const pending = cards.pending || sealed.pending;

  const q = fold(text);
  const items: PaletteItem[] = [];
  if (text) {
    for (const { doc } of cards.results)
      items.push({
        id: doc.id,
        group: 'cards',
        title: doc.name,
        meta: [
          pickText(manifest.sets.find((s) => s.id === doc.setId)?.name),
          doc.number,
          doc.rarity ? rarityLabel(doc.rarity) : undefined,
        ]
          .filter(Boolean)
          .join(' · '),
        visual: 'card',
        image: doc.image,
        setId: doc.setId,
        target: {
          to: '/catalog/sets/$setId/cards/$cardId',
          params: { setId: doc.setId, cardId: doc.id },
        },
      });
    for (const { doc } of sealed.results)
      items.push({
        id: doc.id,
        group: 'sealed',
        title: doc.name,
        meta: [
          doc.category ? productTypeLabel(doc.category) : '',
          ...doc.languages.map(languageCode),
        ]
          .filter(Boolean)
          .join(' · '),
        visual: 'product',
        image: doc.image,
        productType: doc.category ?? 'other',
        target: { to: '/catalog/sealed/$productId', params: { productId: doc.id } },
      });
    if (adding)
      for (const item of (customItems ?? []).filter((c) =>
        Object.values(c.name).some((n) => fold(n).includes(q)),
      ))
        items.push({
          id: `custom:${item.id}`,
          group: 'custom',
          title: pickText(item.name),
          meta: [item.setName, item.localId, ...item.languages.map(languageCode)]
            .filter(Boolean)
            .join(' · '),
          visual: item.kind === 'card' ? 'card' : 'product',
          productType: item.productType ?? 'other',
          target: { to: '/collection/cards' },
        });
    for (const set of manifest.sets.filter(
      (s) =>
        !adding &&
        s.kind === 'main' &&
        (Object.values(s.name).some((n) => fold(n).includes(q)) || fold(s.code ?? '') === q),
    ))
      items.push({
        id: set.id,
        group: 'sets',
        title: pickText(set.name),
        meta: [printLabel(set.print), set.code].filter(Boolean).join(' · '),
        target: { to: '/catalog/sets/$setId', params: { setId: set.id } },
      });
  }
  const actions: Action[] = [
    {
      id: 'export',
      label: m.palette_backup_export(),
      words: ['backup', 'sichern', 'export', 'daten'],
      icon: DownloadSimpleIcon,
      run: () => void exportBackup(queryClient),
    },
    {
      id: 'import',
      label: m.palette_backup_import(),
      words: ['backup', 'import', 'einspielen', 'wiederherstellen', 'daten'],
      icon: UploadSimpleIcon,
      target: { to: '/settings/data', hash: 'settings-import' },
    },
    ...manifest.sets
      .filter((set) => set.kind === 'main')
      .map<Action>((set) => ({
        id: `quick:${set.id}`,
        label: m.palette_quick_entry({ set: pickText(set.name) }),
        meta: [printLabel(set.print), set.code].filter(Boolean).join(' · '),
        words: [...QUICK_WORDS, ...Object.values(set.name).map(fold), fold(set.code ?? '')],
        icon: LightningIcon,
        onQueryOnly: true,
        run: () => openSheet({ type: 'quick', setId: set.id }),
      })),
    {
      id: 'shortcuts',
      label: m.palette_shortcuts(),
      words: ['tastenkürzel', 'tastatur', 'kürzel', 'shortcuts', 'hilfe'],
      icon: KeyboardIcon,
      run: onShowShortcuts,
    },
    {
      id: 'privacy',
      label: privacy.on ? m.toolbar_privacy_show() : m.toolbar_privacy_hide(),
      words: ['beträge', 'verbergen', 'anzeigen', 'privat', 'privatsphäre'],
      icon: privacy.on ? EyeIcon : EyeSlashIcon,
      run: privacy.toggle,
    },
    {
      id: 'theme',
      label: dark ? m.toolbar_theme_to_light() : m.toolbar_theme_to_dark(),
      words: ['design', 'dunkel', 'hell', 'theme', 'darstellung'],
      icon: dark ? SunIcon : MoonIcon,
      run: () => void changeDisplay(settings.display, { theme: dark ? 'light' : 'dark' }),
    },
  ];
  if (!adding)
    for (const action of actions)
      if (
        text
          ? fold(action.label).includes(q) || action.words.some((w) => w && w.startsWith(q))
          : !action.onQueryOnly
      )
        items.push({
          id: `action:${action.id}`,
          group: 'actions',
          title: action.label,
          ...(action.meta ? { meta: action.meta } : {}),
          icon: action.icon,
          target: action.target ?? { to: '/' },
          ...(action.run ? { run: action.run } : {}),
        });
  if (!adding)
    for (const page of PAGES)
      if (!text || fold(page.label()).includes(q))
        items.push({
          id: `page:${page.label()}`,
          group: 'pages',
          title: page.label(),
          target: page.target,
        });

  const close = () => {
    onOpenChange(false);
    setQuery('');
  };
  const go = (item: PaletteItem) => {
    close();
    if (item.run) {
      item.run();
      return;
    }
    if (adding && (item.group === 'cards' || item.group === 'sealed' || item.group === 'custom')) {
      const kind = item.group === 'cards' || item.visual === 'card' ? 'card' : 'sealed';
      openSheet({ type: 'add', item: { kind, id: item.id }, setId: item.setId });
      return;
    }
    navigated.current = true;
    void navigate(item.target);
  };
  const addCustom = () => {
    close();
    openSheet({ type: 'custom', kind: 'card', name: text || undefined });
  };
  const groupLabel = {
    cards: m.search_group_cards(),
    sealed: m.search_group_sealed(),
    custom: m.search_group_custom(),
    sets: m.search_group_sets(),
    actions: m.search_group_actions(),
    pages: m.search_group_pages(),
  };
  const groups: PaletteGroup[] = (
    ['cards', 'sealed', 'custom', 'sets', 'actions', 'pages'] as const
  )
    .map((group) => ({
      value: group,
      label: groupLabel[group],
      items: items.filter((i) => i.group === group),
    }))
    .filter((g) => g.items.length);
  const found = items.some((i) => i.group !== 'pages' && i.group !== 'actions');

  return (
    <BaseDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else close();
      }}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="ui-backdrop" />
        <BaseDialog.Popup
          className="ui-palette glass-thick"
          aria-label={adding ? m.search_add_title() : m.search_title()}
          finalFocus={() => {
            if (!navigated.current) return true;
            navigated.current = false;
            return document.getElementById('main');
          }}
        >
          <Autocomplete.Root
            open
            inline
            items={groups}
            filter={null}
            value={query}
            onValueChange={setQuery}
            itemToStringValue={(item: PaletteItem) => item.title}
            autoHighlight="always"
            keepHighlight
          >
            <Autocomplete.InputGroup className="flex items-center gap-2 border-b border-line px-4">
              <MagnifyingGlassIcon size={22} aria-hidden className="shrink-0 text-ink-muted" />
              <Autocomplete.Input
                aria-label={adding ? m.search_add_title() : m.search_title()}
                aria-describedby="palette-keys"
                placeholder={adding ? m.search_add_placeholder() : m.search_placeholder()}
                className="h-16 min-w-0 flex-1 bg-transparent type-ui text-[17px] text-ink outline-none placeholder:text-ink-subtle"
              />
              <BaseDialog.Close
                aria-label={m.dialog_close()}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-pill text-ink-muted hover:bg-hover hover:text-ink"
              >
                <XIcon size={18} weight="bold" aria-hidden />
              </BaseDialog.Close>
            </Autocomplete.InputGroup>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              <Autocomplete.List>
                {(group: PaletteGroup) => (
                  <Autocomplete.Group key={group.value} items={group.items}>
                    <Autocomplete.GroupLabel className="px-3 pt-3 pb-1.5 type-label text-ink-muted">
                      {group.label}
                    </Autocomplete.GroupLabel>
                    <Autocomplete.Collection>
                      {(item: PaletteItem) => (
                        <Autocomplete.Item
                          key={item.id}
                          value={item}
                          onClick={() => go(item)}
                          className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[14px] px-3 py-2 outline-none data-highlighted:bg-hover-strong"
                        >
                          {item.visual === 'card' ? (
                            <CardImage
                              image={item.image}
                              size="small"
                              alt=""
                              className="w-8 shrink-0"
                            />
                          ) : item.visual === 'product' ? (
                            <ProductImage
                              image={item.image}
                              type={item.productType ?? 'other'}
                              size="small"
                              alt=""
                              className="w-10 shrink-0 rounded-[10px]"
                            />
                          ) : item.icon ? (
                            <item.icon size={18} aria-hidden className="shrink-0 text-ink-muted" />
                          ) : (
                            <ArrowRightIcon
                              size={18}
                              aria-hidden
                              className="shrink-0 text-ink-muted"
                            />
                          )}
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="type-ui truncate text-[15px] text-ink">
                              {item.title}
                            </span>
                            {item.meta ? (
                              <span className="type-small truncate text-ink-muted">
                                {item.meta}
                              </span>
                            ) : null}
                          </span>
                        </Autocomplete.Item>
                      )}
                    </Autocomplete.Collection>
                  </Autocomplete.Group>
                )}
              </Autocomplete.List>
              {text && !pending && !found ? (
                <p className="type-body m-0 px-3 py-4 text-ink-muted">{m.search_empty()}</p>
              ) : null}
              {adding && !text ? (
                <p className="type-body m-0 px-3 py-4 text-ink-muted">{m.search_add_hint()}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
              <span id="palette-keys" className="type-small text-ink-muted max-sm:hidden">
                {adding ? m.search_add_keys() : m.search_keys()}
              </span>
              {adding ? (
                <button
                  type="button"
                  onClick={addCustom}
                  className="inline-flex items-center gap-1.5 type-small font-bold text-accent-text hover:underline"
                >
                  <PlusIcon size={14} weight="bold" aria-hidden />
                  {m.search_add_custom()}
                </button>
              ) : text ? (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    navigated.current = true;
                    void navigate({ to: '/catalog/cards', search: { q: text } });
                  }}
                  className="type-small font-bold text-accent-text hover:underline"
                >
                  {m.search_all_cards()}
                </button>
              ) : null}
            </div>
          </Autocomplete.Root>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
