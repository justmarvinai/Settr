import { Autocomplete } from '@base-ui/react/autocomplete';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { ArrowRightIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';
import { useNavigate, type NavigateOptions } from '@tanstack/react-router';
import { useState } from 'react';
import { useManifest } from '@/catalog';
import { useCatalogSearch } from '@/catalog/useCatalogSearch';
import { CardImage } from '@/components/domain/CardImage';
import { ProductImage } from '@/components/domain/ProductImage';
import { pickText } from '@/domain/catalog';
import { languageCode, m, printLabel, productTypeLabel, rarityLabel } from '@/i18n';

interface PaletteGroup {
  value: PaletteItem['group'];
  label: string;
  items: PaletteItem[];
}

interface PaletteItem {
  id: string;
  group: 'cards' | 'sealed' | 'sets' | 'pages';
  title: string;
  meta?: string;
  visual?: 'card' | 'product';
  image?: Parameters<typeof CardImage>[0]['image'];
  productType?: string;
  target: NavigateOptions;
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const manifest = useManifest();
  const [query, setQuery] = useState('');
  const text = query.trim();
  const { results, pending } = useCatalogSearch(text, { limit: 30 }, open && text.length > 0);

  const q = fold(text);
  const items: PaletteItem[] = [];
  if (text) {
    for (const { doc } of results.filter((r) => r.kind === 'card').slice(0, 6))
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
        target: {
          to: '/catalog/sets/$setId/cards/$cardId',
          params: { setId: doc.setId, cardId: doc.id },
        },
      });
    for (const { doc } of results.filter((r) => r.kind === 'sealed').slice(0, 4))
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
    for (const set of manifest.sets.filter(
      (s) =>
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
    void navigate(item.target);
  };
  const groupLabel = {
    cards: m.search_group_cards(),
    sealed: m.search_group_sealed(),
    sets: m.search_group_sets(),
    pages: m.search_group_pages(),
  };
  const groups: PaletteGroup[] = (['cards', 'sealed', 'sets', 'pages'] as const)
    .map((group) => ({
      value: group,
      label: groupLabel[group],
      items: items.filter((i) => i.group === group),
    }))
    .filter((g) => g.items.length);
  const found = items.some((i) => i.group !== 'pages');

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
        <BaseDialog.Popup className="ui-palette glass-thick" aria-label={m.search_title()}>
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
                aria-label={m.search_title()}
                aria-describedby="palette-keys"
                placeholder={m.search_placeholder()}
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
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
              <span id="palette-keys" className="type-small text-ink-muted max-sm:hidden">
                {m.search_keys()}
              </span>
              {text ? (
                <button
                  type="button"
                  onClick={() => {
                    close();
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
