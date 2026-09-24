import { useAllPrices, useHoldings, useSettings } from '@/db';
import { chunkSetId } from '@/domain/catalog';
import { collectedSets } from '@/domain/collection';
import { remaining } from '@/domain/schemas';
import { todayIso } from '@/domain/ids';
import { portfolioTotals, realizedTotal, type LotValue } from '@/domain/valuation';
import { useManifest } from '@/catalog';
import { useLibraryRows } from '@/features/collection';
import { m } from '@/i18n';
import { HeroTile } from './HeroTile';
import {
  AllocationTile,
  MoversTile,
  ProgressTile,
  RecentTile,
  StaleTile,
  UnpricedNotice,
} from './tiles';

/**
 * Übersicht with a collection (PRT-01, UX_SPEC.md §4.1): what it's worth and how it's doing,
 * what needs attention (stale and missing prices), set progress, movers, allocation and the
 * latest additions. Every number follows DATA_MODEL.md §6.
 */
export function Dashboard() {
  const cardRows = useLibraryRows('card');
  const sealedRows = useLibraryRows('sealed');
  const holdings = useHoldings();
  const prices = useAllPrices();
  const settings = useSettings();
  const manifest = useManifest();
  if (!cardRows || !sealedRows || !holdings || !prices) {
    return <div aria-busy="true" className="min-h-[60vh]" />;
  }
  const rows = [...cardRows, ...sealedRows];
  const values = rows.map((r) => r.value).filter((v): v is LotValue => v !== undefined);
  if (values.length < rows.length) return <div aria-busy="true" className="min-h-[60vh]" />;

  const today = todayIso();
  const totals = portfolioTotals(values, realizedTotal(holdings));
  const byId = new Map(rows.map((r) => [r.holding.id, r]));
  const unpricedCards = cardRows.filter((r) => remaining(r.holding) > 0 && !r.value?.unit).length;

  return (
    <div className="flex flex-col gap-4" aria-label={m.overview_dashboard_label()}>
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <HeroTile
          holdings={holdings}
          prices={prices}
          totals={totals}
          today={today}
          unpriced={settings.price.unpriced}
          className="p-6 lg:col-span-2"
        />
        <div className="flex flex-col gap-4">
          <StaleTile stale={totals.stale} staleAfterDays={settings.price.staleAfterDays} />
          <ProgressTile
            sets={collectedSets(
              cardRows.filter((row) => row.inCatalog && !row.info.custom).map((row) => row.holding),
              (setId) => chunkSetId(setId, manifest.sets),
            ).slice(0, 4)}
          />
        </div>
      </div>
      <UnpricedNotice count={totals.unpriced} kind={unpricedCards ? 'card' : 'sealed'} />
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <MoversTile values={values} rows={byId} />
        <AllocationTile rows={rows} />
        <RecentTile rows={rows} />
      </div>
    </div>
  );
}
