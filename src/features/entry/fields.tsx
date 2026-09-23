import { CaretDownIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';
import { CardImage } from '@/components/domain/CardImage';
import { ProductImage } from '@/components/domain/ProductImage';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { FormRow } from '@/components/ui/FormControls';
import { Input, inputClass } from '@/components/ui/Input';
import { cn } from '@/components/ui/cn';
import { db, ensureTag, useHoldingsInLocation, useLocations, useTags } from '@/db';
import { isOccupied, nextFreeSlot, occupiedSlots, type SlotPosition } from '@/domain/collection';
import type { CardLanguage } from '@/domain/catalog-types';
import { htmlLang, m } from '@/i18n';
import { toastError, type ItemInfo } from '@/features/collection';

/** Thumbnail, name, set and number of the item a lot is about (UX_SPEC.md §4.7 header). */
export function ItemHeader({ info, language }: { info: ItemInfo; language: CardLanguage }) {
  const name = info.name(language);
  const meta = [info.setName, info.number].filter(Boolean).join(' · ');
  return (
    <div className="flex items-center gap-4">
      <div className={info.ref.kind === 'card' ? 'w-14 shrink-0' : 'w-16 shrink-0'}>
        {info.ref.kind === 'card' ? (
          <CardImage image={info.image(language)} size="small" alt="" />
        ) : (
          <ProductImage
            image={info.image(language)}
            type={info.productType ?? 'other'}
            size="small"
            alt=""
            className="rounded-[12px]"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span lang={htmlLang(name.lang)} className="type-h3 break-words text-ink">
          {name.text}
        </span>
        {meta ? <span className="type-small text-ink-muted">{meta}</span> : null}
        {!info.inCatalog ? (
          <span className="type-small text-warn">{m.holding_not_in_catalog()}</span>
        ) : info.custom ? (
          <span className="type-small text-ink-muted">{m.holding_custom()}</span>
        ) : null}
      </div>
    </div>
  );
}

export const selectClass = cn(inputClass, 'appearance-none pr-10');

/**
 * Binder + page + slot (COL-09, Q5.7). Picking a binder fills in its next free pocket; an occupied
 * pocket is a hint, not an error (a pocket can hold a stack).
 */
export function LocationFields({
  locationId,
  page,
  slot,
  onChange,
  pageError,
  slotError,
  ignoreHoldingId,
}: {
  locationId: string;
  page: string;
  slot: string;
  onChange: (next: { locationId?: string; page?: string; slot?: string }) => void;
  pageError?: string | undefined;
  slotError?: string | undefined;
  /** The lot being edited, whose own pocket doesn't count as taken. */
  ignoreHoldingId?: string | undefined;
}) {
  const id = useId();
  const locations = useLocations() ?? [];
  const location = locations.find((l) => l.id === locationId);
  const lots = useHoldingsInLocation(locationId);
  const layout = location?.kind === 'binder' ? location.layout : undefined;
  const taken = occupiedSlots(
    (lots ?? []).filter((h) => h.id !== ignoreHoldingId),
    locationId,
  );
  const suggestion = layout ? nextFreeSlot(taken, layout, location?.pages) : undefined;
  const typed: SlotPosition | undefined =
    /^\d+$/.test(page) && /^\d+$/.test(slot)
      ? { page: Number(page), slot: Number(slot) }
      : undefined;
  // Picking a binder (or opening the sheet with one) fills in its next free pocket once.
  const autofill = useRef(!page && !slot);
  const ready = lots !== undefined && Boolean(layout);
  useEffect(() => {
    if (!autofill.current || !ready) return;
    autofill.current = false;
    if (suggestion) onChange({ page: String(suggestion.page), slot: String(suggestion.slot) });
  }, [ready, suggestion, onChange]);
  const showSuggestion =
    suggestion && (!typed || typed.page !== suggestion.page || typed.slot !== suggestion.slot);

  return (
    <div className="flex flex-col gap-3">
      <FormRow label={m.holding_location()} htmlFor={`${id}-location`}>
        <div className="relative">
          <select
            id={`${id}-location`}
            value={locationId}
            onChange={(event) => {
              const next = locations.find((l) => l.id === event.target.value);
              onChange({ locationId: event.target.value, page: '', slot: '' });
              autofill.current = next?.kind === 'binder';
            }}
            className={selectClass}
          >
            <option value="">{m.holding_location_none()}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <CaretDownIcon
            size={16}
            weight="bold"
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-muted"
          />
        </div>
      </FormRow>
      {layout ? (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-3">
            <FormRow
              label={m.holding_page()}
              htmlFor={`${id}-page`}
              error={pageError}
              describedBy={`${id}-page-error`}
            >
              <Input
                id={`${id}-page`}
                inputMode="numeric"
                value={page}
                onChange={(event) => onChange({ page: event.target.value })}
                aria-invalid={pageError ? true : undefined}
                aria-describedby={pageError ? `${id}-page-error` : undefined}
                className="font-mono tabular-nums"
              />
            </FormRow>
            <FormRow
              label={m.holding_slot()}
              htmlFor={`${id}-slot`}
              error={slotError}
              describedBy={`${id}-slot-error`}
            >
              <Input
                id={`${id}-slot`}
                inputMode="numeric"
                value={slot}
                onChange={(event) => onChange({ slot: event.target.value })}
                aria-invalid={slotError ? true : undefined}
                aria-describedby={slotError ? `${id}-slot-error` : undefined}
                className="font-mono tabular-nums"
              />
            </FormRow>
          </div>
          {typed && isOccupied(taken, typed) ? (
            <p className="type-small m-0 text-ink-muted">{m.holding_slot_taken()}</p>
          ) : null}
          {showSuggestion ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-small text-ink-muted">
                {m.holding_next_free({ page: suggestion.page, slot: suggestion.slot })}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onChange({ page: String(suggestion.page), slot: String(suggestion.slot) })
                }
              >
                {m.holding_use_next_free()}
              </Button>
            </div>
          ) : !suggestion && lots !== undefined ? (
            <p className="type-small m-0 text-warn">{m.holding_binder_full()}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Existing tags as toggles plus a field to create one (COL-09). */
export function TagsField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const id = useId();
  const tags = useTags() ?? [];
  const [draft, setDraft] = useState('');
  const create = async () => {
    if (!draft.trim()) return;
    try {
      const tag = await ensureTag(db, draft);
      onChange([...new Set([...value, tag.id])]);
      setDraft('');
    } catch (error) {
      toastError(error);
    }
  };
  return (
    <FormRow label={m.holding_tags()}>
      {tags.length ? (
        <ChipGroup
          label={m.holding_tags()}
          value={value}
          onValueChange={onChange}
          options={tags.map((t) => ({ value: t.id, label: t.name }))}
        />
      ) : null}
      <div className="flex gap-2">
        <label htmlFor={`${id}-new`} className="sr-only">
          {m.holding_tag_new()}
        </label>
        <Input
          id={`${id}-new`}
          value={draft}
          placeholder={m.holding_tag_new()}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.stopPropagation();
              void create();
            }
          }}
        />
        <Button variant="outline" onClick={() => void create()} disabled={!draft.trim()}>
          {m.holding_tag_add()}
        </Button>
      </div>
    </FormRow>
  );
}
