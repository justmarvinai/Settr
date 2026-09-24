import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { manifestQuery } from '@/catalog';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { db, updateSettings, useSettings, useSnapshots, type SettingsPatch } from '@/db';
import {
  ACTIVE_CARD_LANGUAGES,
  CONDITIONS,
  isActiveCardLanguage,
  type ActiveCardLanguage,
  type Condition,
} from '@/domain/catalog-types';
import { PRICE_TYPES, type MotionLevel, type Settings, type Theme } from '@/domain/schemas';
import { languageLabel, m } from '@/i18n';
import { conditionLabel } from '@/i18n/collection-labels';
import { formatDate } from '@/i18n/format';
import { priceTypeLabel } from '@/i18n/price-labels';
import {
  BackupSection,
  CsvSection,
  ImportSection,
  InstallSection,
  SnapshotsSection,
  StorageSection,
  WipeSection,
} from '@/features/data';
import { changeDisplay } from '@/features/appearance';
import { LocationsManager, toastError } from '@/features/collection';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Panel aria-labelledby={id} className="flex flex-col gap-5">
      <h2 id={id} className="type-h2 m-0">
        {title}
      </h2>
      {children}
    </Panel>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <span className="type-ui text-ink">{label}</span>
        {hint ? <span className="type-small text-ink-muted">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function GeneralSettings() {
  const settings = useSettings();
  const languages = settings.cardLanguages.filter(isActiveCardLanguage);
  const defaultLanguage = isActiveCardLanguage(settings.defaultCardLanguage)
    ? settings.defaultCardLanguage
    : 'de';
  const options = ACTIVE_CARD_LANGUAGES.map((value) => ({
    value,
    label: languageLabel(value),
  }));
  const defaultOptions = options.filter((o) => languages.includes(o.value));

  const setLanguages = (next: ActiveCardLanguage[]) => {
    if (next.length === 0) return; // at least one language stays active
    const patch: Partial<Settings> = { cardLanguages: next };
    if (!next.includes(defaultLanguage)) patch.defaultCardLanguage = next[0] ?? 'de';
    void updateSettings(db, patch);
  };

  return (
    <Section id="settings-general" title={m.settings_section_general()}>
      <Field label={m.settings_general_languages()} hint={m.settings_general_languages_hint()}>
        <ChipGroup
          label={m.settings_general_languages()}
          value={languages}
          onValueChange={setLanguages}
          options={options}
        />
      </Field>
      <Field label={m.settings_general_default_language()}>
        <SegmentedControl
          variant="chips"
          label={m.settings_general_default_language()}
          value={defaultLanguage}
          onValueChange={(value) => void updateSettings(db, { defaultCardLanguage: value })}
          options={defaultOptions}
        />
      </Field>
      <p className="type-small m-0 text-ink-muted">{m.settings_general_ui_language()}</p>
    </Section>
  );
}

export function AppearanceSettings() {
  const settings = useSettings();
  const setDisplay = (patch: Partial<Settings['display']>) => {
    void changeDisplay(settings.display, patch); // instant feedback, stored after
  };
  return (
    <Section id="settings-appearance" title={m.settings_section_appearance()}>
      <Field label={m.settings_appearance_theme()} hint={m.settings_appearance_theme_hint()}>
        <SegmentedControl<Theme>
          label={m.settings_appearance_theme()}
          value={settings.display.theme}
          onValueChange={(theme) => setDisplay({ theme })}
          options={[
            { value: 'system', label: m.settings_appearance_theme_system() },
            { value: 'light', label: m.settings_appearance_theme_light() },
            { value: 'dark', label: m.settings_appearance_theme_dark() },
          ]}
        />
      </Field>
      <Switch
        id="reduce-transparency"
        label={m.settings_appearance_transparency()}
        hint={m.settings_appearance_transparency_hint()}
        checked={settings.display.reduceTransparency}
        onCheckedChange={(reduceTransparency) => setDisplay({ reduceTransparency })}
      />
      <Field label={m.settings_appearance_motion()}>
        <SegmentedControl<MotionLevel>
          label={m.settings_appearance_motion()}
          value={settings.display.motion}
          onValueChange={(motion) => setDisplay({ motion })}
          options={[
            { value: 'full', label: m.settings_appearance_motion_full() },
            { value: 'reduced', label: m.settings_appearance_motion_reduced() },
            { value: 'off', label: m.settings_appearance_motion_off() },
          ]}
        />
      </Field>
    </Section>
  );
}

const STALE_DAYS = [7, 14, 30, 60, 90] as const;

const setPrice = (patch: SettingsPatch['price']) =>
  void updateSettings(db, { price: patch }).catch(toastError);

/** Einstellungen › Preise (UX_SPEC.md §4.13, R2.2): how prices are entered, linked and valued. */
export function PriceSettings() {
  const { price } = useSettings();
  const stale = STALE_DAYS.map(String);
  return (
    <Section id="settings-prices" title={m.settings_prices_summary()}>
      <Field label={m.settings_prices_type()} hint={m.settings_prices_type_hint()}>
        <div className="sm:w-72">
          <NativeSelect
            aria-label={m.settings_prices_type()}
            value={price.defaultType}
            onChange={(event) => {
              const next = PRICE_TYPES.find((t) => t === event.target.value);
              if (next) setPrice({ defaultType: next });
            }}
          >
            {PRICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {priceTypeLabel(t)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </Field>
      <Field label={m.settings_prices_filters()} hint={m.settings_prices_filters_hint()}>
        <span className="flex flex-col gap-0.5">
          <span className="type-small text-ink-muted">{m.settings_prices_country()}</span>
          <span className="type-body text-ink">{m.settings_prices_country_de()}</span>
        </span>
        <Switch
          id="price-match-language"
          label={m.settings_prices_match_language()}
          hint={m.settings_prices_match_language_hint()}
          checked={price.cardmarket.matchLanguage}
          onCheckedChange={(matchLanguage) => setPrice({ cardmarket: { matchLanguage } })}
        />
        <span className="type-small text-ink-muted">{m.settings_prices_min_condition()}</span>
        <SegmentedControl<Condition>
          label={m.settings_prices_min_condition()}
          value={price.cardmarket.minCondition}
          onValueChange={(minCondition) => setPrice({ cardmarket: { minCondition } })}
          options={CONDITIONS.map((c) => ({ value: c, label: c }))}
        />
        <span className="type-small text-ink-muted">
          {m.price_context_min({ condition: conditionLabel(price.cardmarket.minCondition) })}
        </span>
      </Field>
      <Switch
        id="price-guide"
        label={m.settings_prices_guide()}
        hint={m.settings_prices_guide_hint()}
        checked={price.guideSuggestions}
        onCheckedChange={(guideSuggestions) => setPrice({ guideSuggestions })}
      />
      <Field label={m.settings_prices_stale()}>
        <SegmentedControl
          label={m.settings_prices_stale()}
          value={stale.includes(String(price.staleAfterDays)) ? String(price.staleAfterDays) : ''}
          onValueChange={(days) => setPrice({ staleAfterDays: Number(days) })}
          options={stale.map((days) => ({
            value: days,
            label: m.settings_prices_stale_value({ days }),
          }))}
        />
      </Field>
      <Field label={m.settings_prices_unpriced()} hint={m.settings_prices_unpriced_hint()}>
        <SegmentedControl<Settings['price']['unpriced']>
          label={m.settings_prices_unpriced()}
          value={price.unpriced}
          onValueChange={(unpriced) => setPrice({ unpriced })}
          options={[
            { value: 'exclude', label: m.settings_prices_unpriced_exclude() },
            { value: 'cost', label: m.settings_prices_unpriced_cost() },
          ]}
        />
      </Field>
    </Section>
  );
}

export function LocationSettings() {
  return <LocationsManager />;
}

export function DataSettings() {
  const snapshots = useSnapshots();
  return (
    <div className="flex flex-col gap-4">
      <Section id="settings-backup" title={m.settings_data_backup()}>
        <BackupSection />
      </Section>
      <Section id="settings-import" title={m.settings_data_import()}>
        <ImportSection />
      </Section>
      {snapshots?.length ? (
        <Section id="settings-snapshots" title={m.settings_data_snapshots()}>
          <SnapshotsSection snapshots={snapshots} />
        </Section>
      ) : null}
      <Section id="settings-csv" title={m.settings_data_csv()}>
        <CsvSection />
      </Section>
      <Section id="settings-storage" title={m.settings_data_storage()}>
        <StorageSection />
      </Section>
      <Section id="settings-install" title={m.settings_data_install_title()}>
        <InstallSection />
      </Section>
      <Section id="settings-exit" title={m.settings_data_exit_title()}>
        <p className="type-body m-0 text-ink-muted">{m.settings_data_exit_body()}</p>
      </Section>
      <Section id="settings-wipe" title={m.settings_data_wipe()}>
        <WipeSection />
      </Section>
    </div>
  );
}

export function AboutSettings() {
  const catalog = useQuery(manifestQuery).data;
  return (
    <Section id="settings-about" title={m.app_tagline_long()}>
      <div className="flex flex-col gap-3">
        <p className="type-ui m-0">
          {m.settings_about_version({ version: import.meta.env.VITE_APP_VERSION })}
        </p>
        <p className="type-small m-0 text-ink-muted">
          {catalog
            ? m.settings_about_catalog({
                version: catalog.catalogVersion,
                date: formatDate(new Date(catalog.generatedAt)),
              })
            : m.settings_about_catalog_loading()}
        </p>
        <p className="type-small m-0 text-ink-muted">{m.settings_about_credits()}</p>
        <p className="type-small m-0 text-ink-muted">{m.settings_about_privacy()}</p>
        <p className="type-small m-0 text-ink-subtle">{m.settings_about_disclaimer()}</p>
      </div>
    </Section>
  );
}
