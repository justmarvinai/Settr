import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { PLDelta } from '@/components/domain/PLDelta';
import { Button, buttonVariants } from '@/components/ui/Button';
import { MoneyInput } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { addPrice, db, deletePrice, useHoldingsOfItem, useItemPrices, useSettings } from '@/db';
import { STANDARD_VARIANT } from '@/domain/catalog';
import type { CardLanguage, ItemRef } from '@/domain/catalog-types';
import { todayIso } from '@/domain/ids';
import { money } from '@/domain/money';
import {
  PRICE_TYPES,
  type Holding,
  type ItemSnapshot,
  type PriceEntry,
  type PriceType,
} from '@/domain/schemas';
import { cardSeriesKey, gradeKey, sealedSeriesKey, type GradeKey } from '@/domain/series';
import { isStale } from '@/domain/valuation';
import { toastError, toastWithUndo } from '@/features/collection';
import { languageCode, languageLabel, m } from '@/i18n';
import { gradingText } from '@/i18n/collection-labels';
import { formatDate, formatMoney, formatRelative } from '@/i18n/format';
import { parseMoneyInput } from '@/i18n/money-input';
import { priceTypeLabel } from '@/i18n/price-labels';
import { PriceChartPanel } from './PriceChartPanel';
import { contextOf, isGradeKey, oldestFirst, priceTypeOf, sourceOf } from './series';

/** A card or sealed product as the price views need it. */
export interface PricedItem {
  ref: ItemRef;
  /** Display snapshot stored with every entry (rule 4: records survive catalog changes). */
  snapshot: ItemSnapshot;
  /** Names the item in toasts, e.g. `025 Pikachu-ex`. */
  label: string;
  languages: readonly CardLanguage[];
  /** Card variants; empty for sealed products. */
  variants: readonly { id: string; label: string }[];
}

/** The Cardmarket button: the exact product with the preset filters, or a search. */
export interface CardmarketLink {
  href: string;
  exact: boolean;
  hint: string;
}

/** The price context of an entry (R2.2, R2.6): `Deutsch · ab (DE) · NM oder besser`. */
export function contextText(entry: Pick<PriceEntry, 'language' | 'priceType' | 'context'>) {
  return [
    languageLabel(entry.language),
    priceTypeLabel(entry.priceType),
    entry.context?.minCondition ? m.price_context_nm() : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}

function gradeOptions(
  holdings: readonly Holding[],
  entries: readonly PriceEntry[],
  language: CardLanguage,
): Map<string, string> {
  const options = new Map<string, string>([['raw', m.prices_series_raw()]]);
  for (const h of holdings) {
    if (h.language === language && h.grading)
      options.set(gradeKey(h.grading), gradingText(h.grading));
  }
  for (const e of entries) {
    if (e.language === language && !options.has(e.grade))
      options.set(e.grade, e.grade.toUpperCase());
  }
  return options;
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
  cardmarket: CardmarketLink;
}) {
  const entries = useItemPrices(item.ref.id);
  const holdings = useHoldingsOfItem(item.ref.id);
  const [variantChoice, setVariant] = useState(item.variants[0]?.id ?? STANDARD_VARIANT);
  const [gradeChoice, setGrade] = useState<GradeKey>('raw');
  const [fresh, setFresh] = useState<{ id: string; direction: 'gain' | 'loss' | 'flat' }>();

  const variant = item.variants.some((v) => v.id === variantChoice)
    ? variantChoice
    : (item.variants[0]?.id ?? STANDARD_VARIANT);
  const grades =
    item.ref.kind === 'card'
      ? gradeOptions(holdings ?? [], entries ?? [], language)
      : new Map<GradeKey, string>();
  const grade = grades.has(gradeChoice) ? gradeChoice : 'raw';
  const keyFor = (lang: CardLanguage) =>
    item.ref.kind === 'sealed'
      ? sealedSeriesKey(item.ref.id, lang)
      : cardSeriesKey(item.ref.id, lang, variant, grade);
  const seriesKey = keyFor(language);
  const series = (entries ?? []).filter((e) => e.seriesKey === seriesKey).toSorted(oldestFirst);
  const latest = series.at(-1);

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
        item={item}
        language={language}
        variant={variant}
        grade={grade}
        seriesKey={seriesKey}
        latest={latest}
        cardmarket={cardmarket}
        flash={fresh && fresh.id === latest?.id ? fresh.direction : undefined}
        onSaved={onSaved}
        selectors={
          item.variants.length > 1 || grades.size > 1 ? (
            <div className="flex flex-wrap items-center gap-3">
              {item.variants.length > 1 ? (
                <SegmentedControl
                  label={m.prices_variant()}
                  value={variant}
                  onValueChange={setVariant}
                  options={item.variants.map((v) => ({ value: v.id, label: v.label }))}
                />
              ) : null}
              {grades.size > 1 ? (
                <label className="flex items-center gap-2 type-small text-ink-muted">
                  {m.prices_series()}
                  <NativeSelect
                    value={grade}
                    onChange={(event) => {
                      if (isGradeKey(event.target.value)) setGrade(event.target.value);
                    }}
                    className="h-10 w-auto"
                  >
                    {[...grades].map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              ) : null}
            </div>
          ) : null
        }
      />
      <PriceChartPanel
        item={item}
        language={language}
        series={series}
        compare={item.languages
          .filter((l) => l !== language)
          .map((l) => ({
            language: l,
            entries: (entries ?? []).filter((e) => e.seriesKey === keyFor(l)),
          }))
          .filter((c) => c.entries.length > 0)}
        holdings={holdings ?? []}
        seriesKey={seriesKey}
        freshId={fresh?.id}
        loading={entries === undefined}
      />
    </>
  );
}

