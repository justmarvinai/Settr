import type { CardLanguage } from '@/domain/catalog-types';
import type { Settings } from '@/domain/schemas';

/**
 * The card language a catalog page starts in: the URL's, else the default card language when the
 * set has it, else the first of the user's languages the set has, else the set's first.
 */
export function pickLanguage(
  requested: CardLanguage | undefined,
  available: readonly CardLanguage[],
  settings: Pick<Settings, 'defaultCardLanguage' | 'cardLanguages'>,
): CardLanguage {
  if (requested && available.includes(requested)) return requested;
  if (available.includes(settings.defaultCardLanguage)) return settings.defaultCardLanguage;
  return settings.cardLanguages.find((l) => available.includes(l)) ?? available[0] ?? 'de';
}

/** The set's languages the user collects (all of them when none match, so nothing disappears). */
export function visibleLanguages(
  available: readonly CardLanguage[],
  settings: Pick<Settings, 'cardLanguages'>,
): CardLanguage[] {
  const mine = available.filter((l) => settings.cardLanguages.includes(l));
  return mine.length ? mine : [...available];
}
