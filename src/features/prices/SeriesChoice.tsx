import { useState } from 'react';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { STANDARD_VARIANT } from '@/domain/catalog';
import type { CardLanguage } from '@/domain/catalog-types';
import { remaining, type Holding, type PriceEntry } from '@/domain/schemas';
import { cardSeriesKey, gradeKey, sealedSeriesKey, type GradeKey } from '@/domain/series';
import { m } from '@/i18n';
import { gradingText } from '@/i18n/collection-labels';
import type { PricedItem, SeriesTarget } from './record';
import { isGradeKey, oldestFirst } from './series';

/** Grades with a series in this language: ungraded, the graded lots and grades with entries. */
function gradeOptions(
  holdings: readonly Holding[],
  entries: readonly PriceEntry[],
  language: CardLanguage,
): Map<string, string> {
  const options = new Map<string, string>([['raw', m.prices_series_raw()]]);
  for (const h of holdings) {
    if (h.language === language && h.grading)
      options.set(gradeKey(h.grading), gradingText(h.grading));
  }
  for (const e of entries) {
    if (e.language === language && !options.has(e.grade))
      options.set(e.grade, e.grade.toUpperCase());
  }
  return options;
}

/** The variant you own in this language (open lots, in the card's order), else the first. */
export function ownedVariant(
  item: Pick<PricedItem, 'variants'>,
  holdings: readonly Holding[],
  language: CardLanguage,
): string | undefined {
  const open = holdings.filter((h) => h.language === language && remaining(h) > 0);
  return (
    item.variants.find((v) => open.some((h) => (h.variant ?? STANDARD_VARIANT) === v.id))?.id ??
    item.variants[0]?.id
  );
}

export interface SeriesChoice extends SeriesTarget {
  setVariant: (variant: string) => void;
  setGrade: (grade: GradeKey) => void;
  grades: ReadonlyMap<string, string>;
  keyFor: (language: CardLanguage) => string;
  /** The chosen series' entries, oldest first. */
  series: PriceEntry[];
  latest: PriceEntry | undefined;
}

/**
 * Which series of an item the price views show (DATA_MODEL.md §6.1): the language is given (every
 * price belongs to its card language, R2.6); a card's variant and grade are chosen.
 */
export function useSeriesChoice(
  item: PricedItem,
  language: CardLanguage,
  entries: readonly PriceEntry[] | undefined,
  holdings: readonly Holding[] | undefined,
  initial: { variant?: string | undefined; grade?: string | undefined } = {},
): SeriesChoice {
  const [variantChoice, setVariant] = useState(
    initial.variant ?? item.variants[0]?.id ?? STANDARD_VARIANT,
  );
  const [gradeChoice, setGrade] = useState<GradeKey>(
    initial.grade && isGradeKey(initial.grade) ? initial.grade : 'raw',
  );
  const variant = item.variants.some((v) => v.id === variantChoice)
    ? variantChoice
    : (item.variants[0]?.id ?? STANDARD_VARIANT);
  const grades =
    item.ref.kind === 'card'
      ? gradeOptions(holdings ?? [], entries ?? [], language)
      : new Map<string, string>();
  const grade = grades.has(gradeChoice) ? gradeChoice : 'raw';
  const keyFor = (lang: CardLanguage) =>
    item.ref.kind === 'sealed'
      ? sealedSeriesKey(item.ref.id, lang)
      : cardSeriesKey(item.ref.id, lang, variant, grade);
  const seriesKey = keyFor(language);
  const series = (entries ?? []).filter((e) => e.seriesKey === seriesKey).toSorted(oldestFirst);
  return {
    item,
    language,
    variant,
    grade,
    seriesKey,
    setVariant,
    setGrade,
    grades,
    keyFor,
    series,
    latest: series.at(-1),
  };
}

/** Variant and grade pickers, shown only where an item has more than one. */
export function SeriesSelectors({ choice }: { choice: SeriesChoice }) {
  const { item, grades } = choice;
  if (item.variants.length <= 1 && grades.size <= 1) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {item.variants.length > 1 ? (
        <SegmentedControl
          label={m.prices_variant()}
          variant="chips"
          value={choice.variant}
          onValueChange={choice.setVariant}
          options={item.variants.map((v) => ({ value: v.id, label: v.label }))}
        />
      ) : null}
      {grades.size > 1 ? (
        <label className="flex items-center gap-2 type-small text-ink-muted">
          {m.prices_series()}
          <NativeSelect
            value={choice.grade}
            onChange={(event) => {
              if (isGradeKey(event.target.value)) choice.setGrade(event.target.value);
            }}
            className="h-10 w-auto"
          >
            {[...grades].map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </label>
      ) : null}
    </div>
  );
}
