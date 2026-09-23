import { useState, type ReactNode } from 'react';
import { useCatalogSet, useManifest, useSealed } from '@/catalog';
import {
  createHolding,
  db,
  deleteHolding,
  restoreHolding,
  setUiPref,
  updateHolding,
  useCustomItem,
  useHolding,
  useLocations,
  useSettings,
  useUiPref,
} from '@/db';
import { pickLanguage, pickText } from '@/domain/catalog';
import type { CardLanguage, ItemRef } from '@/domain/catalog-types';
import { todayIso } from '@/domain/ids';
import type { Holding } from '@/domain/schemas';
import { m } from '@/i18n';
import { closeSheet } from '@/lib/sheets';
import { HoldingForm } from './HoldingForm';
import {
  addPrefsSchema,
  defaultValues,
  toNewHolding,
  toPatch,
  valuesFromHolding,
  type HoldingFormValues,
} from './holding-form';
import {
  cardInfo,
  customIdOf,
  customInfo,
  isCustomId,
  lotLabel,
  offeredLanguages,
  productInfo,
  snapshotInfo,
  toastError,
  toastWithUndo,
  type ItemInfo,
} from '@/features/collection';

// ── Item resolution ─────────────────────────────────────────────────────────────────────────────

/** Resolves a card from its set chunk; `children` renders once it's known. */
function WithCard({
  cardId,
  setId,
  fallback,
  children,
}: {
  cardId: string;
  setId: string;
  fallback?: Holding | undefined;
  children: (info: ItemInfo, next?: ItemInfo) => ReactNode;
}) {
  const loaded = useCatalogSet(setId);
  const index = loaded.cards.findIndex((c) => c.id === cardId);
  const card = loaded.cards[index];
  if (!card) return fallback ? children(snapshotInfo(fallback)) : <Missing />;
  const nextCard = loaded.cards[index + 1];
  return children(cardInfo(card, loaded), nextCard ? cardInfo(nextCard, loaded) : undefined);
}

function WithProduct({
  productId,
  fallback,
  children,
}: {
  productId: string;
  fallback?: Holding | undefined;
  children: (info: ItemInfo) => ReactNode;
}) {
  const sealed = useSealed();
  const manifest = useManifest();
  const product = sealed.byId.get(productId);
  if (!product) return fallback ? children(snapshotInfo(fallback)) : <Missing />;
  const set = manifest.sets.find((s) => s.id === product.setIds[0]);
  return children(productInfo(product, set ? pickText(set.name) : undefined));
}

function WithCustom({
  itemId,
  fallback,
  children,
}: {
  itemId: string;
  fallback?: Holding | undefined;
  children: (info: ItemInfo) => ReactNode;
}) {
  const item = useCustomItem(customIdOf(itemId));
  if (!item) return fallback ? children(snapshotInfo(fallback)) : <SheetLoading />;
  return children(customInfo(item));
}

function WithItem({
  item,
  setId,
  fallback,
  children,
}: {
  item: ItemRef;
  setId?: string | undefined;
  fallback?: Holding | undefined;
  children: (info: ItemInfo, next?: ItemInfo) => ReactNode;
}) {
  if (isCustomId(item.id))
    return (
      <WithCustom itemId={item.id} fallback={fallback}>
        {children}
      </WithCustom>
    );
  if (item.kind === 'sealed') {
    return (
      <WithProduct productId={item.id} fallback={fallback}>
        {children}
      </WithProduct>
    );
  }
  if (!setId) return fallback ? children(snapshotInfo(fallback)) : <Missing />;
  return (
    <WithCard cardId={item.id} setId={setId} fallback={fallback}>
      {children}
    </WithCard>
  );
}

export function SheetLoading() {
  return <p className="type-body mt-6 pb-6 text-ink-muted">{m.holding_loading()}</p>;
}

function Missing() {
  return <p className="type-body mt-6 pb-6 text-ink-muted">{m.holding_not_in_catalog()}</p>;
}

// ── Add ─────────────────────────────────────────────────────────────────────────────────────────

interface Chain {
  item: ItemRef;
  sticky?: Partial<HoldingFormValues>;
}

