import { PlusIcon } from '@phosphor-icons/react';
import { Fragment, useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import { PLDelta } from '@/components/domain/PLDelta';
import { Button } from '@/components/ui/Button';
import { ActionMenu } from '@/components/ui/Menu';
import { Panel } from '@/components/ui/Panel';
import { useHoldingsOfItem, useLatestPrices, useLocations, useSettings, useTags } from '@/db';
import { remainingCost, unitCostDisplay } from '@/domain/collection';
import { todayIso } from '@/domain/ids';
import { remaining, type Disposal, type Holding, type Location } from '@/domain/schemas';
import { seriesKeyOf } from '@/domain/series';
import { valueLot, type LotValue, type ValuationOptions } from '@/domain/valuation';
import { languageCode, m } from '@/i18n';
import { disposalText, gradingText, sealedStateLabel } from '@/i18n/collection-labels';
import { formatCount, formatDate, formatMoney } from '@/i18n/format';
import { inDialog, isPlain, isTyping } from '@/lib/keys';
import { useSheets } from '@/lib/sheets';
import { locationText } from './location';
import { lotMenuActions } from './lot-menu';

/** Parts separated by " · ", skipping empty ones. */
function joined(parts: readonly ReactNode[]): ReactNode {
  const present = parts.filter((p) => p !== undefined && p !== null && p !== '');
  return present.map((part, index) => (
    // oxlint-disable-next-line react/no-array-index-key -- a fixed, ordered list of parts
    <Fragment key={index}>
      {index > 0 ? ' · ' : null}
      {part}
    </Fragment>
  ));
}

function DisposalLine({ disposal }: { disposal: Disposal }) {
  return (
    <li className="type-small text-ink-muted">
      {disposalText(disposal.type, {
        quantity: formatCount(disposal.quantity),
        date: formatDate(disposal.date),
      })}
      {disposal.proceedsTotal ? (
        <span className="money ml-1">
          {m.lot_proceeds({ amount: formatMoney(disposal.proceedsTotal) })}
        </span>
      ) : null}
    </li>
  );
}

/** `Wert 69,80 € (34,90 € pro Stück) ↗ +17,80 € (+34,2 %)`, with *eigener Wert* and *veraltet* tags. */
function ValueLine({ value }: { value: LotValue }) {
  const { unit } = value;
  if (!value.value) {
    return <span className="type-small text-ink-subtle">{m.lot_unpriced()}</span>;
  }
  return (
    <span className="type-small flex flex-wrap items-center gap-x-2 gap-y-1 text-ink">
      <span className="money font-bold">
        {value.remaining > 1 && unit
          ? m.lot_value_with_unit({
              value: formatMoney(value.value),
              unit: formatMoney(unit.price),
            })
          : m.lot_value({ value: formatMoney(value.value) })}
      </span>
      {value.pl ? <PLDelta delta={value.pl} ratio={value.plRatio} /> : null}
      {unit?.source === 'override' ? (
        <span className="type-label rounded-pill bg-accent-soft px-2 py-0.5 text-accent-text">
          {m.lot_value_own({ date: formatDate(unit.date) })}
        </span>
      ) : null}
      {value.atCost ? (
        <span className="type-label rounded-pill bg-hover px-2 py-0.5 text-ink-muted">
          {m.lot_value_at_cost()}
        </span>
      ) : null}
      {value.stale ? (
        <span className="type-label rounded-pill bg-warn-soft px-2 py-0.5 text-warn">
          {m.prices_stale()}
        </span>
      ) : null}
    </span>
  );
}

function LotRow({
  holding,
  label,
  locations,
  tagNames,
  value,
  variant,
}: {
  holding: Holding;
  label: string;
  locations: readonly Location[];
  tagNames: ReadonlyMap<string, string>;
  value: LotValue | undefined;
  /** The lot's variant, when its card comes in several (`Reverse-Holo`). */
  variant: string | undefined;
}) {
  const left = remaining(holding);
  const cost = remainingCost(holding);
  const unit = unitCostDisplay(holding);
  const sealed = holding.item.kind === 'sealed';
  const where = locationText(holding.location, locations);
  const bought = holding.acquisition.date;
  const state = sealed
    ? sealedStateLabel(holding.sealedState ?? 'sealed')
    : holding.grading
      ? gradingText(holding.grading)
      : holding.condition;

  return (
    <li className="flex items-start gap-3 border-t border-line py-3 first:border-t-0 first:pt-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="type-ui flex flex-wrap items-baseline gap-x-2 text-ink">
          <span>
            {[variant, languageCode(holding.language), state].filter(Boolean).join(' · ')}
          </span>
          <span className="font-mono">
            {left === holding.quantity
              ? m.count_times({ count: formatCount(left) })
              : m.lot_remaining({
                  remaining: formatCount(left),
                  quantity: formatCount(holding.quantity),
                })}
          </span>
          {left === 0 ? (
            <span className="type-label rounded-pill bg-hover px-2 py-0.5 text-ink-muted">
              {m.lot_closed()}
            </span>
          ) : null}
        </span>
        <span className="type-small text-ink-muted">
          {joined([
            cost ? (
              <span key="cost" className="money">
                {left > 1 && unit
                  ? m.lot_cost_with_unit({ total: formatMoney(cost), unit: formatMoney(unit) })
                  : m.lot_cost({ total: formatMoney(cost) })}
              </span>
            ) : (
              m.lot_cost_unknown()
            ),
            bought ? formatDate(bought) : undefined,
            holding.acquisition.source,
            where,
          ])}
        </span>
        {value && left > 0 ? <ValueLine value={value} /> : null}
        {holding.tags.length ? (
          <span className="flex flex-wrap gap-1.5">
            {holding.tags.map((id) => (
              <span
                key={id}
                className="type-label rounded-pill bg-accent-soft px-2 py-0.5 text-accent-text"
              >
                {tagNames.get(id) ?? id}
              </span>
            ))}
          </span>
        ) : null}
        {holding.disposals.length ? (
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {holding.disposals.map((d) => (
              <DisposalLine key={d.id} disposal={d} />
            ))}
          </ul>
        ) : null}
        {holding.note ? (
          <span className="type-small text-ink-muted italic">{holding.note}</span>
        ) : null}
      </div>
      <ActionMenu label={m.lot_actions({ what: label })} actions={lotMenuActions(holding, label)} />
    </li>
  );
}

/**
 * "In deiner Sammlung" on card and product pages (UX_SPEC.md §4.4, §4.5): every lot of the item
 * with what it cost, what it's worth now (its series' price or its *Eigener Wert*) and the P/L,
 * where it is and a menu (edit, own value, duplicate, sell, open, delete, all undoable).
 */
export function HoldingsPanel({
  itemId,
  describe,
  variantOf,
  onAdd,
}: {
  itemId: string;
  /** Short label of a lot for toasts and menus, e.g. "150/128 Pikachu-ex · DE". */
  describe: (holding: Holding) => string;
  /** A lot's variant name, when the card comes in several; nothing otherwise. */
  variantOf?: (holding: Holding) => string | undefined;
  onAdd: () => void;
}) {
  const holdings = useHoldingsOfItem(itemId);
  const latest = useLatestPrices();
  const settings = useSettings();
  const options: ValuationOptions = {
    today: todayIso(),
    staleAfterDays: settings.price.staleAfterDays,
    unpriced: settings.price.unpriced,
  };
  const locations = useLocations() ?? [];
  const tags = useTags() ?? [];
  const [showClosed, setShowClosed] = useState(false);
  const tagNames = new Map(tags.map((t) => [t.id, t.name]));
  const lots = (holdings ?? []).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  const open = lots.filter((h) => remaining(h) > 0);
  const closed = lots.length - open.length;
  const shown = showClosed ? lots : open;
  const copies = open.reduce((n, h) => n + remaining(h), 0);

  // N adds a lot of the page's card or product (UX_SPEC.md §7). It listens while capturing, so
  // it comes before the shell's N, which opens the add palette everywhere else.
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (!isPlain(event) || event.key.toLowerCase() !== 'n') return;
    if (event.defaultPrevented || isTyping(event.target) || inDialog(event.target)) return;
    if (useSheets.getState().open) return;
    event.preventDefault();
    onAdd();
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener('keydown', listener, { capture: true });
    return () => window.removeEventListener('keydown', listener, { capture: true });
  }, []);

  return (
    <Panel aria-labelledby="holdings-title" className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="holdings-title" className="type-h3 m-0">
          {m.holdings_title()}
          {copies ? (
            <span className="ml-2 type-small font-mono text-ink-muted">
              {m.count_times({ count: formatCount(copies) })}
            </span>
          ) : null}
        </h3>
        <Button variant="primary" size="sm" aria-keyshortcuts="N" onClick={onAdd}>
          <PlusIcon size={16} weight="bold" aria-hidden />
          {m.holdings_add()}
        </Button>
      </div>
      {holdings === undefined ? null : shown.length ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {shown.map((h) => (
            <LotRow
              key={h.id}
              holding={h}
              label={describe(h)}
              locations={locations}
              tagNames={tagNames}
              value={latest ? valueLot(h, latest.get(seriesKeyOf(h)), options) : undefined}
              variant={variantOf?.(h)}
            />
          ))}
        </ul>
      ) : (
        <p className="type-body m-0 text-ink-muted">{m.holdings_empty()}</p>
      )}
      {closed ? (
        <button
          type="button"
          onClick={() => setShowClosed((v) => !v)}
          className="w-fit type-small font-bold text-accent-text hover:underline"
        >
          {showClosed
            ? m.holdings_hide_closed()
            : m.holdings_show_closed({ count: formatCount(closed) })}
        </button>
      ) : null}
    </Panel>
  );
}
