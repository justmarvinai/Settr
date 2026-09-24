import type { KeyboardEvent, ReactNode } from 'react';
import { usePriceGuide } from '@/catalog/price-guide';
import { Kbd } from '@/components/ui/Kbd';
import { useSettings } from '@/db';
import {
  guideSuggestion,
  isReverseVariant,
  type GuideSuggestion,
} from '@/domain/catalog/price-guide';
import type { CardLanguage, ItemRef } from '@/domain/catalog-types';
import { todayIso } from '@/domain/ids';
import { money } from '@/domain/money';
import { m } from '@/i18n';
import { formatDate, formatMoney } from '@/i18n/format';

/** A price-guide value picked for the input: saved with `origin: 'guide'` if left as it is. */
export interface GuidePick {
  minor: number;
  type: 'from' | 'trend';
}

export interface Guide {
  suggestion: GuideSuggestion;
  /** What the value covers, in words (R2.6: never shown as if it were the copy's language). */
  scope: string;
  /** What `V` copies: *ab*, else *Trend*. */
  preferred: GuidePick;
}

/**
 * What a guide value covers (DATA_SOURCES.md §8.3). International cards share one Cardmarket
 * product for every language; Asian prints have their own, and Traditional Chinese copies are
 * listed on the Japanese one.
 */
function scopeOf(item: { ref: ItemRef; languages: readonly CardLanguage[] }, lang: CardLanguage) {
  if (item.ref.kind === 'sealed') {
    return item.languages.length > 1 ? m.guide_scope_sealed_all() : m.guide_scope_sealed();
  }
  if (lang === 'zh-tw') return m.guide_scope_ja_tc();
  if (lang === 'ja' || lang === 'zh-cn') return m.guide_scope_countries();
  return m.guide_scope_all();
}

/**
 * The guide's suggestion for a series (PRC-09): only raw copies (the guide knows no grades), only
 * with Einstellungen › Preise › Vorschläge on, only for a known product and a fresh snapshot.
 */
export function useGuide(
  item: { ref: ItemRef; languages: readonly CardLanguage[] },
  language: CardLanguage,
  series: { variant: string; grade: string },
  productId: number | undefined,
): Guide | undefined {
  const settings = useSettings();
  const on = settings.price.guideSuggestions && series.grade === 'raw' && productId !== undefined;
  const snapshot = usePriceGuide(on);
  if (!on) return undefined;
  const suggestion = guideSuggestion(snapshot, productId, {
    today: todayIso(),
    reverse: isReverseVariant(series.variant),
  });
  if (!suggestion) return undefined;
  const preferred: GuidePick | undefined =
    suggestion.low !== undefined
      ? { minor: suggestion.low, type: 'from' }
      : suggestion.trend !== undefined
        ? { minor: suggestion.trend, type: 'trend' }
        : undefined;
  return preferred ? { suggestion, scope: scopeOf(item, language), preferred } : undefined;
}

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={m.guide_pick({ value: label })}
      className="money inline-flex h-9 items-center rounded-pill border border-line-strong px-3.5 type-small font-bold text-ink transition-colors duration-(--dur-fast) hover:border-accent hover:bg-accent-soft hover:text-accent-text"
    >
      {label}
    </button>
  );
}

/**
 * *ab* and *Trend* from the price guide as chips (US-09): dated, scope-labeled, one click copies
 * a value into the input. Nothing is saved until the entry is.
 */
export function GuideChips({
  guide,
  onPick,
  keyHint,
}: {
  guide: Guide;
  onPick: (pick: GuidePick) => void;
  /** The `V` hint, where the input takes it. */
  keyHint?: ReactNode;
}) {
  const { suggestion } = guide;
  return (
    <div className="flex flex-col gap-1.5" title={m.guide_hint()}>
      <span className="type-small text-ink-muted">
        {m.guide_title({ date: formatDate(suggestion.date) })} · {guide.scope}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {suggestion.low !== undefined ? (
          <Chip
            label={m.guide_low({ amount: formatMoney(money(suggestion.low)) })}
            onClick={() => onPick({ minor: suggestion.low ?? 0, type: 'from' })}
          />
        ) : null}
        {suggestion.trend !== undefined ? (
          <Chip
            label={m.guide_trend({ amount: formatMoney(money(suggestion.trend)) })}
            onClick={() => onPick({ minor: suggestion.trend ?? 0, type: 'trend' })}
          />
        ) : null}
        {keyHint}
      </div>
    </div>
  );
}

/** `V` in an amount field copies the preselected suggestion (UX_SPEC.md §7); `Strg V` still pastes. */
export function isGuideKey(event: KeyboardEvent | globalThis.KeyboardEvent): boolean {
  return event.key.toLowerCase() === 'v' && !event.ctrlKey && !event.metaKey && !event.altKey;
}

/** The `V` hint beside the chips, only where there's a keyboard. */
export function GuideKey() {
  return (
    <span className="type-small inline-flex items-center gap-1.5 text-ink-subtle [@media(hover:none)]:hidden">
      <Kbd>{m.key_v()}</Kbd>
      {m.guide_key()}
    </span>
  );
}
