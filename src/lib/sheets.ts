import { create } from 'zustand';
import type { CardLanguage, ItemRef } from '@/domain/catalog-types';

/**
 * The collection's sheets (UX_SPEC.md §2.2: add/edit flows open as sheets, so context is never
 * lost). Any page asks for one here; the app shell loads the sheets on first use and renders the
 * current one. Ephemeral UI state, so a tiny Zustand store (ARCHITECTURE.md §5).
 */
export type SheetRequest =
  /** Add a lot of a card, product or custom item. `setId` is the card's set (its chunk). */
  | { type: 'add'; item: ItemRef; setId?: string | undefined; language?: CardLanguage | undefined }
  | { type: 'edit'; holdingId: string }
  /** Sell, trade, give away or write off units of a lot (COL-11). */
  | { type: 'dispose'; holdingId: string }
  /** Open a sealed product and log its pulls (COL-12). */
  | { type: 'open'; holdingId: string }
  /** The lot's own value per copy, *Eigener Wert* (PRC-07). */
  | { type: 'value'; holdingId: string }
  /**
   * Record a price (PRC-01, UX_SPEC.md §4.9) for an item in one language; a card's variant and
   * grade preselect its series. `holdingId` is the lot it came from: its snapshot stands in when
   * the catalog lacks the item.
   */
  | {
      type: 'price';
      item: ItemRef;
      setId?: string | undefined;
      language: CardLanguage;
      variant?: string | undefined;
      grade?: string | undefined;
      holdingId?: string | undefined;
    }
  /** Schnellerfassung for a set (COL-06). */
  | { type: 'quick'; setId: string; language?: CardLanguage | undefined }
  /** Create a custom item (CAT-08), then add a lot of it. */
  | { type: 'custom'; kind: 'card' | 'sealed'; name?: string | undefined };

interface SheetState {
  /** The last request stays while the sheet animates out. */
  request: SheetRequest | null;
  /** Counts requests, so a new one starts with a fresh form even for the same item. */
  seq: number;
  open: boolean;
  show: (request: SheetRequest) => void;
  hide: () => void;
}

export const useSheets = create<SheetState>((set) => ({
  request: null,
  seq: 0,
  open: false,
  show: (request) => set((state) => ({ request, open: true, seq: state.seq + 1 })),
  hide: () => set({ open: false }),
}));

export const openSheet = (request: SheetRequest) => useSheets.getState().show(request);
export const closeSheet = () => useSheets.getState().hide();
