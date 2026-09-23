import { useForm, useStore } from '@tanstack/react-form';
import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Disclosure,
  FormRow,
  MoneyInput,
  NumberStepper,
  Textarea,
} from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { useHoldings, useLocations } from '@/db';
import {
  CONDITIONS,
  GRADING_COMPANIES,
  type CardLanguage,
  type Condition,
  type GradingCompany,
} from '@/domain/catalog-types';
import { todayIso } from '@/domain/ids';
import { languageLabel, m } from '@/i18n';
import {
  acquisitionLabel,
  conditionLabel,
  gradingCompanyLabel,
  sealedStateLabel,
} from '@/i18n/collection-labels';
import { formatMoney } from '@/i18n/format';
import { ItemHeader, LocationFields, TagsField } from './fields';
import { NativeSelect } from '@/components/ui/NativeSelect';
import {
  ACQUISITION_TYPES,
  errorText,
  holdingFormSchema,
  priceTotalOf,
  SEALED_STATES,
  type AcquisitionType,
  type HoldingFormValues,
  type PriceMode,
  type SealedState,
} from './holding-form';
import type { ItemInfo } from '@/features/collection';

const SOURCE_SUGGESTIONS = ['Cardmarket', 'eBay', 'Kleinanzeigen', 'Pokémon Center'] as const;

function yesterday(today: string): string {
  const [y, mo, d] = today.split('-').map(Number);
  return todayIso(new Date(y ?? 1970, (mo ?? 1) - 1, (d ?? 1) - 1));
}

export interface HoldingFormProps {
  info: ItemInfo;
  mode: 'add' | 'edit';
  initial: HoldingFormValues;
  languages: readonly CardLanguage[];
  /** Id of the lot being edited (its own binder pocket doesn't count as taken). */
  holdingId?: string | undefined;
  /** Shows "Hinzufügen & nächste" (the next card in set order). */
  canNext?: boolean;
  onSubmit: (values: HoldingFormValues, next: boolean) => Promise<void>;
}

/**
 * The add/edit form of a lot (COL-01, COL-02, UX_SPEC.md §4.7): the everyday fields first, grading,
 * fees, tags and the note behind "Mehr Details". Enter saves; Shift+Enter saves and moves on.
 */
