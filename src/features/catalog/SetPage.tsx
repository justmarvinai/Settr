import {
  ArrowLeftIcon,
  LightningIcon,
  ListIcon,
  MagnifyingGlassIcon,
  SortAscendingIcon,
  SquaresFourIcon,
} from '@phosphor-icons/react';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import {
  useCatalogSet,
  useManifest,
  type LoadedSet,
  type SetSearch,
  type SetSort,
} from '@/catalog';
import { CardTile } from '@/components/domain/CardTile';
import { sectionTitle } from '@/components/domain/sections';
import { Button, IconButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { useSettings } from '@/db';
import {
  CARD_SECTIONS,
  compareCards,
  pickText,
  RARITY_ABBR,
  RARITY_IDS,
  type CardSection,
  type CatalogCard,
  pickLanguage,
  visibleLanguages,
  cardName,
  type NameMode,
} from '@/domain/catalog';
import type { CardLanguage } from '@/domain/catalog-types';
import {
  categoryLabel,
  htmlLang,
  languageCode,
  languageLabel,
  m,
  printLabel,
  rarityLabel,
  typeLabel,
} from '@/i18n';
import { formatCount } from '@/i18n/format';
import {
  CompletionSummary,
  openAdd,
  openItemActions,
  openPrice,
  openQuickAdd,
  quickAdd,
  QuickAddButton,
  QuickPriceButton,
  useSetOwnership,
  type SetOwnership,
} from '@/features/collection';
import { useCjkFonts } from '@/components/domain/cjk';
import { heroStyle, morphWanted, nameHeroTile } from '@/lib/hero';
import { useLongPress } from '@/lib/useLongPress';
import { isTyping } from '@/lib/keys';
import { useSheets } from '@/lib/sheets';
import { useKeySequence } from '@/lib/useKeySequence';
import { useRovingFocus } from '@/lib/useRovingFocus';
import { setReleaseText } from './dates';

const route = /* @__PURE__ */ getRouteApi('/catalog/sets/$setId/');

type Density = 's' | 'm' | 'l';
const DENSITY_KEY = 'settr.catalog.density';
const TILE_MIN: Record<Density, string> = { s: '96px', m: '132px', l: '184px' };

function readDensity(): Density {
  try {
    const stored = localStorage.getItem(DENSITY_KEY);
    return stored === 's' || stored === 'l' ? stored : 'm';
  } catch {
    return 'm';
  }
}

const ABBREVIATIONS = /* @__PURE__ */ new Map<string, string>(Object.entries(RARITY_ABBR));
const RARITY_ORDER = /* @__PURE__ */ new Map<string, number>(
  RARITY_IDS.map((id, index) => [id, index]),
);
const rarityAbbr = (rarity: string | undefined) => ABBREVIATIONS.get(rarity ?? '');
const rarityRank = (rarity: string | undefined) =>
  RARITY_ORDER.get(rarity ?? '') ?? RARITY_IDS.length;

/** Case- and accent-insensitive match on names (all languages) and numbers. */
function matches(card: CatalogCard, query: string): boolean {
  const q = query.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();
  if (!q) return true;
  const number = q.replace(/^#/, '');
  if (/^\d+$/.test(number)) {
    const n = Number(number);
    return Number(card.localId) === n || card.printedNumber.startsWith(`${number}/`);
  }
  return Object.values(card.name).some((name) =>
    name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().includes(q),
  );
}

/**
 * Set detail (CAT-02, UX_SPEC.md §4.3): header with print and language switches, a sticky glass
 * filter bar and the card grid in set order, grouped by section. Ownership filters and completion
 * arrive with the collection (M3).
 */
export function SetPage() {
  const { setId } = route.useParams();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const loaded = useCatalogSet(setId);
  const manifest = useManifest();
  const settings = useSettings();
  const [density, setDensity] = useState<Density>(readDensity);
  const [query, setQuery] = useState(search.q ?? '');
  const gridRef = useRef<HTMLDivElement>(null);
  useRovingFocus(gridRef);

  const { set } = loaded;
  const languages = visibleLanguages(set.languages, settings);
  const lang = pickLanguage(search.lang, languages, settings);
  const names: NameMode = search.names ?? 'german';
  const sort: SetSort = search.sort ?? 'number';
  const view = search.view ?? 'grid';
  useCjkFonts(names === 'card' ? [lang] : []);
  const ownership = useSetOwnership(loaded, search.all ? undefined : lang);
  const ownedCount = (card: CatalogCard) => ownership.owned.get(card.id)?.count ?? 0;
  const ownedCards = loaded.cards.filter((card) => ownedCount(card) > 0).length;
  const update = (patch: Partial<SetSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  // V then G or T switches between grid and list (UX_SPEC.md §7).
  useKeySequence('v', {
    g: () => update({ view: undefined }),
    t: () => update({ view: 'list' }),
  });

  const sections = CARD_SECTIONS.filter((s) => loaded.cards.some((c) => c.section === s));
  const rarities = RARITY_IDS.filter((r) => loaded.cards.some((c) => c.rarity === r));
  const types = [
    ...new Set(loaded.cards.filter((c) => c.category === 'pokemon').flatMap((c) => c.types ?? [])),
  ];
  const categories = ['trainer', 'energy'].filter((cat) =>
    loaded.cards.some((c) => c.category === cat),
  );

  const filtered = loaded.cards.filter(
    (card) =>
      (!search.section || card.section === search.section) &&
      (!search.rarity || card.rarity === search.rarity) &&
      (!search.type ||
        card.category === search.type ||
        (card.category === 'pokemon' && (card.types ?? []).includes(search.type))) &&
      (!search.own || (search.own === 'owned') === ownedCount(card) > 0) &&
      matches(card, query),
  );
  const collator = new Intl.Collator('de');
  const sorted =
    sort === 'name'
      ? filtered.toSorted((a, b) =>
          collator.compare(cardName(a, lang, names).text, cardName(b, lang, names).text),
        )
      : sort === 'rarity'
        ? filtered.toSorted(
            (a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || compareCards(a, b),
          )
        : filtered;
  const grouped = sort === 'number' && !search.section;
  const isFiltered = filtered.length !== loaded.cards.length;
  const other = set.otherPrint ? manifest.sets.find((s) => s.id === set.otherPrint) : undefined;

  // Q opens Schnellerfassung for this set in the language shown (UX_SPEC.md §7).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'q' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.defaultPrevented || isTyping(event.target) || useSheets.getState().open) return;
      event.preventDefault();
      openQuickAdd(set.id, lang);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [set.id, lang]);

  const changeDensity = (next: Density) => {
    setDensity(next);
    try {
      localStorage.setItem(DENSITY_KEY, next);
    } catch {
      // private mode: the choice lasts for this visit
    }
  };

  const renderCards = (cards: CatalogCard[]) =>
    view === 'grid' ? (
      <ul
        className="m-0 grid list-none gap-x-3 gap-y-5 p-0"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${TILE_MIN[density]}, 1fr))` }}
      >
        {cards.map((card) => (
          <li key={card.id} className="group/tile relative" data-roving-tile>
            <CardLink
              card={card}
              setId={set.id}
              lang={lang}
              names={names}
              ownership={ownership}
              onQuickAdd={() => void quickAdd(card, loaded, lang, settings.defaultCondition)}
            />
            <QuickAddButton
              card={card}
              loaded={loaded}
              language={lang}
              name={`${card.printedNumber || card.localId} ${cardName(card, lang, names).text}`}
              className="absolute top-1.5 right-1.5 opacity-0 group-hover/tile:opacity-100 group-focus-within/tile:opacity-100 [@media(hover:none)]:bg-surface-1/90 [@media(hover:none)]:text-accent-text [@media(hover:none)]:opacity-100"
            />
            <QuickPriceButton
              card={card}
              setId={set.id}
              language={lang}
              name={`${card.printedNumber || card.localId} ${cardName(card, lang, names).text}`}
              className="absolute top-12 right-1.5 opacity-0 group-hover/tile:opacity-100 group-focus-within/tile:opacity-100 [@media(hover:none)]:hidden"
            />
          </li>
        ))}
      </ul>
    ) : (
      <CardList
        cards={cards}
        setId={set.id}
        lang={lang}
        names={names}
        loaded={loaded}
        ownership={ownership}
      />
    );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 px-1 pt-1">
        <Link
          to="/catalog"
          className="inline-flex w-fit items-center gap-1.5 type-small text-ink-muted hover:text-ink"
        >
          <ArrowLeftIcon size={16} weight="bold" aria-hidden />
          {m.catalog_back_to_sets()}
        </Link>
        <div className="flex flex-col gap-2">
          <span className="type-label text-ink-muted uppercase">
            {[pickText(set.series.name), printLabel(set.print), set.code, setReleaseText(set)]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <h2 className="type-display m-0 break-words">{pickText(set.name)}</h2>
          <p className="type-body m-0 text-ink-muted">
            {m.catalog_set_cards({ count: loaded.cards.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {other ? (
            <nav aria-label={m.catalog_print_label()}>
              <ul className="m-0 flex list-none gap-0.5 rounded-pill bg-hover p-1">
                {[set, other]
                  .toSorted((a, b) => (a.print === 'intl' ? -1 : b.print === 'intl' ? 1 : 0))
                  .map((s) => (
                    <li key={s.id}>
                      <Link
                        to="/catalog/sets/$setId"
                        params={{ setId: s.id }}
                        aria-current={s.id === set.id ? 'page' : undefined}
                        className="flex h-10 items-center rounded-pill px-4 type-ui text-ink-muted hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-canvas"
                      >
                        {printLabel(s.print)}
                      </Link>
                    </li>
                  ))}
              </ul>
            </nav>
          ) : null}
          {languages.length > 1 ? (
            <SegmentedControl<CardLanguage>
              label={m.catalog_language_label()}
              value={lang}
              onValueChange={(next) => update({ lang: next })}
              options={languages.map((l) => ({ value: l, label: languageCode(l) }))}
            />
          ) : null}
          <Button
            variant="outline"
            aria-keyshortcuts="Q"
            onClick={() => openQuickAdd(set.id, lang)}
          >
            <LightningIcon size={18} weight="bold" aria-hidden />
            {m.catalog_quick_entry()}
          </Button>
        </div>
        {ownership.holdings && ownership.collecting ? (
          <div className="tile flex flex-col gap-4 p-5">
            <CompletionSummary
              completion={ownership.completion}
              scope={search.all ? m.completion_any() : languageLabel(lang)}
            />
            {languages.length > 1 ? (
              <Switch
                id="completion-all-languages"
                label={m.completion_any_toggle()}
                checked={Boolean(search.all)}
                onCheckedChange={(checked) => update({ all: checked || undefined })}
              />
            ) : null}
          </div>
        ) : null}
      </header>

      <search
        aria-label={m.catalog_filters_label()}
        className="glass z-20 flex flex-col gap-2 rounded-toolbar p-2 md:sticky md:top-[calc(max(12px,env(safe-area-inset-top))+72px)] lg:flex-row lg:items-center"
      >
        <div className="flex items-center gap-2 lg:contents">
          <label className="relative flex h-11 min-w-0 flex-1 items-center rounded-pill bg-hover focus-within:shadow-[inset_0_0_0_2px_var(--accent)] lg:max-w-sm">
            <span className="sr-only">{m.catalog_set_search_label()}</span>
            <MagnifyingGlassIcon size={18} aria-hidden className="ml-3.5 shrink-0 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                update({ q: event.target.value || undefined });
              }}
              placeholder={m.catalog_set_search_placeholder()}
              className="h-full min-w-0 flex-1 bg-transparent px-2.5 type-ui text-[14px] text-ink outline-none placeholder:text-ink-subtle"
            />
          </label>
          <fieldset className="m-0 flex min-w-0 shrink-0 gap-1 border-0 p-0 lg:order-last lg:ml-auto">
            <legend className="sr-only">{m.catalog_view_label()}</legend>
            <IconButton
              label={m.catalog_view_grid()}
              aria-pressed={view === 'grid'}
              onClick={() => update({ view: undefined })}
              className={cn(view === 'grid' && 'bg-ink text-canvas hover:bg-ink')}
            >
              <SquaresFourIcon size={20} aria-hidden />
            </IconButton>
            <IconButton
              label={m.catalog_view_list()}
              aria-pressed={view === 'list'}
              onClick={() => update({ view: 'list' })}
              className={cn(view === 'list' && 'bg-ink text-canvas hover:bg-ink')}
            >
              <ListIcon size={20} aria-hidden />
            </IconButton>
          </fieldset>
        </div>
        <div className="-mx-2 flex items-center gap-2 overflow-x-auto px-2 lg:mx-0 lg:overflow-visible lg:px-0">
          {ownership.collecting ? (
            <SegmentedControl<'all' | 'owned' | 'missing'>
              label={m.catalog_own_label()}
              value={search.own ?? 'all'}
              onValueChange={(next) => update({ own: next === 'all' ? undefined : next })}
              className="shrink-0"
              options={[
                { value: 'all', label: m.catalog_own_all() },
                {
                  value: 'owned',
                  label: m.catalog_own_count({
                    label: m.catalog_own_owned(),
                    count: formatCount(ownedCards),
                  }),
                },
                {
                  value: 'missing',
                  label: m.catalog_own_count({
                    label: m.catalog_own_missing(),
                    count: formatCount(loaded.cards.length - ownedCards),
                  }),
                },
              ]}
            />
          ) : null}
          <Select<CardSection | ''>
            label={m.catalog_filter_section()}
            placeholder={m.catalog_filter_section()}
            value={search.section ?? ''}
            onValueChange={(next) => update({ section: next || undefined })}
            options={[
              { value: '', label: m.catalog_filter_section_all() },
              ...sections.map((s) => ({ value: s, label: sectionTitle(s, loaded) })),
            ]}
          />
          <Select<string>
            label={m.catalog_filter_rarity()}
            placeholder={m.catalog_filter_rarity()}
            value={search.rarity ?? ''}
            onValueChange={(next) => update({ rarity: next || undefined })}
            options={[
              { value: '', label: m.catalog_filter_rarity_all() },
              ...rarities.map((r) => ({ value: r, label: rarityLabel(r) })),
            ]}
          />
          <Select<string>
            label={m.catalog_filter_type()}
            placeholder={m.catalog_filter_type()}
            value={search.type ?? ''}
            onValueChange={(next) => update({ type: next || undefined })}
            options={[
              { value: '', label: m.catalog_filter_type_all() },
              ...types.map((t) => ({ value: t, label: typeLabel(t) })),
              ...categories.map((c) => ({ value: c, label: categoryLabel(c) })),
            ]}
          />
          <Select<SetSort>
            label={m.catalog_sort_label()}
            value={sort}
            icon={<SortAscendingIcon size={16} />}
            onValueChange={(next) => update({ sort: next === 'number' ? undefined : next })}
            options={[
              { value: 'number', label: m.catalog_sort_number() },
              { value: 'name', label: m.catalog_sort_name() },
              { value: 'rarity', label: m.catalog_sort_rarity() },
            ]}
          />
          {lang !== 'de' ? (
            <Select<NameMode>
              label={m.catalog_names_label()}
              value={names}
              onValueChange={(next) => update({ names: next === 'german' ? undefined : next })}
              options={[
                { value: 'german', label: m.catalog_names_german() },
                { value: 'card', label: m.catalog_names_card() },
              ]}
            />
          ) : null}
          {view === 'grid' ? (
            <Select<Density>
              label={m.catalog_density_label()}
              value={density}
              icon={<SquaresFourIcon size={16} />}
              onValueChange={changeDensity}
              className="max-sm:hidden"
              options={[
                { value: 'm', label: m.catalog_density_m() },
                { value: 's', label: m.catalog_density_s() },
                { value: 'l', label: m.catalog_density_l() },
              ]}
            />
          ) : null}
        </div>
      </search>

      <output className="type-small m-0 block px-1 text-ink-muted">
        {isFiltered
          ? m.catalog_count_filtered({
              count: formatCount(filtered.length),
              total: formatCount(loaded.cards.length),
            })
          : m.catalog_set_cards({ count: loaded.cards.length })}
      </output>

      <div ref={gridRef} className="flex flex-col gap-5">
        {filtered.length === 0 ? (
          <div className="tile flex flex-col items-start gap-3 p-6">
            <p className="type-body m-0 text-ink-muted">{m.catalog_empty_filtered()}</p>
            <Link
              to="/catalog/sets/$setId"
              params={{ setId: set.id }}
              search={{ lang: search.lang, all: search.all }}
              onClick={() => setQuery('')}
              className="type-ui text-accent-text underline-offset-4 hover:underline"
            >
              {m.catalog_reset_filters()}
            </Link>
          </div>
        ) : grouped ? (
          sections.map((section) => {
            const cards = sorted.filter((c) => c.section === section);
            if (!cards.length) return null;
            return (
              <section
                key={section}
                aria-labelledby={`section-${section}`}
                className="flex flex-col gap-3"
              >
                <h3
                  id={`section-${section}`}
                  className="type-h3 m-0 flex items-baseline gap-2 px-1"
                >
                  {sectionTitle(section, loaded)}
                  <span className="type-small text-ink-muted">{formatCount(cards.length)}</span>
                </h3>
                {renderCards(cards)}
              </section>
            );
          })
        ) : (
          renderCards(sorted)
        )}
      </div>
    </div>
  );
}

function imageBadge(card: CatalogCard, lang: CardLanguage): string | undefined {
  const image = card.images[lang];
  return image && image.lang !== lang ? languageCode(image.lang) : undefined;
}

function CardLink({
  card,
  setId,
  lang,
  names,
  ownership,
  onQuickAdd,
}: {
  card: CatalogCard;
  setId: string;
  lang: CardLanguage;
  names: NameMode;
  ownership: SetOwnership;
  /** + on the focused tile: one copy with defaults, as ＋ does. */
  onQuickAdd: () => void;
}) {
  const name = cardName(card, lang, names);
  const number = card.printedNumber || card.localId;
  const rarity = card.rarity ? rarityLabel(card.rarity) : undefined;
  const owned = ownership.owned.get(card.id)?.count ?? 0;
  const ownedText = owned ? m.catalog_owned_badge({ count: owned }) : undefined;
  // A finger resting on the tile opens its menu: Hinzufügen, Preis eintragen, Details (§4.3)
  const longPress = useLongPress(() =>
    openItemActions({ kind: 'card', id: card.id }, setId, lang, `${number} ${name.text}`),
  );
  return (
    <Link
      {...longPress}
      to="/catalog/sets/$setId/cards/$cardId"
      params={{ setId, cardId: card.id }}
      search={{ lang }}
      aria-label={[number, name.text, rarity, ownedText].filter(Boolean).join(', ')}
      aria-keyshortcuts="N P Plus"
      data-roving
      viewTransition={morphWanted()}
      onClick={(event) => nameHeroTile(event.currentTarget, card.id)}
      className="group block rounded-[14px] outline-offset-4 [-webkit-touch-callout:none] [@media(hover:none)]:select-none"
      onKeyDown={(event) => {
        // N opens the full add sheet for the focused card, P its price, + adds one copy (§7).
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const key = event.key.toLowerCase();
        if (key === '+') {
          event.preventDefault();
          onQuickAdd();
        } else if (key === 'n') {
          event.preventDefault();
          openAdd({ kind: 'card', id: card.id }, setId, lang);
        } else if (key === 'p') {
          event.preventDefault();
          openPrice({ kind: 'card', id: card.id }, setId, lang);
        }
      }}
    >
      <CardTile
        image={card.images[lang]}
        number={card.printedNumber ? (card.printedNumber.split('/')[0] ?? '') : ''}
        name={name.text}
        nameLang={name.lang}
        rarity={rarityAbbr(card.rarity)}
        badge={imageBadge(card, lang)}
        missingLabel={m.catalog_image_missing()}
        owned={owned}
        ownedText={m.count_times({ count: formatCount(owned) })}
        ghost={ownership.collecting && owned === 0}
        artStyle={heroStyle(card.id)}
      />
    </Link>
  );
}

function CardList({
  cards,
  setId,
  lang,
  names,
  loaded,
  ownership,
}: {
  cards: CatalogCard[];
  setId: string;
  lang: CardLanguage;
  names: NameMode;
  loaded: LoadedSet;
  ownership: SetOwnership;
}) {
  return (
    <div className="tile overflow-x-auto p-2">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="type-label text-ink-subtle">
            <th scope="col" className="px-3 py-2 font-bold">
              {m.catalog_col_number()}
            </th>
            <th scope="col" className="px-3 py-2 font-bold">
              {m.catalog_col_name()}
            </th>
            <th scope="col" className="px-3 py-2 font-bold">
              {m.catalog_col_rarity()}
            </th>
            <th scope="col" className="px-3 py-2 font-bold">
              {m.catalog_col_type()}
            </th>
            <th scope="col" className="px-3 py-2 font-bold max-md:hidden">
              {m.catalog_col_illustrator()}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-bold">
              {m.catalog_col_owned()}
            </th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => {
            const name = cardName(card, lang, names);
            return (
              <tr key={card.id} className="border-t border-line type-small">
                <td className="px-3 py-2.5 font-mono text-ink-muted">
                  {card.printedNumber || card.localId}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    to="/catalog/sets/$setId/cards/$cardId"
                    params={{ setId, cardId: card.id }}
                    search={{ lang }}
                    lang={htmlLang(name.lang)}
                    className="type-ui text-[14px] text-ink hover:text-accent-text"
                  >
                    {name.text}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-ink-muted">
                  {card.rarity ? rarityLabel(card.rarity) : ''}
                </td>
                <td className="px-3 py-2.5 text-ink-muted">
                  {card.category === 'pokemon'
                    ? (card.types ?? []).map(typeLabel).join(', ')
                    : categoryLabel(card.category)}
                </td>
                <td className="px-3 py-2.5 text-ink-muted max-md:hidden">{card.illustrator}</td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    {ownership.owned.get(card.id)?.count ? (
                      <span className="font-mono font-bold text-ink">
                        {m.count_times({
                          count: formatCount(ownership.owned.get(card.id)?.count ?? 0),
                        })}
                      </span>
                    ) : null}
                    <QuickPriceButton
                      card={card}
                      setId={setId}
                      language={lang}
                      name={`${card.printedNumber || card.localId} ${name.text}`}
                    />
                    <QuickAddButton
                      card={card}
                      loaded={loaded}
                      language={lang}
                      name={`${card.printedNumber || card.localId} ${name.text}`}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
