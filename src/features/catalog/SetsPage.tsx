import { getRouteApi, Link } from '@tanstack/react-router';
import { useManifest } from '@/catalog';
import { CardImage } from '@/components/domain/CardImage';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { groupBySeries, pickText, type CatalogSetSummary } from '@/domain/catalog';
import { languageCode, m, printLabel } from '@/i18n';
import { formatCount } from '@/i18n/format';
import { setReleaseText } from './dates';

const route = getRouteApi('/catalog/');

export type PrintFilter = 'all' | 'intl' | 'asia';

/**
 * Katalog › Sets (CAT-01, UX_SPEC.md §4.2): every set from the manifest, grouped by series with
 * sticky headers, filtered by print. Needs no set chunk, so it scales to many sets (ADR-028).
 */
export function SetsPage() {
  const { print = 'all' } = route.useSearch();
  const navigate = route.useNavigate();
  const manifest = useManifest();
  const main = manifest.sets.filter((s) => s.kind === 'main');
  const groups = groupBySeries(main.filter((s) => print === 'all' || s.print === print));
  const subsetsOf = (id: string) => manifest.sets.filter((s) => s.parentSetId === id);

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl<PrintFilter>
        label={m.catalog_print_label()}
        value={print}
        onValueChange={(next) =>
          void navigate({ search: { print: next === 'all' ? undefined : next } })
        }
        options={[
          { value: 'all', label: m.catalog_print_all() },
          { value: 'intl', label: printLabel('intl') },
          { value: 'asia', label: printLabel('asia') },
        ]}
      />
      {groups.length === 0 ? (
        <p className="type-body m-0 text-ink-muted">{m.catalog_sets_empty()}</p>
      ) : null}
      {groups.map((group) => (
        <section
          key={group.id}
          aria-labelledby={`series-${group.id}`}
          className="flex flex-col gap-3"
        >
          <h2
            id={`series-${group.id}`}
            className="type-h2 m-0 flex items-baseline gap-2 px-1 text-ink"
          >
            {pickText(group.name)}
            <span className="type-small text-ink-muted">{formatCount(group.sets.length)}</span>
          </h2>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4 p-0">
            {group.sets.map((set) => (
              <li key={set.id}>
                <SetTile set={set} subsets={subsetsOf(set.id)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SetTile({ set, subsets }: { set: CatalogSetSummary; subsets: CatalogSetSummary[] }) {
  const lang = set.languages[0] ?? 'de';
  const total = set.counts.total + subsets.reduce((sum, s) => sum + s.counts.total, 0);
  return (
    <Link
      to="/catalog/sets/$setId"
      params={{ setId: set.id }}
      className="group tile flex min-h-[220px] gap-5 overflow-hidden p-5 transition-shadow duration-(--dur-fast) hover:shadow-[var(--tile-shadow),inset_0_0_0_1.5px_var(--border-strong)]"
    >
      <div className="w-[30%] max-w-[128px] shrink-0 -rotate-3 self-center transition-transform duration-(--dur-base) group-hover:-rotate-1">
        <CardImage
          image={set.cover?.images[lang]}
          size="small"
          alt=""
          className="shadow-[0_12px_28px_-14px_oklch(0_0_0/0.45)]"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="type-label text-ink-subtle uppercase">
          {[printLabel(set.print), set.code].filter(Boolean).join(' · ')}
        </span>
        <h3 className="type-h1 m-0 text-[clamp(22px,2vw,30px)] leading-[1.05] text-ink [font-stretch:100%] [overflow-wrap:anywhere]">
          {pickText(set.name)}
        </h3>
        <p className="type-small m-0 text-ink-muted">{setReleaseText(set)}</p>
        <p className="type-small m-0 text-ink-muted">
          {m.catalog_set_cards({ count: total })}
          {' · '}
          {m.catalog_set_main({ count: set.counts.official })}
        </p>
        {subsets.map((subset) => (
          <p key={subset.id} className="type-small m-0 text-ink-muted">
            {m.catalog_set_subset({ name: pickText(subset.name), count: subset.counts.total })}
          </p>
        ))}
        <ul className="m-0 mt-auto flex list-none flex-wrap gap-1.5 p-0">
          {set.languages.map((l) => (
            <li
              key={l}
              className="rounded-pill bg-hover px-2.5 py-1 font-mono text-[12px] leading-4 text-ink-muted"
            >
              {languageCode(l)}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
