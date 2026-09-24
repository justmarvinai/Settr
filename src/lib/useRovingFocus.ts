import { useEffect, type RefObject } from 'react';
import { isPlain } from './keys';

/** A tile: its main element (`[data-roving]`, a link or button) plus any controls on it. */
const TILE = '[data-roving-tile]';
const MAIN = '[data-roving]';
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';

function tilesOf(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(TILE)];
}

function mainOf(tile: HTMLElement): HTMLElement | null {
  return tile.querySelector<HTMLElement>(MAIN);
}

/** The tile in the nearest row below (1) or above (-1), closest to the current column. */
function vertical(
  tiles: HTMLElement[],
  current: HTMLElement,
  direction: 1 | -1,
): HTMLElement | undefined {
  const box = current.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const boxes = tiles.map((tile) => ({ tile, rect: tile.getBoundingClientRect() }));
  let rowDistance = Infinity;
  for (const { rect } of boxes) {
    const dy = (rect.top - box.top) * direction;
    if (dy > box.height / 2 && dy < rowDistance) rowDistance = dy;
  }
  let best: HTMLElement | undefined;
  let bestDx = Infinity;
  for (const { tile, rect } of boxes) {
    const dy = (rect.top - box.top) * direction;
    if (Math.abs(dy - rowDistance) > 2) continue;
    const dx = Math.abs(rect.left + rect.width / 2 - x);
    if (dx < bestDx) {
      bestDx = dx;
      best = tile;
    }
  }
  return best;
}

/**
 * Arrow keys in tile grids (UX_SPEC.md §7, QUALITY.md §5): the grid is one tab stop (a roving
 * tabindex). Arrows move by the tiles' positions on screen, so they follow the responsive columns
 * and cross section headings; Home and End jump to the first and last tile. Tab from the focused
 * tile reaches the controls on it (＋, €, the check box, the menu), the other tiles' controls stay
 * out of the tab order. Works with virtualized grids: tiles that come and go are picked up.
 */
export function attachRovingFocus(root: HTMLElement): () => void {
  let active: HTMLElement | null = null;
  // What each control's tab index was before this hook touched it: hidden helpers (a check box's
  // form input, tabindex -1) must never become tab stops.
  const natural = new WeakMap<HTMLElement, number>();
  const naturalIndex = (element: HTMLElement) => {
    let index = natural.get(element);
    if (index === undefined) {
      index = element.tabIndex;
      natural.set(element, index);
    }
    return index;
  };

  const sync = () => {
    const tiles = tilesOf(root);
    if (!active?.isConnected || !root.contains(active)) active = tiles[0] ?? null;
    for (const tile of tiles) {
      const on = tile === active;
      for (const element of tile.querySelectorAll<HTMLElement>(FOCUSABLE)) {
        if (naturalIndex(element) < 0) continue;
        const index = on ? 0 : -1;
        if (element.tabIndex !== index) element.tabIndex = index;
      }
    }
  };
  sync();
  // Tiles come and go (filters, virtualization); components may re-apply their own tabindex.
  const observer = new MutationObserver(sync);
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['tabindex'],
  });

  const onFocusIn = (event: FocusEvent) => {
    const tile = event.target instanceof Element ? event.target.closest<HTMLElement>(TILE) : null;
    if (tile && tile !== active && root.contains(tile)) {
      active = tile;
      sync();
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!isPlain(event) || event.shiftKey || !(event.target instanceof HTMLElement)) return;
    if (!event.target.matches(MAIN)) return; // controls on a tile keep their own arrow keys
    const current = event.target.closest<HTMLElement>(TILE);
    if (!current) return;
    const tiles = tilesOf(root);
    const index = tiles.indexOf(current);
    let next: HTMLElement | undefined;
    if (event.key === 'ArrowRight') next = tiles[index + 1];
    else if (event.key === 'ArrowLeft') next = tiles[index - 1];
    else if (event.key === 'ArrowDown') next = vertical(tiles, current, 1);
    else if (event.key === 'ArrowUp') next = vertical(tiles, current, -1);
    else if (event.key === 'Home') next = tiles[0];
    else if (event.key === 'End') next = tiles.at(-1);
    else return;
    event.preventDefault();
    const target = next ? mainOf(next) : null;
    if (!next || !target) return;
    active = next;
    sync();
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest' });
  };

  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('keydown', onKeyDown);
  return () => {
    observer.disconnect();
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('keydown', onKeyDown);
  };
}

/** Roving focus for a grid element that's always mounted. */
export function useRovingFocus(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = ref.current;
    return root ? attachRovingFocus(root) : undefined;
  }, [ref]);
}

/** A ref for grids that mount later (`<ul ref={rovingFocusRef}>`); React 19 runs the cleanup. */
export function rovingFocusRef(node: HTMLElement | null): (() => void) | undefined {
  return node ? attachRovingFocus(node) : undefined;
}
