import { Link } from '@tanstack/react-router';
import { Suspense } from 'react';
import { useCatalogSet, useManifest } from '@/catalog';
import { SetProgressRing } from '@/components/domain/SetProgressRing';
import { useHoldings } from '@/db';
import { chunkSetId, pickText } from '@/domain/catalog';
import type { CardLanguage } from '@/domain/catalog-types';
import { collectedSets, ratio } from '@/domain/collection';
import { useSetOwnership } from '@/features/collection';
import { languageCode, languageLabel, m } from '@/i18n';
import { formatShare } from '@/i18n/format';
import { SIDE_ITEM_CLASS } from './nav';

const MAX_SETS = 4;

function SetLink({ setId, language }: { setId: string; language: CardLanguage }) {
  const loaded = useCatalogSet(setId);
  const { completion } = useSetOwnership(loaded, language);
  const share = ratio(completion.basis);
  const name = pickText(loaded.set.name);
  return (
    <Link
      to="/catalog/sets/$setId"
      params={{ setId }}
      search={{ lang: language }}
      aria-label={m.sidebar_set_label({
        name,
        language: languageLabel(language),
        share: formatShare(share),
      })}
      className={SIDE_ITEM_CLASS}
    >
      <SetProgressRing value={share} size={22} thickness={3} />
      <span className="min-w-0 flex-1 truncate max-lg:hidden">{name}</span>
      <span className="font-mono text-[11px] text-ink-subtle max-lg:hidden">
        {languageCode(language)}
      </span>
    </Link>
  );
}

/**
 * The sidebar's sets (UX_SPEC.md §3.2): the sets you collect, most lots first, each with its Basis
 * ring in the language you collect most. It stays useful as sets are added after v1 (R2.5).
 */
export default function SidebarSets() {
  const manifest = useManifest();
  const holdings = useHoldings();
  if (!holdings) return null;
  const sets: { setId: string; language: CardLanguage }[] = [];
  for (const entry of collectedSets(holdings, (id) => chunkSetId(id, manifest.sets))) {
    if (sets.length === MAX_SETS) break;
    if (!sets.some((s) => s.setId === entry.setId)) sets.push(entry);
  }
  if (!sets.length) return null;
  return (
    <div className="mt-5 flex flex-col gap-1">
      <span id="sidebar-sets" className="px-3 type-label text-ink-subtle uppercase max-lg:sr-only">
        {m.nav_sets_heading()}
      </span>
      <ul aria-labelledby="sidebar-sets" className="m-0 flex list-none flex-col gap-1 p-0">
        {sets.map(({ setId, language }) => (
          <li key={setId}>
            <Suspense fallback={<span className="block h-11" />}>
              <SetLink setId={setId} language={language} />
            </Suspense>
          </li>
        ))}
      </ul>
    </div>
  );
}
