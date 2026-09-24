import { CaretDownIcon, CaretUpIcon, ColumnsIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useRef, type ReactNode } from 'react';
import { CardImage } from '@/components/domain/CardImage';
import { ProductImage } from '@/components/domain/ProductImage';
import { Checkbox } from '@/components/ui/FormControls';
import { PLDelta } from '@/components/domain/PLDelta';
import { ActionMenu, CheckMenu } from '@/components/ui/Menu';
import { db, setUiPref, useUiPref } from '@/db';
import { cn } from '@/components/ui/cn';
import {
  boughtOn,
  remainingCost,
  unitCostDisplay,
  type LotSort,
  type RowGroup,
} from '@/domain/collection';
import { remaining } from '@/domain/schemas';
import { htmlLang, languageCode, m, productTypeLabel } from '@/i18n';
import { formatCount, formatDate, formatMoney, formatPercent } from '@/i18n/format';
import { useElementBox } from '@/lib/useElementBox';
import type { SelectionProps } from './LibraryGrid';
import { lotMenuActions, toastError } from '@/features/collection';
import { lotKeys } from './lot-keys';
import { describeRow, quantityText, stateText, variantText } from './lot-text';
import type { LibraryKind, LibraryRow } from '@/features/collection';

type TableItem =
  | { type: 'header'; key: string; title: string; count: number }
  | { type: 'row'; key: string; row: LibraryRow };

/** Every column besides the name, the check box and the menu. */
export const COLUMN_KEYS = [
  'number',
  'language',
  'state',
  'quantity',
  'unit',
  'cost',
  'unitValue',
  'value',
  'pl',
  'plRatio',
  'priceDate',
  'bought',
  'location',
] as const;
export type ColumnKey = (typeof COLUMN_KEYS)[number];

interface Column {
  key: ColumnKey | 'name' | 'compactValue';
  label: string;
  sort?: LotSort;
  align?: 'right';
  /** Width in px; the name column takes the rest. */
  width?: number;
  cell: (row: LibraryRow) => ReactNode;
}

/** Below this table width a compact line under the name replaces the detail columns. */
const COMPACT_BELOW = 560;
/** Room the name column keeps before detail columns give way; plus check box and menu. */
const NAME_MIN = 224;
const FIXED = 48 + 52;
/**
 * Which columns stay longest as the table narrows (first = last to go): what a lot is worth and
 * how it's doing, then what it is, then what it cost and where it is.
 */
const PRIORITY: readonly ColumnKey[] = [
  'quantity',
  'value',
  'pl',
  'language',
  'state',
  'number',
  'unit',
  'unitValue',
  'plRatio',
  'priceDate',
  'cost',
  'bought',
  'location',
];

