import { Link } from '@tanstack/react-router';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useRef, type KeyboardEvent } from 'react';
import { CardTile } from '@/components/domain/CardTile';
import { PLDelta } from '@/components/domain/PLDelta';
import { ProductImage } from '@/components/domain/ProductImage';
import { Checkbox } from '@/components/ui/FormControls';
import { ActionMenu } from '@/components/ui/Menu';
import { cn } from '@/components/ui/cn';
import { RARITY_ABBR } from '@/domain/catalog';
import type { RowGroup } from '@/domain/collection';
import { remaining } from '@/domain/schemas';
import { htmlLang, languageCode, m, productTypeLabel } from '@/i18n';
import { formatCount, formatMoney } from '@/i18n/format';
import { heroStyle, morphWanted, nameHeroTile } from '@/lib/hero';
import { useElementBox } from '@/lib/useElementBox';
import { useRovingFocus } from '@/lib/useRovingFocus';
import { lotMenuActions, openEdit } from '@/features/collection';
import { lotKeys } from './lot-keys';
import { describeRow, quantityText, stateText, variantText } from './lot-text';
import type { LibraryKind, LibraryRow } from '@/features/collection';

/** Grid tiles (UX_SPEC.md §4.6): the set grid's tiles plus quantity, language and condition. */
const TILE_MIN = { card: 132, sealed: 168 } as const;
const GAP_X = 12;

const ABBREVIATIONS = /* @__PURE__ */ new Map<string, string>(Object.entries(RARITY_ABBR));

export interface SelectionProps {
  selected: ReadonlySet<string>;
  /** Show every check box (something is selected, or the select mode is on). */
  selecting: boolean;
  onToggle: (id: string) => void;
}

type GridItem =
  | { type: 'header'; key: string; title: string; count: number }
  | { type: 'row'; key: string; rows: LibraryRow[] };

function itemsOf(
  groups: readonly RowGroup<LibraryRow>[],
  titles: (group: RowGroup<LibraryRow>) => string | undefined,
  columns: number,
): GridItem[] {
  const items: GridItem[] = [];
  for (const group of groups) {
    const title = titles(group);
    if (title !== undefined) {
      items.push({ type: 'header', key: `h:${group.key}`, title, count: group.rows.length });
    }
    for (let start = 0; start < group.rows.length; start += columns) {
      const rows = group.rows.slice(start, start + columns);
      items.push({ type: 'row', key: `r:${group.key}:${rows[0]?.holding.id ?? start}`, rows });
    }
  }
  return items;
}

/** Space selects the focused tile; N and P as on every lot (UX_SPEC.md §7). */
function tileKeys(row: LibraryRow, onToggle: (id: string) => void) {
  const keys = lotKeys(row);
  return (event: KeyboardEvent) => {
    if (event.key === ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      onToggle(row.holding.id);
    } else {
      keys(event);
    }
  };
}

/** The lot's value and P/L under a tile: `69,80 € ↗ +34,2 %`, or that it has no price yet. */
function TileValue({ row }: { row: LibraryRow }) {
  const v = row.value;
  if (!v || remaining(row.holding) <= 0) return null;
  if (!v.value) return <span className="block truncate text-ink-subtle">{m.lot_unpriced()}</span>;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {v.stale ? (
        <span className="inline-flex shrink-0 items-center">
          <span aria-hidden className="size-1.5 rounded-pill bg-warn" />
          <span className="sr-only">{m.prices_stale()}</span>
        </span>
      ) : null}
      <span className="money shrink-0 font-bold text-ink">{formatMoney(v.value)}</span>
      {v.pl ? (
        <PLDelta delta={v.pl} ratio={v.plRatio} show="ratio" className="text-[12px]" />
      ) : null}
      {v.unit?.source === 'override' ? (
        <span className="truncate font-sans text-accent-text">{m.library_value_own()}</span>
      ) : null}
    </span>
  );
}

