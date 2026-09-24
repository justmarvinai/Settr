import { getRouteApi } from '@tanstack/react-router';
import { useManifest } from '@/catalog';
import { PLDelta } from '@/components/domain/PLDelta';
import { Donut } from '@/components/domain/charts/Donut';
import type { VizColor } from '@/components/domain/charts/TimeChart';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cn } from '@/components/ui/cn';
import { money } from '@/domain/money';
import {
  groupTotals,
  realizedEvents,
  realizedTotal,
  type GroupTotals,
  type LotValue,
} from '@/domain/valuation';
import type { AllocationView, PerformanceView } from '@/domain/valuation/portfolio-search';
import { LotLink, type LibraryRow } from '@/features/collection';
import { htmlLang, languageCode, m } from '@/i18n';
import { gradingText } from '@/i18n/collection-labels';
import { formatCount, formatDate, formatMoney, formatShare } from '@/i18n/format';
import { grouping } from './groups';

const route = /* @__PURE__ */ getRouteApi('/portfolio/');

/** Groups valued by their lots; lots without a value yet (loading) are left out. */
function groupsOf(rows: readonly LibraryRow[], keyOf: (row: LibraryRow) => string): GroupTotals[] {
  const byId = new Map(rows.map((r) => [r.holding.id, r]));
  const values = rows.map((r) => r.value).filter((v): v is LotValue => v !== undefined);
  return groupTotals(values, (v) => {
    const row = byId.get(v.holding.id);
    return row ? keyOf(row) : undefined;
  });
}

// ── Allocation (PRT-02) ─────────────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, VizColor> = { singles: 1, graded: 7, sealed: 5 };
const SEQUENCE: readonly VizColor[] = [1, 5, 7, 2, 4, 6];
const SWATCH: Record<VizColor, string> = {
  1: 'bg-viz-1',
  2: 'bg-viz-2',
  3: 'bg-viz-3',
  4: 'bg-viz-4',
  5: 'bg-viz-5',
  6: 'bg-viz-6',
  7: 'bg-viz-7',
  8: 'bg-viz-8',
  neutral: 'bg-ink-subtle',
};
const REST = '\u0000rest';

interface Slice {
  key: string;
  label: string;
  value: number;
  color: VizColor;
}

/**
 * Aufteilung (PRT-02, UX_SPEC.md §4.11): the value by category, set, language or rarity as a donut
 * and a ranked list with shares and amounts, so nothing depends on color alone.
 */
