import type { Holding } from '../schemas/holding';
import { isOpen } from '../schemas/holding';
import type { Location } from '../schemas/misc';

/**
 * Binder slots (DATA_MODEL.md §5.6, Q5.7, ADR-023). A page is one side of a sheet; slots are
 * 1-based, left→right, top→bottom. Occupancy is a hint, not a rule: a pocket can hold a stack.
 */

export interface SlotPosition {
  page: number;
  slot: number;
}

export type BinderLayout = NonNullable<Location['layout']>;

/** The binders Marvin uses (Q5.7): VaultX 3×3 and Withyu 12-pocket (3×4 or 4×3). */
export const BINDER_LAYOUTS: readonly BinderLayout[] = [
  { columns: 3, rows: 3 },
  { columns: 3, rows: 4 },
  { columns: 4, rows: 3 },
];

export function pocketsPerPage(layout: BinderLayout): number {
  return layout.columns * layout.rows;
}

/** Row and column (1-based) of a slot, e.g. slot 7 in 3×3 = row 3, column 1. */
export function slotCell(slot: number, layout: BinderLayout): { row: number; column: number } {
  return {
    row: Math.floor((slot - 1) / layout.columns) + 1,
    column: ((slot - 1) % layout.columns) + 1,
  };
}

const key = ({ page, slot }: SlotPosition) => `${page}:${slot}`;

/** Slots taken by open lots in `locationId`. */
export function occupiedSlots(
  holdings: readonly Pick<Holding, 'location' | 'quantity' | 'disposals'>[],
  locationId: string,
): SlotPosition[] {
  const taken: SlotPosition[] = [];
  for (const h of holdings) {
    const loc = h.location;
    if (!loc || loc.id !== locationId || !loc.page || !loc.slot || !isOpen(h)) continue;
    taken.push({ page: loc.page, slot: loc.slot });
  }
  return taken;
}

/**
 * The first free pocket (lowest page, then slot), or undefined when a binder with a page count is
 * full. Without a page count, pages never run out.
 */
export function nextFreeSlot(
  occupied: readonly SlotPosition[],
  layout: BinderLayout,
  pages?: number,
): SlotPosition | undefined {
  const perPage = pocketsPerPage(layout);
  if (perPage <= 0) return undefined;
  const taken = new Set(occupied.map(key));
  const lastPage = pages ?? Math.max(1, ...occupied.map((o) => o.page)) + 1;
  for (let page = 1; page <= lastPage; page += 1) {
    for (let slot = 1; slot <= perPage; slot += 1) {
      if (!taken.has(key({ page, slot }))) return { page, slot };
    }
  }
  return undefined;
}

/** The pocket after `position` in reading order (for "Hinzufügen & nächste"). */
export function slotAfter(
  position: SlotPosition,
  layout: BinderLayout,
  pages?: number,
): SlotPosition | undefined {
  const perPage = pocketsPerPage(layout);
  const next =
    position.slot < perPage
      ? { page: position.page, slot: position.slot + 1 }
      : { page: position.page + 1, slot: 1 };
  return pages !== undefined && next.page > pages ? undefined : next;
}

export function isOccupied(occupied: readonly SlotPosition[], position: SlotPosition): boolean {
  return occupied.some((o) => o.page === position.page && o.slot === position.slot);
}

/** True when the position exists in the binder. */
export function isValidSlot(position: SlotPosition, layout: BinderLayout, pages?: number): boolean {
  return (
    Number.isInteger(position.page) &&
    Number.isInteger(position.slot) &&
    position.page >= 1 &&
    position.slot >= 1 &&
    position.slot <= pocketsPerPage(layout) &&
    (pages === undefined || position.page <= pages)
  );
}
