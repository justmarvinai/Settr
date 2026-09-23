import type { ReactNode } from 'react';
import type { CatalogImage } from '@/domain/catalog';
import { htmlLang } from '@/i18n';
import { CardImage } from './CardImage';

/**
 * Grid tile of a card (UX_SPEC.md §4.3): picture, number, name in the chosen language and the
 * rarity abbreviation. Presentational; the caller wraps it in a link and names it for screen
 * readers, so the picture itself stays decorative here.
 */
export function CardTile({
  image,
  number,
  name,
  nameLang,
  rarity,
  badge,
  missingLabel,
}: {
  image: CatalogImage | undefined;
  number: string;
  name: string;
  nameLang: string;
  rarity?: string;
  /** Small note on the picture, e.g. `EN` when it shows another language. */
  badge?: ReactNode;
  missingLabel: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="relative transition-transform duration-(--dur-fast) group-hover:-translate-y-0.5">
        <CardImage image={image} size="small" alt="" label={missingLabel} />
        {badge ? (
          <span className="absolute bottom-[4%] left-[5%] rounded-pill bg-[color-mix(in_oklch,var(--bg)_86%,transparent)] px-1.5 py-0.5 font-mono text-[11px] leading-none font-semibold text-ink-muted">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 items-baseline gap-1.5 px-0.5">
        {number ? (
          <span className="shrink-0 font-mono text-[12px] leading-4 text-ink-muted">{number}</span>
        ) : null}
        <span lang={htmlLang(nameLang)} className="min-w-0 truncate type-small text-ink">
          {name}
        </span>
        {rarity ? (
          <span className="ml-auto shrink-0 font-mono text-[11px] leading-4 text-ink-muted">
            {rarity}
          </span>
        ) : null}
      </div>
    </div>
  );
}
