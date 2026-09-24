import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { PLDelta } from '@/components/domain/PLDelta';
import { Button, buttonVariants } from '@/components/ui/Button';
import { MoneyInput } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Panel } from '@/components/ui/Panel';
import { useHoldingsOfItem, useItemPrices, useSettings } from '@/db';
import type { CardLanguage } from '@/domain/catalog-types';
import { todayIso } from '@/domain/ids';
import { money } from '@/domain/money';
import { PRICE_TYPES, type PriceEntry, type PriceType } from '@/domain/schemas';
import { isStale } from '@/domain/valuation';
import { toastError } from '@/features/collection';
import { languageLabel, m } from '@/i18n';
import { formatDate, formatMoney, formatRelative } from '@/i18n/format';
import { formatAmountInput, parseMoneyInput } from '@/i18n/money-input';
import { entryTypeLabel, priceTypeLabel } from '@/i18n/price-labels';
import { isTyping } from '@/lib/keys';
import { useSheets } from '@/lib/sheets';
import type { CardmarketLink } from './cardmarket-link';
import { GuideChips, GuideKey, isGuideKey, useGuide, type GuidePick } from './guide';
import { PriceChartPanel } from './PriceChartPanel';
import { amountError, dateError, savePrice, type PricedItem, type SeriesTarget } from './record';
import { SeriesSelectors, useSeriesChoice } from './SeriesChoice';
import { priceTypeOf } from './series';

/**
 * The price context of an entry (R2.2, R2.6): `Deutsch · ab (DE) · NM oder besser`, or
 * `Deutsch · Preisführer ab` for an accepted guide value (PRC-09).
 */
