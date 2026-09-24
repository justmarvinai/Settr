import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';
import { PLDelta } from '@/components/domain/PLDelta';
import { Button, buttonVariants } from '@/components/ui/Button';
import { FormRow, MoneyInput } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { Kbd } from '@/components/ui/Kbd';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { useHoldingsOfItem, useItemPrices, useSettings } from '@/db';
import { todayIso } from '@/domain/ids';
import { money } from '@/domain/money';
import { PRICE_TYPES, type Holding, type PriceEntry, type PriceType } from '@/domain/schemas';
import { isStale } from '@/domain/valuation';
import { snapshotOf, toastError, type ItemInfo } from '@/features/collection';
import {
  amountError,
  cardmarketLinkOf,
  contextText,
  dateError,
  GuideChips,
  GuideKey,
  isGuideKey,
  ownedVariant,
  savePrice,
  SeriesSelectors,
  useGuide,
  useSeriesChoice,
  type GuidePick,
  type PricedItem,
} from '@/features/prices';
import { languageLabel, m } from '@/i18n';
import { formatDate, formatMoney, formatRelative } from '@/i18n/format';
import { formatAmountInput, parseMoneyInput } from '@/i18n/money-input';
import { priceTypeLabel } from '@/i18n/price-labels';
import { closeSheet, useSheets, type SheetRequest } from '@/lib/sheets';
import { ItemHeader } from './fields';
import { SheetLoading, WithItem } from './HoldingSheet';

type PriceRequest = Omit<Extract<SheetRequest, { type: 'price' }>, 'type'>;

/** Key hints only where there's a keyboard. */
function KeyHint({ children }: { children: string }) {
  return (
    <span className="contents [@media(hover:none)]:hidden">
      <Kbd>{children}</Kbd>
    </span>
  );
}

/**
 * Record a price (PRC-01, UX_SPEC.md §4.9) from a tile, a lot or a row: the last price with its
 * context, a new one with a live delta, the Cardmarket link. `Enter` saves, `Esc` closes and `U`
 * confirms the last price for today.
 */
export function PriceBody(request: PriceRequest) {
  const holdings = useHoldingsOfItem(request.item.id);
  const entries = useItemPrices(request.item.id);
  if (!holdings || !entries) return <SheetLoading />;
  const lot = holdings.find((h) => h.id === request.holdingId);
  return (
    <WithItem item={request.item} setId={request.setId} fallback={lot}>
      {(info) => <PriceForm info={info} request={request} holdings={holdings} entries={entries} />}
    </WithItem>
  );
}