export function AllocationPanel({
  rows,
  view,
}: {
  rows: readonly LibraryRow[];
  view: AllocationView;
}) {
  const navigate = route.useNavigate();
  const manifest = useManifest();
  const hasCards = rows.some((r) => r.holding.item.kind === 'card');
  const shown: AllocationView = view === 'rarity' && !hasCards ? 'category' : view;
  const { keyOf, labelOf } = grouping(shown, manifest, rows);
  const groups = groupsOf(rows, keyOf);
  const priced = groups.filter((g) => g.totals.value.minor > 0);
  const total = priced.reduce((n, g) => n + g.totals.value.minor, 0);
  const unpriced = groups.reduce((n, g) => n + g.totals.unpriced, 0);

  const slices: Slice[] = priced.slice(0, SEQUENCE.length).map((g, index) => ({
    key: g.key,
    label: labelOf(g.key),
    value: g.totals.value.minor,
    color:
      shown === 'category' ? (CATEGORY_COLORS[g.key] ?? 'neutral') : (SEQUENCE[index] ?? 'neutral'),
  }));
  const rest = priced.slice(SEQUENCE.length).reduce((n, g) => n + g.totals.value.minor, 0);
  if (rest > 0)
    slices.push({ key: REST, label: m.portfolio_rest(), value: rest, color: 'neutral' });

  const views: { value: AllocationView; label: string }[] = [
    { value: 'category', label: m.portfolio_by_category() },
    { value: 'set', label: m.portfolio_by_set() },
    { value: 'language', label: m.portfolio_by_language() },
    ...(hasCards ? [{ value: 'rarity' as const, label: m.portfolio_by_rarity() }] : []),
  ];

  return (
    <Panel aria-labelledby="allocation-title" className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="allocation-title" className="type-label m-0 text-ink-muted uppercase">
          {m.portfolio_allocation()}
        </h2>
        <SegmentedControl<AllocationView>
          label={m.portfolio_allocation_by()}
          value={shown}
          onValueChange={(by) =>
            void navigate({
              search: (prev) => ({ ...prev, by: by === 'category' ? undefined : by }),
              replace: true,
            })
          }
          options={views}
          className="[&>*]:h-8 [&>*]:px-3"
        />
      </div>
      {total > 0 ? (
        <div className="flex flex-wrap items-center gap-5">
          <Donut slices={slices} />
          <ul className="m-0 flex min-w-[14rem] flex-1 list-none flex-col gap-2.5 p-0">
            {slices.map((s) => (
              <li key={s.key} className="flex flex-col gap-1">
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn('size-3 shrink-0 rounded-[4px]', SWATCH[s.color])}
                  />
                  <span className="type-ui min-w-0 flex-1 truncate">{s.label}</span>
                  <span className="type-small font-bold tabular-nums">
                    {formatShare(s.value / total)}
                  </span>
                  <span className="money type-small w-24 text-right text-ink-muted tabular-nums">
                    {formatMoney(money(s.value))}
                  </span>
                </span>
                <span aria-hidden className="ml-5.5 h-1 overflow-hidden rounded-pill bg-hover">
                  <span
                    className={cn('block h-full rounded-pill', SWATCH[s.color])}
                    style={{ width: `${(s.value / total) * 100}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="type-small m-0 text-ink-muted">{m.portfolio_allocation_none()}</p>
      )}
      {total > 0 && unpriced > 0 ? (
        <p className="type-small m-0 text-ink-muted">
          {m.portfolio_allocation_unpriced({ count: formatCount(unpriced) })}
        </p>
      ) : null}
    </Panel>
  );
}

// ── Performance (PRT-03) ────────────────────────────────────────────────────────────────────────

/** Performance (PRT-03): value, what's invested and P/L per set or per card language. */
export function PerformancePanel({
  rows,
  view,
}: {
  rows: readonly LibraryRow[];
  view: PerformanceView;
}) {
  const navigate = route.useNavigate();
  const manifest = useManifest();
  const { keyOf, labelOf } = grouping(view, manifest, rows);
  const groups = groupsOf(rows, keyOf);
  const column = view === 'set' ? m.portfolio_per_set() : m.portfolio_per_language();
  return (
    <Panel aria-labelledby="performance-title" className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="performance-title" className="type-label m-0 text-ink-muted uppercase">
          {m.portfolio_performance()}
        </h2>
        <SegmentedControl<PerformanceView>
          label={m.portfolio_performance_per()}
          value={view}
          onValueChange={(per) =>
            void navigate({
              search: (prev) => ({ ...prev, per: per === 'set' ? undefined : per }),
              replace: true,
            })
          }
          options={[
            { value: 'set', label: m.portfolio_per_set() },
            { value: 'language', label: m.portfolio_per_language() },
          ]}
          className="[&>*]:h-8 [&>*]:px-3"
        />
      </div>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="type-label text-ink-subtle">
            <th scope="col" className="py-2 pr-3 font-bold">
              {column}
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-bold">
              {m.library_col_value()}
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-bold max-sm:hidden">
              {m.library_col_cost()}
            </th>
            <th scope="col" className="py-2 text-right font-bold">
              {m.library_col_pl()}
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map(({ key, totals }) => (
            <tr key={key} className="type-small border-t border-line">
              <th scope="row" className="type-ui py-2.5 pr-3 font-normal">
                {labelOf(key)}
              </th>
              <td className="money py-2.5 pr-3 text-right font-mono tabular-nums">
                {formatMoney(totals.value)}
              </td>
              <td className="money py-2.5 pr-3 text-right font-mono text-ink-muted tabular-nums max-sm:hidden">
                {formatMoney(totals.invested)}
              </td>
              <td className="py-2.5 text-right">
                {totals.pricedCost.minor > 0 ? (
                  <PLDelta delta={totals.pl} ratio={totals.plRatio} className="justify-end" />
                ) : (
                  <span className="text-ink-subtle">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

// ── Realized (PRT-04) ───────────────────────────────────────────────────────────────────────────

/**
 * Realisiert (PRT-04): every sale and trade with what it brought in after fees, what the copies had
 * cost and the result (DATA_MODEL.md §6.4), newest first, under the total.
 */
export function RealizedPanel({ rows }: { rows: readonly LibraryRow[] }) {
  const byId = new Map(rows.map((r) => [r.holding.id, r]));
  const holdings = rows.map((r) => r.holding);
  const events = realizedEvents(holdings);
  const total = realizedTotal(holdings);
  return (
    <Panel aria-labelledby="realized-title" className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 id="realized-title" className="type-label m-0 text-ink-muted uppercase">
            {m.portfolio_realized()}
          </h2>
          <p className="type-small m-0 text-ink-muted">{m.portfolio_realized_hint()}</p>
        </div>
        {events.length ? <PLDelta delta={total} show="amount" className="type-h3" /> : null}
      </div>
      {events.length ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {events.map(({ holding: h, disposal: d, net, cost, result }) => {
            const row = byId.get(h.id);
            if (!row) return null;
            const quantity = formatCount(d.quantity);
            const what =
              d.type === 'sale'
                ? m.disposal_sale({ quantity, date: formatDate(d.date) })
                : m.disposal_trade({ quantity, date: formatDate(d.date) });
            return (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line py-2.5 first:border-t-0"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <LotLink row={row} className="type-ui min-w-0 truncate hover:text-accent-text">
                    <span lang={htmlLang(row.nameLang)}>{row.name}</span>
                    <span className="ml-2 font-mono text-[12px] text-ink-muted">
                      {[languageCode(h.language), h.grading ? gradingText(h.grading) : h.condition]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </LotLink>
                  <span className="type-small text-ink-muted">{what}</span>
                </span>
                <span className="flex flex-col items-start gap-0.5 sm:items-end sm:text-right">
                  {result ? (
                    <PLDelta delta={result} show="amount" className="type-ui" />
                  ) : (
                    <span className="type-small text-ink-subtle">
                      {net ? m.portfolio_realized_open() : m.portfolio_realized_no_proceeds()}
                    </span>
                  )}
                  <span className="money type-small text-ink-muted">
                    {[
                      net ? m.portfolio_realized_net({ amount: formatMoney(net) }) : undefined,
                      cost ? m.portfolio_realized_cost({ amount: formatMoney(cost) }) : undefined,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="type-small m-0 text-ink-muted">{m.portfolio_realized_none()}</p>
      )}
    </Panel>
  );
}
