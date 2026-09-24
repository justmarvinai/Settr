import { getRouteApi, Link } from '@tanstack/react-router';
import { Suspense } from 'react';
import { useManifest } from '@/catalog';
import { buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAllPrices, useSettings } from '@/db';
import { CARD_LANGUAGES } from '@/domain/catalog-types';
import { todayIso } from '@/domain/ids';
import { portfolioTotals, realizedTotal, type LotValue } from '@/domain/valuation';
import type { PortfolioSearch } from '@/domain/valuation/portfolio-search';
import { useLibraryRows, type LibraryRow } from '@/features/collection';
import { HeroTile, MoversTile } from '@/features/overview';
import { languageLabel, m } from '@/i18n';
import { setKeyOf, setLabelOf } from './groups';
import { AllocationPanel, PerformancePanel, RealizedPanel } from './panels';

const route = /* @__PURE__ */ getRouteApi('/portfolio/');

type Kind = NonNullable<PortfolioSearch['kind']> | 'all';

function Filters({ rows }: { rows: readonly LibraryRow[] }) {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const manifest = useManifest();
  const update = (patch: Partial<PortfolioSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const languages = CARD_LANGUAGES.filter((l) => rows.some((r) => r.holding.language === l));
  const sets = [...new Set(rows.map((r) => setKeyOf(r, manifest)))];
  return (
    <search aria-label={m.portfolio_filters()} className="flex flex-wrap items-center gap-3">
      <SegmentedControl<Kind>
        label={m.portfolio_kind()}
        value={search.kind ?? 'all'}
        onValueChange={(kind) => update({ kind: kind === 'all' ? undefined : kind })}
        options={[
          { value: 'all', label: m.portfolio_kind_all() },
          { value: 'card', label: m.portfolio_kind_card() },
          { value: 'sealed', label: m.portfolio_kind_sealed() },
        ]}
      />
      {languages.length > 1 ? (
        <div className="w-48">
          <NativeSelect
            aria-label={m.portfolio_language()}
            value={search.lang ?? ''}
            onChange={(event) => {
              const lang = languages.find((l) => l === event.target.value);
              update({ lang });
            }}
          >
            <option value="">{m.portfolio_language_all()}</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {languageLabel(l)}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      {sets.length > 1 ? (
        <div className="w-56">
          <NativeSelect
            aria-label={m.portfolio_set()}
            value={search.set ?? ''}
            onChange={(event) => update({ set: event.target.value || undefined })}
          >
            <option value="">{m.portfolio_set_all()}</option>
            {sets.map((key) => (
              <option key={key} value={key}>
                {setLabelOf(key, manifest, rows)}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}
    </search>
  );
}

function Portfolio() {
  const search = route.useSearch();
  const manifest = useManifest();
  const settings = useSettings();
  const cardRows = useLibraryRows('card');
  const sealedRows = useLibraryRows('sealed');
  const prices = useAllPrices();
  if (!cardRows || !sealedRows || !prices) return <div aria-busy="true" className="min-h-[60vh]" />;
  const all = [...cardRows, ...sealedRows];
  if (!all.length) {
    return (
      <EmptyState
        id="portfolio-empty"
        title={m.empty_collection_title()}
        actions={
          <Link to="/catalog" className={buttonVariants({ variant: 'primary' })}>
            {m.library_empty_cards_action()}
          </Link>
        }
      >
        {m.portfolio_empty()}
      </EmptyState>
    );
  }

  const rows = all.filter(
    (r) =>
      (!search.kind || r.holding.item.kind === search.kind) &&
      (!search.lang || r.holding.language === search.lang) &&
      (!search.set || setKeyOf(r, manifest) === search.set),
  );
  const values = rows.map((r) => r.value).filter((v): v is LotValue => v !== undefined);
  if (values.length < rows.length) return <div aria-busy="true" className="min-h-[60vh]" />;
  const holdings = rows.map((r) => r.holding);
  const totals = portfolioTotals(values, realizedTotal(holdings));
  const byId = new Map(rows.map((r) => [r.holding.id, r]));
  const filtered = Boolean(search.kind || search.lang || search.set);

  return (
    <div className="flex flex-col gap-4">
      <Filters rows={all} />
      {rows.length ? (
        <>
          <HeroTile
            holdings={holdings}
            prices={prices}
            totals={totals}
            today={todayIso()}
            unpriced={settings.price.unpriced}
            title={filtered ? m.portfolio_value_part() : m.overview_value()}
            className="p-6"
          />
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <AllocationPanel rows={rows} view={search.by ?? 'category'} />
            <MoversTile values={values} rows={byId} count={8} />
          </div>
          <PerformancePanel rows={rows} view={search.per ?? 'set'} />
          <RealizedPanel rows={rows} />
        </>
      ) : (
        <Panel className="flex flex-col items-start gap-4 p-6">
          <p className="type-body m-0 text-ink-muted">{m.portfolio_filtered_empty()}</p>
          <Link to="/portfolio" search={{}} className={buttonVariants({ variant: 'outline' })}>
            {m.portfolio_reset()}
          </Link>
        </Panel>
      )}
    </div>
  );
}

/**
 * Portfolio (PRT-02…04, UX_SPEC.md §4.11): the value over time for all of the collection or a
 * part of it (cards or sealed, a language, a set), how it splits up, what gained and lost, the
 * P/L per set or language, and what sales and trades realized.
 */
export function PortfolioPage() {
  return (
    <Suspense fallback={<div aria-busy="true" className="min-h-[60vh]" />}>
      <Portfolio />
    </Suspense>
  );
}
