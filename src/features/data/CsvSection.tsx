import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { toastManager } from '@/components/ui/Toasts';
import { useAllPrices, useHoldings, useTags, useUiChoice } from '@/db';
import { CSV_DIALECTS, type CsvDialect } from '@/domain/csv';
import { remaining } from '@/domain/schemas';
import { useLibraryRows, type LibraryRow } from '@/features/collection';
import { m } from '@/i18n';
import { collectionCsv, pricesCsv, salesCsv, saveCsv, type CsvKind } from './csv';
import { toastFailure } from './export';

export const CSV_DIALECT_KEY = 'csv.dialect';

/** The CSV dialect last chosen on this device (kv `ui:csv.dialect`); Excel (Deutschland) at first. */
export function useCsvDialect() {
  return useUiChoice<CsvDialect>(CSV_DIALECT_KEY, CSV_DIALECTS, 'excel-de');
}

/** Downloads a collection CSV of these lots and says so. */
export function downloadCollectionCsv(
  rows: readonly LibraryRow[],
  tagNames: ReadonlyMap<string, string>,
  dialect: CsvDialect,
): void {
  const name = saveCsv(collectionCsv(rows, tagNames, dialect), 'collection');
  toastManager.add({ title: m.toast_csv_started(), description: name, timeout: 6000 });
}

/** Loads what a CSV needs (the lots need the catalog for names), writes it, then ends. */
function CsvJob({
  kind,
  dialect,
  onDone,
}: {
  kind: CsvKind;
  dialect: CsvDialect;
  onDone: () => void;
}) {
  const cards = useLibraryRows('card');
  const sealed = useLibraryRows('sealed');
  const tags = useTags();
  const prices = useAllPrices();
  const done = useRef(false);
  // Values follow once the latest prices have loaded.
  const ready = Boolean(
    cards && sealed && tags && prices && [...cards, ...sealed].every((r) => r.value !== undefined),
  );

  useEffect(() => {
    if (!ready || !cards || !sealed || !tags || !prices || done.current) return;
    done.current = true;
    const rows = [...cards, ...sealed];
    const tagNames = new Map(tags.map((t) => [t.id, t.name]));
    if (kind === 'collection') {
      downloadCollectionCsv(
        rows.filter((r) => remaining(r.holding) > 0),
        tagNames,
        dialect,
      );
    } else {
      const name = saveCsv(
        kind === 'prices' ? pricesCsv(prices, rows, dialect) : salesCsv(rows, dialect),
        kind,
      );
      toastManager.add({ title: m.toast_csv_started(), description: name, timeout: 6000 });
    }
    onDone();
  }, [ready, cards, sealed, tags, prices, kind, dialect, onDone]);
  return null;
}

/** Offline without the catalog cached, the lots can't be named: say so instead of breaking. */
class CsvBoundary extends Component<
  { onError: (error: unknown) => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * CSV für Tabellen (DAT-03, IMPORT_EXPORT.md §6): the collection (open lots), all prices, and the
 * sales and trades, as Excel (Deutschland) or International.
 */
export function CsvSection() {
  const [dialect, setDialect] = useCsvDialect();
  const holdings = useHoldings();
  const prices = useAllPrices();
  const [job, setJob] = useState<CsvKind | null>(null);
  const open = holdings?.filter((h) => remaining(h) > 0).length ?? 0;
  const sales =
    holdings?.some((h) => h.disposals.some((d) => d.type === 'sale' || d.type === 'trade')) ??
    false;
  const end = () => setJob(null);

  const kinds: { kind: CsvKind; label: string; enabled: boolean }[] = [
    { kind: 'collection', label: m.csv_collection(), enabled: open > 0 },
    { kind: 'prices', label: m.csv_prices(), enabled: (prices?.length ?? 0) > 0 },
    { kind: 'sales', label: m.csv_sales(), enabled: sales },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="type-body m-0 text-ink-muted">{m.settings_data_csv_intro()}</p>
      <div className="flex flex-col gap-2">
        <SegmentedControl<CsvDialect>
          label={m.csv_dialect()}
          value={dialect}
          onValueChange={(next) => void setDialect(next).catch(toastFailure)}
          options={[
            { value: 'excel-de', label: m.csv_dialect_excel() },
            { value: 'international', label: m.csv_dialect_intl() },
          ]}
        />
        <p className="type-small m-0 text-ink-muted">
          {dialect === 'excel-de' ? m.csv_dialect_excel_hint() : m.csv_dialect_intl_hint()}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {kinds.map(({ kind, label, enabled }) => (
          <Button
            key={kind}
            variant="outline"
            disabled={!enabled || job !== null}
            onClick={() => setJob(kind)}
          >
            {m.csv_export({ what: label })}
          </Button>
        ))}
      </div>
      {job ? (
        <CsvBoundary
          onError={(error) => {
            end();
            toastFailure(error);
          }}
        >
          <Suspense fallback={null}>
            <CsvJob kind={job} dialect={dialect} onDone={end} />
          </Suspense>
        </CsvBoundary>
      ) : null}
    </div>
  );
}