function PriceForm({
  info,
  request,
  holdings,
  entries,
}: {
  info: ItemInfo;
  request: PriceRequest;
  holdings: Holding[];
  entries: PriceEntry[];
}) {
  const id = useId();
  const settings = useSettings();
  const today = todayIso();
  const { language } = request;
  const item: PricedItem = {
    ref: info.ref,
    snapshot: snapshotOf(info, language),
    label: [info.ref.kind === 'card' ? info.number : undefined, info.name(language).text]
      .filter(Boolean)
      .join(' '),
    languages: info.languages,
    variants: info.variants,
  };
  const choice = useSeriesChoice(item, language, entries, holdings, {
    variant: request.variant ?? ownedVariant(item, holdings, language),
    grade: request.grade,
  });
  const { latest } = choice;
  const cardmarket = cardmarketLinkOf(info, language, choice.variant, settings);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [type, setType] = useState<PriceType>(settings.price.defaultType);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<GuidePick>();
  const amountRef = useRef<HTMLInputElement>(null);
  const guide = useGuide(item, language, choice, cardmarket);

  const errors = { amount: amountError(amount), date: dateError(date, today) };
  const parsed = parseMoneyInput(amount);
  const delta =
    latest && parsed.ok && latest.price.currency === 'EUR'
      ? parsed.minor - latest.price.minor
      : undefined;
  const stale = latest ? isStale(latest.date, today, settings.price.staleAfterDays) : false;
  const run = (input: Parameters<typeof savePrice>[2]) => {
    if (busy) return;
    setBusy(true);
    savePrice(choice, settings, input)
      .then(() => closeSheet())
      .catch(toastError)
      .finally(() => setBusy(false));
  };
  const submit = () => {
    setTried(true);
    if (errors.amount || errors.date || !parsed.ok) return;
    const fromGuide = picked?.minor === parsed.minor && picked.type === type;
    run({ minor: parsed.minor, date, type, note, fromGuide });
  };
  // A guide value copied into the field (a chip or V) is saved as one while it stays unchanged.
  const pick = (value: GuidePick) => {
    setAmount(formatAmountInput(money(value.minor)));
    setType(value.type);
    setPicked(value);
    setTried(false);
    amountRef.current?.focus();
  };
  const unchanged = () => {
    if (!latest) return;
    run({ minor: latest.price.minor, date: today, type: latest.priceType, note, like: latest });
  };

  // The amount has focus (UX_SPEC.md §4.9). The form mounts after its entries load, when the
  // sheet has already placed its initial focus.
  useEffect(() => amountRef.current?.focus(), []);

  // U confirms the last price (UX_SPEC.md §4.9). Letters never belong in an amount, so that field
  // hands them on; the note, the date and the type menu keep theirs.
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const element = formRef.current;
    if (!element) return undefined;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'u' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const typing =
        target !== amountRef.current && /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '');
      if (typing || !latest || latest.date >= today || !useSheets.getState().open) return;
      event.preventDefault();
      unchanged();
    };
    element.addEventListener('keydown', onKey);
    return () => element.removeEventListener('keydown', onKey);
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      ref={formRef}
      className="mt-5 flex flex-col gap-5 pb-2"
    >
      <ItemHeader info={info} language={language} />

      <div className="flex flex-col gap-3 rounded-[16px] bg-hover px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="type-label text-ink-muted uppercase">{m.prices_current()}</span>
            {latest ? (
              <>
                <span className="money type-h2 font-mono tabular-nums">
                  {formatMoney(latest.price)}
                </span>
                <span className="type-small text-ink-muted">{contextText(latest)}</span>
                <span className="type-small flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted">
                  {formatDate(latest.date)} · {formatRelative(latest.date)}
                  {stale ? (
                    <span className="type-label rounded-pill bg-warn-soft px-2 py-0.5 text-warn">
                      {m.prices_stale()}
                    </span>
                  ) : null}
                </span>
              </>
            ) : (
              <span className="type-body text-ink-muted">
                {m.prices_none()} · {languageLabel(language)}
              </span>
            )}
          </div>
          <a
            href={cardmarket.href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {cardmarket.exact ? m.catalog_cardmarket_open() : m.catalog_cardmarket_search()}
            <ArrowSquareOutIcon size={16} aria-hidden />
            <span className="sr-only">{m.catalog_opens_new_tab()}</span>
          </a>
        </div>
        <SeriesSelectors choice={choice} />
      </div>

      {guide ? <GuideChips guide={guide} onPick={pick} keyHint={<GuideKey />} /> : null}

      <FormRow
        label={m.prices_new()}
        htmlFor={`${id}-amount`}
        error={tried ? errors.amount : undefined}
        describedBy={`${id}-amount-feedback`}
        hint={
          delta !== undefined && latest ? (
            <span className="inline-flex items-center gap-1.5">
              <PLDelta
                delta={money(delta)}
                ratio={latest.price.minor ? delta / latest.price.minor : undefined}
              />
              {m.prices_delta_last()}
            </span>
          ) : undefined
        }
      >
        <MoneyInput
          ref={amountRef}
          id={`${id}-amount`}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          onKeyDown={(event) => {
            if (guide && isGuideKey(event)) {
              event.preventDefault();
              pick(guide.preferred);
            }
          }}
          placeholder="0,00"
          aria-invalid={tried && errors.amount ? true : undefined}
          aria-describedby={`${id}-amount-feedback`}
          data-initial-focus=""
        />
      </FormRow>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
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
        <FormRow label={m.prices_type()} htmlFor={`${id}-type`}>
          <NativeSelect
            id={`${id}-type`}
            value={type}
            onChange={(event) => {
              const next = PRICE_TYPES.find((t) => t === event.target.value);
              if (next) setType(next);
            }}
          >
            {PRICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {priceTypeLabel(t)}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
      </div>
      <FormRow label={m.history_note()} htmlFor={`${id}-note`}>
        <Input id={`${id}-note`} value={note} onChange={(event) => setNote(event.target.value)} />
      </FormRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {latest && latest.date < today ? (
          <Button
            type="button"
            variant="quiet"
            disabled={busy}
            title={m.prices_unchanged_hint()}
            onClick={unchanged}
          >
            <span className="money">
              {m.prices_unchanged()} · {formatMoney(latest.price)}
            </span>
            <KeyHint>{m.key_u()}</KeyHint>
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" variant="primary" disabled={busy}>
          {m.prices_save()}
          <KeyHint>{m.key_enter()}</KeyHint>
        </Button>
      </div>
      <p className="type-small m-0 text-ink-muted">{cardmarket.hint}</p>
    </form>
  );
}
