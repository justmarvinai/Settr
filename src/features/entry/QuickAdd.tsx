import { useId, useState } from 'react';
import { z } from '@/lib/zod';
import { useCatalogSet, type LoadedSet } from '@/catalog';
import { sectionTitle } from '@/components/domain/sections';
import { FormRow } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { db, setUiPref, useLocations, useSettings, useUiPref } from '@/db';
import {
  CARD_SECTIONS,
  pickLanguage,
  pickText,
  visibleLanguages,
  type CardSection,
} from '@/domain/catalog';
import {
  CARD_LANGUAGES,
  CONDITIONS,
  type CardLanguage,
  type Condition,
} from '@/domain/catalog-types';
import { todayIso } from '@/domain/ids';
import type { Location } from '@/domain/schemas';
import { languageCode, m } from '@/i18n';
import { conditionLabel } from '@/i18n/collection-labels';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { SheetLoading } from './HoldingSheet';
import { QuickEntry, type QuickDefaults } from './QuickEntry';

/** Sticky defaults kept per device (kv `ui:quick`). */
const quickPrefsSchema = z
  .object({
    language: z.enum(CARD_LANGUAGES).optional(),
    condition: z.enum(CONDITIONS).optional(),
    source: z.string().max(80).optional(),
    date: z.string().optional(),
    locationId: z.string().optional(),
  })
  .catch({});

/** Schnellerfassung for a set (COL-06, UX_SPEC.md §4.8). */
export function QuickAddBody({
  setId,
  language,
}: {
  setId: string;
  language?: CardLanguage | undefined;
}) {
  const loaded = useCatalogSet(setId);
  const settings = useSettings();
  const locations = useLocations();
  const stored = useUiPref('quick');
  if (!locations || !stored) return <SheetLoading />;
  const prefs = quickPrefsSchema.parse(stored.value ?? {});
  const languages = visibleLanguages(loaded.set.languages, settings);
  const initial: QuickDefaults = {
    language: pickLanguage(language ?? prefs.language, languages, settings),
    condition: prefs.condition ?? settings.defaultCondition,
    section: '',
    source: prefs.source ?? '',
    // A remembered date only counts for today's session; older ones start empty (unknown).
    date: prefs.date === todayIso() ? prefs.date : '',
    locationId: locations.some((l) => l.id === prefs.locationId) ? (prefs.locationId ?? '') : '',
  };
  return (
    <QuickAddPanel loaded={loaded} languages={languages} locations={locations} initial={initial} />
  );
}

function QuickAddPanel({
  loaded,
  languages,
  locations,
  initial,
}: {
  loaded: LoadedSet;
  languages: readonly CardLanguage[];
  locations: readonly Location[];
  initial: QuickDefaults;
}) {
  const id = useId();
  const [defaults, setDefaults] = useState(initial);
  const sections = CARD_SECTIONS.filter((s) => loaded.cards.some((c) => c.section === s));
  const change = (patch: Partial<QuickDefaults>) => {
    const next = { ...defaults, ...patch };
    setDefaults(next);
    void setUiPref(db, 'quick', {
      language: next.language,
      condition: next.condition,
      source: next.source || undefined,
      date: next.date || undefined,
      locationId: next.locationId || undefined,
    });
  };

  return (
    <div className="mt-2 flex flex-col gap-5">
      <p className="type-body m-0 text-ink-muted">{pickText(loaded.set.name)}</p>

      <fieldset className="m-0 flex flex-col gap-4 rounded-[18px] border-0 bg-hover p-4">
        <legend className="type-label float-left mb-1 p-0 text-ink-muted">
          {m.quick_defaults()}
        </legend>
        {languages.length > 1 ? (
          <FormRow label={m.holding_language()} className="clear-both">
            <SegmentedControl<CardLanguage>
              label={m.holding_language()}
              value={defaults.language}
              onValueChange={(language) => change({ language })}
              options={languages.map((l) => ({ value: l, label: languageCode(l) }))}
            />
          </FormRow>
        ) : null}
        <div className="grid clear-both grid-cols-2 gap-3 max-sm:grid-cols-1">
          <FormRow label={m.holding_condition()} htmlFor={`${id}-condition`}>
            <NativeSelect
              id={`${id}-condition`}
              value={defaults.condition}
              onChange={(event) => {
                const condition = CONDITIONS.find((c) => c === event.target.value);
                if (condition) change({ condition: condition satisfies Condition });
              }}
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {m.quick_condition_option({ code: c, name: conditionLabel(c) })}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow label={m.quick_section()} htmlFor={`${id}-section`}>
            <NativeSelect
              id={`${id}-section`}
              value={defaults.section}
              onChange={(event) => {
                const section = sections.find((s) => s === event.target.value);
                change({ section: section ?? '' });
              }}
            >
              <option value="">{m.quick_section_all()}</option>
              {sections.map((s: CardSection) => (
                <option key={s} value={s}>
                  {sectionTitle(s, loaded)}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow label={m.holding_source()} htmlFor={`${id}-source`}>
            <Input
              id={`${id}-source`}
              value={defaults.source}
              placeholder={m.holding_source_placeholder()}
              onChange={(event) => change({ source: event.target.value })}
            />
          </FormRow>
          <FormRow label={m.holding_date()} htmlFor={`${id}-date`} hint={m.quick_date_hint()}>
            <Input
              id={`${id}-date`}
              type="date"
              max={todayIso()}
              value={defaults.date}
              onChange={(event) => change({ date: event.target.value })}
            />
          </FormRow>
          <FormRow
            label={m.holding_location()}
            htmlFor={`${id}-location`}
            className="col-span-full"
          >
            <NativeSelect
              id={`${id}-location`}
              value={defaults.locationId}
              onChange={(event) => change({ locationId: event.target.value })}
            >
              <option value="">{m.holding_location_none()}</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
        </div>
      </fieldset>

      <QuickEntry loaded={loaded} defaults={defaults} locations={locations} />
    </div>
  );
}
