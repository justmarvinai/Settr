import { ArrowCounterClockwiseIcon, CheckIcon } from '@phosphor-icons/react';
import { useId, useState } from 'react';
import type { LoadedSet } from '@/catalog';
import { CardImage } from '@/components/domain/CardImage';
import { Input } from '@/components/ui/Input';
import { cn } from '@/components/ui/cn';
import { createHolding, db, deleteHolding, listHoldingsAt, type NewHolding } from '@/db';
import {
  findCardsByNumber,
  nextFreeSlot,
  occupiedSlots,
  parseQuickAdd,
  pickVariant,
  type QuickAddCommand,
  type VariantHint,
} from '@/domain/collection';
import type { CardSection, CatalogCard } from '@/domain/catalog';
import type { CardLanguage, Condition } from '@/domain/catalog-types';
import { money } from '@/domain/money';
import type { Holding, Location } from '@/domain/schemas';
import { cardInfo, lotLabel, snapshotOf, toastError } from '@/features/collection';
import { languageLabel, m, rarityLabel } from '@/i18n';
import { formatMoney } from '@/i18n/format';
import { parseMoneyInput } from '@/i18n/money-input';

/** What every card added in a quick-entry session gets (COL-06 "sticky defaults"). */
export interface QuickDefaults {
  language: CardLanguage;
  condition: Condition;
  section: CardSection | '';
  source: string;
  date: string;
  locationId: string;
}

const VARIANT_NAMES: Record<VariantHint, () => string> = {
  reverse: m.variant_hint_reverse,
  holo: m.variant_hint_holo,
  normal: m.variant_hint_normal,
};

type Resolution =
  | { ok: true; card: CatalogCard; variant: string; command: QuickAddCommand; priceMinor?: number }
  | { ok: false; message: string };

/** Parses and resolves what was typed against the set (preview and submit use the same). */
function resolve(
  text: string,
  loaded: LoadedSet,
  defaults: QuickDefaults,
  allowPrice: boolean,
): Resolution | undefined {
  if (!text.trim()) return undefined;
  const parsed = parseQuickAdd(text);
  if (!parsed.ok) {
    if (parsed.error === 'quantity') return { ok: false, message: m.quick_error_quantity() };
    if (parsed.error === 'unknown' && parsed.token) {
      return { ok: false, message: m.quick_error_token({ token: parsed.token }) };
    }
    return undefined;
  }
  const { command } = parsed;
  const card = findCardsByNumber(loaded.cards, command.number, defaults.section || undefined)[0];
  if (!card) return { ok: false, message: m.quick_error_unknown({ number: command.number }) };
  if (!card.languages.includes(defaults.language)) {
    return {
      ok: false,
      message: m.quick_error_language({ language: languageLabel(defaults.language) }),
    };
  }
  const variant = pickVariant(card, command.variant);
  if (!variant) {
    return {
      ok: false,
      message: m.quick_error_variant({
        variant: command.variant ? VARIANT_NAMES[command.variant]() : '',
      }),
    };
  }
  if (command.priceText !== undefined) {
    if (!allowPrice)
      return { ok: false, message: m.quick_error_token({ token: command.priceText }) };
    const price = parseMoneyInput(command.priceText);
    if (!price.ok) return { ok: false, message: m.quick_error_price({ price: command.priceText }) };
    return { ok: true, card, variant, command, priceMinor: price.minor };
  }
  return { ok: true, card, variant, command };
}

interface Entry {
  id: string;
  label: string;
  undone: boolean;
}

/**
 * Rapid entry by card number (COL-06, UX_SPEC.md §4.8): the preview shows what Enter will add;
 * each added lot lands in the running list with its own undo. With a binder chosen, every card
 * goes into the binder's next free pocket.
 */
