import { ArrowRightIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { Suspense, useState } from 'react';
import { CardImage } from '@/components/domain/CardImage';
import { PLDelta } from '@/components/domain/PLDelta';
import { SetProgressRing } from '@/components/domain/SetProgressRing';
import { ProductImage } from '@/components/domain/ProductImage';
import { Donut, type DonutSlice } from '@/components/domain/charts/Donut';
import { buttonVariants } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cn } from '@/components/ui/cn';
import { useCatalogSet } from '@/catalog';
import { pickText } from '@/domain/catalog';
import type { CardLanguage } from '@/domain/catalog-types';
import { ratio as shareOf } from '@/domain/collection';
import { money } from '@/domain/money';
import { remaining } from '@/domain/schemas';
import { rankMovers, type LotValue } from '@/domain/valuation';
import { LotLink, useSetOwnership, type LibraryRow } from '@/features/collection';
import { htmlLang, languageCode, m } from '@/i18n';
import { gradingText } from '@/i18n/collection-labels';
import { formatCount, formatMoney, formatShare } from '@/i18n/format';

// ── Stale prices ───────────────────────────────────────────────────────────────────────────────

export function StaleTile({ stale, staleAfterDays }: { stale: number; staleAfterDays: number }) {
  return (
    <Panel aria-labelledby="stale-title" className="flex flex-col gap-3 p-5">
      <h2 id="stale-title" className="type-label m-0 text-ink-muted uppercase">
        {m.overview_stale_title()}
      </h2>
      {stale ? (
        <>
          <p className="m-0 flex items-baseline gap-2">
            <span className="type-display-m tabular-nums text-warn">{formatCount(stale)}</span>
          </p>
          <p className="type-small m-0 text-ink-muted">
            {m.overview_stale_count({
              n: stale,
              count: formatCount(stale),
              days: formatCount(staleAfterDays),
            })}
          </p>
          <Link
            to="/prices/session"
            search={{ start: 'stale' }}
            className={buttonVariants({ variant: 'primary', size: 'sm', className: 'w-fit' })}
          >
            {m.overview_stale_action()}
            <ArrowRightIcon size={16} weight="bold" aria-hidden />
          </Link>
        </>
      ) : (
        <p className="type-body m-0 text-ink-muted">{m.overview_stale_none()}</p>
      )}
    </Panel>
  );
}

// ── Set progress ───────────────────────────────────────────────────────────────────────────────

function ProgressRow({ setId, language }: { setId: string; language: CardLanguage }) {
  const loaded = useCatalogSet(setId);
  const { completion } = useSetOwnership(loaded, language);
  const basis = completion.basis;
  const share = shareOf(basis);
  return (
    <li>
      <Link
        to="/catalog/sets/$setId"
        params={{ setId }}
        search={{ lang: language }}
        className="group flex items-center gap-3 rounded-[14px] px-2 py-2 hover:bg-hover"
      >
        <SetProgressRing value={share} size={40} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="type-ui truncate">
            {pickText(loaded.set.name)}
            <span className="ml-2 font-mono text-ink-muted">{languageCode(language)}</span>
          </span>
          <span className="type-small text-ink-muted">
            {m.overview_progress_basis({
              owned: formatCount(basis.owned),
              total: formatCount(basis.total),
            })}
          </span>
        </span>
        <span className="type-ui font-bold tabular-nums">{formatShare(share)}</span>
      </Link>
    </li>
  );
}

export function ProgressTile({
  sets,
}: {
  /** Set chunks and languages you collect, most lots first. */
  sets: readonly { setId: string; language: CardLanguage }[];
}) {
  if (!sets.length) return null;
  return (
    <Panel aria-labelledby="progress-title" className="flex flex-col gap-2 p-5">
      <h2 id="progress-title" className="type-label m-0 text-ink-muted uppercase">
        {m.overview_progress_title()}
      </h2>
      <Suspense fallback={<div className="h-16" />}>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {sets.map((s) => (
            <ProgressRow key={`${s.setId}|${s.language}`} setId={s.setId} language={s.language} />
          ))}
        </ul>
      </Suspense>
    </Panel>
  );
}

// ── Movers ─────────────────────────────────────────────────────────────────────────────────────

