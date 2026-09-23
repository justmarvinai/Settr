import { PlusIcon } from '@phosphor-icons/react';
import { Fragment, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { ActionMenu } from '@/components/ui/Menu';
import { Panel } from '@/components/ui/Panel';
import { useHoldingsOfItem, useLocations, useTags } from '@/db';
import { remainingCost, unitCostDisplay } from '@/domain/collection';
import { remaining, type Disposal, type Holding, type Location } from '@/domain/schemas';
import { languageCode, m } from '@/i18n';
import { disposalText, gradingText, sealedStateLabel } from '@/i18n/collection-labels';
import { formatCount, formatDate, formatMoney } from '@/i18n/format';
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

function LotRow({
  holding,
  label,
  locations,
  tagNames,
}: {
  holding: Holding;
  label: string;
  locations: readonly Location[];
  tagNames: ReadonlyMap<string, string>;
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
          <span>{[languageCode(holding.language), state].filter(Boolean).join(' · ')}</span>
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
 * with what it cost, where it is and a menu (edit, duplicate, sell, open, delete, all undoable).
 */
export function HoldingsPanel({
  itemId,
  describe,
  onAdd,
}: {
  itemId: string;
  /** Short label of a lot for toasts and menus, e.g. "150/128 Pikachu-ex · DE". */
  describe: (holding: Holding) => string;
  onAdd: () => void;
}) {
  const holdings = useHoldingsOfItem(itemId);
  const locations = useLocations() ?? [];
  const tags = useTags() ?? [];
  const [showClosed, setShowClosed] = useState(false);
  const tagNames = new Map(tags.map((t) => [t.id, t.name]));
  const lots = (holdings ?? []).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  const open = lots.filter((h) => remaining(h) > 0);
  const closed = lots.length - open.length;
  const shown = showClosed ? lots : open;
  const copies = open.reduce((n, h) => n + remaining(h), 0);

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
        <Button variant="primary" size="sm" onClick={onAdd}>
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