function NameCell({
  row,
  kind,
  compact,
}: {
  row: LibraryRow;
  kind: LibraryKind;
  /** Quantity, language and condition under the name, when their columns don't fit. */
  compact: boolean;
}) {
  const h = row.holding;
  const second = [
    kind === 'sealed' ? productTypeLabel(row.productType ?? 'other') : undefined,
    row.setName,
    variantText(row),
    row.info.custom ? m.holding_custom() : row.inCatalog ? undefined : m.holding_not_in_catalog(),
  ]
    .filter(Boolean)
    .join(' · ');
  const summary = [quantityText(h), languageCode(h.language), stateText(h)]
    .filter(Boolean)
    .join(' · ');
  const nameClass = 'type-ui block truncate text-[14px] text-ink hover:text-accent-text';
  let name: ReactNode;
  if (kind === 'card' && row.pageSetId) {
    name = (
      <Link
        to="/catalog/sets/$setId/cards/$cardId"
        params={{ setId: row.pageSetId, cardId: h.item.id }}
        search={{ lang: h.language }}
        lang={htmlLang(row.nameLang)}
        className={nameClass}
        onKeyDown={lotKeys(row)}
      >
        {row.name}
      </Link>
    );
  } else if (kind === 'sealed' && row.inCatalog && !row.info.custom) {
    name = (
      <Link
        to="/catalog/sealed/$productId"
        params={{ productId: h.item.id }}
        search={{ lang: h.language }}
        lang={htmlLang(row.nameLang)}
        className={nameClass}
        onKeyDown={lotKeys(row)}
      >
        {row.name}
      </Link>
    );
  } else {
    name = (
      <span lang={htmlLang(row.nameLang)} className="type-ui block truncate text-[14px] text-ink">
        {row.name}
      </span>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-3">
      {kind === 'card' ? (
        <CardImage image={row.image} size="small" alt="" className="w-9 shrink-0" />
      ) : (
        <ProductImage
          image={row.image}
          type={row.productType ?? 'other'}
          size="small"
          alt=""
          className="w-11 shrink-0 rounded-[10px]"
        />
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        {name}
        {second ? <span className="type-small truncate text-ink-muted">{second}</span> : null}
        {compact ? (
          <span className="type-small truncate font-mono text-ink-muted">{summary}</span>
        ) : null}
      </div>
    </div>
  );
}

function moneyCell(value: ReturnType<typeof remainingCost>): ReactNode {
  return value ? <span className="money">{formatMoney(value)}</span> : '—';
}

/** The lot's value per copy, with the *eigener Wert* tag when it's the lot's own (PRC-07). */
function unitValueCell(row: LibraryRow): ReactNode {
  const unit = row.value?.unit;
  if (!unit || remaining(row.holding) <= 0) return '—';
  return (
    <span className="inline-flex flex-col items-end">
      <span className="money">{formatMoney(unit.price)}</span>
      {unit.source === 'override' ? (
        <span className="text-[11px] leading-4 text-accent-text">{m.library_value_own()}</span>
      ) : null}
    </span>
  );
}

function plCell(row: LibraryRow, show: 'amount' | 'ratio'): ReactNode {
  const v = row.value;
  if (!v?.pl) return '—';
  return <PLDelta delta={v.pl} ratio={v.plRatio} show={show} className="font-semibold" />;
}

function priceDateCell(row: LibraryRow): ReactNode {
  const unit = row.value?.unit;
  if (!unit || remaining(row.holding) <= 0) return '—';
  return (
    <span className={cn('whitespace-nowrap', row.value?.stale && 'font-bold text-warn')}>
      {formatDate(unit.date)}
    </span>
  );
}

/** Phones: value on top, P/L % under it, in one narrow column. */
function compactValueCell(row: LibraryRow): ReactNode {
  const v = row.value;
  if (!v?.value) return <span className="text-ink-subtle">—</span>;
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className="money font-bold text-ink">{formatMoney(v.value)}</span>
      {v.pl ? (
        <span
          className={cn(
            'money text-[12px] font-semibold',
            v.pl.minor > 0 ? 'text-gain' : v.pl.minor < 0 ? 'text-loss' : 'text-ink-muted',
          )}
        >
          {formatPercent(v.plRatio)}
        </span>
      ) : null}
    </span>
  );
}

/** Every detail column of the library, in display order. */
function allColumns(kind: LibraryKind): Column[] {
  const columns: Column[] = [];
  if (kind === 'card') {
    columns.push({
      key: 'number',
      label: m.catalog_col_number(),
      sort: 'number',
      width: 88,
      cell: (row) => <span className="font-mono text-ink-muted">{row.number ?? '—'}</span>,
    });
  }
  columns.push(
    {
      key: 'language',
      label: m.holding_language(),
      width: 76,
      cell: (row) => <span className="font-mono">{languageCode(row.holding.language)}</span>,
    },
    {
      key: 'state',
      label: kind === 'card' ? m.holding_condition() : m.holding_state(),
      width: kind === 'card' ? 92 : 112,
      cell: (row) => stateText(row.holding) ?? '—',
    },
    {
      key: 'quantity',
      label: m.holding_quantity(),
      sort: 'quantity',
      align: 'right',
      width: 80,
      cell: (row) => <span className="font-mono">{quantityText(row.holding)}</span>,
    },
    {
      key: 'unit',
      label: m.library_col_unit_cost(),
      sort: 'cost',
      align: 'right',
      width: 112,
      cell: (row) => (remaining(row.holding) > 0 ? moneyCell(unitCostDisplay(row.holding)) : '—'),
    },
    {
      key: 'cost',
      label: m.library_col_cost(),
      align: 'right',
      width: 108,
      cell: (row) => moneyCell(remainingCost(row.holding)),
    },
    {
      key: 'unitValue',
      label: m.library_col_unit_value(),
      sort: 'unitValue',
      align: 'right',
      width: 104,
      cell: unitValueCell,
    },
    {
      key: 'value',
      label: m.library_col_value(),
      sort: 'value',
      align: 'right',
      width: 108,
      cell: (row) => moneyCell(row.value?.value),
    },
    {
      key: 'pl',
      label: m.library_col_pl(),
      sort: 'pl',
      align: 'right',
      width: 116,
      cell: (row) => plCell(row, 'amount'),
    },
    {
      key: 'plRatio',
      label: m.library_col_pl_ratio(),
      sort: 'plRatio',
      align: 'right',
      width: 96,
      cell: (row) => plCell(row, 'ratio'),
    },
    {
      key: 'priceDate',
      label: m.library_col_price_date(),
      sort: 'priceDate',
      width: 108,
      cell: priceDateCell,
    },
    {
      key: 'bought',
      label: m.holding_date(),
      sort: 'bought',
      width: 108,
      cell: (row) => formatDate(boughtOn(row.holding)),
    },
    {
      key: 'location',
      label: m.holding_location(),
      width: 168,
      cell: (row) => <span className="block truncate">{row.locationText ?? '—'}</span>,
    },
  );
  return columns;
}

/** The detail columns a user can choose from (UX_SPEC.md §4.6), with their labels. */
export function columnChoices(kind: LibraryKind): { key: ColumnKey; label: string }[] {
  return allColumns(kind).flatMap((c) =>
    c.key === 'name' || c.key === 'compactValue' ? [] : [{ key: c.key, label: c.label }],
  );
}

/**
 * The columns to render: the name, then the chosen columns that fit, most important first
 * (PRIORITY), shown in their display order. Narrow tables (phones) get the name with a compact
 * line under it and one value column.
 */
function columnsOf(kind: LibraryKind, width: number, hidden: ReadonlySet<string>): Column[] {
  const compact = width < COMPACT_BELOW;
  const nameColumn: Column = {
    key: 'name',
    label: kind === 'card' ? m.library_col_card() : m.library_col_product(),
    sort: 'name',
    cell: (row) => <NameCell row={row} kind={kind} compact={compact} />,
  };
  if (compact) {
    return [
      nameColumn,
      {
        key: 'compactValue',
        label: m.library_col_value(),
        sort: 'value',
        align: 'right',
        width: 96,
        cell: compactValueCell,
      },
    ];
  }
  const all = allColumns(kind);
  let room = width - NAME_MIN - FIXED;
  const shown = new Set<string>();
  for (const key of PRIORITY) {
    const column = all.find((c) => c.key === key);
    if (!column || hidden.has(key)) continue;
    const need = column.width ?? 0;
    if (need <= room) {
      shown.add(key);
      room -= need;
    }
  }
  return [nameColumn, ...all.filter((c) => shown.has(c.key))];
}

/** Columns this device hides, per library (kv `ui:library.columns.<kind>`); all show by default. */
function useHiddenColumns(
  kind: LibraryKind,
): [ReadonlySet<string>, (next: ReadonlySet<string>) => void] {
  const key = `library.columns.${kind}`;
  const stored = useUiPref(key)?.value;
  const hidden = new Set(Array.isArray(stored) ? stored.filter((v) => typeof v === 'string') : []);
  return [hidden, (next) => void setUiPref(db, key, [...next]).catch(toastError)];
}

/** Until the table is measured: the viewport minus the sidebar and the page padding. */
function guessWidth(): number {
  const viewport = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const chrome = viewport >= 1024 ? 300 : viewport >= 768 ? 128 : 40;
  return Math.min(viewport, 1440) - chrome;
}

/**
 * The collection as a table (UX_SPEC.md §4.6), virtualized: only the rows near the viewport are in
 * the DOM, with spacer rows keeping the scroll height. Columns give way as the table narrows, and a
 * compact line under the name carries quantity, language and condition when their columns are gone.
 */
export function LibraryTable({
  kind,
  groups,
  title,
  rows,
  sort,
  dir,
  onSort,
  selected,
  selecting,
  onToggle,
  onToggleAll,
}: SelectionProps & {
  kind: LibraryKind;
  groups: readonly RowGroup<LibraryRow>[];
  title: (group: RowGroup<LibraryRow>) => string | undefined;
  /** Every row shown, for "select all". */
  rows: readonly LibraryRow[];
  sort: LotSort;
  dir: 'asc' | 'desc';
  onSort: (sort: LotSort) => void;
  onToggleAll: (select: boolean) => void;
}) {
  'use no memo'; // TanStack Virtual keeps one mutable instance; compiled memoization would go stale.
  const ref = useRef<HTMLTableSectionElement>(null);
  const box = useElementBox(ref);
  const [hidden, setHidden] = useHiddenColumns(kind);
  const width = box.width || guessWidth();
  // Columns come and go with the table's width (not the viewport's: the sidebar takes room), and
  // only rendered columns exist, so the spacer and group rows span exactly the table.
  const columns = columnsOf(kind, width, hidden);
  const span = columns.length + 2;
  const items: TableItem[] = [];
  for (const group of groups) {
    const heading = title(group);
    if (heading !== undefined) {
      items.push({
        type: 'header',
        key: `h:${group.key}`,
        title: heading,
        count: group.rows.length,
      });
    }
    for (const row of group.rows) items.push({ type: 'row', key: row.holding.id, row });
  }
  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: (index) => (items[index]?.type === 'header' ? 52 : 64),
    getItemKey: (index) => items[index]?.key ?? index,
    overscan: 8,
    scrollMargin: box.top,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const first = virtualItems[0];
  const last = virtualItems.at(-1);
  const before = first ? first.start - box.top : 0;
  const after = last ? virtualizer.getTotalSize() - (last.end - box.top) : 0;
  const selectedCount = rows.filter((row) => selected.has(row.holding.id)).length;
  const all = rows.length > 0 && selectedCount === rows.length;

  return (
    <div className="tile overflow-hidden p-2">
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">
          {kind === 'card' ? m.library_list_cards() : m.library_list_sealed()}
        </caption>
        <thead>
          <tr className="type-label text-ink-subtle">
            <th scope="col" className="w-12 px-2 py-2">
              <span className="flex justify-center">
                <Checkbox
                  checked={all}
                  indeterminate={selectedCount > 0 && !all}
                  onCheckedChange={() => onToggleAll(!all)}
                  label={m.library_select_all()}
                />
              </span>
            </th>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={
                  column.sort && column.sort === sort
                    ? dir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
                style={column.width ? { width: column.width } : undefined}
                className={cn('px-3 py-2 font-bold', column.align === 'right' && 'text-right')}
              >
                {column.sort ? (
                  <button
                    type="button"
                    onClick={() => column.sort && onSort(column.sort)}
                    className={cn(
                      'inline-flex min-h-8 items-center gap-1 rounded-pill hover:text-ink',
                      column.sort === sort && 'text-ink',
                    )}
                  >
                    {column.label}
                    {column.sort === sort ? (
                      dir === 'asc' ? (
                        <CaretUpIcon size={12} weight="bold" aria-hidden />
                      ) : (
                        <CaretDownIcon size={12} weight="bold" aria-hidden />
                      )
                    ) : null}
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
            <th scope="col" className="w-13 px-2 py-2">
              <span className="sr-only">{m.library_col_actions()}</span>
              {width >= COMPACT_BELOW ? (
                <CheckMenu
                  label={m.library_columns()}
                  icon={<ColumnsIcon size={18} weight="bold" aria-hidden />}
                  options={columnChoices(kind).map((c) => ({
                    value: c.key,
                    label: c.label,
                    checked: !hidden.has(c.key),
                  }))}
                  onToggle={(key, checked) => {
                    const next = new Set(hidden);
                    if (checked) next.delete(key);
                    else next.add(key);
                    setHidden(next);
                  }}
                />
              ) : null}
            </th>
          </tr>
        </thead>
        <tbody ref={ref}>
          {before > 0 ? (
            <tr aria-hidden>
              {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- empty spacer of the virtualized rows */}
              <td colSpan={span} style={{ height: before, padding: 0 }} />
            </tr>
          ) : null}
          {virtualItems.map((virtual) => {
            const item = items[virtual.index];
            if (!item) return null;
            if (item.type === 'header') {
              return (
                <tr key={virtual.key} data-index={virtual.index} ref={virtualizer.measureElement}>
                  <th
                    scope="colgroup"
                    colSpan={span}
                    className="type-h3 border-t border-line px-3 pt-5 pb-2 text-left"
                  >
                    {item.title}
                    <span className="ml-2 type-small text-ink-muted">
                      {formatCount(item.count)}
                    </span>
                  </th>
                </tr>
              );
            }
            const { row } = item;
            const h = row.holding;
            const label = describeRow(row);
            const isSelected = selected.has(h.id);
            return (
              <tr
                key={virtual.key}
                data-index={virtual.index}
                ref={virtualizer.measureElement}
                className={cn(
                  'border-t border-line type-small',
                  isSelected && 'bg-accent-soft',
                  remaining(h) <= 0 && 'text-ink-muted',
                )}
              >
                <td className="px-2 py-2">
                  <span
                    className={cn(
                      'flex justify-center',
                      !selecting && !isSelected && '[@media(hover:none)]:hidden',
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggle(h.id)}
                      label={m.library_select({ what: label })}
                    />
                  </span>
                </td>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn('px-3 py-2', column.align === 'right' && 'text-right')}
                  >
                    {column.cell(row)}
                  </td>
                ))}
                <td className="px-1 py-1">
                  <ActionMenu
                    label={m.lot_actions({ what: label })}
                    actions={lotMenuActions(h, label)}
                  />
                </td>
              </tr>
            );
          })}
          {after > 0 ? (
            <tr aria-hidden>
              {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- empty spacer of the virtualized rows */}
              <td colSpan={span} style={{ height: after, padding: 0 }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
