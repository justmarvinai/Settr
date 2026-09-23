import type { ReactNode } from 'react';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { db, updateSettings, useSettings } from '@/db';
import {
  ACTIVE_CARD_LANGUAGES,
  isActiveCardLanguage,
  type ActiveCardLanguage,
} from '@/domain/catalog-types';
import type { MotionLevel, Settings, Theme } from '@/domain/schemas';
import { m } from '@/i18n';
import { InstallSection, StorageSection } from '@/features/data';
import { ComingSoon } from '@/components/ui/ComingSoon';
import { applyDisplay } from '@/features/appearance';

const LANGUAGE_LABELS: Record<ActiveCardLanguage, () => string> = {
  de: m.language_de,
  en: m.language_en,
  ja: m.language_ja,
  'zh-cn': m.language_zh_cn,
  'zh-tw': m.language_zh_tw,
};

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
    label: LANGUAGE_LABELS[value](),
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
    applyDisplay({ ...settings.display, ...patch }); // instant feedback
    void updateSettings(db, { display: patch });
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-line pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:gap-6">
      <dt className="type-small text-ink-muted sm:w-48">{label}</dt>
      <dd className="type-ui m-0 text-ink">{value}</dd>
    </div>
  );
}

export function PriceSettings() {
  const settings = useSettings();
  return (
    <Section id="settings-prices" title={m.settings_prices_summary()}>
      <dl className="m-0 flex flex-col gap-3">
        <Row label={m.settings_prices_type()} value={m.settings_prices_type_value()} />
        <Row label={m.settings_prices_filters()} value={m.settings_prices_filters_value()} />
        <Row
          label={m.settings_prices_stale()}
          value={m.settings_prices_stale_value({ days: settings.price.staleAfterDays })}
        />
      </dl>
      <p className="type-small m-0 text-ink-muted">{m.settings_prices_more()}</p>
    </Section>
  );
}

export function LocationSettings() {
  return <ComingSoon badge={m.page_coming_title()} body={m.settings_locations_coming()} />;
}

export function DataSettings() {
  return (
    <div className="flex flex-col gap-4">
      <Section id="settings-storage" title={m.settings_data_storage()}>
        <StorageSection />
      </Section>
      <Section id="settings-install" title={m.settings_data_install_title()}>
        <InstallSection />
      </Section>
      <Section id="settings-exit" title={m.settings_data_exit_title()}>
        <p className="type-body m-0 text-ink-muted">{m.settings_data_exit_body()}</p>
      </Section>
      <Section id="settings-backup" title={m.settings_data_backup()}>
        <p className="type-body m-0 text-ink-muted">{m.settings_data_backup_coming()}</p>
      </Section>
    </div>
  );
}

export function AboutSettings() {
  return (
    <Section id="settings-about" title={m.app_tagline_long()}>
      <div className="flex flex-col gap-3">
        <p className="type-ui m-0">
          {m.settings_about_version({ version: import.meta.env.VITE_APP_VERSION })}
        </p>
        <p className="type-small m-0 text-ink-muted">{m.settings_about_catalog()}</p>
        <p className="type-small m-0 text-ink-muted">{m.settings_about_credits()}</p>
        <p className="type-small m-0 text-ink-muted">{m.settings_about_privacy()}</p>
        <p className="type-small m-0 text-ink-subtle">{m.settings_about_disclaimer()}</p>
      </div>
    </Section>
  );
}
