import { useId, useState } from 'react';
import { useCatalogSet } from '@/catalog';
import { Button } from '@/components/ui/Button';
import { FormRow, MoneyInput, NumberStepper, Textarea } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  addDisposal,
  allocatePullCosts,
  db,
  removeDisposal,
  restoreHoldings,
  useHolding,
  useLocations,
  useSettings,
} from '@/db';
import { todayIso } from '@/domain/ids';
import { money } from '@/domain/money';
import { remaining, type Disposal, type Holding } from '@/domain/schemas';
import { lotLabel, toastError, toastWithUndo, type ItemInfo } from '@/features/collection';
import { m } from '@/i18n';
import { formatCount, formatDate } from '@/i18n/format';
import { parseMoneyInput } from '@/i18n/money-input';
import { closeSheet } from '@/lib/sheets';
import { ItemHeader } from './fields';
import { SheetLoading, WithItem } from './HoldingSheet';
import { QuickEntry } from './QuickEntry';

const DISPOSAL_TYPES = ['sale', 'trade', 'gift', 'lost'] as const;
type DisposalType = (typeof DISPOSAL_TYPES)[number];

const TYPE_LABEL: Record<DisposalType, () => string> = {
  sale: m.disposal_type_sale,
  trade: m.disposal_type_trade,
  gift: m.disposal_type_gift,
  lost: m.disposal_type_lost,
};

function amountError(text: string): string | undefined {
  if (!text.trim()) return undefined;
  const parsed = parseMoneyInput(text);
  if (parsed.ok) return undefined;
  return parsed.error === 'too-many-decimals' ? m.error_price_decimals() : m.error_price_invalid();
}

/** A typed amount in cents, or undefined when empty or not an amount. */
function amount(text: string) {
  const parsed = parseMoneyInput(text);
  return text.trim() && parsed.ok ? money(parsed.minor) : undefined;
}

function dateError(date: string, holding: Holding): string | undefined {
  if (!date) return m.error_date_required();
  if (date > todayIso()) return m.error_date_future();
  if (holding.acquisition.date && date < holding.acquisition.date)
    return m.error_date_before_purchase();
  return undefined;
}

// ── Sell, trade, give away, lose (COL-11) ───────────────────────────────────────────────────────

export function DisposeBody({ holdingId }: { holdingId: string }) {
  const holding = useHolding(holdingId);
  if (!holding) return <SheetLoading />;
  return (
    <WithItem item={holding.item} setId={holding.setId} fallback={holding}>
      {(info) => <DisposeForm info={info} holding={holding} />}
    </WithItem>
  );
}

