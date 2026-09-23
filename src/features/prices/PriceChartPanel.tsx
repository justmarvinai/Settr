import { useId, useState } from 'react';
import { PLDelta } from '@/components/domain/PLDelta';
import { RangeChips } from '@/components/domain/charts/RangeChips';
import { CHART_RANGES, rangeStartDay } from '@/components/domain/charts/scale';
import {
  LineSwatch,
  MarkerSwatch,
  TimeChart,
  type ChartPoint,
  type OtherSeries,
} from '@/components/domain/charts/TimeChart';
import { Panel } from '@/components/ui/Panel';
import { useUiChoice } from '@/db';
import type { CardLanguage } from '@/domain/catalog-types';
import { dayNumber, isoFromDayNumber } from '@/domain/dates';
import { todayIso } from '@/domain/ids';
import { money } from '@/domain/money';
import type { Holding, PriceEntry, PriceType } from '@/domain/schemas';
import { toastError } from '@/features/collection';
import { languageCode, languageLabel, m } from '@/i18n';
import { formatDate, formatMoney, formatMoneyShort } from '@/i18n/format';
import { priceTypeLabel } from '@/i18n/price-labels';
import type { PricedItem } from './ItemPrices';
import { PriceHistory } from './PriceHistory';
import {
  chartPoints,
  languageLine,
  lastPerDay,
  MARKERS,
  newestFirst,
  purchaseBaseline,
} from './series';

function ToggleText({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="rounded-pill px-3 py-1.5 type-small font-bold text-accent-text transition-colors duration-(--dur-fast) hover:bg-hover aria-pressed:bg-accent-soft"
    >
      {children}
    </button>
  );
}

/**
 * Preisverlauf (PRC-03, DESIGN_SYSTEM.md §9): straight segments between real observations, every
 * observation marked by its type, the purchase price as a dashed baseline with the area tinted
 * gain or loss, other languages on demand, scrubbing, and the same data as a table. Below it every
 * entry, editable and deletable (PRC-02).
 */