function amountError(text: string): string | undefined {
  if (!text.trim()) return m.error_price_required();
  const parsed = parseMoneyInput(text);
  if (parsed.ok) return undefined;
  return parsed.error === 'too-many-decimals' ? m.error_price_decimals() : m.error_price_invalid();
}

function CurrentPrice({
  item,
  language,
  variant,
  grade,
  seriesKey,
  latest,
  cardmarket,
  flash,
  onSaved,
  selectors,
}: {
  item: PricedItem;
  language: CardLanguage;
  variant: string;
  grade: GradeKey;
  seriesKey: string;
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
  const amountRef = useRef<HTMLInputElement>(null);

  const errors = {
    amount: amountError(amount),
    date: !date ? m.error_date_required() : date > today ? m.error_date_future() : undefined,
  };
  const parsed = parseMoneyInput(amount);
  const delta =
    latest && parsed.ok && latest.price.currency === 'EUR'
      ? parsed.minor - latest.price.minor
      : undefined;
  const stale = latest ? isStale(latest.date, today, settings.price.staleAfterDays) : false;
  const what = `${item.label} · ${languageCode(language)}`;
  const feedback = (tried && (errors.amount ?? errors.date)) || delta !== undefined;

  const save = async (price: number, entryDate: string, priceType: PriceType) => {
    const context = contextOf(priceType, settings, language);
    const entry = await addPrice(db, {
      seriesKey,
      item: item.ref,
      language,
      ...(item.ref.kind === 'card' ? { variant } : {}),
      grade,
      snapshot: item.snapshot,
      date: entryDate,
      price: money(price),
      priceType,
      source: sourceOf(priceType),
      ...(context ? { context } : {}),
      origin: 'manual',
    });
    onSaved(entry);
    toastWithUndo(m.prices_saved({ amount: formatMoney(entry.price), what }), () =>
      deletePrice(db, entry.id),
    );
    return entry;
  };

  const submit = async () => {
    setTried(true);
    if (errors.amount || errors.date || !parsed.ok) return;
    try {
      await save(parsed.minor, date, type);
      setAmount('');
      setDate(todayIso());
      setTried(false);
      amountRef.current?.focus();
    } catch (error) {
      toastError(error);
    }
  };

  const confirmUnchanged = () => {
    if (!latest) return;
    save(latest.price.minor, todayIso(), latest.priceType).catch(toastError);
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
