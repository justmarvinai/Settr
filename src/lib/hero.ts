import type { CSSProperties } from 'react';
import { motionWanted } from './motion';

/**
 * The grid → detail morph (DSN-02, DESIGN_SYSTEM.md §7 moment 1): a tile's picture and the card
 * page's hero share one `view-transition-name`, so the browser morphs one into the other. A name
 * must be unique on the page, so only the clicked tile (or, on the way back, the tile of the card
 * you came from) carries it.
 */
export const HERO_NAME = 'card-hero';

/** Marks the picture inside a tile (CardTile). */
export const HERO_ART = 'data-card-art';

let heroCard: string | undefined;

/** The card page tells the grid which tile to name on the way back. */
export function setHeroCard(id: string): void {
  heroCard = id;
}

/** The style of a tile's picture: named when it's the card you came from. */
export function heroStyle(cardId: string): CSSProperties | undefined {
  return heroCard === cardId ? { viewTransitionName: HERO_NAME } : undefined;
}

/** A tile was clicked: its picture takes the name, every other picture drops it. */
export function nameHeroTile(tile: HTMLElement, cardId: string): void {
  for (const art of document.querySelectorAll<HTMLElement>(`[${HERO_ART}]`)) {
    art.style.removeProperty('view-transition-name');
  }
  tile
    .querySelector<HTMLElement>(`[${HERO_ART}]`)
    ?.style.setProperty('view-transition-name', HERO_NAME);
  heroCard = cardId;
}

/** Morphs only where the browser has them and motion is wanted (the OS and Darstellung). */
export function morphWanted(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document && motionWanted();
}
