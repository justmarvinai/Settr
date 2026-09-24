import { ArrowLeftIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useEffectEvent, type ReactNode } from 'react';
import { useCatalogSet, useManifest } from '@/catalog';
import { CardImage } from '@/components/domain/CardImage';
import { foilOf } from '@/components/domain/holo/foil';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useSettings } from '@/db';
import { pickText, type CatalogCard, pickLanguage, cardName, otherNames } from '@/domain/catalog';
import type { CardLanguage } from '@/domain/catalog-types';
import {
  categoryLabel,
  energyKindLabel,
  htmlLang,
  languageCode,
  languageLabel,
  m,
  rarityLabel,
  stageLabel,
  trainerTypeLabel,
  typeLabel,
} from '@/i18n';
import { useCjkFonts } from '@/components/domain/cjk';
import { remaining } from '@/domain/schemas';
import { cardInfo, HoldingsPanel, lotLabel, openAdd, snapshotOf } from '@/features/collection';
import { cardmarketLinkOf, ItemPrices } from '@/features/prices';
import { HERO_NAME, morphWanted, setHeroCard } from '@/lib/hero';
import { useSwipe } from '@/lib/useSwipe';

// The holo viewer (DSN-01) loads with the first card page; the picture shows until then.
const HoloCard = lazy(() => import('@/components/domain/holo/HoloCard'));

const route = /* @__PURE__ */ getRouteApi('/catalog/sets/$setId/cards/$cardId');

/** Arrow keys belong to text fields and to widgets that use them (radio groups, tabs, menus). */
const ownsArrows = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    target.closest('[role=radiogroup],[role=tablist],[role=menu],[role=listbox],[role=slider]') !==
      null);

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="type-label text-ink-subtle">{label}</dt>
      <dd className="type-ui m-0 text-ink">{children}</dd>
    </div>
  );
}

function TranslatedHint() {
  return (
    <span className="ml-1.5 inline-flex rounded-pill bg-warn-soft px-2 py-0.5 align-middle type-label text-warn">
      {m.catalog_translated()}
    </span>
  );
}

/**
 * Card detail (CAT-03, UX_SPEC.md §4.4): the large picture, names in every language (translations
 * marked), the price of the chosen language with its entry, chart and Cardmarket link (PRC-01…03,
 * PRC-06), the copies you own, the facts and prev/next in set order (← →).
 */
