import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormRow, MoneyInput, Textarea } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { ActionMenu } from '@/components/ui/Menu';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { db, deletePrice, restorePrices, updatePrice, useSettings } from '@/db';
import { todayIso } from '@/domain/ids';
import { money } from '@/domain/money';
import { PRICE_TYPES, type PriceEntry, type PriceType } from '@/domain/schemas';
import { toastError, toastWithUndo } from '@/features/collection';
import { m } from '@/i18n';
import { formatCount, formatDate, formatMoney } from '@/i18n/format';
import { formatAmountInput, parseMoneyInput } from '@/i18n/money-input';
import { entryTypeLabel, priceTypeLabel } from '@/i18n/price-labels';
import { contextOf, newestFirst, priceTypeOf, sourceOf } from './series';

const COLLAPSED = 5;

function remove(entry: PriceEntry) {
  deletePrice(db, entry.id).then(
    (deleted) =>
      deleted &&
      toastWithUndo(m.prices_deleted({ date: formatDate(deleted.date) }), () =>
        restorePrices(db, [deleted]),
      ),
    toastError,
  );
}

/** Every entry of the shown series, newest first, with Bearbeiten and Löschen (PRC-02). */
export function PriceHistory({ entries, what }: { entries: readonly PriceEntry[]; what: string }) {
  const id = useId();
  const [all, setAll] = useState(false);
  const [editing, setEditing] = useState<PriceEntry>();
  const sorted = entries.toSorted(newestFirst);
  const shown = all ? sorted : sorted.slice(0, COLLAPSED);

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-1 border-t border-line pt-4"
    >
      <h4 id={`${id}-title`} className="type-label m-0 text-ink-muted uppercase">
        {m.history_title()}
        <span className="ml-2 font-mono">{formatCount(entries.length)}</span>
      </h4>
      <ul className="m-0 flex list-none flex-col p-0">
        {shown.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center gap-3 border-t border-line py-1.5 first:border-t-0"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="type-small font-mono text-ink-muted tabular-nums">
                {formatDate(entry.date)}
              </span>
              <span className="money type-ui font-mono font-bold tabular-nums">
                {formatMoney(entry.price)}
              </span>
              <span className="type-small text-ink-muted">{entryTypeLabel(entry)}</span>
              {entry.note ? (
                <span className="type-small basis-full text-ink-muted italic">{entry.note}</span>
              ) : null}
            </div>
            <ActionMenu
              label={m.history_actions({ date: formatDate(entry.date) })}
              actions={[
                {
                  label: m.action_edit(),
                  icon: <PencilSimpleIcon size={18} />,
                  onSelect: () => setEditing(entry),
                },
                {
                  label: m.action_delete(),
                  icon: <TrashIcon size={18} />,
                  danger: true,
                  onSelect: () => remove(entry),
                },
              ]}
            />
          </li>
        ))}
      </ul>
      {sorted.length > COLLAPSED ? (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="w-fit type-small font-bold text-accent-text hover:underline"
        >
          {all ? m.history_show_less() : m.history_show_all({ count: formatCount(sorted.length) })}
        </button>
      ) : null}
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
        title={m.history_edit_title()}
        description={what}
        initialFocus={true}
      >
        {editing ? (
          <EditForm key={editing.id} entry={editing} onDone={() => setEditing(undefined)} />
        ) : null}
      </Dialog>
    </section>
  );
}

function EditForm({ entry, onDone }: { entry: PriceEntry; onDone: () => void }) {
  const id = useId();
  const settings = useSettings();
  const [amount, setAmount] = useState(formatAmountInput(entry.price));
  const [date, setDate] = useState(entry.date);
  const [type, setType] = useState<PriceType>(entry.priceType);
  const [note, setNote] = useState(entry.note ?? '');
  const [tried, setTried] = useState(false);
  const today = todayIso();

  const parsed = parseMoneyInput(amount);
  const errors = {
    amount: parsed.ok
      ? undefined
      : parsed.error === 'empty'
        ? m.error_price_required()
        : parsed.error === 'too-many-decimals'
          ? m.error_price_decimals()
          : m.error_price_invalid(),
    date: !date ? m.error_date_required() : date > today ? m.error_date_future() : undefined,
  };

  const save = async () => {
    setTried(true);
    if (!parsed.ok || errors.date) return;
    try {
      const { before } = await updatePrice(db, entry.id, {
        price: money(parsed.minor),
        date,
        priceType: type,
        source: type === entry.priceType ? entry.source : sourceOf(type),
        context:
          type === entry.priceType ? entry.context : contextOf(type, settings, entry.language),
        note: note.trim() || undefined,
      });
      toastWithUndo(m.prices_updated({ date: formatDate(date) }), () =>
        restorePrices(db, [before]),
      );
      onDone();
    } catch (error) {
      toastError(error);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="mt-5 flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <FormRow
          label={m.prices_new()}
          htmlFor={`${id}-amount`}
          error={tried ? errors.amount : undefined}
          describedBy={`${id}-amount-error`}
        >
          <MoneyInput
            id={`${id}-amount`}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={tried && errors.amount ? true : undefined}
          />
        </FormRow>
        <FormRow
          label={m.prices_date()}
          htmlFor={`${id}-date`}
          error={tried ? errors.date : undefined}
          describedBy={`${id}-date-error`}
        >
          <Input
            id={`${id}-date`}
            type="date"
            value={date}
            max={today}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={tried && errors.date ? true : undefined}
          />
        </FormRow>
      </div>
      <FormRow label={m.prices_type()} htmlFor={`${id}-type`}>
        <NativeSelect
          id={`${id}-type`}
          value={type}
          onChange={(event) => setType(priceTypeOf(event.target.value))}
        >
          {PRICE_TYPES.map((t) => (
            <option key={t} value={t}>
              {priceTypeLabel(t)}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
      <FormRow label={m.history_note()} htmlFor={`${id}-note`}>
        <Textarea
          id={`${id}-note`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </FormRow>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          {m.action_cancel()}
        </Button>
        <Button type="submit" variant="primary">
          {m.prices_save()}
        </Button>
      </div>
    </form>
  );
}
