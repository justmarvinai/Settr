import { toCsv, type CsvCell, type CsvDialect } from '@/domain/csv';
import { unitCostDisplay } from '@/domain/collection';
import { remaining, type PriceEntry } from '@/domain/schemas';
import { realizedEvents } from '@/domain/valuation';
import type { LibraryRow } from '@/features/collection';
import { languageCode, m } from '@/i18n';
import { gradingText, sealedStateLabel } from '@/i18n/collection-labels';
import { entryTypeLabel } from '@/i18n/price-labels';
import { download } from './save-file';

/**
 * CSV files for spreadsheets (DAT-03, IMPORT_EXPORT.md §6): the collection, every price entry and
 * the sales and trades, with German headers. Names, sets and numbers come from the catalog where it
 * knows the item, else from the record's snapshot.
 */

export type CsvKind = 'collection' | 'prices' | 'sales';

const FILE_NAMES: Record<CsvKind, string> = {
  collection: 'sammlung',
  prices: 'preise',
  sales: 'verkaeufe',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** `settr-sammlung-2026-09-24.csv` (local date). */
export function csvFileName(kind: CsvKind, now: Date = new Date()): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `settr-${FILE_NAMES[kind]}-${date}.csv`;
}

/** One lot per line: what it is, what it cost, what it's worth today (open lots show a value). */
export function collectionCsv(
  rows: readonly LibraryRow[],
  tagNames: ReadonlyMap<string, string>,
  dialect: CsvDialect,
): string {
  const header = [
    m.csv_col_id(),
    m.csv_col_kind(),
    m.csv_col_name(),
    m.csv_col_set(),
    m.csv_col_number(),
    m.csv_col_language(),
    m.csv_col_variant(),
    m.csv_col_condition(),
    m.csv_col_grading(),
    m.csv_col_quantity(),
    m.csv_col_bought(),
    m.csv_col_cost_total(),
    m.csv_col_fees(),
    m.csv_col_cost_unit(),
    m.csv_col_price_unit(),
    m.csv_col_price_date(),
    m.csv_col_value(),
    m.csv_col_pl(),
    m.csv_col_pl_pct(),
    m.csv_col_source(),
    m.csv_col_tags(),
    m.csv_col_location(),
    m.csv_col_note(),
  ];
  const lines = rows.map((row): CsvCell[] => {
    const h = row.holding;
    const sealed = h.item.kind === 'sealed';
    const value = row.value;
    const unitCost = unitCostDisplay(h);
    return [
      h.id,
      sealed ? m.csv_kind_sealed() : m.csv_kind_card(),
      row.name,
      row.setName,
      row.number,
      languageCode(h.language),
      row.variantLabel,
      sealed ? sealedStateLabel(h.sealedState ?? 'sealed') : h.condition,
      h.grading ? gradingText(h.grading) : undefined,
      remaining(h),
      h.acquisition.date ? { date: h.acquisition.date } : undefined,
      h.acquisition.priceTotal ? { money: h.acquisition.priceTotal } : undefined,
      h.acquisition.feesTotal ? { money: h.acquisition.feesTotal } : undefined,
      unitCost ? { money: unitCost } : undefined,
      value?.unit ? { money: value.unit.price } : undefined,
      value?.unit ? { date: value.unit.date } : undefined,
      value?.value ? { money: value.value } : undefined,
      value?.pl ? { money: value.pl } : undefined,
      value?.plRatio === undefined ? undefined : Math.round(value.plRatio * 10_000) / 100,
      h.acquisition.source,
      h.tags
        .map((id) => tagNames.get(id))
        .filter(Boolean)
        .join(', '),
      row.locationText,
      h.note,
    ];
  });
  return toCsv(header, lines, dialect);
}

/** Every price entry, series by series, oldest first. */
export function pricesCsv(
  entries: readonly PriceEntry[],
  rows: readonly LibraryRow[],
  dialect: CsvDialect,
): string {
  const known = new Map(rows.map((r) => [r.holding.item.id, r]));
  const variants = new Map(
    rows.map((r) => [`${r.holding.item.id}|${r.holding.variant ?? ''}`, r.variantLabel]),
  );
  const header = [
    m.csv_col_series(),
    m.csv_col_name(),
    m.csv_col_set(),
    m.csv_col_number(),
    m.csv_col_language(),
    m.csv_col_variant(),
    m.csv_col_grade(),
    m.csv_col_date(),
    m.csv_col_price(),
    m.csv_col_currency(),
    m.csv_col_price_type(),
    m.csv_col_source(),
    m.csv_col_note(),
  ];
  const sorted = entries.toSorted(
    (a, b) =>
      a.seriesKey.localeCompare(b.seriesKey) ||
      a.date.localeCompare(b.date) ||
      a.createdAt.localeCompare(b.createdAt),
  );
  const lines = sorted.map((e): CsvCell[] => {
    const row = known.get(e.item.id);
    return [
      e.seriesKey,
      row?.name ?? e.snapshot.name,
      row?.setName ?? e.snapshot.setName,
      row?.number ?? e.snapshot.localId,
      languageCode(e.language),
      e.variant ? (variants.get(`${e.item.id}|${e.variant}`) ?? e.variant) : undefined,
      e.grade === 'raw' ? undefined : e.grade.toUpperCase(),
      { date: e.date },
      { money: e.price },
      e.price.currency,
      entryTypeLabel(e),
      e.source === 'cardmarket' ? m.catalog_cardmarket_title() : e.source,
      e.note,
    ];
  });
  return toCsv(header, lines, dialect);
}

/** Sales and trades with proceeds, fees, cost and the realized result (PRT-04). */
export function salesCsv(rows: readonly LibraryRow[], dialect: CsvDialect): string {
  const byId = new Map(rows.map((r) => [r.holding.id, r]));
  const header = [
    m.csv_col_kind(),
    m.csv_col_name(),
    m.csv_col_set(),
    m.csv_col_number(),
    m.csv_col_language(),
    m.csv_col_quantity(),
    m.csv_col_date(),
    m.csv_col_proceeds(),
    m.csv_col_fees(),
    m.csv_col_basis(),
    m.csv_col_realized(),
    m.csv_col_note(),
  ];
  const lines = realizedEvents(rows.map((r) => r.holding))
    .toReversed()
    .map(({ holding, disposal, cost, result }): CsvCell[] => {
      const row = byId.get(holding.id);
      return [
        disposal.type === 'sale' ? m.csv_sale() : m.csv_trade(),
        row?.name ?? holding.snapshot.name,
        row?.setName ?? holding.snapshot.setName,
        row?.number ?? holding.snapshot.localId,
        languageCode(holding.language),
        disposal.quantity,
        { date: disposal.date },
        disposal.proceedsTotal ? { money: disposal.proceedsTotal } : undefined,
        disposal.feesTotal ? { money: disposal.feesTotal } : undefined,
        cost ? { money: cost } : undefined,
        result ? { money: result } : undefined,
        disposal.note,
      ];
    });
  return toCsv(header, lines, dialect);
}

export function saveCsv(text: string, kind: CsvKind): string {
  const name = csvFileName(kind);
  download(new Blob([text], { type: 'text/csv;charset=utf-8' }), name);
  return name;
}
