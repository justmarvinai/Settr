import type { LoadedSet } from '@/catalog';
import { pickText, type CardSection } from '@/domain/catalog';
import { sectionLabel } from '@/i18n';

/** Section heading: a subset's own name (Klassische Sammlung) or the generic label. */
export function sectionTitle(section: CardSection, loaded: LoadedSet): string {
  if (section === 'subset') {
    const subset = loaded.subsets[0];
    const named = loaded.set.sectionNames?.subset;
    if (named) return pickText(named);
    if (subset) return pickText(subset.name).replace(`${pickText(loaded.set.name)}: `, '');
  }
  return sectionLabel(section);
}