function MoverList({
  title,
  values,
  rows,
  by,
}: {
  title: string;
  values: readonly LotValue[];
  rows: ReadonlyMap<string, LibraryRow>;
  by: 'abs' | 'ratio';
}) {
  if (!values.length) return null;
  return (
    <div className="flex flex-col gap-1">
      <h3 className="type-small m-0 font-bold text-ink-muted">{title}</h3>
      <ol className="m-0 flex list-none flex-col p-0">
        {values.map((v) => {
          const row = rows.get(v.holding.id);
          if (!row || !v.pl) return null;
          return (
            <li key={v.holding.id}>
              <LotLink
                row={row}
                className="flex items-center justify-between gap-3 rounded-[12px] px-2 py-1.5 hover:bg-hover"
              >
                <span className="type-ui min-w-0 truncate" lang={htmlLang(row.nameLang)}>
                  {row.name}
                  <span className="ml-2 font-mono text-[12px] text-ink-muted">
                    {[
                      languageCode(v.holding.language),
                      v.holding.grading ? gradingText(v.holding.grading) : v.holding.condition,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <PLDelta
                  delta={v.pl}
                  ratio={v.plRatio}
                  show={by === 'abs' ? 'amount' : 'ratio'}
                  className="type-small"
                />
              </LotLink>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function MoversTile({
  values,
  rows,
  count = 5,
  className,
}: {
  values: readonly LotValue[];
  rows: ReadonlyMap<string, LibraryRow>;
  count?: number;
  className?: string;
}) {
  const [by, setBy] = useState<'abs' | 'ratio'>('abs');
  const { gainers, losers } = rankMovers(values, by, count);
  return (
    <Panel aria-labelledby="movers-title" className={cn('flex flex-col gap-3 p-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="movers-title" className="type-label m-0 text-ink-muted uppercase">
          {m.overview_movers_title()}
        </h2>
        <SegmentedControl<'abs' | 'ratio'>
          label={m.overview_movers_by()}
          value={by}
          onValueChange={setBy}
          options={[
            { value: 'abs', label: m.overview_movers_abs() },
            { value: 'ratio', label: m.overview_movers_ratio() },
          ]}
          className="[&>*]:h-8 [&>*]:px-3"
        />
      </div>
      {gainers.length || losers.length ? (
        <>
          <MoverList title={m.overview_gainers()} values={gainers} rows={rows} by={by} />
          <MoverList title={m.overview_losers()} values={losers} rows={rows} by={by} />
        </>
      ) : (
        <p className="type-small m-0 text-ink-muted">{m.overview_movers_none()}</p>
      )}
    </Panel>
  );
}

// ── Allocation ─────────────────────────────────────────────────────────────────────────────────

export function AllocationTile({ rows }: { rows: readonly LibraryRow[] }) {
  let singles = 0;
  let graded = 0;
  let sealed = 0;
  for (const row of rows) {
    const value = row.value?.value?.minor ?? 0;
    if (remaining(row.holding) <= 0 || value <= 0) continue;
    if (row.holding.item.kind === 'sealed') sealed += value;
    else if (row.holding.grading) graded += value;
    else singles += value;
  }
  const total = singles + graded + sealed;
  const slices: (DonutSlice & { label: string })[] = [
    { key: 'singles', value: singles, color: 1, label: m.overview_alloc_singles() },
    { key: 'graded', value: graded, color: 7, label: m.overview_alloc_graded() },
    { key: 'sealed', value: sealed, color: 5, label: m.overview_alloc_sealed() },
  ];
  const shown = slices.filter((s) => s.value > 0);
  const swatch: Record<string, string> = {
    singles: 'bg-viz-1',
    graded: 'bg-viz-7',
    sealed: 'bg-viz-5',
  };
  return (
    <Panel aria-labelledby="allocation-title" className="flex flex-col gap-3 p-5">
      <h2 id="allocation-title" className="type-label m-0 text-ink-muted uppercase">
        {m.overview_allocation_title()}
      </h2>
      {total > 0 ? (
        <div className="flex flex-wrap items-center gap-5">
          <Donut slices={shown} />
          <ul className="m-0 flex min-w-0 flex-1 list-none flex-col gap-2 p-0">
            {shown.map((s) => (
              <li key={s.key} className="flex items-center gap-2.5">
                <span aria-hidden className={cn('size-3 shrink-0 rounded-[4px]', swatch[s.key])} />
                <span className="type-ui flex-1">{s.label}</span>
                <span className="type-small font-bold tabular-nums">
                  {formatShare(s.value / total)}
                </span>
                <span className="money type-small w-24 text-right text-ink-muted tabular-nums">
                  {formatMoney(money(s.value))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="type-small m-0 text-ink-muted">{m.overview_alloc_none()}</p>
      )}
    </Panel>
  );
}

// ── Recently added ─────────────────────────────────────────────────────────────────────────────

export function RecentTile({ rows }: { rows: readonly LibraryRow[] }) {
  const recent = rows
    .toSorted((a, b) => b.holding.createdAt.localeCompare(a.holding.createdAt))
    .slice(0, 10);
  if (!recent.length) return null;
  return (
    <Panel aria-labelledby="recent-title" className="flex min-w-0 flex-col gap-3 p-5">
      <h2 id="recent-title" className="type-label m-0 text-ink-muted uppercase">
        {m.overview_recent_title()}
      </h2>
      <ul className="-mx-1 m-0 flex list-none gap-3 overflow-x-auto p-1 pb-2">
        {recent.map((row) => (
          <li key={row.holding.id} className="w-24 shrink-0">
            <LotLink row={row} className="flex flex-col gap-1.5 rounded-[12px]">
              {row.holding.item.kind === 'card' ? (
                <CardImage image={row.image} size="small" alt="" />
              ) : (
                <ProductImage
                  image={row.image}
                  type={row.productType ?? 'other'}
                  size="small"
                  alt=""
                  className="rounded-[10px]"
                />
              )}
              <span className="type-small truncate" lang={htmlLang(row.nameLang)}>
                {row.name}
              </span>
              <span className="money text-[12px] leading-4 text-ink-muted tabular-nums">
                {row.value?.value ? formatMoney(row.value.value) : m.lot_unpriced()}
              </span>
            </LotLink>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ── Unpriced notice ────────────────────────────────────────────────────────────────────────────

export function UnpricedNotice({
  count,
  kind,
}: {
  count: number;
  /** Which list shows them: cards when any card lacks a price. */
  kind: 'card' | 'sealed';
}) {
  if (!count) return null;
  return (
    <p className="type-small m-0 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-ink-muted">
      <WarningCircleIcon size={16} aria-hidden className="shrink-0 text-warn" />
      {m.overview_unpriced({ n: count, count: formatCount(count) })}
      <Link
        to={kind === 'card' ? '/collection/cards' : '/collection/sealed'}
        search={{ priced: 'no' }}
        className="font-bold text-accent-text hover:underline"
      >
        {m.overview_unpriced_action()}
      </Link>
    </p>
  );
}
