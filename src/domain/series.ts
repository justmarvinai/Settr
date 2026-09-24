import type { CardLanguage, GradingCompany } from './catalog-types';
import { STANDARD_VARIANT } from './catalog/vocab';
import type { Holding } from './schemas/holding';

/**
 * Price series keys (DATA_MODEL.md §6.1). All raw copies of the same card, language and variant
 * share one series; graded copies get their own series per company + grade.
 * Every price belongs to its card language (R2.6): the language is always part of the key.
 */

export interface GradingLike {
  readonly company: GradingCompany;
  readonly companyName?: string | undefined;
  readonly grade: string;
  readonly qualifier?: string | undefined;
}

export type GradeKey = 'raw' | `${string}-${string}`;

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Like slug(), but never empty: symbols-only values (e.g. `★`) become their code points. */
function slugOrCodes(value: string): string {
  return (
    slug(value) || Array.from(value, (c) => c.codePointAt(0)?.toString(16) ?? '').join('.') || 'x'
  );
}

export function gradeKey(grading?: GradingLike | null): GradeKey {
  if (!grading) return 'raw';
  const company =
    grading.company === 'other'
      ? slug(grading.companyName ?? 'other') || 'other'
      : grading.company.toLowerCase();
  const grade = [
    slugOrCodes(grading.grade),
    grading.qualifier ? slugOrCodes(grading.qualifier) : '',
  ]
    .filter(Boolean)
    .join('-');
  return `${company}-${grade}`;
}

export function cardSeriesKey(
  cardId: string,
  language: CardLanguage,
  variant: string,
  grade: GradeKey,
): string {
  return `card|${cardId}|${language}|${variant}|${grade}`;
}

export function sealedSeriesKey(productId: string, language: CardLanguage): string {
  return `sealed|${productId}|${language}`;
}

/** The series a lot is valued by: its item, language, variant and grade (DATA_MODEL.md §6.1). */
export function seriesKeyOf(h: Pick<Holding, 'item' | 'language' | 'variant' | 'grading'>): string {
  return h.item.kind === 'sealed'
    ? sealedSeriesKey(h.item.id, h.language)
    : cardSeriesKey(h.item.id, h.language, h.variant ?? STANDARD_VARIANT, gradeKey(h.grading));
}
