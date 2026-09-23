import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useRef, type ReactNode } from 'react';
import { CardImage } from '@/components/domain/CardImage';
import { ProductImage } from '@/components/domain/ProductImage';
import { Checkbox } from '@/components/ui/FormControls';
import { ActionMenu } from '@/components/ui/Menu';
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
import { formatCount, formatDate, formatMoney } from '@/i18n/format';
import { useElementBox } from '@/lib/useElementBox';
import type { SelectionProps } from './LibraryGrid';
import { lotMenuActions } from '@/features/collection';
import { describeRow, quantityText, stateText, variantText } from './lot-text';
import type { LibraryKind, LibraryRow } from './rows';

type TableItem =
  | { type: 'header'; key: string; title: string; count: number }
  | { type: 'row'; key: string; row: LibraryRow };

interface Column {
  key: string;
  label: string;
  /** Screen-reader-only header (check boxes, menus). */
  hidden?: boolean;
  sort?: LotSort;
  align?: 'right';
  /** Width in px; the name column takes the rest. */
  width?: number;
  /** Table width (px) from which the column shows; narrower tables leave it out. */
  from?: number;
  cell: (row: LibraryRow) => ReactNode;
}

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

function columnsOf(kind: LibraryKind, width: number): Column[] {
  const compact = width < 560;
  const nameColumn: Column = {
    key: 'name',
    label: kind === 'card' ? m.library_col_card() : m.library_col_product(),
    sort: 'name',
    cell: (row) => <NameCell row={row} kind={kind} compact={compact} />,
  };
  const columns: Column[] = [nameColumn];
  if (kind === 'card') {
    columns.push({
      key: 'number',
      label: m.catalog_col_number(),
      sort: 'number',
      width: 88,
      from: 752,
      cell: (row) => <span className="font-mono text-ink-muted">{row.number ?? '—'}</span>,
    });
  }
  columns.push(
    {
      key: 'language',
      label: m.holding_language(),
      width: 76,
      from: 560,
      cell: (row) => <span className="font-mono">{languageCode(row.holding.language)}</span>,
    },
    {
      key: 'state',
      label: kind === 'card' ? m.holding_condition() : m.holding_state(),
      width: kind === 'card' ? 92 : 112,
      from: 560,
      cell: (row) => stateText(row.holding) ?? '—',
    },
    {
      key: 'quantity',
      label: m.holding_quantity(),
      sort: 'quantity',
      align: 'right',
      width: 80,
      from: 560,
      cell: (row) => <span className="font-mono">{quantityText(row.holding)}</span>,
    },
    {
      key: 'unit',
      label: m.library_col_unit_cost(),
      sort: 'cost',
      align: 'right',
      width: 108,
      from: 752,
      cell: (row) => (remaining(row.holding) > 0 ? moneyCell(unitCostDisplay(row.holding)) : '—'),
    },
    {
      key: 'cost',
      label: m.library_col_cost(),
      align: 'right',
      width: 108,
      from: 880,
      cell: (row) => moneyCell(remainingCost(row.holding)),
    },
    {
      key: 'bought',
      label: m.holding_date(),
      sort: 'bought',
      width: 108,
      from: 1008,
      cell: (row) => formatDate(boughtOn(row.holding)),
    },
    {
      key: 'location',
      label: m.holding_location(),
      width: 168,
      from: 1136,
      cell: (row) => <span className="block truncate">{row.locationText ?? '—'}</span>,
    },
  );
  return columns.filter((column) => column.from === undefined || width >= column.from);
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
  // Columns come and go with the table's width (not the viewport's: the sidebar takes room), and
  // only rendered columns exist, so the spacer and group rows span exactly the table.
  const columns = columnsOf(kind, box.width || guessWidth());
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
