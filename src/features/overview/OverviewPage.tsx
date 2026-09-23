import { ArrowRightIcon, CardsThreeIcon, SquaresFourIcon, TagIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { m } from '@/i18n';

/** Übersicht in M1: an honest welcome and what comes next. No demo data (I-19). */
export function OverviewPage() {
  const steps = [
    { icon: SquaresFourIcon, text: m.overview_step_catalog() },
    { icon: CardsThreeIcon, text: m.overview_step_collection() },
    { icon: TagIcon, text: m.overview_step_prices() },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      <Panel className="flex flex-col gap-5 p-8">
        <h2 className="type-display m-0">{m.overview_welcome_title()}</h2>
        <p className="type-body m-0 max-w-[60ch] text-ink-muted">{m.overview_welcome_body()}</p>
        <div className="flex flex-col gap-3">
          <h3 className="type-h3 m-0">{m.overview_next_steps()}</h3>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {steps.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 rounded-card bg-hover px-4 py-3 type-ui"
              >
                <Icon size={22} aria-hidden className="shrink-0 text-accent-text" />
                {text}
              </li>
            ))}
          </ol>
        </div>
      </Panel>
      <Panel className="flex flex-col gap-4">
        <h2 className="type-h2 m-0">{m.overview_storage_title()}</h2>
        <p className="type-body m-0 text-ink-muted">{m.overview_storage_body()}</p>
        <Link
          to="/settings/data"
          className={buttonVariants({ variant: 'primary', className: 'w-fit' })}
        >
          {m.overview_storage_action()}
          <ArrowRightIcon size={18} weight="bold" aria-hidden />
        </Link>
      </Panel>
    </div>
  );
}