export function CardPage() {
  const { setId, cardId } = route.useParams();
  const search = route.useSearch();
  const navigate = useNavigate();
  const loaded = useCatalogSet(setId);
  const manifest = useManifest();
  const settings = useSettings();
  const card = loaded.byId.get(cardId);
  const index = card ? loaded.cards.indexOf(card) : -1;
  const prev = loaded.cards[index - 1];
  const next = loaded.cards[index + 1];

  // Prev/next in set order: ← →, the step buttons and a swipe on the picture (UX_SPEC.md §4.4)
  const step = (target: CatalogCard) =>
    void navigate({
      to: '/catalog/sets/$setId/cards/$cardId',
      params: { setId, cardId: target.id },
      search: { lang: search.lang },
      replace: true,
    });

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (ownsArrows(event.target)) return;
    const target = event.key === 'ArrowLeft' ? prev : event.key === 'ArrowRight' ? next : null;
    if (!target) return;
    event.preventDefault();
    step(target);
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const swipe = useSwipe(
    cardId,
    (direction) => (direction === 'next' ? next : prev) !== undefined,
    (direction) => {
      const target = direction === 'next' ? next : prev;
      if (target) step(target);
    },
  );

  useCjkFonts(card ? Object.keys(card.name) : []);

  // On the way back, the grid names this card's tile, so the picture morphs back (DSN-02).
  useEffect(() => {
    if (card) setHeroCard(card.id);
  }, [card]);

  if (!card) return null; // the loader answers 404 first
  const lang = pickLanguage(search.lang, card.languages, settings);
  const name = cardName(card, lang, 'card');
  const cardSet = loaded.sets.get(card.setId) ?? loaded.set;
  const info = cardInfo(card, loaded);
  const image = card.images[lang];
  const number = card.printedNumber || card.localId;
  const mark = card.printedRarity?.[lang];
  // Counterparts live in the other print's chunks; the catalog names each one's set (card ids
  // are never parsed, DATA_MODEL.md §3). Older catalogs only knew the set's `otherPrint`.
  const counterparts = (card.counterparts ?? []).flatMap((id, i) => {
    const homeId = card.counterpartSets?.[i] ?? loaded.set.otherPrint;
    const home = manifest.sets.find((s) => s.id === homeId);
    return home ? [{ id, set: home }] : [];
  });

  const imageNote =
    image && image.lang !== lang
      ? image.counterpart
        ? m.catalog_image_counterpart({ language: languageLabel(image.lang) })
        : m.catalog_image_other_language({ language: languageLabel(image.lang) })
      : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start xl:gap-10">
      <div className="flex flex-col gap-3 lg:sticky lg:top-[96px]">
        <div {...swipe} className="touch-pan-y touch-pinch-zoom">
          <Suspense
            fallback={
              <div
                style={{ viewTransitionName: HERO_NAME }}
                className="mx-auto w-full max-w-[400px]"
              >
                <CardImage
                  image={image}
                  size="large"
                  eager
                  alt={`${name.text}, ${number}`}
                  label={m.catalog_image_missing()}
                />
              </div>
            }
          >
            <HoloCard
              image={image}
              alt={`${name.text}, ${number}`}
              label={m.catalog_image_missing()}
              foil={foilOf(card.rarity)}
              motion={settings.display.motion}
              labels={{
                enableGyro: m.holo_enable_gyro(),
                openFullscreen: m.holo_open_fullscreen({ name: name.text }),
                closeFullscreen: m.dialog_close(),
              }}
              heroName={HERO_NAME}
              className="mx-auto w-full max-w-[400px]"
            />
          </Suspense>
        </div>
        {imageNote ? (
          <p className="type-small m-0 text-center text-ink-muted">{imageNote}</p>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <nav
          aria-label={m.catalog_card_nav_label()}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <Link
            to="/catalog/sets/$setId"
            params={{ setId: loaded.set.id }}
            search={{ lang: search.lang }}
            viewTransition={morphWanted()}
            className="inline-flex items-center gap-1.5 type-small text-ink-muted hover:text-ink"
          >
            <ArrowLeftIcon size={16} weight="bold" aria-hidden />
            {pickText(loaded.set.name)}
          </Link>
          <div className="flex items-center gap-1.5">
            <StepLink card={prev} setId={setId} lang={search.lang} direction="prev" />
            <span className="type-small px-1 font-mono text-ink-muted">
              {m.catalog_card_position({ index: index + 1, total: loaded.cards.length })}
            </span>
            <StepLink card={next} setId={setId} lang={search.lang} direction="next" />
          </div>
        </nav>

        <header className="flex flex-col gap-2">
          <span className="type-label text-ink-muted uppercase">
            {[pickText(cardSet.name), m.catalog_card_number({ number })].join(' · ')}
          </span>
          <h2 lang={htmlLang(name.lang)} className="type-display-m m-0 break-words">
            {name.text}
            {name.translated ? <TranslatedHint /> : null}
          </h2>
          <p className="type-body m-0 flex flex-wrap gap-x-3 gap-y-1 text-ink-muted">
            {otherNames(card, name.lang).map((other) => (
              <span key={other.lang} lang={htmlLang(other.lang)}>
                {other.text}
                {other.translated ? (
                  <span className="ml-1 type-label text-ink-subtle">
                    {m.catalog_translated_short()}
                  </span>
                ) : null}
              </span>
            ))}
          </p>
        </header>

        {card.languages.length > 1 ? (
          <SegmentedControl<CardLanguage>
            label={m.catalog_language_label()}
            value={lang}
            onValueChange={(value) =>
              void navigate({
                to: '/catalog/sets/$setId/cards/$cardId',
                params: { setId, cardId },
                search: { lang: value },
                replace: true,
              })
            }
            options={card.languages.map((l) => ({ value: l, label: languageCode(l) }))}
          />
        ) : null}

        <ItemPrices
          item={{
            ref: info.ref,
            snapshot: snapshotOf(info, lang),
            label: [number, name.text].join(' '),
            languages: card.languages,
            variants: info.variants,
          }}
          language={lang}
          cardmarket={(variant) => cardmarketLinkOf(info, lang, variant, settings)}
        />

        <HoldingsPanel
          itemId={card.id}
          describe={(h) =>
            lotLabel(info, {
              language: h.language,
              condition: h.condition,
              quantity: remaining(h),
            })
          }
          onAdd={() => openAdd({ kind: 'card', id: card.id }, setId, lang)}
        />

        <Panel className="p-5">
          <dl className="m-0 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-6 gap-y-4">
            <Fact label={m.catalog_fact_category()}>{categoryLabel(card.category)}</Fact>
            {card.rarity ? (
              <Fact label={m.catalog_fact_rarity()}>
                {rarityLabel(card.rarity)}
                {mark ? <span className="ml-1.5 font-mono text-ink-muted">{mark}</span> : null}
              </Fact>
            ) : null}
            {card.types?.length ? (
              <Fact label={m.catalog_fact_type()}>{card.types.map(typeLabel).join(', ')}</Fact>
            ) : null}
            {card.hp ? <Fact label={m.catalog_fact_hp()}>{card.hp}</Fact> : null}
            {card.stage ? (
              <Fact label={m.catalog_fact_stage()}>{stageLabel(card.stage)}</Fact>
            ) : null}
            {card.trainerType ? (
              <Fact label={m.catalog_fact_trainer_type()}>
                {trainerTypeLabel(card.trainerType)}
              </Fact>
            ) : null}
            {card.energyKind ? (
              <Fact label={m.catalog_fact_energy_kind()}>{energyKindLabel(card.energyKind)}</Fact>
            ) : null}
            {card.illustrator ? (
              <Fact label={m.catalog_fact_illustrator()}>{card.illustrator}</Fact>
            ) : null}
            <Fact label={m.catalog_fact_languages()}>
              {card.languages.map(languageCode).join(' · ')}
            </Fact>
          </dl>
        </Panel>

        {counterparts.length ? (
          <Panel className="flex flex-col gap-2 p-5">
            <h3 className="type-h3 m-0">{m.catalog_counterparts_title()}</h3>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {counterparts.map(({ id, set: home }) => (
                <li key={id}>
                  <Link
                    to="/catalog/sets/$setId/cards/$cardId"
                    params={{ setId: home.id, cardId: id }}
                    className="type-ui text-accent-text underline-offset-4 hover:underline"
                  >
                    {m.catalog_counterpart_link({ set: pickText(home.name) })}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

function StepLink({
  card,
  setId,
  lang,
  direction,
}: {
  card: CatalogCard | undefined;
  setId: string;
  lang: CardLanguage | undefined;
  direction: 'prev' | 'next';
}) {
  const label = direction === 'prev' ? m.catalog_card_prev() : m.catalog_card_next();
  const icon =
    direction === 'prev' ? (
      <CaretLeftIcon size={18} weight="bold" aria-hidden />
    ) : (
      <CaretRightIcon size={18} weight="bold" aria-hidden />
    );
  const className =
    'inline-flex size-11 items-center justify-center rounded-pill bg-hover text-ink transition-colors duration-(--dur-fast) hover:bg-hover-strong';
  if (!card)
    return (
      <span aria-hidden className={`${className} opacity-40`}>
        {icon}
      </span>
    );
  return (
    <Link
      to="/catalog/sets/$setId/cards/$cardId"
      params={{ setId, cardId: card.id }}
      search={{ lang }}
      replace
      aria-label={label}
      title={label}
      className={className}
    >
      {icon}
    </Link>
  );
}
