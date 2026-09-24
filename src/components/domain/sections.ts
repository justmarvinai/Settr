import type { LoadedSet } from '@/catalog';
import { pickText, type CardSection } from '@/domain/catalog';
import { sectionLabel } from '@/i18n';

/**
 * Section heading: a subset's own name without its main set's (Klassische Sammlung,
 * Trainer-Galerie) or the generic label.
 */
export function sectionTitle(section: CardSection, loaded: LoadedSet): string {
  if (section === 'subset') {
    const subset = loaded.subsets[0];
    const named = loaded.set.sectionNames?.subset;
    if (named) return pickText(named);
    if (subset) {
      const name = pickText(subset.name);
      const parent = pickText(loaded.set.name);
      const own = name.startsWith(parent) ? name.slice(parent.length).replace(/^:?\s+/, '') : '';
      return own || name;
    }
  }
  return sectionLabel(section);
}
