import type { Holding, Location } from '@/domain/schemas';
import { m } from '@/i18n';

/** "VaultX 9er · Seite 4 · Platz 7" */
export function locationText(
  location: Holding['location'],
  locations: readonly Location[],
): string | undefined {
  if (!location) return undefined;
  const name = locations.find((l) => l.id === location.id)?.name;
  if (!name) return undefined;
  if (location.page && location.slot) {
    return m.lot_location_slot({ name, page: location.page, slot: location.slot });
  }
  if (location.page) return m.lot_location_page({ name, page: location.page });
  return name;
}