export function contextText(
  entry: Pick<PriceEntry, 'language' | 'priceType' | 'context' | 'origin'>,
) {
  return [
    languageLabel(entry.language),
    entryTypeLabel(entry),
    entry.context?.minCondition
      ? m.price_context_min({ condition: entry.context.minCondition })
      : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Prices of one card or product (UX_SPEC.md §4.4): the current price with its context, inline entry
 * (PRC-01), the Cardmarket link (PRC-06), then the chart and every entry (PRC-02, PRC-03). Every
 * price belongs to its card language (R2.6), so the page's language picks the series; variant and
 * grade narrow it where they exist.
 */
export function ItemPrices({
  item,
  language,
  cardmarket,
}: {
  item: PricedItem;
  language: CardLanguage;
  /** The Cardmarket link of the chosen variant. */
  cardmarket: (variant: string) => CardmarketLink;
}) {
  const entries = useItemPrices(item.ref.id);
  const holdings = useHoldingsOfItem(item.ref.id);
  const choice = useSeriesChoice(item, language, entries, holdings);
  const { series, latest } = choice;
  const [fresh, setFresh] = useState<{ id: string; direction: 'gain' | 'loss' | 'flat' }>();

  useEffect(() => {
    if (!fresh) return undefined;
    const timer = setTimeout(() => setFresh(undefined), 1200);
    return () => clearTimeout(timer);
  }, [fresh]);

  const onSaved = (entry: PriceEntry) => {
    const before = latest?.price.minor;
    const after = entry.price.minor;
    setFresh({
      id: entry.id,
      direction:
        before === undefined || before === after ? 'flat' : after > before ? 'gain' : 'loss',
    });
  };

  return (
    <>
      <CurrentPrice
        target={choice}
        latest={latest}
        cardmarket={cardmarket(choice.variant)}
        flash={fresh && fresh.id === latest?.id ? fresh.direction : undefined}
        onSaved={onSaved}
        selectors={<SeriesSelectors choice={choice} />}
      />
      <PriceChartPanel
        item={item}
        language={language}
        series={series}
        compare={item.languages
          .filter((l) => l !== language)
          .map((l) => ({
            language: l,
            entries: (entries ?? []).filter((e) => e.seriesKey === choice.keyFor(l)),
          }))
          .filter((c) => c.entries.length > 0)}
        holdings={holdings ?? []}
        seriesKey={choice.seriesKey}
        freshId={fresh?.id}
        loading={entries === undefined}
      />
    </>
  );
}

function CurrentPrice({
  target,
  latest,
  cardmarket,
  flash,
  onSaved,
  selectors,
}: {
  target: SeriesTarget;
  latest: PriceEntry | undefined;
  cardmarket: CardmarketLink;
  flash: 'gain' | 'loss' | 'flat' | undefined;
  onSaved: (entry: PriceEntry) => void;
  selectors: ReactNode;
}) {
  const id = useId();
  const settings = useSettings();
  const today = todayIso();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [type, setType] = useState<PriceType>(settings.price.defaultType);
  const [tried, setTried] = useState(false);
  const [picked, setPicked] = useState<GuidePick>();
  const amountRef = useRef<HTMLInputElement>(null);
  const { language } = target;
  const guide = useGuide(target.item, language, target, cardmarket.productId);

  const errors = { amount: amountError(amount), date: dateError(date, today) };
  const parsed = parseMoneyInput(amount);
  const delta =
    latest && parsed.ok && latest.price.currency === 'EUR'
      ? parsed.minor - latest.price.minor
      : undefined;
  const stale = latest ? isStale(latest.date, today, settings.price.staleAfterDays) : false;
  const feedback = (tried && (errors.amount ?? errors.date)) || delta !== undefined;

  // P records a price for the page's item (UX_SPEC.md §7): here, that's this field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'p' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.defaultPrevented || isTyping(event.target) || useSheets.getState().open) return;
      const input = amountRef.current;
      if (!input) return;
      event.preventDefault();
      input.scrollIntoView({ block: 'center' });
      input.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const save = async (input: Parameters<typeof savePrice>[2]) => {
    const entry = await savePrice(target, settings, input);
    onSaved(entry);
    return entry;
  };

  // A guide value copied into the field (a chip or V) is saved as one while it stays unchanged.
  const pick = (value: GuidePick) => {
    setAmount(formatAmountInput(money(value.minor)));
    setType(value.type);
    setPicked(value);
    setTried(false);
    amountRef.current?.focus();
  };

  const submit = async () => {
    setTried(true);
    if (errors.amount || errors.date || !parsed.ok) return;
    try {
      const fromGuide = picked?.minor === parsed.minor && picked.type === type;
      await save({ minor: parsed.minor, date, type, fromGuide });
      setAmount('');
      setDate(todayIso());
      setTried(false);
      setPicked(undefined);
      amountRef.current?.focus();
    } catch (error) {
      toastError(error);
    }
  };

  const confirmUnchanged = () => {
    if (!latest) return;
    save({
      minor: latest.price.minor,
      date: todayIso(),
      type: latest.priceType,
      like: latest,
    }).catch(toastError);
  };

  return (
    <Panel aria-labelledby={`${id}-title`} className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={`${id}-title`} className="type-label m-0 text-ink-muted uppercase">
            {m.prices_current()}
          </h3>
          {latest ? (
            <>
              <span
                key={latest.id}
                className={
                  flash && flash !== 'flat'
                    ? `money type-h1 font-mono tabular-nums value-flash-${flash}`
                    : 'money type-h1 font-mono tabular-nums'
                }
              >
                {formatMoney(latest.price)}
              </span>
              <span className="type-small flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted">
                <span>{contextText(latest)}</span>
                <span>
                  {formatDate(latest.date)} · {formatRelative(latest.date)}
                </span>
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

      {selectors}

      {guide ? <GuideChips guide={guide} onPick={pick} keyHint={<GuideKey />} /> : null}

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-2"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(8rem,1fr)_auto_auto_auto]">
          <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
            <label htmlFor={`${id}-amount`} className="type-label text-ink-subtle">
              {m.prices_new()}
            </label>
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
              aria-describedby={feedback ? `${id}-feedback` : undefined}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${id}-date`} className="type-label text-ink-subtle">
              {m.prices_date()}
            </label>
            <Input
              id={`${id}-date`}
              type="date"
              value={date}
              max={today}
              onChange={(event) => setDate(event.target.value)}
              aria-invalid={tried && errors.date ? true : undefined}
              className="sm:w-[10.5rem]"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${id}-type`} className="type-label text-ink-subtle">
              {m.prices_type()}
            </label>
            <NativeSelect
              id={`${id}-type`}
              value={type}
              onChange={(event) => setType(priceTypeOf(event.target.value))}
              className="sm:w-[12.5rem]"
            >
              {PRICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {priceTypeLabel(t)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button
            type="submit"
            variant="primary"
            className="col-span-2 h-12 self-end sm:col-span-1"
          >
            {m.prices_save()}
          </Button>
        </div>
        <div id={`${id}-feedback`} className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1">
          {tried && (errors.amount || errors.date) ? (
            <span role="alert" className="type-small text-loss">
              {errors.amount ?? errors.date}
            </span>
          ) : delta !== undefined && latest ? (
            <span className="type-small inline-flex items-center gap-1.5 text-ink-muted">
              <PLDelta
                delta={money(delta)}
                ratio={latest.price.minor ? delta / latest.price.minor : undefined}
              />
              {m.prices_delta_last()}
            </span>
          ) : latest && latest.date < today ? (
            <button
              type="button"
              onClick={confirmUnchanged}
              title={m.prices_unchanged_hint()}
              className="type-small font-bold text-accent-text hover:underline"
            >
              {m.prices_unchanged()} · {formatMoney(latest.price)}
            </button>
          ) : null}
        </div>
      </form>

      <p className="type-small m-0 text-ink-muted">{cardmarket.hint}</p>
    </Panel>
  );
}
