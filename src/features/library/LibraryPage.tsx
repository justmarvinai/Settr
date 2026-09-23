import {
  CheckSquareIcon,
  FadersHorizontalIcon,
  MagnifyingGlassIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  SquaresFourIcon,
  StackIcon,
  TableIcon,
  XIcon,
} from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { buttonVariants, Button, IconButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { Select } from '@/components/ui/Select';
import { useLocations, useTags } from '@/db';
import {
  defaultDirection,
  groupRows,
  matchesFilter,
  sortRows,
  summarize,
  type CollectionSearch,
  type LotGroup,
  type LotSort,
  type RowGroup,
} from '@/domain/collection';
import { m } from '@/i18n';
import { formatCount, formatMoney } from '@/i18n/format';
import { BulkBar } from './BulkBar';
import { FilterSheet } from './FilterSheet';
import { LibraryGrid } from './LibraryGrid';
import { LibraryTable } from './LibraryTable';
import {
  filterChips,
  filterOf,
  filterOptions,
  GROUP_LABELS,
  groupTitle,
  LIBRARY_GROUPS,
  LIBRARY_SORTS,
  NO_FILTERS,
  orderGroups,
  SORT_LABELS,
} from './library-options';
import { useLibraryRows, type LibraryKind, type LibraryRow } from './rows';

function Stat({
  label,
  value,
  hint,
  money = false,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  /** Hidden in privacy mode (PRT-05). */
  money?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="type-label text-ink-muted uppercase">{label}</dt>
      <dd className="m-0 flex flex-col gap-0.5">
        <span className={cn('type-h1 truncate tabular-nums', money && 'money')}>{value}</span>
        {hint ? <span className="type-small text-ink-muted">{hint}</span> : null}
      </dd>
    </div>
  );
}

function EmptyLibrary({ kind }: { kind: LibraryKind }) {
  return (
    <div className="tile flex flex-col items-start gap-4 p-8">
      <p className="type-body m-0 max-w-[48ch] text-ink-muted">
        {kind === 'card' ? m.library_empty_cards() : m.library_empty_sealed()}
      </p>
      <Link
        to={kind === 'card' ? '/catalog' : '/catalog/sealed'}
        className={buttonVariants({ variant: 'primary' })}
      >
        {kind === 'card' ? m.library_empty_cards_action() : m.library_empty_sealed_action()}
      </Link>
    </div>
  );
}

/**
 * Sammlung › Karten / Sealed (COL-04, COL-05, UX_SPEC.md §4.6): a summary that follows the
 * filters, a sticky glass bar (search, filters, sort, grouping, view), then the lots as a grid or
 * a table. Everything but the selection lives in the URL.
 */
export function LibraryPage({
  kind,
  search,
  onSearchChange,
}: {
  kind: LibraryKind;
  search: CollectionSearch;
  onSearchChange: (patch: Partial<CollectionSearch>) => void;
}) {
  const all = useLibraryRows(kind);
  const tags = useTags();
  const locations = useLocations();
  const [query, setQuery] = useState(search.q ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [selectMode, setSelectMode] = useState(false);

  const update = (patch: Partial<CollectionSearch>) => {
    if ('q' in patch) setQuery(patch.q ?? '');
    onSearchChange(patch);
  };
  const sorts = LIBRARY_SORTS[kind];
  const groupsOffered = LIBRARY_GROUPS[kind];
  const sort: LotSort = search.sort && sorts.includes(search.sort) ? search.sort : 'added';
  const dir = search.dir ?? defaultDirection(sort);
  const group = search.group && groupsOffered.includes(search.group) ? search.group : undefined;
  const view = search.view ?? 'grid';
  const filter = filterOf(search, kind);

  if (!all || !tags || !locations) return <div aria-busy="true" className="min-h-[50vh]" />;
  if (!all.length) return <EmptyLibrary kind={kind} />;

  const rows = sortRows(
    all.filter((row) => matchesFilter(row, filter)),
    sort,
    dir,
  );
  const options = filterOptions(all, tags, locations);
  const chips = filterChips(filter, options, tags, locations);
  const summary = summarize(rows);
  const openLots = all.length - options.closed;
  const total = filter.closed ? all.length : openLots;
  const groups: RowGroup<LibraryRow>[] = group
    ? orderGroups(groupRows(rows, group), group, locations)
    : [{ key: '', rows }];
  const title = (g: RowGroup<LibraryRow>) =>
    group ? groupTitle(group, g.key, g.rows, locations) : undefined;
  const chosen = rows.filter((row) => selected.has(row.holding.id));
  const selecting = selectMode || chosen.length > 0;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectAll = (select: boolean) =>
    setSelected(select ? new Set(rows.map((row) => row.holding.id)) : new Set<string>());
  const clearSelection = () => {
    setSelected(new Set<string>());
    setSelectMode(false);
  };
  const sortBy = (next: LotSort) =>
    next === sort
      ? update({ dir: dir === 'asc' ? 'desc' : 'asc' })
      : update({ sort: next === 'added' ? undefined : next, dir: undefined });

  return (
    <div className={cn('flex flex-col gap-5', selecting && 'pb-24')}>
      <dl
        aria-label={m.library_summary_label()}
        className="tile m-0 grid grid-cols-2 gap-x-6 gap-y-5 p-5 sm:grid-cols-4"
      >
        <Stat label={m.library_stat_lots()} value={formatCount(summary.lots)} />
        <Stat label={m.library_stat_copies()} value={formatCount(summary.copies)} />
        <Stat
          label={kind === 'card' ? m.library_stat_items_cards() : m.library_stat_items_sealed()}
          value={formatCount(summary.items)}
        />
        <Stat
          label={m.library_stat_invested()}
          value={formatMoney(summary.invested)}
          money
          hint={
            summary.unknownCost
              ? m.library_stat_unknown_cost({ count: formatCount(summary.unknownCost) })
              : undefined
          }
        />
      </dl>

      <search
        aria-label={
          kind === 'card' ? m.library_filters_label_cards() : m.library_filters_label_sealed()
        }
        className="glass z-20 flex flex-col gap-2 rounded-toolbar p-2 md:sticky md:top-[calc(max(12px,env(safe-area-inset-top))+72px)]"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 lg:contents">
            <label className="relative flex h-11 min-w-0 flex-1 items-center rounded-pill bg-hover focus-within:shadow-[inset_0_0_0_2px_var(--accent)] lg:max-w-sm">
              <span className="sr-only">{m.library_search_label()}</span>
              <MagnifyingGlassIcon
                size={18}
                aria-hidden
                className="ml-3.5 shrink-0 text-ink-muted"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  onSearchChange({ q: event.target.value || undefined });
                }}
                placeholder={
                  kind === 'card'
                    ? m.library_search_placeholder_cards()
                    : m.library_search_placeholder_sealed()
                }
                className="h-full min-w-0 flex-1 bg-transparent px-2.5 type-ui text-[14px] text-ink outline-none placeholder:text-ink-subtle"
              />
            </label>
            <fieldset className="m-0 flex min-w-0 shrink-0 gap-1 border-0 p-0 lg:order-last lg:ml-auto">
              <legend className="sr-only">{m.catalog_view_label()}</legend>
              <IconButton
                label={m.bulk_label()}
                aria-pressed={selecting}
                onClick={() => (selecting ? clearSelection() : setSelectMode(true))}
                className={cn(selecting && 'bg-ink text-canvas hover:bg-ink')}
              >
                <CheckSquareIcon size={20} aria-hidden />
              </IconButton>
              <IconButton
                label={m.catalog_view_grid()}
                aria-pressed={view === 'grid'}
                onClick={() => update({ view: undefined })}
                className={cn(view === 'grid' && 'bg-ink text-canvas hover:bg-ink')}
              >
                <SquaresFourIcon size={20} aria-hidden />
              </IconButton>
              <IconButton
                label={m.library_view_table()}
                aria-pressed={view === 'table'}
                onClick={() => update({ view: 'table' })}
                className={cn(view === 'table' && 'bg-ink text-canvas hover:bg-ink')}
              >
                <TableIcon size={20} aria-hidden />
              </IconButton>
            </fieldset>
          </div>
          <div className="-mx-2 flex items-center gap-2 overflow-x-auto px-2 lg:mx-0 lg:overflow-visible lg:px-0">
            <Button
              variant="quiet"
              aria-label={
                chips.length
                  ? m.library_filter_open_count({ count: formatCount(chips.length) })
                  : undefined
              }
              onClick={() => setFiltersOpen(true)}
              className={cn(chips.length && 'bg-accent-soft text-accent-text')}
            >
              <FadersHorizontalIcon size={18} weight="bold" aria-hidden />
              {m.library_filter_open()}
              {chips.length ? (
                <span
                  aria-hidden
                  className="-mr-1 rounded-pill bg-accent px-1.5 font-mono text-[12px] leading-5 text-accent-contrast"
                >
                  {formatCount(chips.length)}
                </span>
              ) : null}
            </Button>
            <Select<LotSort>
              label={m.catalog_sort_label()}
              value={sort}
              icon={<SortAscendingIcon size={16} />}
              onValueChange={(next) =>
                update({ sort: next === 'added' ? undefined : next, dir: undefined })
              }
              options={sorts.map((s) => ({ value: s, label: SORT_LABELS[s]() }))}
            />
            <IconButton
              label={m.library_sort_desc()}
              aria-pressed={dir === 'desc'}
              onClick={() => update({ dir: dir === 'asc' ? 'desc' : 'asc' })}
            >
              {dir === 'desc' ? (
                <SortDescendingIcon size={20} aria-hidden />
              ) : (
                <SortAscendingIcon size={20} aria-hidden />
              )}
            </IconButton>
            <Select<LotGroup | ''>
              label={m.library_group_label()}
              value={group ?? ''}
              icon={<StackIcon size={16} />}
              onValueChange={(next) => update({ group: next || undefined })}
              options={[
                { value: '', label: m.library_group_none() },
                ...groupsOffered.map((g) => ({ value: g, label: GROUP_LABELS[g]() })),
              ]}
            />
          </div>
        </div>
        {chips.length ? (
          <ul className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0">
            {chips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  onClick={() => update(chip.clear)}
                  aria-label={m.library_chip_remove({ filter: chip.text })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-accent-soft pr-2.5 pl-3.5 type-small text-accent-text hover:bg-hover-strong"
                >
                  {chip.text}
                  <XIcon size={14} weight="bold" aria-hidden />
                </button>
              </li>
            ))}
            {chips.length > 1 ? (
              <li>
                <button
                  type="button"
                  onClick={() => update({ ...NO_FILTERS, q: search.q })}
                  className="inline-flex h-9 items-center rounded-pill px-3 type-small font-bold text-ink-muted hover:bg-hover hover:text-ink"
                >
                  {m.library_chips_clear()}
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </search>

      <output className="type-small m-0 block px-1 text-ink-muted">
        {rows.length === total
          ? m.library_count({ n: rows.length, count: formatCount(rows.length) })
          : m.library_count_filtered({
              n: total,
              count: formatCount(rows.length),
              total: formatCount(total),
            })}
      </output>

      {rows.length === 0 ? (
        <div className="tile flex flex-col items-start gap-3 p-6">
          {openLots === 0 && !filter.closed ? (
            <>
              <p className="type-body m-0 text-ink-muted">{m.library_only_closed()}</p>
              <Button variant="quiet" onClick={() => update({ closed: true })}>
                {m.library_show_closed()}
              </Button>
            </>
          ) : (
            <>
              <p className="type-body m-0 text-ink-muted">{m.library_empty_filtered()}</p>
              <Button variant="quiet" onClick={() => update(NO_FILTERS)}>
                {m.catalog_reset_filters()}
              </Button>
            </>
          )}
        </div>
      ) : view === 'table' ? (
        <LibraryTable
          kind={kind}
          groups={groups}
          title={title}
          rows={rows}
          sort={sort}
          dir={dir}
          onSort={sortBy}
          selected={selected}
          selecting={selecting}
          onToggle={toggle}
          onToggleAll={selectAll}
        />
      ) : (
        <LibraryGrid
          kind={kind}
          groups={groups}
          title={title}
          selected={selected}
          selecting={selecting}
          onToggle={toggle}
        />
      )}

      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        kind={kind}
        search={search}
        update={update}
        options={options}
        matches={rows.length}
      />

      {selecting ? (
        <BulkBar
          lots={chosen.map((row) => row.holding)}
          total={rows.length}
          locations={locations}
          tags={tags}
          onSelectAll={() => selectAll(true)}
          onClear={clearSelection}
        />
      ) : null}
    </div>
  );
}
