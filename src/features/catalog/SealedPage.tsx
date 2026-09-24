import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { getRouteApi } from '@tanstack/react-router';
import { useState } from 'react';
import { useSealed, type SealedSearch } from '@/catalog';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { firstRelease, PRODUCT_TYPES, type CatalogProduct } from '@/domain/catalog';
import { ACTIVE_CARD_LANGUAGES, type CardLanguage } from '@/domain/catalog-types';
import { languageLabel, m, printLabel, productTypeLabel } from '@/i18n';
import { formatCount } from '@/i18n/format';
import { rovingFocusRef } from '@/lib/useRovingFocus';
import { ProductTile } from './ProductTile';
import type { PrintFilter } from './SetsPage';

const route = /* @__PURE__ */ getRouteApi('/catalog/sealed/');

const typeRank = (type: string) => {
  const index = (PRODUCT_TYPES as readonly string[]).indexOf(type);
  return index === -1 ? PRODUCT_TYPES.length : index;
};
const releaseOf = (p: CatalogProduct) => firstRelease({ releaseDates: p.releaseDates ?? {} });
const fold = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();

/**
 * Katalog › Sealed (CAT-05, CAT-06): every product by print, filtered by language, type and name.
 * Products come in release order, the types in shelf order (packs, boxes, collections, tins …).
 */
export function SealedPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { products } = useSealed();
  const [query, setQuery] = useState(search.q ?? '');
  const print: PrintFilter = search.print ?? 'all';
  const update = (patch: Partial<SealedSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const languages = ACTIVE_CARD_LANGUAGES.filter((l) =>
    products.some((p) => p.languages.includes(l)),
  );
  const types = [...new Set(products.map((p) => p.type))].toSorted(
    (a, b) => typeRank(a) - typeRank(b),
  );
  const q = fold(query);
  const today = new Date().toISOString().slice(0, 10);
  const released = (p: CatalogProduct) => {
    const date = releaseOf(p);
    return date !== '' && date <= today;
  };
  const shown = products
    .filter(
      (p) =>
        (print === 'all' || p.print === print) &&
        (!search.lang || p.languages.includes(search.lang)) &&
        (!search.type || p.type === search.type) &&
        (!search.when || (search.when === 'released') === released(p)) &&
        (!q || Object.values(p.name).some((name) => fold(name).includes(q))),
    )
    .toSorted(
      (a, b) =>
        releaseOf(a).localeCompare(releaseOf(b)) ||
        typeRank(a.type) - typeRank(b.type) ||
        a.id.localeCompare(b.id),
    );
  const groups = (['intl', 'asia'] as const)
    .map((p) => ({ print: p, products: shown.filter((x) => x.print === p) }))
    .filter((g) => g.products.length);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl<PrintFilter>
          label={m.catalog_print_label()}
          value={print}
          onValueChange={(next) => update({ print: next === 'all' ? undefined : next })}
          options={[
            { value: 'all', label: m.catalog_print_all() },
            { value: 'intl', label: printLabel('intl') },
            { value: 'asia', label: printLabel('asia') },
          ]}
        />
        <label className="relative flex h-11 min-w-[12rem] flex-1 items-center rounded-pill bg-hover focus-within:shadow-[inset_0_0_0_2px_var(--accent)] md:max-w-sm">
          <span className="sr-only">{m.catalog_sealed_search_label()}</span>
          <MagnifyingGlassIcon size={18} aria-hidden className="ml-3.5 shrink-0 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              update({ q: event.target.value || undefined });
            }}
            placeholder={m.catalog_sealed_search_placeholder()}
            className="h-full min-w-0 flex-1 bg-transparent px-2.5 type-ui text-[14px] text-ink outline-none placeholder:text-ink-subtle"
          />
        </label>
        <Select<CardLanguage | ''>
          label={m.catalog_filter_language()}
          placeholder={m.catalog_filter_language()}
          value={search.lang ?? ''}
          onValueChange={(next) => update({ lang: next || undefined })}
          options={[
            { value: '', label: m.catalog_filter_language_all() },
            ...languages.map((l) => ({ value: l, label: languageLabel(l) })),
          ]}
        />
        <Select<'' | 'released' | 'upcoming'>
          label={m.catalog_filter_release()}
          placeholder={m.catalog_filter_release()}
          value={search.when ?? ''}
          onValueChange={(next) => update({ when: next || undefined })}
          options={[
            { value: '', label: m.catalog_filter_release_all() },
            { value: 'released', label: m.catalog_filter_release_out() },
            { value: 'upcoming', label: m.catalog_filter_release_upcoming() },
          ]}
        />
        <Select<string>
          label={m.catalog_filter_product_type()}
          placeholder={m.catalog_filter_product_type()}
          value={search.type ?? ''}
          onValueChange={(next) => update({ type: next || undefined })}
          options={[
            { value: '', label: m.catalog_filter_product_type_all() },
            ...types.map((t) => ({ value: t, label: productTypeLabel(t) })),
          ]}
        />
      </div>
      <output className="type-small m-0 block px-1 text-ink-muted">
        {shown.length === products.length
          ? m.catalog_sealed_count({ count: formatCount(products.length) })
          : m.catalog_sealed_count_filtered({
              count: formatCount(shown.length),
              total: formatCount(products.length),
            })}
      </output>
      {groups.length === 0 ? (
        <p className="type-body m-0 text-ink-muted">{m.catalog_sealed_empty()}</p>
      ) : null}
      {groups.map((group) => (
        <section
          key={group.print}
          aria-labelledby={`sealed-${group.print}`}
          className="flex flex-col gap-3"
        >
          <h2 id={`sealed-${group.print}`} className="type-h2 m-0 px-1">
            {printLabel(group.print)}
          </h2>
          <ul
            ref={rovingFocusRef}
            className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-4 gap-y-6 p-0"
          >
            {group.products.map((product) => (
              <li key={product.id} data-roving-tile>
                <ProductTile product={product} lang={search.lang} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
