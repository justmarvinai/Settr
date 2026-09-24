import { ArrowRightIcon, CheckCircleIcon, WarningIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, type NavigateOptions } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { manifestQuery } from '@/catalog';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { db, updateSettings, useSettings } from '@/db/core';
import { pickText } from '@/domain/catalog';
import {
  ACTIVE_CARD_LANGUAGES,
  isActiveCardLanguage,
  type ActiveCardLanguage,
} from '@/domain/catalog-types';
import type { Settings } from '@/domain/schemas';
import { languageLabel, m } from '@/i18n';
import { requestPersistence } from '@/lib/storage';
import { isIOS, promptInstall, useInstall } from '@/features/pwa';
import { markOnboarded } from './state';

const STEPS = 3;

/** A new step starts at the top, its heading focused so screen readers announce it. */
const focusOnMount = (node: HTMLElement | null) => {
  if (!node) return;
  window.scrollTo({ top: 0 });
  node.focus({ preventScroll: true });
};

function Field({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <span className="type-ui text-ink">{label}</span>
        <span className="type-small text-ink-muted">{hint}</span>
      </div>
      {children}
    </div>
  );
}

function Done({ children }: { children: ReactNode }) {
  return (
    <p className="type-body m-0 flex items-center gap-2 text-ink">
      <CheckCircleIcon size={22} weight="fill" className="shrink-0 text-gain" aria-hidden />
      {children}
    </p>
  );
}

/** Step 1: what Settr is, and the card languages you collect. */
function Welcome({
  languages,
  language,
}: {
  languages: ActiveCardLanguage[];
  language: ActiveCardLanguage;
}) {
  // As in Einstellungen: at least one language stays, and the default stays among them.
  const setLanguages = (next: ActiveCardLanguage[]) => {
    if (next.length === 0) return;
    const patch: Partial<Settings> = { cardLanguages: next };
    if (!next.includes(language)) patch.defaultCardLanguage = next[0] ?? 'de';
    void updateSettings(db, patch);
  };
  return (
    <>
      <p className="type-body m-0 max-w-[60ch] text-ink-muted">{m.onboarding_intro()}</p>
      <Field label={m.onboarding_languages()} hint={m.onboarding_languages_hint()}>
        <ChipGroup
          label={m.onboarding_languages()}
          value={languages}
          onValueChange={setLanguages}
          options={ACTIVE_CARD_LANGUAGES.map((value) => ({ value, label: languageLabel(value) }))}
        />
      </Field>
    </>
  );
}

/** Step 2: local storage, persistence, installing, and what erases it (ADR-027). */
function YourData() {
  const [persist, setPersist] = useState<boolean>();
  const { promptEvent, installed } = useInstall();
  const ios = isIOS();
  return (
    <>
      <p className="type-body m-0 max-w-[60ch] text-ink-muted">{m.onboarding_data_body()}</p>
      <section className="flex flex-col gap-2.5" aria-labelledby="onboarding-persist">
        <h3 id="onboarding-persist" className="type-h3 m-0">
          {m.settings_data_persist_action()}
        </h3>
        {persist ? (
          <Done>{m.settings_data_persisted()}</Done>
        ) : (
          <>
            <p className="type-small m-0 text-ink-muted">{m.onboarding_persist_body()}</p>
            <Button
              className="w-fit"
              onClick={() => void requestPersistence().then((granted) => setPersist(granted))}
            >
              {m.settings_data_persist_action()}
            </Button>
            {persist === false ? (
              <output className="type-small m-0 block text-ink-muted">
                {m.settings_data_persist_denied()}
              </output>
            ) : null}
          </>
        )}
      </section>
      <section className="flex flex-col gap-2.5" aria-labelledby="onboarding-install">
        <h3 id="onboarding-install" className="type-h3 m-0">
          {m.settings_data_install_title()}
        </h3>
        {installed ? (
          <Done>{m.settings_data_install_done()}</Done>
        ) : (
          <>
            <p className="type-small m-0 text-ink-muted">
              {ios ? m.install_ios() : m.settings_data_install_body()}
            </p>
            {promptEvent ? (
              <Button variant="primary" className="w-fit" onClick={() => void promptInstall()}>
                {m.settings_data_install_action()}
              </Button>
            ) : ios ? null : (
              <p className="type-small m-0 text-ink-muted">{m.settings_data_install_manual()}</p>
            )}
          </>
        )}
      </section>
      {ios ? null : (
        <section
          className="flex gap-3 rounded-card bg-warn-soft p-4"
          aria-labelledby="onboarding-exit"
        >
          <WarningIcon size={22} weight="bold" className="mt-0.5 shrink-0 text-warn" aria-hidden />
          <div className="flex flex-col gap-1">
            <h3 id="onboarding-exit" className="type-ui m-0 text-ink">
              {m.settings_data_exit_title()}
            </h3>
            <p className="type-small m-0 text-ink-muted">{m.settings_data_exit_body()}</p>
          </div>
        </section>
      )}
    </>
  );
}

