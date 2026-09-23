import { ArrowRightIcon, PlayIcon } from '@phosphor-icons/react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Suspense, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { clearPriceSession, db, useAllPrices, usePriceSession } from '@/db';
import {
  inScope,
  SESSION_ORDERS,
  type SeriesState,
  type SessionOrder,
  type SessionScope,
} from '@/domain/valuation';
import { toastError } from '@/features/collection';
import { htmlLang, languageCode, m } from '@/i18n';
import { formatCount, formatDate, formatMoney, formatRelative } from '@/i18n/format';
import { priceTypeLabel } from '@/i18n/price-labels';
import { newestFirst } from './series';
import { useSessionData, type SessionData } from './session-data';

export const SCOPE_LABELS: Record<SessionScope, () => string> = {
  stale: m.session_scope_stale,
  unpriced: m.session_scope_unpriced,
  all: m.session_scope_all,
  selection: m.session_scope_selection,
};

const ORDER_LABELS: Record<SessionOrder, () => string> = {
  value: m.session_order_value,
  oldest: m.session_order_oldest,
  set: m.session_order_set,
};

function Count({ label, value, tone }: { label: string; value: number; tone?: 'warn' }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="type-label text-ink-muted uppercase">{label}</dt>
      <dd
        className={`type-display-m m-0 tabular-nums ${tone === 'warn' && value ? 'text-warn' : ''}`}
      >
        {formatCount(value)}
      </dd>
    </div>
  );
}

function StartPanel({ data }: { data: SessionData }) {
  const navigate = useNavigate();
  const counts: Record<Exclude<SessionScope, 'selection'>, number> = {
    stale: data.states.filter((s) => inScope(s, 'stale')).length,
    unpriced: data.states.filter((s) => inScope(s, 'unpriced')).length,
    all: data.states.length,
  };
  const first = (['stale', 'unpriced', 'all'] as const).find((s) => counts[s] > 0) ?? 'all';
  const [scope, setScope] = useState<Exclude<SessionScope, 'selection'>>(first);
  const [order, setOrder] = useState<SessionOrder>('value');
  return (
    <Panel aria-labelledby="start-title" className="flex flex-col gap-4 p-5">
      <h2 id="start-title" className="type-h3 m-0">
        {m.prices_hub_scope()}
      </h2>
      <SegmentedControl<Exclude<SessionScope, 'selection'>>
        label={m.prices_hub_scope()}
        variant="chips"
        value={scope}
        onValueChange={setScope}
        options={(['stale', 'unpriced', 'all'] as const).map((s) => ({
          value: s,
          label: `${SCOPE_LABELS[s]()} · ${formatCount(counts[s])}`,
        }))}
      />
      <label className="flex flex-wrap items-center gap-3 type-small text-ink-muted">
        {m.session_order()}
        <SegmentedControl<SessionOrder>
          label={m.session_order()}
          value={order}
          onValueChange={setOrder}
          options={SESSION_ORDERS.map((o) => ({ value: o, label: ORDER_LABELS[o]() }))}
          className="[&>*]:h-8 [&>*]:px-3"
        />
      </label>
      <Button
        variant="primary"
        size="lg"
        disabled={!counts[scope]}
        className="w-fit"
        onClick={() => void navigate({ to: '/prices/session', search: { start: scope, order } })}
      >
        <PlayIcon size={18} weight="fill" aria-hidden />
        {m.prices_hub_start()}
      </Button>
    </Panel>
  );
}

function ResumePanel() {
  const session = usePriceSession()?.value;
  if (!session || session.position >= session.queue.length) return null;
  return (
    <Panel
      aria-labelledby="resume-title"
      className="flex flex-wrap items-center justify-between gap-3 p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="resume-title" className="type-h3 m-0">
          {m.prices_hub_resume()}
        </h2>
        <span className="type-small text-ink-muted">
          {m.prices_hub_resume_progress({
            scope: SCOPE_LABELS[session.scope](),
            index: formatCount(session.position + 1),
            total: formatCount(session.queue.length),
          })}
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => void clearPriceSession(db).catch(toastError)}>
          {m.prices_hub_discard()}
        </Button>
        <Link to="/prices/session" className={buttonVariants({ variant: 'primary' })}>
          {m.prices_hub_resume()}
          <ArrowRightIcon size={18} weight="bold" aria-hidden />
        </Link>
      </div>
    </Panel>
  );
}