export function HoldingForm({
  info,
  mode,
  initial,
  languages,
  holdingId,
  canNext = false,
  onSubmit,
}: HoldingFormProps) {
  const id = useId();
  const today = todayIso();
  const locations = useLocations() ?? [];
  const holdings = useHoldings();
  const isCard = info.ref.kind === 'card';
  const schema = holdingFormSchema(today, locations);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm({
    defaultValues: initial,
    validators: { onChange: schema, onSubmit: schema },
    onSubmitMeta: { next: false },
    onSubmit: async ({ value, meta }) => onSubmit(value, meta.next),
    // Take the user to the first field that needs attention (it may sit behind "Mehr Details").
    onSubmitInvalid: () => {
      requestAnimationFrame(() => {
        const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        invalid?.scrollIntoView({ block: 'center' });
        invalid?.focus({ preventScroll: true });
      });
    },
  });
  const attempts = useStore(form.store, (s) => s.submissionAttempts);
  const submitting = useStore(form.store, (s) => s.isSubmitting);
  const values = useStore(form.store, (s) => s.values);

  const sources = [
    ...new Set([
      ...(holdings ?? []).map((h) => h.acquisition.source).filter((s): s is string => Boolean(s)),
      ...SOURCE_SUGGESTIONS,
    ]),
  ];
  const detailsOpen =
    mode === 'edit' &&
    Boolean(
      values.fees ||
      values.graded ||
      values.tags.length ||
      values.note ||
      values.acquisitionType !== 'purchase',
    );

  const submit = (next: boolean) => {
    void form.handleSubmit({ next });
  };
  // Enter submits natively (the primary button is the form's default); Shift+Enter adds and
  // moves on to the next card.
  const priceRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const element = formRef.current;
    if (!element || !canNext) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || !event.shiftKey || event.isComposing) return;
      if (!(event.target instanceof HTMLInputElement)) return;
      event.preventDefault();
      void form.handleSubmit({ next: true });
    };
    element.addEventListener('keydown', onKey);
    return () => element.removeEventListener('keydown', onKey);
  }, [canNext, form]);
  // The price is what's typed next (UX_SPEC.md §4.7): also when the form replaces another one in
  // an open sheet (custom item, "& nächste"), where the drawer's focus handling runs after ours.
  useEffect(() => {
    if (mode !== 'add') return undefined;
    let frame = 0;
    const focus = () => priceRef.current?.focus();
    focus();
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(focus);
    });
    return () => cancelAnimationFrame(frame);
  }, [mode]);
  const shown = (errors: readonly unknown[], touched: boolean) =>
    touched || attempts > 0 ? errorText(errors) : undefined;

  const grading = () => (
    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
      <form.Field name="gradingCompany">
        {(field) => (
          <FormRow label={m.holding_grading_company()} htmlFor={`${id}-company`}>
            <NativeSelect
              id={`${id}-company`}
              value={field.state.value}
              onChange={(event) => {
                const next = GRADING_COMPANIES.find((c) => c === event.target.value);
                if (next) field.handleChange(next satisfies GradingCompany);
              }}
            >
              {GRADING_COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {gradingCompanyLabel(c)}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
        )}
      </form.Field>
      {values.gradingCompany === 'other' ? (
        <form.Field name="gradingName">
          {(field) => (
            <FormRow label={m.holding_grading_name()} htmlFor={`${id}-company-name`}>
              <Input
                id={`${id}-company-name`}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </FormRow>
          )}
        </form.Field>
      ) : null}
      <form.Field name="grade">
        {(field) => {
          const error = shown(field.state.meta.errors, field.state.meta.isTouched);
          return (
            <FormRow
              label={m.holding_grade()}
              htmlFor={`${id}-grade`}
              error={error}
              describedBy={`${id}-grade-error`}
            >
              <Input
                id={`${id}-grade`}
                value={field.state.value}
                inputMode="decimal"
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-grade-error` : undefined}
              />
            </FormRow>
          );
        }}
      </form.Field>
      <form.Field name="qualifier">
        {(field) => (
          <FormRow label={m.holding_qualifier()} htmlFor={`${id}-qualifier`}>
            <Input
              id={`${id}-qualifier`}
              value={field.state.value}
              placeholder={m.holding_qualifier_placeholder()}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </FormRow>
        )}
      </form.Field>
      <form.Field name="cert">
        {(field) => (
          <FormRow label={m.holding_cert()} htmlFor={`${id}-cert`}>
            <Input
              id={`${id}-cert`}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              className="font-mono"
            />
          </FormRow>
        )}
      </form.Field>
    </div>
  );

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit(false);
      }}
      className="mt-5 flex flex-col gap-5"
    >
      <ItemHeader info={info} language={values.language} />

      {languages.length > 1 ? (
        <form.Field name="language">
          {(field) => (
            <FormRow label={m.holding_language()}>
              <SegmentedControl<CardLanguage>
                label={m.holding_language()}
                variant="chips"
                value={field.state.value}
                onValueChange={field.handleChange}
                options={languages.map((l) => ({ value: l, label: languageLabel(l) }))}
              />
            </FormRow>
          )}
        </form.Field>
      ) : null}

      {isCard && info.variants.length > 1 ? (
        <form.Field name="variant">
          {(field) => (
            <FormRow label={m.holding_variant()}>
              <SegmentedControl<string>
                label={m.holding_variant()}
                variant="chips"
                value={field.state.value}
                onValueChange={field.handleChange}
                options={info.variants.map((v) => ({ value: v.id, label: v.label }))}
              />
            </FormRow>
          )}
        </form.Field>
      ) : null}

      {isCard ? (
        <form.Field name="condition">
          {(field) => (
            <FormRow label={m.holding_condition()} hint={conditionLabel(field.state.value)}>
              <SegmentedControl<Condition>
                label={m.holding_condition()}
                variant="chips"
                value={field.state.value}
                onValueChange={field.handleChange}
                options={CONDITIONS.map((c) => ({ value: c, label: c }))}
              />
            </FormRow>
          )}
        </form.Field>
      ) : (
        <form.Field name="sealedState">
          {(field) => (
            <FormRow label={m.holding_state()}>
              <SegmentedControl<SealedState>
                label={m.holding_state()}
                variant="chips"
                value={field.state.value}
                onValueChange={field.handleChange}
                options={SEALED_STATES.map((s) => ({ value: s, label: sealedStateLabel(s) }))}
              />
            </FormRow>
          )}
        </form.Field>
      )}

      <form.Field name="quantity">
        {(field) => (
          <FormRow
            label={m.holding_quantity()}
            error={shown(field.state.meta.errors, field.state.meta.isTouched)}
            describedBy={`${id}-quantity-error`}
          >
            <NumberStepper
              id={`${id}-quantity`}
              label={m.holding_quantity()}
              value={field.state.value}
              onValueChange={field.handleChange}
              decrementLabel={m.holding_quantity_less()}
              incrementLabel={m.holding_quantity_more()}
            />
          </FormRow>
        )}
      </form.Field>

      <form.Field name="price">
        {(field) => {
          const error = shown(field.state.meta.errors, field.state.meta.isTouched);
          const total =
            values.quantity > 1 && values.priceMode === 'unit' ? priceTotalOf(values) : undefined;
          return (
            <FormRow
              label={m.holding_price()}
              htmlFor={`${id}-price`}
              error={error}
              hint={
                total
                  ? m.holding_price_total_hint({ total: formatMoney(total) })
                  : m.holding_price_hint()
              }
              describedBy={`${id}-price-hint`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1 basis-40">
                  <MoneyInput
                    id={`${id}-price`}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={`${id}-price-hint`}
                    placeholder="0,00"
                    ref={priceRef}
                    data-initial-focus={mode === 'add' ? '' : undefined}
                  />
                </div>
                {values.quantity > 1 ? (
                  <form.Field name="priceMode">
                    {(modeField) => (
                      <SegmentedControl<PriceMode>
                        label={m.holding_price_mode()}
                        value={modeField.state.value}
                        onValueChange={modeField.handleChange}
                        options={[
                          { value: 'unit', label: m.holding_price_unit() },
                          { value: 'total', label: m.holding_price_total() },
                        ]}
                      />
                    )}
                  </form.Field>
                ) : null}
              </div>
            </FormRow>
          );
        }}
      </form.Field>

      <form.Field name="date">
        {(field) => {
          const error = shown(field.state.meta.errors, field.state.meta.isTouched);
          return (
            <FormRow
              label={m.holding_date()}
              htmlFor={`${id}-date`}
              error={error}
              describedBy={`${id}-date-error`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id={`${id}-date`}
                  type="date"
                  max={today}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${id}-date-error` : undefined}
                  className="w-auto min-w-44 flex-1 basis-44"
                />
                <Button variant="outline" size="sm" onClick={() => field.handleChange(today)}>
                  {m.holding_date_today()}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => field.handleChange(yesterday(today))}
                >
                  {m.holding_date_yesterday()}
                </Button>
              </div>
            </FormRow>
          );
        }}
      </form.Field>

      <form.Field name="source">
        {(field) => (
          <FormRow label={m.holding_source()} htmlFor={`${id}-source`}>
            <Input
              id={`${id}-source`}
              list={`${id}-sources`}
              value={field.state.value}
              placeholder={m.holding_source_placeholder()}
              onChange={(event) => field.handleChange(event.target.value)}
              autoComplete="off"
            />
            <datalist id={`${id}-sources`}>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </datalist>
          </FormRow>
        )}
      </form.Field>

      <form.Subscribe
        selector={(s) => ({
          locationId: s.values.locationId,
          page: s.values.page,
          slot: s.values.slot,
          pageMeta: s.fieldMeta.page,
          slotMeta: s.fieldMeta.slot,
        })}
      >
        {({ locationId, page, slot, pageMeta, slotMeta }) => (
          <LocationFields
            locationId={locationId}
            page={page}
            slot={slot}
            ignoreHoldingId={holdingId}
            pageError={pageMeta ? shown(pageMeta.errors, true) : undefined}
            slotError={slotMeta ? shown(slotMeta.errors, true) : undefined}
            onChange={(next) => {
              if (next.locationId !== undefined) form.setFieldValue('locationId', next.locationId);
              if (next.page !== undefined) form.setFieldValue('page', next.page);
              if (next.slot !== undefined) form.setFieldValue('slot', next.slot);
            }}
          />
        )}
      </form.Subscribe>

      <Disclosure label={m.holding_more()} defaultOpen={detailsOpen}>
        <form.Field name="acquisitionType">
          {(field) => (
            <FormRow label={m.holding_acquisition()}>
              <SegmentedControl<AcquisitionType>
                label={m.holding_acquisition()}
                variant="chips"
                value={field.state.value}
                onValueChange={field.handleChange}
                options={ACQUISITION_TYPES.map((t) => ({ value: t, label: acquisitionLabel(t) }))}
              />
            </FormRow>
          )}
        </form.Field>

        <form.Field name="fees">
          {(field) => {
            const error = shown(field.state.meta.errors, field.state.meta.isTouched);
            return (
              <FormRow
                label={m.holding_fees()}
                htmlFor={`${id}-fees`}
                error={error}
                describedBy={`${id}-fees-error`}
              >
                <MoneyInput
                  id={`${id}-fees`}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${id}-fees-error` : undefined}
                  placeholder="0,00"
                />
              </FormRow>
            );
          }}
        </form.Field>

        {isCard ? (
          <form.Field name="graded">
            {(field) => (
              <div className="flex flex-col gap-4">
                <Switch
                  id={`${id}-graded`}
                  label={m.holding_graded()}
                  hint={m.holding_graded_hint()}
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                />
                {field.state.value ? grading() : null}
              </div>
            )}
          </form.Field>
        ) : null}

        <form.Field name="tags">
          {(field) => <TagsField value={field.state.value} onChange={field.handleChange} />}
        </form.Field>

        <form.Field name="note">
          {(field) => (
            <FormRow label={m.holding_note()} htmlFor={`${id}-note`}>
              <Textarea
                id={`${id}-note`}
                value={field.state.value}
                rows={3}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </FormRow>
          )}
        </form.Field>
      </Disclosure>

      <div className="sticky bottom-0 z-10 -mx-6 mt-2 flex flex-col gap-2 border-t border-line bg-surface-1/95 px-6 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="flex justify-end gap-2">
          {canNext ? (
            <Button
              variant="outline"
              size="lg"
              disabled={submitting}
              onClick={() => submit(true)}
              aria-label={m.holding_submit_next()}
              className="max-sm:flex-1"
            >
              <span className="sm:hidden">{m.holding_submit_next_short()}</span>
              <span className="max-sm:hidden">{m.holding_submit_next()}</span>
            </Button>
          ) : null}
          <Button
            variant="primary"
            size="lg"
            type="submit"
            disabled={submitting}
            className="max-sm:flex-1"
          >
            {mode === 'add' ? m.holding_submit_add() : m.holding_submit_save()}
          </Button>
        </div>
        <span className="type-small text-right text-ink-muted max-sm:hidden">
          {canNext ? m.holding_keys() : m.holding_keys_save()}
        </span>
      </div>
    </form>
  );
}
