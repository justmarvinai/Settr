import {
  ArrowLeftIcon,
  ListIcon,
  MagnifyingGlassIcon,
  SortAscendingIcon,
  SquaresFourIcon,
} from '@phosphor-icons/react';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useState } from 'react';
import {
  useCatalogSet,
  useManifest,
  type LoadedSet,
  type SetSearch,
  type SetSort,
} from '@/catalog';
import { CardTile } from '@/components/domain/CardTile';
import { IconButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
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
  m,
  printLabel,
  rarityLabel,
  sectionLabel,
  typeLabel,
} from '@/i18n';
import { formatCount } from '@/i18n/format';
import { useCjkFonts } from '@/components/domain/cjk';
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

/** Section heading: a subset's own name (Klassische Sammlung) or the generic label. */
function sectionTitle(section: CardSection, loaded: LoadedSet): string {
  if (section === 'subset') {
    const subset = loaded.subsets[0];
    const named = loaded.set.sectionNames?.subset;
    if (named) return pickText(named);
    if (subset) return pickText(subset.name).replace(`${pickText(loaded.set.name)}: `, '');
  }
  return sectionLabel(section);
}

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

  const { set } = loaded;
  const languages = visibleLanguages(set.languages, settings);
  const lang = pickLanguage(search.lang, languages, settings);
  const names: NameMode = search.names ?? 'german';
  const sort: SetSort = search.sort ?? 'number';
  const view = search.view ?? 'grid';
  useCjkFonts(names === 'card' ? [lang] : []);
  const update = (patch: Partial<SetSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

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
          <li key={card.id}>
            <CardLink card={card} setId={set.id} lang={lang} names={names} />
          </li>
        ))}
      </ul>
    ) : (
      <CardList cards={cards} setId={set.id} lang={lang} names={names} />
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
        </div>
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

      {filtered.length === 0 ? (
        <div className="tile flex flex-col items-start gap-3 p-6">
          <p className="type-body m-0 text-ink-muted">{m.catalog_empty_filtered()}</p>
          <Link
            to="/catalog/sets/$setId"
            params={{ setId: set.id }}
            search={{ lang: search.lang }}
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
              <h3 id={`section-${section}`} className="type-h3 m-0 flex items-baseline gap-2 px-1">
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
}: {
  card: CatalogCard;
  setId: string;
  lang: CardLanguage;
  names: NameMode;
}) {
  const name = cardName(card, lang, names);
  const number = card.printedNumber || card.localId;
  const rarity = card.rarity ? rarityLabel(card.rarity) : undefined;
  return (
    <Link
      to="/catalog/sets/$setId/cards/$cardId"
      params={{ setId, cardId: card.id }}
      search={{ lang }}
      aria-label={[number, name.text, rarity].filter(Boolean).join(', ')}
      className="group block rounded-[14px] outline-offset-4"
    >
      <CardTile
        image={card.images[lang]}
        number={card.printedNumber ? (card.printedNumber.split('/')[0] ?? '') : ''}
        name={name.text}
        nameLang={name.lang}
        rarity={rarityAbbr(card.rarity)}
        badge={imageBadge(card, lang)}
        missingLabel={m.catalog_image_missing()}
      />
    </Link>
  );
}

function CardList({
  cards,
  setId,
  lang,
  names,
}: {
  cards: CatalogCard[];
  setId: string;
  lang: CardLanguage;
  names: NameMode;
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
