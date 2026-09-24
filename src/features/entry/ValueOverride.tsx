import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormRow, MoneyInput, Textarea } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { db, updateHolding, useHolding, useLatestPrices, restoreHolding } from '@/db';
import { todayIso } from '@/domain/ids';
import { money } from '@/domain/money';
import { remaining, type Holding } from '@/domain/schemas';
import { seriesKeyOf } from '@/domain/series';
import { lotLabel, toastError, toastWithUndo, type ItemInfo } from '@/features/collection';
import { languageLabel, m } from '@/i18n';
import { formatDate, formatMoney } from '@/i18n/format';
import { formatAmountInput, parseMoneyInput } from '@/i18n/money-input';
import { closeSheet } from '@/lib/sheets';
import { ItemHeader } from './fields';
import { SheetLoading, WithItem } from './HoldingSheet';

/** *Eigener Wert* of a lot (PRC-07, R2.2, ADR-025): its own value per copy, with a date and note. */
export function ValueBody({ holdingId }: { holdingId: string }) {
  const holding = useHolding(holdingId);
  if (!holding) return <SheetLoading />;
  return (
    <WithItem item={holding.item} setId={holding.setId} fallback={holding}>
      {(info) => <ValueForm info={info} holding={holding} />}
    </WithItem>
  );
}

function ValueForm({ info, holding }: { info: ItemInfo; holding: Holding }) {
  const id = useId();
  const own = holding.valueOverride;
  const latest = useLatestPrices()?.get(seriesKeyOf(holding));
  const [amount, setAmount] = useState(own ? formatAmountInput(own.price) : '');
  const [date, setDate] = useState(own?.date ?? todayIso());
  const [note, setNote] = useState(own?.note ?? '');
  const [tried, setTried] = useState(false);
  const today = todayIso();
  const what = lotLabel(info, {
    language: holding.language,
    condition: holding.condition,
    quantity: remaining(holding),
    variant: holding.variant,
  });

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
      const { before } = await updateHolding(db, holding.id, {
        valueOverride: {
          price: money(parsed.minor),
          date,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      });
      toastWithUndo(m.toast_value_saved({ what }), () => restoreHolding(db, before));
      closeSheet();
    } catch (error) {
      toastError(error);
    }
  };

  const remove = async () => {
    try {
      const { before } = await updateHolding(db, holding.id, { valueOverride: undefined });
      toastWithUndo(m.toast_value_removed({ what }), () => restoreHolding(db, before));
      closeSheet();
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
      className="mt-5 flex flex-col gap-5 pb-2"
    >
      <ItemHeader info={info} language={holding.language} />
      <p className="type-body m-0 text-ink-muted">{m.value_intro()}</p>
      <p className="type-small m-0 rounded-[14px] bg-hover px-4 py-3 text-ink-muted">
        {latest && latest.price.currency === 'EUR' ? (
          <span className="money">
            {m.value_market({
              language: languageLabel(holding.language),
              amount: formatMoney(latest.price),
              date: formatDate(latest.date),
            })}
          </span>
        ) : (
          m.value_no_market({ language: languageLabel(holding.language) })
        )}
      </p>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <FormRow
          label={m.value_amount()}
          htmlFor={`${id}-amount`}
          error={tried ? errors.amount : undefined}
          describedBy={`${id}-amount-error`}
        >
          <MoneyInput
            id={`${id}-amount`}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            aria-invalid={tried && errors.amount ? true : undefined}
            data-initial-focus=""
          />
        </FormRow>
        <FormRow
          label={m.value_date()}
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
      <FormRow label={m.holding_note()} htmlFor={`${id}-note`}>
        <Textarea
          id={`${id}-note`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </FormRow>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {own ? (
          <Button type="button" variant="ghost" onClick={() => void remove()}>
            {m.value_remove()}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" variant="primary">
          {m.prices_save()}
        </Button>
      </div>
    </form>
  );
}