/** Step 3: the language you collect most, then into the set (or a backup instead). */
function Start({
  languages,
  language,
  finish,
}: {
  languages: ActiveCardLanguage[];
  language: ActiveCardLanguage;
  finish: (target: NavigateOptions) => void;
}) {
  const manifest = useQuery(manifestQuery).data;
  const set = manifest?.sets.find((s) => s.kind === 'main' && s.languages.includes(language));
  return (
    <>
      <p className="type-body m-0 max-w-[60ch] text-ink-muted">{m.onboarding_start_body()}</p>
      {languages.length > 1 ? (
        <Field label={m.onboarding_default_language()} hint={m.onboarding_default_language_hint()}>
          <SegmentedControl
            variant="chips"
            label={m.onboarding_default_language()}
            value={language}
            onValueChange={(value) => void updateSettings(db, { defaultCardLanguage: value })}
            options={languages.map((value) => ({ value, label: languageLabel(value) }))}
          />
        </Field>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={() =>
            finish(
              set
                ? {
                    to: '/catalog/sets/$setId',
                    params: { setId: set.id },
                    search: { lang: language },
                  }
                : { to: '/catalog' },
            )
          }
        >
          {set ? m.onboarding_open_set({ set: pickText(set.name) }) : m.nav_catalog()}
          <ArrowRightIcon size={18} weight="bold" aria-hidden />
        </Button>
        <Button onClick={() => finish({ to: '/settings/data', hash: 'settings-import' })}>
          {m.onboarding_have_backup()}
        </Button>
      </div>
    </>
  );
}

/**
 * First run (APP-06, UX_SPEC.md §4.14), three steps without demo data (I-19): the card languages
 * you collect, why and how your data stays safe on this device, then your first set. Every choice
 * is saved at once and can be changed in Einstellungen; "Überspringen" is always there.
 */
export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const settings = useSettings();
  const languages = settings.cardLanguages.filter(isActiveCardLanguage);
  const language = isActiveCardLanguage(settings.defaultCardLanguage)
    ? settings.defaultCardLanguage
    : (languages[0] ?? 'de');

  // Each step announces itself: its heading takes focus (not on the first render).
  const [moved, setMoved] = useState(false);
  const go = (next: number) => {
    setMoved(true);
    setStep(next);
  };

  const finish = (target: NavigateOptions) => {
    markOnboarded();
    void navigate(target);
  };

  const titles = [
    m.overview_welcome_title(),
    m.overview_storage_title(),
    m.onboarding_start_title(),
  ];
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="type-label text-ink-muted">
          {m.onboarding_step({ step: step + 1, total: STEPS })}
        </span>
        <button
          type="button"
          onClick={() => finish({ to: '/' })}
          className="inline-flex h-11 items-center rounded-pill px-3 type-ui text-ink-muted hover:bg-hover hover:text-ink"
        >
          {m.onboarding_skip()}
        </button>
      </div>
      <Panel className="flex flex-col gap-6 p-6 sm:p-8" aria-labelledby="onboarding-title">
        <div className="flex flex-col gap-2">
          {step === 0 ? (
            <span className="type-label text-accent-text uppercase">{m.app_tagline()}</span>
          ) : null}
          <h2
            key={step}
            id="onboarding-title"
            ref={moved ? focusOnMount : undefined}
            tabIndex={-1}
            className="type-display m-0 outline-none"
          >
            {titles[step]}
          </h2>
        </div>
        {step === 0 ? <Welcome languages={languages} language={language} /> : null}
        {step === 1 ? <YourData /> : null}
        {step === 2 ? <Start languages={languages} language={language} finish={finish} /> : null}
      </Panel>
      <div className="flex items-center justify-between gap-3 px-1">
        {step > 0 ? <Button onClick={() => go(step - 1)}>{m.onboarding_back()}</Button> : <span />}
        {step < STEPS - 1 ? (
          <Button variant="primary" onClick={() => go(step + 1)}>
            {m.onboarding_next()}
            <ArrowRightIcon size={18} weight="bold" aria-hidden />
          </Button>
        ) : null}
      </div>
      <ol aria-hidden className="m-0 flex list-none justify-center gap-2 p-0">
        {Array.from({ length: STEPS }, (_, index) => (
          <li
            // oxlint-disable-next-line react/no-array-index-key -- a fixed row of step dots
            key={index}
            className={
              index === step
                ? 'h-2 w-6 rounded-pill bg-accent'
                : 'size-2 rounded-pill bg-hover-strong'
            }
          />
        ))}
      </ol>
    </div>
  );
}