export function QuickEntry({
  loaded,
  defaults,
  locations,
  acquisition,
  allowPrice = true,
  onAdded,
}: {
  loaded: LoadedSet;
  defaults: QuickDefaults;
  locations: readonly Location[];
  /** Overrides for every lot, e.g. `{ type: 'pull', fromHoldingId }` when logging pulls. */
  acquisition?: Partial<Holding['acquisition']>;
  allowPrice?: boolean;
  onAdded?: (holding: Holding) => void;
}) {
  const id = useId();
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const resolution = resolve(text, loaded, defaults, allowPrice);

  const add = async () => {
    if (!resolution?.ok || busy) return;
    setBusy(true);
    try {
      const { card, variant, command, priceMinor } = resolution;
      const info = cardInfo(card, loaded);
      const input: NewHolding = {
        item: info.ref,
        snapshot: snapshotOf(info, defaults.language),
        language: defaults.language,
        variant,
        condition: defaults.condition,
        quantity: command.quantity,
        acquisition: { type: 'purchase', ...acquisition },
        tags: [],
      };
      if (info.setId) input.setId = info.setId;
      if (info.print) input.print = info.print;
      if (defaults.date) input.acquisition.date = defaults.date;
      if (defaults.source.trim()) input.acquisition.source = defaults.source.trim();
      if (priceMinor !== undefined)
        input.acquisition.priceTotal = money(priceMinor * command.quantity);
      const location = locations.find((l) => l.id === defaults.locationId);
      if (location) {
        input.location = { id: location.id };
        if (location.kind === 'binder' && location.layout) {
          const taken = occupiedSlots(await listHoldingsAt(db, location.id), location.id);
          const pocket = nextFreeSlot(taken, location.layout, location.pages);
          if (pocket) input.location = { id: location.id, page: pocket.page, slot: pocket.slot };
        }
      }
      const holding = await createHolding(db, input);
      const label = lotLabel(info, {
        language: defaults.language,
        condition: defaults.condition,
        quantity: command.quantity,
      });
      setEntries((list) => [{ id: holding.id, label, undone: false }, ...list].slice(0, 50));
      setText('');
      onAdded?.(holding);
    } catch (error) {
      toastError(error);
    } finally {
      setBusy(false);
    }
  };

  const undo = async (entry: Entry) => {
    try {
      await deleteHolding(db, entry.id);
      setEntries((list) => list.map((e) => (e.id === entry.id ? { ...e, undone: true } : e)));
    } catch (error) {
      toastError(error);
    }
  };

  const preview = resolution?.ok ? resolution : undefined;
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-4">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor={`${id}-number`} className="type-ui text-ink">
          {m.quick_input_label()}
        </label>
        <Input
          id={`${id}-number`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={m.quick_input_placeholder()}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={hintId}
          aria-invalid={resolution && !resolution.ok ? true : undefined}
          data-initial-focus=""
          className="h-14 font-mono text-[18px]"
        />
        <p id={hintId} className="type-small m-0 text-ink-muted" aria-live="polite">
          {resolution && !resolution.ok ? (
            <span className="text-loss">{resolution.message}</span>
          ) : preview ? (
            m.quick_preview({
              what: lotLabel(cardInfo(preview.card, loaded), {
                language: defaults.language,
                condition: defaults.condition,
                quantity: preview.command.quantity,
              }),
            })
          ) : (
            m.quick_hint()
          )}
        </p>
      </form>

      {preview ? (
        <div className="tile flex items-center gap-3 p-3">
          <CardImage
            image={preview.card.images[defaults.language]}
            size="small"
            alt=""
            className="w-12 shrink-0"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="type-ui truncate text-ink">
              {cardInfo(preview.card, loaded).name(defaults.language).text}
            </span>
            <span className="type-small text-ink-muted">
              {[
                preview.card.printedNumber || preview.card.localId,
                preview.card.rarity ? rarityLabel(preview.card.rarity) : undefined,
                preview.priceMinor !== undefined
                  ? m.quick_price_each({ price: formatMoney(money(preview.priceMinor)) })
                  : undefined,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        </div>
      ) : null}

      <section aria-labelledby={`${id}-list`} className="flex flex-col gap-2">
        <h3 id={`${id}-list`} className="type-label m-0 text-ink-muted">
          {m.quick_added_list()}
        </h3>
        {entries.length ? (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-[12px] px-3',
                  entry.undone ? 'text-ink-subtle line-through' : 'bg-hover text-ink',
                )}
              >
                <CheckIcon size={16} weight="bold" aria-hidden className="shrink-0 text-gain" />
                <span className="type-small min-w-0 flex-1 truncate">{entry.label}</span>
                {entry.undone ? null : (
                  <button
                    type="button"
                    onClick={() => void undo(entry)}
                    aria-label={m.quick_undo_entry({ what: entry.label })}
                    title={m.toast_undo()}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-muted hover:bg-hover-strong hover:text-ink"
                  >
                    <ArrowCounterClockwiseIcon size={16} weight="bold" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-small m-0 text-ink-muted">{m.quick_empty_list()}</p>
        )}
      </section>
    </div>
  );
}