/** Add a lot (COL-01, COL-02); "Hinzufügen & nächste" walks on through the set. */
export function AddHoldingBody({
  item,
  setId,
  language,
}: {
  item: ItemRef;
  setId?: string | undefined;
  language?: CardLanguage | undefined;
}) {
  const [chain, setChain] = useState<Chain>({ item });
  return (
    <WithItem key={chain.item.id} item={chain.item} setId={setId}>
      {(info, next) => (
        <AddForm
          info={info}
          next={next}
          language={chain.sticky?.language ?? language}
          sticky={chain.sticky}
          onNext={(values) =>
            next &&
            setChain({
              item: next.ref,
              sticky: {
                language: values.language,
                condition: values.condition,
                date: values.date,
                source: values.source,
                acquisitionType: values.acquisitionType,
                locationId: values.locationId,
                priceMode: values.priceMode,
                tags: values.tags,
              },
            })
          }
        />
      )}
    </WithItem>
  );
}

function AddForm({
  info,
  next,
  language,
  sticky,
  onNext,
}: {
  info: ItemInfo;
  next?: ItemInfo | undefined;
  language?: CardLanguage | undefined;
  sticky?: Partial<HoldingFormValues> | undefined;
  onNext: (values: HoldingFormValues) => void;
}) {
  const settings = useSettings();
  const locations = useLocations();
  const storedPrefs = useUiPref('add');
  // The form reads its defaults once, so wait until they're known.
  if (locations === undefined || storedPrefs === undefined) return <SheetLoading />;
  const prefs = addPrefsSchema.parse(storedPrefs.value ?? {});
  const languages = offeredLanguages(info, settings.cardLanguages, language);
  const preferred =
    language ?? (prefs.language && languages.includes(prefs.language) ? prefs.language : undefined);
  const lang = pickLanguage(preferred, languages, settings);
  const base = defaultValues(info, {
    language: lang,
    settings,
    today: todayIso(),
    prefs,
    locations,
  });
  const initial: HoldingFormValues = {
    ...base,
    ...sticky,
    language: sticky?.language && languages.includes(sticky.language) ? sticky.language : lang,
    variant: base.variant,
    page: '',
    slot: '',
  };

  const save = async (values: HoldingFormValues, goNext: boolean) => {
    try {
      const holding = await createHolding(db, toNewHolding(values, info));
      toastWithUndo(m.toast_added({ what: lotLabel(info, values) }), () =>
        deleteHolding(db, holding.id),
      );
      await setUiPref(db, 'add', {
        language: values.language,
        source: values.source.trim() || undefined,
        locationId: values.locationId || undefined,
      });
      if (goNext && next) onNext(values);
      else closeSheet();
    } catch (error) {
      toastError(error);
    }
  };

  return (
    <HoldingForm
      info={info}
      mode="add"
      initial={initial}
      languages={languages}
      canNext={info.ref.kind === 'card' && Boolean(next)}
      onSubmit={save}
    />
  );
}

// ── Edit ────────────────────────────────────────────────────────────────────────────────────────

export function EditHoldingBody({ holdingId }: { holdingId: string }) {
  const holding = useHolding(holdingId);
  if (!holding) return <SheetLoading />;
  return (
    <WithItem item={holding.item} setId={holding.setId} fallback={holding}>
      {(info) => <EditForm info={info} holding={holding} />}
    </WithItem>
  );
}

function EditForm({ info, holding }: { info: ItemInfo; holding: Holding }) {
  const settings = useSettings();
  const languages = offeredLanguages(info, settings.cardLanguages, holding.language);
  const save = async (values: HoldingFormValues) => {
    try {
      const { before } = await updateHolding(db, holding.id, toPatch(values, info, holding));
      toastWithUndo(m.toast_saved({ what: lotLabel(info, values) }), () =>
        restoreHolding(db, before),
      );
      closeSheet();
    } catch (error) {
      toastError(error);
    }
  };
  return (
    <HoldingForm
      info={info}
      mode="edit"
      initial={valuesFromHolding(holding, info, settings)}
      languages={languages}
      holdingId={holding.id}
      onSubmit={save}
    />
  );
}
