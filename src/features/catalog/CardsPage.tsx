import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { type CardsSearch } from '@/catalog';
import { useCatalogSearch } from '@/catalog/useCatalogSearch';
import { CardTile } from '@/components/domain/CardTile';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { useOwnedItemIds } from '@/db';
import { RARITY_ABBR, RARITY_IDS, type SearchDoc } from '@/domain/catalog';
import { ACTIVE_CARD_LANGUAGES, type CardLanguage } from '@/domain/catalog-types';
import { ENERGY_TYPES } from '@/domain/catalog';
import { categoryLabel, languageLabel, m, printLabel, rarityLabel, typeLabel } from '@/i18n';
import { formatCount } from '@/i18n/format';
import { heroStyle, morphWanted, nameHeroTile } from '@/lib/hero';
import { rovingFocusRef } from '@/lib/useRovingFocus';
import type { PrintFilter } from './SetsPage';

const route = /* @__PURE__ */ getRouteApi('/catalog/cards');
const PAGE = 60;
const EXAMPLES = ['Glurak', 'ピカチュウ', '皮卡丘', '#150', 'rarity:sir', 'set:m6a', 'owned:nein'];
const ABBREVIATIONS = /* @__PURE__ */ new Map<string, string>(Object.entries(RARITY_ABBR));

/**
 * Katalog › Karten (CAT-04): search every card of every set by name in any language and script,
 * number (`25`, `025/128`, `#150`), illustrator, rarity or set code, with filters in the URL.
 * Runs in the search worker over the slim global index (ARCHITECTURE.md §7).
 */
export function CardsPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const [text, setText] = useState(search.q ?? '');
  const [shown, setShown] = useState(PAGE);
  const print: PrintFilter = search.print ?? 'all';
  const update = (patch: Partial<CardsSearch>) => {
    setShown(PAGE);
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  };
  const owned = useOwnedItemIds();
  const hasFilter = Boolean(search.print || search.lang || search.rarity || search.type);
  const active = Boolean(search.q?.trim()) || hasFilter;
  const { results, pending } = useCatalogSearch(
    search.q ?? '',
    {
      kind: 'card',
      limit: 0,
      ...(search.print ? { print: search.print } : {}),
      ...(search.lang ? { languages: [search.lang] } : {}),
      ...(search.rarity ? { rarities: [search.rarity] } : {}),
      ...(search.type
        ? search.type === 'trainer' || search.type === 'energy'
          ? { categories: [search.type] }
          : { types: [search.type] }
        : {}),
    },
    active,
    owned,
  );

  return (
    <div className="flex flex-col gap-5">
      <search aria-label={m.catalog_cards_search_label()} className="flex flex-col gap-3">
        <label className="relative flex h-14 items-center rounded-pill bg-surface-1 shadow-[inset_0_0_0_1.5px_var(--border-strong)] focus-within:shadow-[inset_0_0_0_2px_var(--accent)]">
          <span className="sr-only">{m.catalog_cards_search_label()}</span>
          <MagnifyingGlassIcon size={22} aria-hidden className="ml-5 shrink-0 text-ink-muted" />
          <input
            type="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              update({ q: event.target.value || undefined });
            }}
            placeholder={m.catalog_cards_search_placeholder()}
            className="h-full min-w-0 flex-1 bg-transparent px-3 type-ui text-[16px] text-ink outline-none placeholder:text-ink-subtle"
          />
        </label>
        <div className="-mx-3 flex items-center gap-2 overflow-x-auto px-3">
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
          <Select<CardLanguage | ''>
            label={m.catalog_filter_language()}
            placeholder={m.catalog_filter_language()}
            value={search.lang ?? ''}
            onValueChange={(next) => update({ lang: next || undefined })}
            options={[
              { value: '', label: m.catalog_filter_language_all() },
              ...ACTIVE_CARD_LANGUAGES.map((l) => ({ value: l, label: languageLabel(l) })),
            ]}
          />
          <Select<string>
            label={m.catalog_filter_rarity()}
            placeholder={m.catalog_filter_rarity()}
            value={search.rarity ?? ''}
            onValueChange={(next) => update({ rarity: next || undefined })}
            options={[
              { value: '', label: m.catalog_filter_rarity_all() },
              ...RARITY_IDS.map((r) => ({ value: r, label: rarityLabel(r) })),
            ]}
          />
          <Select<string>
            label={m.catalog_filter_type()}
            placeholder={m.catalog_filter_type()}
            value={search.type ?? ''}
            onValueChange={(next) => update({ type: next || undefined })}
            options={[
              { value: '', label: m.catalog_filter_type_all() },
              ...ENERGY_TYPES.map((t) => ({ value: t, label: typeLabel(t) })),
              { value: 'trainer', label: categoryLabel('trainer') },
              { value: 'energy', label: categoryLabel('energy') },
            ]}
          />
        </div>
      </search>

      {!active ? (
        <div className="tile flex flex-col gap-3 p-5">
          <p className="type-body m-0 text-ink-muted">{m.catalog_cards_hint()}</p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {EXAMPLES.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => {
                    setText(example);
                    update({ q: example });
                  }}
                  className="h-10 rounded-pill bg-hover px-4 font-mono text-[13px] text-ink hover:bg-hover-strong"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <output
            className="type-small m-0 block px-1 text-ink-muted"
            aria-busy={pending ? true : undefined}
          >
            {pending && results.length === 0
              ? m.catalog_searching()
              : m.catalog_cards_count({ count: formatCount(results.length) })}
          </output>
          {!pending && results.length === 0 ? (
            <p className="type-body m-0 px-1 text-ink-muted">{m.catalog_cards_empty()}</p>
          ) : null}
          <ul
            ref={rovingFocusRef}
            className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-x-3 gap-y-5 p-0"
          >
            {results.slice(0, shown).map(({ doc }) => (
              <li key={doc.id} data-roving-tile>
                <ResultTile doc={doc} />
              </li>
            ))}
          </ul>
          {results.length > shown ? (
            <Button className="self-center" onClick={() => setShown((n) => n + PAGE)}>
              {m.catalog_show_more({ count: formatCount(Math.min(PAGE, results.length - shown)) })}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

function ResultTile({ doc }: { doc: SearchDoc }) {
  const number = doc.number?.split('/')[0] ?? '';
  return (
    <Link
      to="/catalog/sets/$setId/cards/$cardId"
      params={{ setId: doc.setId, cardId: doc.id }}
      aria-label={[doc.number, doc.name, doc.rarity ? rarityLabel(doc.rarity) : '']
        .filter(Boolean)
        .join(', ')}
      data-roving
      viewTransition={morphWanted()}
      onClick={(event) => nameHeroTile(event.currentTarget, doc.id)}
      className="group block rounded-[14px] outline-offset-4"
    >
      <CardTile
        image={doc.image}
        number={number}
        name={doc.name}
        nameLang="de"
        rarity={ABBREVIATIONS.get(doc.rarity ?? '')}
        missingLabel={m.catalog_image_missing()}
        artStyle={heroStyle(doc.id)}
      />
    </Link>
  );
}