function DisposeForm({ info, holding }: { info: ItemInfo; holding: Holding }) {
  const id = useId();
  const left = remaining(holding);
  const [type, setType] = useState<DisposalType>('sale');
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(todayIso());
  const [proceeds, setProceeds] = useState('');
  const [fees, setFees] = useState('');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);

  const errors = {
    date: dateError(date, holding),
    proceeds: amountError(proceeds),
    fees: amountError(fees),
  };
  const valued = type === 'sale' || type === 'trade';

  const save = async () => {
    setTried(true);
    if (errors.date || (valued && (errors.proceeds || errors.fees))) return;
    const input: Omit<Disposal, 'id'> = { type, date, quantity: Math.min(quantity, left) };
    if (valued) {
      const total = amount(proceeds);
      const cost = amount(fees);
      if (total) input.proceedsTotal = total;
      if (cost) input.feesTotal = cost;
    }
    if (note.trim()) input.note = note.trim();
    try {
      const { disposal } = await addDisposal(db, holding.id, input);
      const what = lotLabel(info, {
        language: holding.language,
        condition: holding.condition,
        quantity: input.quantity,
      });
      toastWithUndo(m.toast_disposed({ what }), () => removeDisposal(db, holding.id, disposal.id));
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
      <FormRow label={m.dispose_type()}>
        <SegmentedControl<DisposalType>
          label={m.dispose_type()}
          variant="chips"
          value={type}
          onValueChange={setType}
          options={DISPOSAL_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t]() }))}
        />
      </FormRow>
      {left > 1 ? (
        <FormRow
          label={m.holding_quantity()}
          hint={m.dispose_quantity_hint({ count: formatCount(left) })}
        >
          <NumberStepper
            label={m.holding_quantity()}
            value={quantity}
            max={left}
            onValueChange={setQuantity}
            decrementLabel={m.holding_quantity_less()}
            incrementLabel={m.holding_quantity_more()}
          />
        </FormRow>
      ) : null}
      <FormRow
        label={m.dispose_date()}
        htmlFor={`${id}-date`}
        error={tried ? errors.date : undefined}
        describedBy={`${id}-date-error`}
      >
        <Input
          id={`${id}-date`}
          type="date"
          value={date}
          min={holding.acquisition.date}
          max={todayIso()}
          onChange={(event) => setDate(event.target.value)}
          aria-invalid={tried && errors.date ? true : undefined}
          aria-describedby={tried && errors.date ? `${id}-date-error` : undefined}
        />
      </FormRow>
      {valued ? (
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <FormRow
            label={type === 'sale' ? m.dispose_proceeds() : m.dispose_proceeds_trade()}
            htmlFor={`${id}-proceeds`}
            error={errors.proceeds}
            describedBy={`${id}-proceeds-error`}
          >
            <MoneyInput
              id={`${id}-proceeds`}
              value={proceeds}
              onChange={(event) => setProceeds(event.target.value)}
              placeholder="0,00"
              aria-invalid={errors.proceeds ? true : undefined}
              data-initial-focus=""
            />
          </FormRow>
          <FormRow
            label={m.holding_fees()}
            htmlFor={`${id}-fees`}
            error={errors.fees}
            describedBy={`${id}-fees-error`}
          >
            <MoneyInput
              id={`${id}-fees`}
              value={fees}
              onChange={(event) => setFees(event.target.value)}
              placeholder="0,00"
              aria-invalid={errors.fees ? true : undefined}
            />
          </FormRow>
        </div>
      ) : null}
      <FormRow label={m.holding_note()} htmlFor={`${id}-note`}>
        <Textarea
          id={`${id}-note`}
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </FormRow>
      <div className="flex justify-end">
        <Button variant="primary" size="lg" type="submit">
          {m.dispose_submit()}
        </Button>
      </div>
    </form>
  );
}

// ── Open a sealed product and log its pulls (COL-12) ────────────────────────────────────────────

export function OpenBody({ holdingId }: { holdingId: string }) {
  const holding = useHolding(holdingId);
  const [opened, setOpened] = useState<{ quantity: number; date: string } | null>(null);
  if (!holding) return <SheetLoading />;
  return (
    <WithItem item={holding.item} setId={holding.setId} fallback={holding}>
      {(info) =>
        opened ? (
          <PullLog info={info} holding={holding} date={opened.date} />
        ) : (
          <OpenForm info={info} holding={holding} onOpened={setOpened} />
        )
      }
    </WithItem>
  );
}

