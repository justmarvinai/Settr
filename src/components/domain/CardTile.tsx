import type { CSSProperties, ReactNode } from 'react';
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
  owned,
  ownedText,
  ownedLabel,
  ghost = false,
  meta,
  artStyle,
}: {
  image: CatalogImage | undefined;
  number: string;
  name: string;
  nameLang: string;
  rarity?: string;
  /** Small note on the picture, e.g. `EN` when it shows another language. */
  badge?: ReactNode;
  missingLabel: string;
  /** Copies you own (a "×2" badge); 0 or undefined shows none. */
  owned?: number | undefined;
  /** The badge text ("×2") and its screen-reader text ("2 im Besitz"). */
  ownedText?: string | undefined;
  ownedLabel?: string | undefined;
  /** A card you don't own yet in a set you collect: faded, with a dashed outline. */
  ghost?: boolean;
  /** Second caption line, e.g. a lot's "×2 · DE · NM" in the collection. */
  meta?: ReactNode;
  /** The picture's style, e.g. its view-transition name on the way back from the card (DSN-02). */
  artStyle?: CSSProperties | undefined;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        data-card-art
        style={artStyle}
        className="relative transition-transform duration-(--dur-fast) group-hover:-translate-y-0.5"
      >
        <div
          className={
            ghost
              ? // Only the picture fades: a placeholder's text keeps its contrast (WCAG 1.4.3).
                'rounded-[4.2%/3%] outline-2 outline-offset-[-2px] outline-line-strong outline-dashed [&_img]:opacity-40 [&_img]:grayscale'
              : undefined
          }
        >
          <CardImage image={image} size="small" alt="" label={missingLabel} />
        </div>
        {owned ? (
          <span className="absolute top-[4%] left-[5%] rounded-pill bg-ink px-2 py-0.5 font-mono text-[12px] leading-4 font-bold text-canvas shadow-[0_4px_10px_-4px_oklch(0_0_0/0.5)]">
            <span aria-hidden>{ownedText ?? owned}</span>
            {ownedLabel ? <span className="sr-only">{ownedLabel}</span> : null}
          </span>
        ) : null}
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
      {meta ? (
        <div className="-mt-1 min-w-0 truncate px-0.5 font-mono text-[12px] leading-4 text-ink-muted">
          {meta}
        </div>
      ) : null}
    </div>
  );
}