export function PriceChartPanel({
  item,
  language,
  series,
  compare,
  holdings,
  seriesKey,
  freshId,
  loading,
}: {
  item: PricedItem;
  language: CardLanguage;
  /** Entries of the shown series, oldest first. */
  series: readonly PriceEntry[];
  /** The same series in other languages, where they have entries. */
  compare: readonly { language: CardLanguage; entries: readonly PriceEntry[] }[];
  holdings: readonly Holding[];
  seriesKey: string;
  freshId: string | undefined;
  loading: boolean;
}) {
  const id = useId();
  const [range, setRange] = useUiChoice('chart.range', CHART_RANGES, 'max');
  const [comparing, setComparing] = useState(false);
  const [asTable, setAsTable] = useState(false);
  const [active, setActive] = useState<number>();

  const today = todayIso();
  const to = dayNumber(today);
  const points = lastPerDay(chartPoints(series));
  const shownCompare = comparing ? compare : [];
  const others: OtherSeries[] = shownCompare.map((c) => ({
    id: c.language,
    points: lastPerDay(chartPoints(c.entries)),
    ...languageLine(c.language),
  }));
  const firstDay = Math.min(points[0]?.day ?? to, ...others.map((o) => o.points[0]?.day ?? to));
  const from = rangeStartDay(range, today, firstDay);
  const byId = new Map(series.map((e) => [e.id, e]));
  const base = purchaseBaseline(holdings, seriesKey);
  const baselineLabel = base
    ? (base.avg ? m.chart_baseline_avg : m.chart_baseline)({
        amount: formatMoney(money(base.minor)),
      })
    : undefined;

  // The readout: the scrubbed point, else the latest; the change since the range began.
  const shownIndex = active ?? points.length - 1;
  const shown = points[shownIndex];
  const startIndex = points.findLastIndex((p) => p.day <= from);
  const start = startIndex >= 0 ? points[startIndex] : points.find((p) => p.day >= from);
  const change = shown && start && shown !== start ? shown.value - start.value : undefined;
  const typeOf = (p: ChartPoint): PriceType | undefined =>
    p.id ? byId.get(p.id)?.priceType : undefined;
  const pointText = (p: ChartPoint) => {
    const type = typeOf(p);
    return m.chart_point({
      date: formatDate(isoFromDayNumber(p.day)),
      amount: formatMoney(money(p.value)),
      type: type ? priceTypeLabel(type) : '',
    });
  };

  const visibleTypes = [
    ...new Set(series.filter((e) => dayNumber(e.date) >= from).map((e) => e.priceType)),
  ];
  const carried = (points.at(-1)?.day ?? to) < to;
  const tableRows = [
    ...series.map((e) => ({ entry: e, compared: false })),
    ...shownCompare.flatMap((c) => c.entries.map((e) => ({ entry: e, compared: true }))),
  ]
    .filter((row) => dayNumber(row.entry.date) >= from)
    .toSorted((a, b) => newestFirst(a.entry, b.entry));

  return (
    <Panel aria-labelledby={`${id}-title`} className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={`${id}-title`} className="type-h3 m-0">
          {m.chart_title()}
        </h3>
        {points.length ? (
          <RangeChips
            value={range}
            onChange={(next) => {
              setActive(undefined);
              setRange(next).catch(toastError);
            }}
          />
        ) : null}
      </div>

      {loading ? (
        <div className="h-[220px]" />
      ) : !points.length ? (
        <p className="type-body m-0 rounded-[16px] border border-dashed border-line-strong p-5 text-ink-muted">
          {m.chart_empty()}
        </p>
      ) : (
        <>
          {shown ? (
            <div className="flex min-h-8 flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="money type-h2 font-mono tabular-nums">
                {formatMoney(money(shown.value))}
              </span>
              <span className="type-small text-ink-muted">
                {[
                  formatDate(isoFromDayNumber(shown.day)),
                  typeOf(shown) ? priceTypeLabel(typeOf(shown) ?? 'from') : undefined,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {change !== undefined && start ? (
                <span className="type-small inline-flex items-center gap-1.5 text-ink-muted">
                  <PLDelta
                    delta={money(change)}
                    ratio={start.value ? change / start.value : undefined}
                  />
                  {m.chart_in_range()}
                </span>
              ) : null}
            </div>
          ) : null}

          {asTable ? (
            tableRows.length ? (
              <div className="overflow-x-auto">
                <table className="type-small w-full border-collapse text-left">
                  <caption className="sr-only">
                    {m.chart_title()} · {languageLabel(language)}
                  </caption>
                  <thead className="text-ink-subtle">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-bold">
                        {m.chart_col_date()}
                      </th>
                      <th scope="col" className="py-2 pr-4 font-bold">
                        {m.chart_col_price()}
                      </th>
                      <th scope="col" className="py-2 pr-4 font-bold">
                        {m.chart_col_type()}
                      </th>
                      {comparing ? (
                        <th scope="col" className="py-2 font-bold">
                          {m.chart_col_language()}
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map(({ entry }) => (
                      <tr key={entry.id} className="border-t border-line">
                        <td className="py-2 pr-4 font-mono whitespace-nowrap">
                          {formatDate(entry.date)}
                        </td>
                        <td className="money py-2 pr-4 font-mono whitespace-nowrap tabular-nums">
                          {formatMoney(entry.price)}
                        </td>
                        <td className="py-2 pr-4">{priceTypeLabel(entry.priceType)}</td>
                        {comparing ? (
                          <td className="py-2">{languageCode(entry.language)}</td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="type-small m-0 text-ink-muted">{m.chart_range_empty()}</p>
            )
          ) : (
            <TimeChart
              from={from}
              to={to}
              points={points}
              shape="line"
              others={others}
              baseline={base?.minor}
              formatTick={(value) => formatMoneyShort(money(value))}
              formatDay={(day) => formatDate(isoFromDayNumber(day))}
              label={m.chart_scrub()}
              valueText={pointText}
              active={active}
              onActiveChange={setActive}
              freshId={freshId}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <ul
              aria-label={m.chart_legend()}
              className="type-small m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1.5 p-0 text-ink-muted"
            >
              {visibleTypes.map((type) => (
                <li key={type} className="inline-flex items-center gap-1.5">
                  <MarkerSwatch shape={MARKERS[type]} />
                  {priceTypeLabel(type)}
                </li>
              ))}
              {carried ? (
                <li className="inline-flex items-center gap-1.5">
                  <LineSwatch color="accent" dash="2 5" />
                  {m.chart_carried()}
                </li>
              ) : null}
              {baselineLabel ? (
                <li className="inline-flex items-center gap-1.5">
                  <LineSwatch color="neutral" dash="5 4" />
                  <span className="money">{baselineLabel}</span>
                </li>
              ) : null}
              {others.map((o) => (
                <li key={o.id} className="inline-flex items-center gap-1.5">
                  <LineSwatch color={o.color} dash={o.dash} />
                  {languageCode(o.id)}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-1">
              {compare.length ? (
                <ToggleText pressed={comparing} onClick={() => setComparing((v) => !v)}>
                  {m.chart_compare()}
                </ToggleText>
              ) : null}
              <ToggleText pressed={asTable} onClick={() => setAsTable((v) => !v)}>
                {asTable ? m.chart_hide_table() : m.chart_show_table()}
              </ToggleText>
            </div>
          </div>
        </>
      )}

      {series.length ? (
        <PriceHistory entries={series} what={`${item.label} · ${languageCode(language)}`} />
      ) : null}
    </Panel>
  );
}
