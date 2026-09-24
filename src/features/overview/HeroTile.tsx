import { useState } from 'react';
import { PLDelta } from '@/components/domain/PLDelta';
import { RangeChips } from '@/components/domain/charts/RangeChips';
import { CHART_RANGES, rangeStartDay } from '@/components/domain/charts/scale';
import { LineSwatch, TimeChart, type OtherSeries } from '@/components/domain/charts/TimeChart';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useUiChoice } from '@/db';
import { dayNumber, isoFromDayNumber } from '@/domain/dates';
import { money } from '@/domain/money';
import type { Holding, PriceEntry } from '@/domain/schemas';
import {
  acquiredOn,
  portfolioSeries,
  type PortfolioPoint,
  type PortfolioTotals,
} from '@/domain/valuation';
import { toastError } from '@/features/collection';
import { m } from '@/i18n';
import { formatDate, formatMoney, formatMoneyShort } from '@/i18n/format';
import { useCountUp } from '@/lib/useCountUp';

type Mode = 'value' | 'pl';
const MODES: readonly Mode[] = ['value', 'pl'];

const plOf = (p: PortfolioPoint) => p.pricedValue - p.pricedCost;

/** Entries grouped by series, for the time series sweep. */
function bySeries(entries: readonly PriceEntry[]): Map<string, PriceEntry[]> {
  const map = new Map<string, PriceEntry[]>();
  for (const e of entries) {
    const list = map.get(e.seriesKey);
    if (list) list.push(e);
    else map.set(e.seriesKey, [e]);
  }
  return map;
}

/**
 * The hero of Übersicht (PRT-01, UX_SPEC.md §4.1): Gesamtwert with P/L (sign, arrow, color) and
 * what's invested, over a step chart of value or P/L with a dashed *Investiert* line. Scrubbing
 * shows any day's numbers and the change since the range began (DESIGN_SYSTEM.md §9).
 */
export function HeroTile({
  holdings,
  prices,
  totals,
  today,
  unpriced,
  title = m.overview_value(),
  view = 'overview',
  className,
}: {
  holdings: readonly Holding[];
  prices: readonly PriceEntry[];
  totals: PortfolioTotals;
  today: string;
  unpriced: 'exclude' | 'cost';
  /** What the numbers cover: Gesamtwert, or e.g. the Portfolio page's filtered part. */
  title?: string;
  /** The page it's on: the number counts up the first time each page shows it. */
  view?: 'overview' | 'portfolio';
  className?: string;
}) {
  const [range, setRange] = useUiChoice('overview.range', CHART_RANGES, 'max');
  const [mode, setMode] = useUiChoice('overview.mode', MODES, 'value');
  const [active, setActive] = useState<number>();
  const odometer = useCountUp(view, totals.value.minor);

  const to = dayNumber(today);
  const firstDay = holdings.reduce(
    (min, h) => Math.min(min, dayNumber(acquiredOn(h))),
    Number.POSITIVE_INFINITY,
  );
  const from = rangeStartDay(range, today, Number.isFinite(firstDay) ? firstDay : undefined);
  const series = portfolioSeries(holdings, bySeries(prices), {
    today,
    from: isoFromDayNumber(from),
    unpriced,
  });
  const points = series.map((p) => ({
    day: dayNumber(p.date),
    value: mode === 'value' ? p.value : plOf(p),
  }));
  const others: OtherSeries[] =
    mode === 'value'
      ? [
          {
            id: 'invested',
            color: 'neutral',
            dash: '5 4',
            points: series.map((p) => ({ day: dayNumber(p.date), value: p.invested })),
          },
        ]
      : [];
  const hasValue = series.some((p) => p.value > 0 || p.invested > 0);

  const point = active === undefined ? undefined : series[active];
  const first = series[0];
  const shown = point ?? series.at(-1);
  const change =
    first && shown
      ? mode === 'value'
        ? shown.value - first.value
        : plOf(shown) - plOf(first)
      : undefined;
  const changeBase = first?.value ?? 0;

  const value = point ? money(point.value) : totals.value;
  const pl = point ? money(plOf(point)) : totals.pl;
  const plRatio = point
    ? point.pricedCost > 0
      ? plOf(point) / point.pricedCost
      : undefined
    : totals.plRatio;
  const invested = point ? money(point.invested) : totals.invested;

  return (
    <Panel aria-labelledby="hero-title" className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="hero-title" className="type-label m-0 text-ink-muted uppercase">
            {title}
            <span className="ml-2 normal-case">
              {point ? m.overview_on({ date: formatDate(point.date) }) : m.overview_today()}
            </span>
          </h2>
          <span className="money type-display-m tabular-nums">
            {point || !odometer.counting ? (
              formatMoney(value)
            ) : (
              <>
                <span aria-hidden>{formatMoney(money(odometer.value, value.currency))}</span>
                <span className="sr-only">{formatMoney(value)}</span>
              </>
            )}
          </span>
          <span className="type-small flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-muted">
            <PLDelta delta={pl} ratio={plRatio} className="type-ui" />
            <span className="money">{m.overview_invested({ amount: formatMoney(invested) })}</span>
            {!point && totals.realized.minor !== 0 ? (
              <span className="money">
                {m.overview_realized({ amount: formatMoney(totals.realized) })}
              </span>
            ) : null}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<Mode>
            label={m.overview_mode()}
            value={mode}
            onValueChange={(next) => {
              setActive(undefined);
              setMode(next).catch(toastError);
            }}
            options={[
              { value: 'value', label: m.overview_mode_value() },
              { value: 'pl', label: m.overview_mode_pl() },
            ]}
            className="[&>*]:h-8 [&>*]:px-3"
          />
          <RangeChips
            value={range}
            onChange={(next) => {
              setActive(undefined);
              setRange(next).catch(toastError);
            }}
          />
        </div>
      </div>

      {hasValue ? (
        <>
          <TimeChart
            from={from}
            to={to}
            points={points}
            shape="step"
            others={others}
            baseline={mode === 'pl' ? 0 : undefined}
            height={240}
            formatTick={(v) => formatMoneyShort(money(v))}
            formatDay={(day) => formatDate(isoFromDayNumber(day))}
            label={m.overview_chart_label()}
            valueText={(p) =>
              m.overview_chart_point({
                date: formatDate(isoFromDayNumber(p.day)),
                value: formatMoney(money(p.value)),
              })
            }
            active={active}
            onActiveChange={setActive}
            className="mt-4"
          />
          <div className="type-small mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-ink-muted">
            <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
              <li className="inline-flex items-center gap-1.5">
                <LineSwatch color="accent" />
                {mode === 'value' ? m.overview_legend_value() : m.overview_legend_pl()}
              </li>
              {mode === 'value' ? (
                <li className="inline-flex items-center gap-1.5">
                  <LineSwatch color="neutral" dash="5 4" />
                  {m.overview_legend_invested()}
                </li>
              ) : null}
            </ul>
            {change !== undefined ? (
              <span className="inline-flex items-center gap-1.5">
                <PLDelta
                  delta={money(change)}
                  ratio={changeBase > 0 ? change / changeBase : undefined}
                  show={mode === 'value' && changeBase > 0 ? 'both' : 'amount'}
                />
                {m.chart_in_range()}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <p className="type-body m-0 mt-4 rounded-[16px] border border-dashed border-line-strong p-5 text-ink-muted">
          {m.overview_chart_empty()}
        </p>
      )}
    </Panel>
  );
}