function StaleList({ data }: { data: SessionData }) {
  const stale = data.states
    .filter((s) => s.stale)
    .toSorted((a, b) => b.value - a.value)
    .slice(0, 8);
  return (
    <Panel aria-labelledby="stale-list-title" className="flex flex-col gap-2 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="stale-list-title" className="type-h3 m-0">
          {m.prices_hub_stale_list()}
        </h2>
        {stale.length ? (
          <Link
            to="/collection/cards"
            search={{ stale: true }}
            className="type-small font-bold text-accent-text hover:underline"
          >
            {m.prices_hub_show_stale()}
          </Link>
        ) : null}
      </div>
      {stale.length ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {stale.map((s) => (
            <SeriesLine key={s.seriesKey} state={s} data={data} />
          ))}
        </ul>
      ) : (
        <p className="type-body m-0 text-ink-muted">{m.prices_hub_all_current()}</p>
      )}
    </Panel>
  );
}

function SeriesLine({ state, data }: { state: SeriesState; data: SessionData }) {
  const row = data.rowOf(state);
  const lot = state.lots[0];
  if (!row || !lot) return null;
  const name = (
    <span className="type-ui truncate" lang={htmlLang(row.nameLang)}>
      {row.name}
      <span className="ml-2 font-mono text-[12px] text-ink-muted">
        {languageCode(lot.language)}
      </span>
    </span>
  );
  return (
    <li className="flex items-center justify-between gap-3 border-t border-line py-2 first:border-t-0">
      {lot.item.kind === 'card' && row.pageSetId ? (
        <Link
          to="/catalog/sets/$setId/cards/$cardId"
          params={{ setId: row.pageSetId, cardId: lot.item.id }}
          search={{ lang: lot.language }}
          className="min-w-0 hover:text-accent-text"
        >
          {name}
        </Link>
      ) : (
        <span className="min-w-0">{name}</span>
      )}
      <span className="type-small shrink-0 text-right text-ink-muted">
        {state.latest ? (
          <>
            <span className="money font-mono">{formatMoney(state.latest.price)}</span>
            <span className="ml-2 font-bold text-warn">{formatRelative(state.latest.date)}</span>
          </>
        ) : null}
      </span>
    </li>
  );
}

function RecentEntries() {
  const prices = useAllPrices();
  if (!prices) return null;
  const recent = prices.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  return (
    <Panel aria-labelledby="recent-prices-title" className="flex flex-col gap-2 p-5">
      <h2 id="recent-prices-title" className="type-h3 m-0">
        {m.prices_hub_recent()}
      </h2>
      {recent.length ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {recent.toSorted(newestFirst).map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 border-t border-line py-2 first:border-t-0"
            >
              <span className="type-ui min-w-0 truncate">
                {e.snapshot.name}
                <span className="ml-2 font-mono text-[12px] text-ink-muted">
                  {languageCode(e.language)}
                </span>
              </span>
              <span className="type-small shrink-0 text-right text-ink-muted">
                <span className="money font-mono text-ink">{formatMoney(e.price)}</span>
                <span className="ml-2">
                  {formatDate(e.date)} · {priceTypeLabel(e.priceType)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="type-body m-0 text-ink-muted">{m.prices_hub_no_entries()}</p>
      )}
    </Panel>
  );
}

function Hub() {
  const data = useSessionData();
  if (!data) return <div aria-busy="true" className="min-h-[50vh]" />;
  if (!data.states.length) {
    return (
      <Panel className="p-6">
        <p className="type-body m-0 max-w-[60ch] text-ink-muted">{m.prices_hub_empty()}</p>
      </Panel>
    );
  }
  const stale = data.states.filter((s) => s.stale).length;
  const unpriced = data.states.filter((s) => !s.latest).length;
  return (
    <div className="flex flex-col gap-4">
      <dl className="tile m-0 grid grid-cols-3 gap-4 p-5">
        <Count label={m.prices_hub_stale()} value={stale} tone="warn" />
        <Count label={m.prices_hub_unpriced()} value={unpriced} />
        <Count label={m.prices_hub_current()} value={data.states.length - stale - unpriced} />
      </dl>
      <ResumePanel />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          <StartPanel data={data} />
          <RecentEntries />
        </div>
        <StaleList data={data} />
      </div>
    </div>
  );
}

/**
 * Preise (PRC-05): how current your prices are, a start (or resume) for the price session
 * (PRC-04), the most valuable stale prices and the latest entries.
 */
export function PricesPage() {
  return (
    <Suspense fallback={<div aria-busy="true" className="min-h-[50vh]" />}>
      <Hub />
    </Suspense>
  );
}