function OpenForm({
  info,
  holding,
  onOpened,
}: {
  info: ItemInfo;
  holding: Holding;
  onOpened: (opened: { quantity: number; date: string }) => void;
}) {
  const id = useId();
  const left = remaining(holding);
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(todayIso());
  const [tried, setTried] = useState(false);
  const error = dateError(date, holding);

  const open = async () => {
    setTried(true);
    if (error) return;
    try {
      const count = Math.min(quantity, left);
      const { disposal } = await addDisposal(db, holding.id, {
        type: 'opened',
        date,
        quantity: count,
      });
      const what = lotLabel(info, { language: holding.language, quantity: count });
      toastWithUndo(m.toast_opened({ what }), () => removeDisposal(db, holding.id, disposal.id));
      onOpened({ quantity: count, date });
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void open();
      }}
      className="mt-5 flex flex-col gap-5 pb-2"
    >
      <ItemHeader info={info} language={holding.language} />
      <p className="type-body m-0 text-ink-muted">{m.open_intro()}</p>
      {left > 1 ? (
        <FormRow
          label={m.open_quantity()}
          hint={m.dispose_quantity_hint({ count: formatCount(left) })}
        >
          <NumberStepper
            label={m.open_quantity()}
            value={quantity}
            max={left}
            onValueChange={setQuantity}
            decrementLabel={m.holding_quantity_less()}
            incrementLabel={m.holding_quantity_more()}
          />
        </FormRow>
      ) : null}
      <FormRow
        label={m.open_date()}
        htmlFor={`${id}-date`}
        error={tried ? error : undefined}
        describedBy={`${id}-date-error`}
      >
        <Input
          id={`${id}-date`}
          type="date"
          value={date}
          min={holding.acquisition.date}
          max={todayIso()}
          onChange={(event) => setDate(event.target.value)}
          aria-invalid={tried && error ? true : undefined}
        />
      </FormRow>
      <div className="flex justify-end">
        <Button variant="primary" size="lg" type="submit" data-initial-focus="">
          {m.open_submit()}
        </Button>
      </div>
    </form>
  );
}

/** After opening: log the pulls with quick entry; Abschließen splits the product's cost (Q5.8). */
function PullLog({ info, holding, date }: { info: ItemInfo; holding: Holding; date: string }) {
  const setId = info.setId ?? holding.setId;
  if (!setId) {
    return (
      <div className="mt-5 flex flex-col gap-4 pb-2">
        <p className="type-body m-0 text-ink-muted">{m.open_no_set()}</p>
        <Button variant="primary" onClick={closeSheet}>
          {m.open_done()}
        </Button>
      </div>
    );
  }
  return <PullLogForSet setId={setId} info={info} holding={holding} date={date} />;
}

function PullLogForSet({
  setId,
  info,
  holding,
  date,
}: {
  setId: string;
  info: ItemInfo;
  holding: Holding;
  date: string;
}) {
  const loaded = useCatalogSet(setId);
  const settings = useSettings();
  const locations = useLocations() ?? [];
  const [pulls, setPulls] = useState(0);
  const language = loaded.set.languages.includes(holding.language)
    ? holding.language
    : (loaded.set.languages[0] ?? holding.language);

  const finish = async () => {
    try {
      if (pulls) {
        const before = await allocatePullCosts(db, holding.id);
        toastWithUndo(m.toast_pull_costs({ count: formatCount(before.length) }), () =>
          restoreHoldings(db, before),
        );
      }
      closeSheet();
    } catch (error) {
      toastError(error);
    }
  };

  return (
    <div className="mt-5 flex flex-col gap-5 pb-2">
      <ItemHeader info={info} language={holding.language} />
      <div className="flex flex-col gap-1">
        <h3 className="type-h3 m-0">{m.open_pulls_title()}</h3>
        <p className="type-small m-0 text-ink-muted">
          {m.open_pulls_intro({ date: formatDate(date) })}
        </p>
      </div>
      <QuickEntry
        loaded={loaded}
        locations={locations}
        allowPrice={false}
        defaults={{
          language,
          condition: settings.defaultCondition,
          section: '',
          source: '',
          date,
          locationId: '',
        }}
        acquisition={{ type: 'pull', fromHoldingId: holding.id }}
        onAdded={() => setPulls((n) => n + 1)}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="lg" onClick={closeSheet}>
          {pulls ? m.open_skip_costs() : m.open_done()}
        </Button>
        {pulls ? (
          <Button variant="primary" size="lg" onClick={() => void finish()}>
            {m.open_finish()}
          </Button>
        ) : null}
      </div>
      <p className="type-small m-0 text-ink-muted">{m.open_finish_hint()}</p>
    </div>
  );
}
