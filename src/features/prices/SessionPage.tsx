import { ArrowLeftIcon, ArrowSquareOutIcon, XIcon } from '@phosphor-icons/react';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { Suspense, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cardmarketSearchUrl } from '@/catalog';
import { CardImage } from '@/components/domain/CardImage';
import { PLDelta } from '@/components/domain/PLDelta';
import { ProductImage } from '@/components/domain/ProductImage';
import { Button, buttonVariants, IconButton } from '@/components/ui/Button';
import { MoneyInput } from '@/components/ui/FormControls';
import { Kbd } from '@/components/ui/Kbd';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Panel } from '@/components/ui/Panel';
import {
  addPrice,
  clearPriceSession,
  db,
  deletePrice,
  getUiPref,
  savePriceSession,
  usePriceEntry,
  usePriceSession,
  useSettings,
} from '@/db';
import { STANDARD_VARIANT } from '@/domain/catalog';
import { todayIso } from '@/domain/ids';
import { money } from '@/domain/money';
import { PRICE_TYPES, type Holding, type PriceEntry, type PriceType } from '@/domain/schemas';
import { gradeKey } from '@/domain/series';
import {
  sessionSummary,
  type PriceSessionState,
  type SeriesState,
  type SessionResult,
} from '@/domain/valuation';
import { snapshotOf, toastError, type LibraryRow } from '@/features/collection';
import { htmlLang, languageLabel, m } from '@/i18n';
import { gradingText } from '@/i18n/collection-labels';
import { formatCount, formatMoney, formatRelative } from '@/i18n/format';
import { formatAmountInput, parseMoneyInput } from '@/i18n/money-input';
import { entryTypeLabel, priceTypeLabel } from '@/i18n/price-labels';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { cardmarketLinkOf, type CardmarketLink } from './cardmarket-link';
import { GuideChips, GuideKey, isGuideKey, useGuide, type GuidePick } from './guide';
import { SCOPE_LABELS } from './PricesPage';
import { contextOf, priceTypeOf, sourceOf } from './series';
import { startSession, useSessionData, type SessionData } from './session-data';

const route = /* @__PURE__ */ getRouteApi('/prices/session');

/** What a step can do; the view wires them to buttons and keys. */
interface StepActions {
  /** `fromGuide`: an accepted price-guide value (PRC-09), stored with `origin: 'guide'`. */
  save: (minor: number, type: PriceType, fromGuide: boolean) => Promise<void>;
  unchanged: () => Promise<void>;
  skip: () => Promise<void>;
  back: () => Promise<void>;
  pause: () => void;
}

interface StepProps {
  state: SeriesState;
  row: LibraryRow | undefined;
  result: SessionResult | undefined;
  /** The series' latest entry: its type shows under the name and "Unverändert" keeps it. */
  latestEntry: PriceEntry | undefined;
  actions: StepActions;
  position: number;
}

const save = (next: PriceSessionState) => savePriceSession(db, next);

function openCardmarket(href: string) {
  window.open(href, '_blank', 'noopener,noreferrer');
}

/** The lot's state as it reads under the name: `Deutsch · Holo · NM` or `… · PSA 10`. */
function seriesLine(lot: Holding, row: LibraryRow | undefined): string {
  return [
    languageLabel(lot.language),
    // The variant only when the card has several (as in the Sammlung lists)
    row && row.info.variants.length > 1 && lot.variant !== STANDARD_VARIANT
      ? row.variantLabel
      : undefined,
    lot.grading ? gradingText(lot.grading) : lot.condition,
  ]
    .filter(Boolean)
    .join(' · ');
}

