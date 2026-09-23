/** Controlled vocabularies shared by catalog and user data (DATA_MODEL.md §3, §4.1, §5.2). */

export const PRINTS = ['intl', 'asia'] as const;
export type Print = (typeof PRINTS)[number];

/** TCGdex language codes. fr/it/es/pt/ko stay valid values but are disabled in v1 (Q3.3). */
export const CARD_LANGUAGES = [
  'de',
  'en',
  'ja',
  'zh-tw',
  'zh-cn',
  'fr',
  'it',
  'es',
  'pt',
  'ko',
] as const;
export type CardLanguage = (typeof CARD_LANGUAGES)[number];

/** Active in v1 for cards and sealed products (Q3.3, R2.3). */
export const ACTIVE_CARD_LANGUAGES = [
  'de',
  'en',
  'ja',
  'zh-cn',
  'zh-tw',
] as const satisfies readonly CardLanguage[];
export type ActiveCardLanguage = (typeof ACTIVE_CARD_LANGUAGES)[number];

export function isActiveCardLanguage(value: string): value is ActiveCardLanguage {
  return (ACTIVE_CARD_LANGUAGES as readonly string[]).includes(value);
}

/** Cardmarket condition scale, best first. */
export const CONDITIONS = ['MT', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO'] as const;
export type Condition = (typeof CONDITIONS)[number];

/** True when `condition` is at least as good as `minimum` (e.g. "NM or better", R2.2). */
export function meetsCondition(condition: Condition, minimum: Condition): boolean {
  return CONDITIONS.indexOf(condition) <= CONDITIONS.indexOf(minimum);
}

export const GRADING_COMPANIES = [
  'PSA',
  'BGS',
  'CGC',
  'TAG',
  'ACE',
  'SGC',
  'GMA',
  'PCA',
  'other',
] as const;
export type GradingCompany = (typeof GRADING_COMPANIES)[number];

export type ItemKind = 'card' | 'sealed';
export interface ItemRef {
  readonly kind: ItemKind;
  readonly id: string;
}
