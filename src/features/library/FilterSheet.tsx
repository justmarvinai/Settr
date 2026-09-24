import { useId } from 'react';
import { Button } from '@/components/ui/Button';
import { FormRow } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Sheet } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { useSettings } from '@/db';
import { todayIso } from '@/domain/ids';
import { collectionSearchSchema, type CollectionSearch } from '@/domain/collection';
import { languageLabel, m, productTypeLabel, rarityLabel } from '@/i18n';
import { conditionLabel, sealedStateLabel } from '@/i18n/collection-labels';
import { formatCount } from '@/i18n/format';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { NO_FILTERS, type FilterOptions } from './library-options';
import type { LibraryKind } from '@/features/collection';

const fields = /* @__PURE__ */ collectionSearchSchema.shape;

/** A choice with a single value filters nothing, unless it's the active one. */
const offer = (count: number, active: unknown) => count > 1 || active !== undefined;

function Choice({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string | undefined;
  options: readonly { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
}) {
  return (
    <FormRow label={label} htmlFor={id}>
      <NativeSelect
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        <option value="">{m.library_filter_any()}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </FormRow>
  );
}

/**
 * Every filter of Sammlung › Karten / Sealed (UX_SPEC.md §4.6) in a sheet: right on desktop, from
 * the bottom on phones. Filters apply as they change; the footer shows how many lots match.
 */
export function FilterSheet({
  open,
  onOpenChange,
  kind,
  search,
  update,
  options,
  matches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: LibraryKind;
  search: CollectionSearch;
  update: (patch: Partial<CollectionSearch>) => void;
  options: FilterOptions;
  /** Lots the current filters show. */
  matches: number;
}) {
  const id = useId();
  const desktop = useMediaQuery('(min-width: 768px)');
  const staleAfterDays = useSettings().price.staleAfterDays;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={m.library_filters_title()}
      side={desktop ? 'right' : 'bottom'}
      flush
    >
      <div className="flex min-h-full flex-col">
        <div className="mt-2 flex flex-1 flex-col gap-5 pb-6">
          {offer(options.sets.length, search.set) ? (
            <Choice
              id={`${id}-set`}
              label={m.library_filter_set()}
              value={search.set}
              options={options.sets.map((s) => ({ value: s.id, label: s.name }))}
              onChange={(set) => update({ set })}
            />
          ) : null}
          {offer(options.languages.length, search.lang) ? (
            <Choice
              id={`${id}-lang`}
              label={m.holding_language()}
              value={search.lang}
              options={options.languages.map((l) => ({ value: l, label: languageLabel(l) }))}
              onChange={(lang) => update({ lang: fields.lang.parse(lang) })}
            />
          ) : null}
          {kind === 'card' && offer(options.rarities.length, search.rarity) ? (
            <Choice
              id={`${id}-rarity`}
              label={m.catalog_filter_rarity()}
              value={search.rarity}
              options={options.rarities.map((r) => ({ value: r, label: rarityLabel(r) }))}
              onChange={(rarity) => update({ rarity })}
            />
          ) : null}
          {kind === 'card' && offer(options.variants.length, search.variant) ? (
            <Choice
              id={`${id}-variant`}
              label={m.holding_variant()}
              value={search.variant}
              options={options.variants.map((v) => ({ value: v.id, label: v.name }))}
              onChange={(variant) => update({ variant })}
            />
          ) : null}
          {kind === 'card' && offer(options.conditions.length, search.cond) ? (
            <Choice
              id={`${id}-cond`}
              label={m.holding_condition()}
              value={search.cond}
              options={options.conditions.map((c) => ({ value: c, label: conditionLabel(c) }))}
              onChange={(cond) => update({ cond: fields.cond.parse(cond) })}
            />
          ) : null}
          {kind === 'card' && (options.graded || search.graded) ? (
            <Choice
              id={`${id}-graded`}
              label={m.library_filter_graded()}
              value={search.graded}
              options={[
                { value: 'yes', label: m.library_filter_graded_yes() },
                { value: 'no', label: m.library_filter_graded_no() },
              ]}
              onChange={(graded) => update({ graded: fields.graded.parse(graded) })}
            />
          ) : null}
          {kind === 'sealed' && offer(options.types.length, search.type) ? (
            <Choice
              id={`${id}-type`}
              label={m.catalog_filter_product_type()}
              value={search.type}
              options={options.types.map((t) => ({ value: t, label: productTypeLabel(t) }))}
              onChange={(type) => update({ type })}
            />
          ) : null}
          {kind === 'sealed' ? (
            <Choice
              id={`${id}-state`}
              label={m.holding_state()}
              value={search.state}
              options={[
                { value: 'sealed', label: sealedStateLabel('sealed') },
                { value: 'damaged', label: sealedStateLabel('damaged') },
              ]}
              onChange={(state) => update({ state: fields.state.parse(state) })}
            />
          ) : null}
          {options.tags.length || search.tag ? (
            <Choice
              id={`${id}-tag`}
              label={m.library_filter_tag()}
              value={search.tag}
              options={options.tags.map((t) => ({ value: t.id, label: t.name }))}
              onChange={(tag) => update({ tag })}
            />
          ) : null}
          {offer(options.locations.length, search.loc) ? (
            <Choice
              id={`${id}-loc`}
              label={m.holding_location()}
              value={search.loc}
              options={options.locations.map((l) => ({ value: l.id, label: l.name }))}
              onChange={(loc) => update({ loc })}
            />
          ) : null}
          {(options.priced && options.unpriced) || search.priced ? (
            <Choice
              id={`${id}-priced`}
              label={m.library_filter_priced()}
              value={search.priced}
              options={[
                { value: 'yes', label: m.library_filter_priced_yes() },
                { value: 'no', label: m.library_filter_priced_no() },
              ]}
              onChange={(priced) => update({ priced: fields.priced.parse(priced) })}
            />
          ) : null}
          {options.gains || options.losses || search.pl ? (
            <Choice
              id={`${id}-pl`}
              label={m.library_filter_pl()}
              value={search.pl}
              options={[
                { value: 'gain', label: m.library_filter_pl_gain() },
                { value: 'loss', label: m.library_filter_pl_loss() },
              ]}
              onChange={(pl) => update({ pl: fields.pl.parse(pl) })}
            />
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <FormRow label={m.library_filter_from()} htmlFor={`${id}-from`}>
              <Input
                id={`${id}-from`}
                type="date"
                max={search.to ?? todayIso()}
                value={search.from ?? ''}
                onChange={(event) => update({ from: fields.from.parse(event.target.value) })}
              />
            </FormRow>
            <FormRow label={m.library_filter_to()} htmlFor={`${id}-to`}>
              <Input
                id={`${id}-to`}
                type="date"
                min={search.from}
                max={todayIso()}
                value={search.to ?? ''}
                onChange={(event) => update({ to: fields.to.parse(event.target.value) })}
              />
            </FormRow>
          </div>
          {options.stale || search.stale ? (
            <Switch
              id={`${id}-stale`}
              label={m.library_filter_stale()}
              hint={m.library_filter_stale_hint({ days: formatCount(staleAfterDays) })}
              checked={Boolean(search.stale)}
              onCheckedChange={(stale) => update({ stale: stale || undefined })}
            />
          ) : null}
          {options.closed || search.closed ? (
            <Switch
              id={`${id}-closed`}
              label={m.library_filter_closed()}
              hint={m.library_filter_closed_hint()}
              checked={Boolean(search.closed)}
              onCheckedChange={(closed) => update({ closed: closed || undefined })}
            />
          ) : null}
        </div>
        <div className="sticky bottom-0 z-10 -mx-6 flex gap-3 border-t border-line bg-surface-1/95 px-6 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] backdrop-blur-md">
          <Button
            variant="outline"
            size="lg"
            onClick={() => update({ ...NO_FILTERS, q: search.q })}
          >
            {m.library_filters_reset()}
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {m.library_filters_show({ n: matches, count: formatCount(matches) })}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
