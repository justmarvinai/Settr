import { CurrencyEurIcon, PlusIcon } from '@phosphor-icons/react';
import type { LoadedSet } from '@/catalog';
import { cn } from '@/components/ui/cn';
import {
  createHolding,
  db,
  deleteHolding,
  useHoldingsInSets,
  useSettings,
  type NewHolding,
} from '@/db';
import {
  COMPLETION_METRICS,
  ownedByCard,
  ratio,
  setCompletion,
  type CompletionMetric,
  type OwnedCard,
  type SetCompletion,
} from '@/domain/collection';
import type { CatalogCard } from '@/domain/catalog';
import type { CardLanguage } from '@/domain/catalog-types';
import type { Holding } from '@/domain/schemas';
import { m } from '@/i18n';
import { formatCount, formatShare } from '@/i18n/format';
import { openPrice } from './actions';
import { cardInfo, lotLabel, snapshotOf } from './item';
import { toastError, toastWithUndo } from './toasts';

export interface SetOwnership {
  /** Undefined while the lots load. */
  holdings: Holding[] | undefined;
  /** Copies per card in the language (or any language). */
  owned: Map<string, OwnedCard>;
  completion: SetCompletion;
  /** Whether you collect this set at all (any open lot in any language). */
  collecting: boolean;
}

/** Lots, per-card ownership and completion of a set chunk (COL-07, DATA_MODEL.md §6.6). */
export function useSetOwnership(
  loaded: LoadedSet,
  language: CardLanguage | undefined,
): SetOwnership {
  const setIds = [...loaded.sets.keys()];
  const holdings = useHoldingsInSets(setIds);
  const lots = holdings ?? [];
  return {
    holdings,
    owned: ownedByCard(lots, language),
    completion: setCompletion(loaded.cards, lots, {
      language,
      variantsLegend: loaded.variantsLegend,
    }),
    collecting: ownedByCard(lots).size > 0,
  };
}

/** One copy with defaults: the view's language, the default condition, no price (R2.1). */
export function quickAddInput(
  card: CatalogCard,
  loaded: LoadedSet,
  language: CardLanguage,
  condition: Holding['condition'],
  variant?: string,
): NewHolding {
  const info = cardInfo(card, loaded);
  const input: NewHolding = {
    item: info.ref,
    snapshot: snapshotOf(info, language),
    language,
    quantity: 1,
    acquisition: { type: 'purchase' },
    tags: [],
  };
  if (info.setId) input.setId = info.setId;
  if (info.print) input.print = info.print;
  const chosen = variant ?? card.variants[0]?.id;
  if (chosen) input.variant = chosen;
  if (condition) input.condition = condition;
  return input;
}

/** Adds one copy with defaults and offers undo: ＋ on a tile, or + on a focused tile (US-01). */
export async function quickAdd(
  card: CatalogCard,
  loaded: LoadedSet,
  language: CardLanguage,
  condition: Holding['condition'],
): Promise<void> {
  try {
    const holding = await createHolding(db, quickAddInput(card, loaded, language, condition));
    toastWithUndo(
      m.toast_added({
        what: lotLabel(cardInfo(card, loaded), { language, condition, quantity: 1 }),
      }),
      () => deleteHolding(db, holding.id),
    );
  } catch (error) {
    toastError(error);
  }
}

/** ＋ on a set tile: adds one copy right away and offers undo (UX_SPEC.md §4.3, US-01). */
export function QuickAddButton({
  card,
  loaded,
  language,
  name,
  className,
}: {
  card: CatalogCard;
  loaded: LoadedSet;
  language: CardLanguage;
  /** The tile's name, for the button's accessible name. */
  name: string;
  className?: string;
}) {
  const settings = useSettings();
  const label = m.collection_quick_add({ name });
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => void quickAdd(card, loaded, language, settings.defaultCondition)}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-pill bg-accent text-accent-contrast shadow-[0_6px_16px_-6px_oklch(0_0_0/0.5)] transition-[opacity,transform] duration-(--dur-fast) hover:scale-105 focus-visible:opacity-100',
        className,
      )}
    >
      <PlusIcon size={18} weight="bold" aria-hidden />
    </button>
  );
}

/** € on a set tile: the price sheet for the card in the view's language (UX_SPEC.md §4.3, §4.9). */
export function QuickPriceButton({
  card,
  setId,
  language,
  name,
  className,
}: {
  card: Pick<CatalogCard, 'id'>;
  setId: string;
  language: CardLanguage;
  /** The tile's name, for the button's accessible name. */
  name: string;
  className?: string;
}) {
  const label = m.collection_quick_price({ name });
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => openPrice({ kind: 'card', id: card.id }, setId, language)}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-pill bg-surface-1 text-ink shadow-[0_0_0_1px_var(--border),0_6px_16px_-6px_oklch(0_0_0/0.5)] transition-[opacity,transform] duration-(--dur-fast) hover:scale-105 hover:text-accent-text focus-visible:opacity-100',
        className,
      )}
    >
      <CurrencyEurIcon size={18} weight="bold" aria-hidden />
    </button>
  );
}

const METRIC_LABEL: Record<CompletionMetric, () => string> = {
  basis: m.completion_basis,
  komplett: m.completion_komplett,
  master: m.completion_master,
};

/** Basis big, Komplett and Master beside it (UX_SPEC.md §4.3 header, Q5.5). */
export function CompletionSummary({
  completion,
  scope,
}: {
  completion: SetCompletion;
  /** The language the numbers count ("Deutsch") or "alle Sprachen". */
  scope: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="type-label text-ink-muted">{m.completion_label({ scope })}</span>
      <dl className="m-0 flex flex-wrap items-end gap-x-8 gap-y-3">
        {COMPLETION_METRICS.map((metric) => {
          const progress = completion[metric];
          const share = ratio(progress);
          return (
            <div key={metric} className="flex min-w-32 flex-col gap-1.5">
              <dt className="type-ui text-ink-muted">{METRIC_LABEL[metric]()}</dt>
              <dd className="m-0 flex flex-col gap-1.5">
                <span className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      'tabular-nums',
                      metric === 'basis' ? 'type-display-m' : 'type-h2',
                    )}
                  >
                    {formatShare(share)}
                  </span>
                  <span className="type-small font-mono text-ink-muted">
                    {m.completion_fraction({
                      owned: formatCount(progress.owned),
                      total: formatCount(progress.total),
                    })}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="block h-1.5 overflow-hidden rounded-pill bg-hover-strong"
                >
                  <span
                    className="block h-full rounded-pill bg-accent"
                    style={{ width: `${Math.round(share * 1000) / 10}%` }}
                  />
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
