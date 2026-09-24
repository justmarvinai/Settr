import { ArrowSquareOutIcon, BugIcon, KeyboardIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { manifestQuery } from '@/catalog';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Panel } from '@/components/ui/Panel';
import { toastManager } from '@/components/ui/Toasts';
import { m } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { copyErrorReport } from '@/lib/error-log';
import { showShortcuts } from '@/lib/shortcuts';

/** The sources the catalog is built from (DATA_SOURCES.md §9); names and licenses aren't translated. */
const SOURCES: { name: string; href: string; what: () => string; license?: string }[] = [
  { name: 'TCGdex', href: 'https://tcgdex.dev', what: m.about_source_tcgdex, license: 'MIT' },
  {
    name: 'PTCG-database (type-null)',
    href: 'https://github.com/type-null/PTCG-database',
    what: m.about_source_ptcg,
    license: 'MIT',
  },
  {
    name: 'PokéAPI',
    href: 'https://pokeapi.co',
    what: m.about_source_pokeapi,
    license: 'BSD-3-Clause',
  },
  { name: 'TCGCSV', href: 'https://tcgcsv.com', what: m.about_source_tcgcsv },
  { name: 'Cardmarket', href: 'https://www.cardmarket.com', what: m.about_source_cardmarket },
];

/** Self-hosted fonts (DESIGN_SYSTEM.md §4), all under the SIL Open Font License 1.1. */
const FONTS = ['Mona Sans', 'Geist Mono', 'Noto Sans JP · SC · TC'];

/** The main libraries in the app; licenses.txt has every package with its full text. */
const LIBRARIES: [name: string, license: string][] = [
  ['React', 'MIT'],
  ['TanStack Router, Query, Form, Virtual', 'MIT'],
  ['Base UI', 'MIT'],
  ['Tailwind CSS', 'MIT'],
  ['Dexie', 'Apache-2.0'],
  ['Zod', 'MIT'],
  ['Zustand', 'MIT'],
  ['MiniSearch', 'MIT'],
  ['Paraglide JS', 'MIT'],
  ['Phosphor Icons', 'MIT'],
  ['Workbox', 'MIT'],
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Panel aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="type-h2 m-0">
        {title}
      </h2>
      {children}
    </Panel>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-bold text-accent-text underline decoration-1 underline-offset-2 hover:decoration-2"
    >
      {children}
      <ArrowSquareOutIcon size={14} weight="bold" aria-hidden />
      <span className="sr-only">{m.about_new_tab()}</span>
    </a>
  );
}

async function copyReport(catalogVersion: string | undefined): Promise<void> {
  const copied = await copyErrorReport({
    app: import.meta.env.VITE_APP_VERSION,
    catalog: catalogVersion,
  });
  toastManager.add(
    copied
      ? { title: m.report_copied(), description: m.report_copied_body() }
      : { title: m.report_copy_failed(), description: m.report_copy_failed_body() },
  );
}

/**
 * Einstellungen › Über & Rechtliches (APP-08, UX_SPEC.md §4.13): version and catalog, the sources
 * and open-source credits, the privacy note and the disclaimer. No Impressum while Settr is
 * private (ADR-022).
 */
export function AboutSettings() {
  const catalog = useQuery(manifestQuery).data;
  return (
    <div className="flex flex-col gap-4">
      <Panel aria-labelledby="about-title" className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <Logo size={48} />
          <div className="flex min-w-0 flex-col">
            <h2 id="about-title" className="type-display-m m-0">
              {m.app_name()}
            </h2>
            <p className="type-body m-0 text-ink-muted">{m.app_tagline_long()}</p>
          </div>
        </div>
        <p className="type-body m-0 max-w-[60ch]">{m.about_intro()}</p>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
          <dt className="type-small text-ink-muted">{m.about_version_label()}</dt>
          <dd className="m-0 font-mono text-[14px] text-ink">{import.meta.env.VITE_APP_VERSION}</dd>
          <dt className="type-small text-ink-muted">{m.about_catalog_label()}</dt>
          <dd className="m-0 font-mono text-[14px] text-ink">
            {catalog
              ? m.about_catalog_value({
                  version: catalog.catalogVersion,
                  date: formatDate(new Date(catalog.generatedAt)),
                })
              : m.settings_about_catalog_loading()}
          </dd>
        </dl>
        <div className="flex flex-wrap gap-3">
          <Button onClick={showShortcuts}>
            <KeyboardIcon size={20} weight="bold" aria-hidden />
            {m.shortcuts_title()}
          </Button>
          <Button onClick={() => void copyReport(catalog?.catalogVersion)}>
            <BugIcon size={20} weight="bold" aria-hidden />
            {m.report_copy()}
          </Button>
        </div>
        <p className="type-small m-0 max-w-[60ch] text-ink-muted">{m.about_report_hint()}</p>
      </Panel>

      <Section id="about-sources" title={m.about_sources_title()}>
        <p className="type-body m-0 max-w-[60ch] text-ink-muted">{m.about_sources_intro()}</p>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {SOURCES.map((source) => (
            <li key={source.name} className="flex flex-col gap-0.5">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <ExternalLink href={source.href}>{source.name}</ExternalLink>
                {source.license ? (
                  <span className="font-mono text-[12px] text-ink-muted">{source.license}</span>
                ) : null}
              </span>
              <span className="type-small text-ink-muted">{source.what()}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="about-open-source" title={m.about_open_source_title()}>
        <p className="type-body m-0 max-w-[60ch] text-ink-muted">{m.about_open_source_intro()}</p>
        <div className="flex flex-col gap-1">
          <h3 className="type-label m-0 text-ink-subtle uppercase">{m.about_fonts_title()}</h3>
          <p className="type-ui m-0">{FONTS.join(' · ')}</p>
          <p className="type-small m-0 text-ink-muted">{m.about_fonts_license()}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="type-label m-0 text-ink-subtle uppercase">{m.about_libraries_title()}</h3>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-6 gap-y-1.5 p-0">
            {LIBRARIES.map(([name, license]) => (
              <li key={name} className="flex items-baseline justify-between gap-3">
                <span className="type-ui">{name}</span>
                <span className="font-mono text-[12px] text-ink-muted">{license}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="type-small m-0 max-w-[60ch] text-ink-muted">{m.about_holo_note()}</p>
        <p className="m-0">
          <ExternalLink href="/licenses.txt">{m.about_licenses_link()}</ExternalLink>
        </p>
      </Section>

      <Section id="about-privacy" title={m.about_privacy_title()}>
        <ul className="type-body m-0 flex max-w-[65ch] list-disc flex-col gap-2 pl-5">
          <li>{m.about_privacy_none()}</li>
          <li>{m.about_privacy_local()}</li>
          <li>{m.about_privacy_hosts()}</li>
          <li>{m.about_privacy_cardmarket()}</li>
          <li>{m.about_privacy_errors()}</li>
        </ul>
      </Section>

      <Section id="about-legal" title={m.about_legal_title()}>
        <p className="type-body m-0 max-w-[65ch]">{m.about_disclaimer()}</p>
        <p className="type-small m-0 max-w-[65ch] text-ink-muted">{m.about_copyright()}</p>
        <p className="type-small m-0 max-w-[65ch] text-ink-muted">{m.about_prices_note()}</p>
      </Section>
    </div>
  );
}