function StepView({
  state,
  row,
  href,
  exact,
  result,
  latestEntry,
  actions,
  position,
  cardmarket,
}: StepProps & {
  href: string;
  exact: boolean;
  cardmarket: Pick<CardmarketLink, 'productId' | 'reverse'>;
}) {
  const id = useId();
  const settings = useSettings();
  const desktop = useMediaQuery('(min-width: 1024px)');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<PriceType>(settings.price.defaultType);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<GuidePick>();
  const inputRef = useRef<HTMLInputElement>(null);
  const lot = state.lots[0];
  const guide = useGuide(
    row?.info ?? { ref: { kind: 'card', id: '' }, languages: [] },
    lot?.language ?? 'de',
    { grade: gradeKey(lot?.grading) },
    cardmarket,
  );
  const parsed = parseMoneyInput(amount);
  const latest = state.latest;
  const delta = latest && parsed.ok ? parsed.minor - latest.price.minor : undefined;
  const error = !tried
    ? undefined
    : parsed.ok
      ? undefined
      : parsed.error === 'empty'
        ? m.error_price_required()
        : parsed.error === 'too-many-decimals'
          ? m.error_price_decimals()
          : m.error_price_invalid();

  const run = (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    action()
      .catch(toastError)
      .finally(() => setBusy(false));
  };
  const submit = () => {
    setTried(true);
    if (!parsed.ok) return;
    const fromGuide = picked?.minor === parsed.minor && picked.type === type;
    run(() => actions.save(parsed.minor, type, fromGuide));
  };
  // A guide value copied into the field (a chip or V) is saved as one while it stays unchanged.
  const pick = (value: GuidePick) => {
    setAmount(formatAmountInput(money(value.minor)));
    setType(value.type);
    setPicked(value);
    setTried(false);
    inputRef.current?.focus();
  };

  // Each step starts in the amount field: the session is made for typing (UX_SPEC.md §4.10).
  useEffect(() => inputRef.current?.focus(), []);

  // Shortcuts (UX_SPEC.md §4.10), wherever the focus is on the page. Letters never belong in an
  // amount, so the field hands them on; the type menu keeps its own letters.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const inAmount = target === inputRef.current;
      if (event.key === 'Escape') {
        event.preventDefault();
        actions.pause();
        return;
      }
      if (target?.tagName === 'SELECT' || (target?.tagName === 'INPUT' && !inAmount)) return;
      const key = event.key.toLowerCase();
      if (key === 'c') {
        event.preventDefault();
        openCardmarket(href);
      } else if (key === 'u' && latest) {
        event.preventDefault();
        run(actions.unchanged);
      } else if (key === 's') {
        event.preventDefault();
        run(actions.skip);
      } else if (guide && isGuideKey(event)) {
        event.preventDefault();
        pick(guide.preferred);
      } else if (event.key === 'ArrowLeft' && position > 0 && (!inAmount || amount === '')) {
        event.preventDefault();
        run(actions.back);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!lot) return null;
  const name = row?.name ?? lot.snapshot.name;
  const meta = [row?.number, row?.setName].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-5">
        <div className="w-24 shrink-0 sm:w-32">
          {lot.item.kind === 'card' ? (
            <CardImage image={row?.image} size="small" alt="" />
          ) : (
            <ProductImage
              image={row?.image}
              type={row?.productType ?? 'other'}
              size="small"
              alt=""
              className="rounded-[12px]"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="type-h2 m-0 break-words" lang={row ? htmlLang(row.nameLang) : undefined}>
            {name}
          </h2>
          {meta ? <span className="type-small text-ink-muted">{meta}</span> : null}
          <span className="type-ui text-ink">{seriesLine(lot, row)}</span>
          <span className="type-small text-ink-muted">
            {latest ? (
              <span className="money">
                {m.session_last({
                  amount: formatMoney(latest.price),
                  type: latestEntry
                    ? entryTypeLabel(latestEntry)
                    : priceTypeLabel(settings.price.defaultType),
                  age: formatRelative(latest.date),
                })}
              </span>
            ) : (
              m.session_no_price()
            )}
          </span>
          <span className="type-small text-ink-muted">
            {[
              state.unitCost === undefined
                ? undefined
                : m.session_cost({ amount: formatMoney(money(state.unitCost)) }),
              m.session_copies({ count: formatCount(state.copies) }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          {result?.outcome === 'saved' && result.after !== undefined ? (
            <span className="type-small font-bold text-accent-text">
              {m.session_saved_note({ amount: formatMoney(money(result.after)) })}
            </span>
          ) : null}
        </div>
      </div>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: 'outline', className: 'w-fit' })}
      >
        {exact ? m.session_cardmarket() : m.catalog_cardmarket_search()}
        <ArrowSquareOutIcon size={18} aria-hidden />
        <Kbd>{m.key_c()}</Kbd>
        <span className="sr-only">{m.catalog_opens_new_tab()}</span>
      </a>

      {guide ? <GuideChips guide={guide} onPick={pick} keyHint={<GuideKey />} /> : null}

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-2"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
            <label htmlFor={`${id}-amount`} className="type-label text-ink-subtle">
              {m.prices_new()}
            </label>
            <MoneyInput
              ref={inputRef}
              id={`${id}-amount`}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0,00"
              aria-invalid={error ? true : undefined}
              aria-describedby={`${id}-feedback`}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
            <label htmlFor={`${id}-type`} className="type-label text-ink-subtle">
              {m.prices_type()}
            </label>
            <NativeSelect
              id={`${id}-type`}
              value={type}
              onChange={(event) => setType(priceTypeOf(event.target.value))}
              className="sm:w-[13rem]"
            >
              {PRICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {priceTypeLabel(t)}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div id={`${id}-feedback`} className="type-small min-h-5">
          {error ? (
            <span role="alert" className="text-loss">
              {error}
            </span>
          ) : delta !== undefined && latest ? (
            <span className="inline-flex items-center gap-1.5 text-ink-muted">
              <PLDelta
                delta={money(delta)}
                ratio={latest.price.minor ? delta / latest.price.minor : undefined}
              />
              {m.prices_delta_last()}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => run(actions.skip)}>
            {m.session_skip()}
            <Kbd>{m.key_s()}</Kbd>
          </Button>
          {latest ? (
            <Button
              type="button"
              variant="quiet"
              disabled={busy}
              onClick={() => run(actions.unchanged)}
            >
              {m.session_unchanged()}
              <Kbd>{m.key_u()}</Kbd>
            </Button>
          ) : null}
          <Button type="submit" variant="primary" disabled={busy} className="ml-auto">
            {m.session_save()}
            <Kbd>{m.key_enter()}</Kbd>
          </Button>
        </div>
      </form>

      {desktop && position === 0 ? (
        <p className="type-small m-0 text-ink-muted">{m.session_tip()}</p>
      ) : null}
    </div>
  );
}

/** A step with its Cardmarket link (PRC-06): the lot's exact product, else a search. */
function Step(props: StepProps) {
  const settings = useSettings();
  const lot = props.state.lots[0];
  if (!lot) return null;
  const link: CardmarketLink = props.row
    ? cardmarketLinkOf(props.row.info, lot.language, lot.variant, settings)
    : { href: cardmarketSearchUrl(lot.snapshot.name), exact: false, hint: '' };
  return <StepView {...props} href={link.href} exact={link.exact} cardmarket={link} />;
}

function Summary({ session, data }: { session: PriceSessionState; data: SessionData }) {
  const navigate = useNavigate();
  const summary = sessionSummary(session);
  const moreStale = data.states.some((s) => s.stale);
  const finish = () =>
    clearPriceSession(db)
      .then(() => navigate({ to: '/prices' }))
      .catch(toastError);
  return (
    <div className="flex flex-col gap-5">
      <h2 className="type-display-m m-0">{m.session_done_title()}</h2>
      <p className="type-body m-0 flex flex-wrap gap-x-4 gap-y-1 text-ink-muted">
        <span className="font-bold text-ink">
          {m.session_done_saved({ n: summary.saved, count: formatCount(summary.saved) })}
        </span>
        <span>{m.session_done_unchanged({ count: formatCount(summary.unchanged) })}</span>
        <span>{m.session_done_skipped({ count: formatCount(summary.skipped) })}</span>
      </p>
      <div className="flex flex-col gap-1">
        <span className="type-label text-ink-muted uppercase">{m.session_done_delta()}</span>
        <PLDelta delta={money(summary.delta)} show="amount" className="type-h1" />
        {summary.newlyPriced ? (
          <span className="type-small money text-ink-muted">
            {m.session_done_new({ amount: formatMoney(money(summary.newlyPriced)) })}
          </span>
        ) : null}
      </div>
      {summary.movers.length ? (
        <div className="flex flex-col gap-1">
          <h3 className="type-label m-0 text-ink-muted uppercase">{m.session_done_movers()}</h3>
          <ul className="m-0 flex list-none flex-col p-0">
            {summary.movers.map((mover) => {
              const state = data.byKey.get(mover.seriesKey);
              const row = state ? data.rowOf(state) : undefined;
              return (
                <li
                  key={mover.seriesKey}
                  className="flex items-center justify-between gap-3 border-t border-line py-2 first:border-t-0"
                >
                  <span className="type-ui truncate">
                    {row?.name ?? state?.lots[0]?.snapshot.name}
                  </span>
                  <PLDelta delta={money(mover.delta)} show="amount" className="type-small" />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {moreStale ? (
          <Link
            to="/prices/session"
            search={{ start: 'stale', order: session.order }}
            className={buttonVariants({ variant: 'quiet' })}
          >
            {m.session_done_more()}
          </Link>
        ) : null}
        <Button variant="primary" onClick={() => void finish()}>
          {m.session_done_finish()}
        </Button>
      </div>
    </div>
  );
}

function Frame({
  session,
  children,
  onPause,
}: {
  session: PriceSessionState | undefined;
  children: ReactNode;
  onPause: () => void;
}) {
  const total = session?.queue.length ?? 0;
  const position = Math.min(session?.position ?? 0, total);
  return (
    <Panel className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="type-label text-ink-muted uppercase">
            {[m.session_title(), session ? SCOPE_LABELS[session.scope]() : undefined]
              .filter(Boolean)
              .join(' · ')}
            {session && position < total ? (
              <span className="ml-2 font-mono normal-case">
                {m.session_progress({
                  index: formatCount(position + 1),
                  total: formatCount(total),
                })}
              </span>
            ) : null}
          </span>
          <progress
            aria-label={m.session_progress_label()}
            max={Math.max(1, total)}
            value={position}
            className="h-1.5 w-full appearance-none overflow-hidden rounded-pill bg-hover-strong [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-hover-strong [&::-webkit-progress-value]:rounded-pill [&::-webkit-progress-value]:bg-accent"
          />
        </div>
        <IconButton label={m.session_pause()} onClick={onPause}>
          <XIcon size={20} weight="bold" aria-hidden />
        </IconButton>
      </div>
      {children}
    </Panel>
  );
}

function Runner() {
  const search = route.useSearch();
  const navigate = useNavigate();
  const data = useSessionData();
  const stored = usePriceSession();
  const settings = useSettings();
  const starting = useRef(false);
  const current = stored?.value;
  const currentKey = current ? current.queue[current.position] : undefined;
  const latestEntry = usePriceEntry(
    currentKey ? data?.byKey.get(currentKey)?.latest?.entryId : undefined,
  );

  // `?start=` begins a new session, then leaves the URL so a reload resumes it.
  useEffect(() => {
    if (!data || !search.start || starting.current) return;
    starting.current = true;
    const scope = search.start;
    const selection =
      scope === 'selection'
        ? getUiPref(db, 'session.selection').then(
            (keys) => new Set(Array.isArray(keys) ? keys.filter((k) => typeof k === 'string') : []),
          )
        : Promise.resolve(undefined);
    selection
      .then((keys) => startSession(data, scope, search.order ?? 'value', keys))
      .then(() => navigate({ to: '/prices/session', search: {}, replace: true }))
      .catch(toastError)
      .finally(() => {
        starting.current = false;
      });
  }, [data, navigate, search.order, search.start]);

  const pause = () => void navigate({ to: '/prices' });
  const session = stored?.value;

  if (!data || !stored || search.start) {
    return (
      <Frame session={undefined} onPause={pause}>
        <div aria-busy="true" className="min-h-64" />
      </Frame>
    );
  }
  if (!session) {
    return (
      <Frame session={undefined} onPause={pause}>
        <p className="type-body m-0 text-ink-muted">{m.session_none()}</p>
        <Link to="/prices" className={buttonVariants({ variant: 'primary', className: 'w-fit' })}>
          <ArrowLeftIcon size={18} weight="bold" aria-hidden />
          {m.nav_prices()}
        </Link>
      </Frame>
    );
  }
  if (session.position >= session.queue.length) {
    return (
      <Frame session={session} onPause={pause}>
        {session.queue.length ? (
          <Summary session={session} data={data} />
        ) : (
          <p className="type-body m-0 text-ink-muted">{m.session_empty()}</p>
        )}
      </Frame>
    );
  }

  const key = session.queue[session.position] ?? '';
  const state = data.byKey.get(key);
  const result = session.results[key];
  const advance = (outcome?: SessionResult) =>
    save({
      ...session,
      position: session.position + 1,
      results: outcome ? { ...session.results, [key]: outcome } : session.results,
    });

  if (!state) {
    // The lots of this series were sold or deleted since the session started.
    return (
      <Frame session={session} onPause={pause}>
        <p className="type-body m-0 text-ink-muted">{m.session_missing()}</p>
        <Button
          variant="primary"
          className="w-fit"
          onClick={() => void advance().catch(toastError)}
        >
          {m.session_skip()}
        </Button>
      </Frame>
    );
  }

  const lot = state.lots[0];
  const row = data.rowOf(state);
  const before = result?.before ?? state.latest?.price.minor;
  const actions: StepActions = {
    save: async (minor, type, fromGuide) => {
      if (!lot) return;
      // Saving a step again replaces what this session entered for it.
      if (result?.entryId) await deletePrice(db, result.entryId);
      const context = fromGuide ? undefined : contextOf(type, settings, lot.language);
      const entry = await addPrice(db, {
        seriesKey: state.seriesKey,
        item: lot.item,
        language: lot.language,
        ...(lot.item.kind === 'card' ? { variant: lot.variant ?? STANDARD_VARIANT } : {}),
        grade: gradeKey(lot.grading),
        snapshot: row ? snapshotOf(row.info, lot.language) : lot.snapshot,
        date: todayIso(),
        price: money(minor),
        priceType: type,
        source: fromGuide ? 'cardmarket' : sourceOf(type),
        ...(context ? { context } : {}),
        origin: fromGuide ? 'guide' : 'manual',
      });
      await advance({
        outcome: 'saved',
        ...(before === undefined ? {} : { before }),
        after: minor,
        copies: state.copies,
        entryId: entry.id,
      });
    },
    unchanged: async () => {
      const latest = state.latest;
      if (!latest || !lot) return;
      if (result?.entryId) await deletePrice(db, result.entryId);
      const kept = before ?? latest.price.minor;
      const entry = await addPrice(db, {
        seriesKey: state.seriesKey,
        item: lot.item,
        language: lot.language,
        ...(lot.item.kind === 'card' ? { variant: lot.variant ?? STANDARD_VARIANT } : {}),
        grade: gradeKey(lot.grading),
        snapshot: row ? snapshotOf(row.info, lot.language) : lot.snapshot,
        date: todayIso(),
        price: money(kept),
        priceType: latestEntry?.priceType ?? settings.price.defaultType,
        source: latestEntry?.source ?? sourceOf(settings.price.defaultType),
        ...(latestEntry?.context ? { context: latestEntry.context } : {}),
        // A confirmed guide value stays one (ADR-040): it says where the number came from.
        origin: latestEntry?.origin ?? 'manual',
      });
      await advance({
        outcome: 'unchanged',
        before: kept,
        after: kept,
        copies: state.copies,
        entryId: entry.id,
      });
    },
    skip: () => advance(result ?? { outcome: 'skipped', copies: state.copies }),
    back: () => save({ ...session, position: Math.max(0, session.position - 1) }),
    pause,
  };

  return (
    <Frame session={session} onPause={pause}>
      <Suspense fallback={<div aria-busy="true" className="min-h-64" />}>
        <Step
          key={key}
          state={state}
          row={row}
          result={result}
          latestEntry={latestEntry}
          actions={actions}
          position={session.position}
        />
      </Suspense>
    </Frame>
  );
}

/**
 * The price-update session (PRC-04, UX_SPEC.md §4.10): one series after another, most valuable
 * first. `C` opens Cardmarket (the exact product, the copy's language, German sellers, NM or
 * better), the amount and `Enter` save, `U` keeps the price for today, `S` skips, `←` goes back
 * and `Esc` pauses; the state stays in kv, so a paused session resumes where it stopped.
 */
export function PriceSessionPage() {
  return (
    <Suspense fallback={<div aria-busy="true" className="min-h-[50vh]" />}>
      <Runner />
    </Suspense>
  );
}