function TileBody({ row, kind }: { row: LibraryRow; kind: LibraryKind }) {
  const h = row.holding;
  const meta = [quantityText(h), languageCode(h.language), stateText(h), variantText(row)]
    .filter(Boolean)
    .join(' · ');
  if (kind === 'card') {
    const number = row.number?.split('/')[0] ?? '';
    const image = row.image;
    return (
      <CardTile
        image={image}
        number={number}
        name={row.name}
        nameLang={row.nameLang}
        rarity={ABBREVIATIONS.get(row.rarity ?? '')}
        badge={image && image.lang !== h.language ? languageCode(image.lang) : undefined}
        missingLabel={m.catalog_image_missing()}
        artStyle={heroStyle(h.item.id)}
        meta={
          <>
            <span className="block truncate">{meta}</span>
            <TileValue row={row} />
          </>
        }
      />
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <ProductImage
        image={row.image}
        type={row.productType ?? 'other'}
        size="small"
        alt=""
        className="transition-transform duration-(--dur-fast) group-hover:-translate-y-0.5"
      />
      <div className="flex min-w-0 flex-col gap-1 px-0.5">
        <span className="type-label truncate text-ink-muted">
          {productTypeLabel(row.productType ?? 'other')}
        </span>
        <span lang={htmlLang(row.nameLang)} className="type-ui line-clamp-2 text-[14px] text-ink">
          {row.name}
        </span>
        <span className="truncate font-mono text-[12px] leading-4 text-ink-muted">{meta}</span>
        <span className="font-mono text-[12px] leading-4 text-ink-muted">
          <TileValue row={row} />
        </span>
      </div>
    </div>
  );
}

function LotTile({
  row,
  kind,
  selected,
  selecting,
  onToggle,
}: {
  row: LibraryRow;
  kind: LibraryKind;
  selected: boolean;
  selecting: boolean;
  onToggle: (id: string) => void;
}) {
  const h = row.holding;
  const label = describeRow(row);
  const closed = remaining(h) <= 0;
  const linkClass = 'group block rounded-[14px] text-left outline-offset-4';
  const ariaLabel = closed ? `${label}, ${m.lot_closed()}` : label;
  const onKeyDown = tileKeys(row, onToggle);
  const body = <TileBody row={row} kind={kind} />;
  let target;
  if (kind === 'card' && row.pageSetId) {
    target = (
      <Link
        to="/catalog/sets/$setId/cards/$cardId"
        params={{ setId: row.pageSetId, cardId: h.item.id }}
        search={{ lang: h.language }}
        aria-label={ariaLabel}
        aria-keyshortcuts="N P Space"
        data-roving
        viewTransition={morphWanted()}
        onClick={(event) => nameHeroTile(event.currentTarget, h.item.id)}
        className={linkClass}
        onKeyDown={onKeyDown}
      >
        {body}
      </Link>
    );
  } else if (kind === 'sealed' && row.inCatalog && !row.info.custom) {
    target = (
      <Link
        to="/catalog/sealed/$productId"
        params={{ productId: h.item.id }}
        search={{ lang: h.language }}
        aria-label={ariaLabel}
        aria-keyshortcuts="N P Space"
        data-roving
        className={linkClass}
        onKeyDown={onKeyDown}
      >
        {body}
      </Link>
    );
  } else {
    // Custom items and lots whose item left the catalog have no page: open the lot instead.
    target = (
      <button
        type="button"
        aria-label={ariaLabel}
        aria-keyshortcuts="N P Space"
        data-roving
        className={cn(linkClass, 'w-full')}
        onClick={() => openEdit(h.id)}
        onKeyDown={onKeyDown}
      >
        {body}
      </button>
    );
  }
  return (
    <div
      data-roving-tile
      className={cn(
        'group/tile relative rounded-[16px]',
        closed && 'opacity-60',
        selected && 'outline-2 outline-offset-4 outline-accent',
      )}
    >
      {target}
      <span
        className={cn(
          'absolute top-1 left-1 flex size-11 items-center justify-center rounded-pill',
          selected || selecting
            ? 'opacity-100'
            : 'opacity-0 group-focus-within/tile:opacity-100 group-hover/tile:opacity-100 [@media(hover:none)]:hidden',
        )}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(h.id)}
          label={m.library_select({ what: label })}
          className="shadow-[inset_0_0_0_1.5px_var(--border-strong),0_4px_10px_-4px_oklch(0_0_0/0.5)]"
        />
      </span>
      <ActionMenu
        label={m.lot_actions({ what: label })}
        actions={lotMenuActions(h, label)}
        className="absolute top-1 right-1 bg-surface-1/90 opacity-0 group-focus-within/tile:opacity-100 group-hover/tile:opacity-100 data-popup-open:opacity-100 [@media(hover:none)]:opacity-100"
      />
    </div>
  );
}

/**
 * The collection as a grid of tiles, virtualized by rows (QUALITY.md §4: 60 fps with 300+ tiles),
 * with group headings when grouped.
 */
export function LibraryGrid({
  kind,
  groups,
  title,
  selected,
  selecting,
  onToggle,
}: SelectionProps & {
  kind: LibraryKind;
  groups: readonly RowGroup<LibraryRow>[];
  /** Heading of a group; undefined when the list isn't grouped. */
  title: (group: RowGroup<LibraryRow>) => string | undefined;
}) {
  'use no memo'; // TanStack Virtual keeps one mutable instance; compiled memoization would go stale.
  const ref = useRef<HTMLDivElement>(null);
  const box = useElementBox(ref);
  useRovingFocus(ref);
  const min = TILE_MIN[kind];
  const width = box.width || 960;
  const columns = Math.max(2, Math.floor((width + GAP_X) / (min + GAP_X)));
  const tileWidth = (width - (columns - 1) * GAP_X) / columns;
  const rowHeight = kind === 'card' ? tileWidth * (88 / 63) + 72 : tileWidth + 104;
  const items = itemsOf(groups, title, columns);
  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: (index) => (items[index]?.type === 'header' ? 56 : rowHeight),
    getItemKey: (index) => items[index]?.key ?? index,
    overscan: 3,
    scrollMargin: box.top,
  });

  return (
    <div ref={ref} className="relative" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((virtual) => {
        const item = items[virtual.index];
        if (!item) return null;
        return (
          <div
            key={virtual.key}
            data-index={virtual.index}
            ref={virtualizer.measureElement}
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translateY(${virtual.start - box.top}px)` }}
          >
            {item.type === 'header' ? (
              <h3 className="type-h3 m-0 flex items-baseline gap-2 px-1 pt-2 pb-4">
                {item.title}
                <span className="type-small text-ink-muted">{formatCount(item.count)}</span>
              </h3>
            ) : (
              <div
                className="grid pb-6"
                style={{
                  columnGap: GAP_X,
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {item.rows.map((row) => (
                  <LotTile
                    key={row.holding.id}
                    row={row}
                    kind={kind}
                    selected={selected.has(row.holding.id)}
                    selecting={selecting}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
