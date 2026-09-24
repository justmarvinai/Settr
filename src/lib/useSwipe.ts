import { useLayoutEffect, useRef, type PointerEvent } from 'react';
import { motionWanted } from './motion';
import { swallowNextClick } from './swallowClick';

export type SwipeDirection = 'prev' | 'next';

/** How far a finger travels sideways to turn the page, or how fast a short flick has to be. */
const DISTANCE_PX = 64;
const FLICK_PX_PER_MS = 0.5;
/** How far a finger moves before the gesture decides between sideways and scrolling. */
const SLOP_PX = 10;

export interface SwipeHandlers {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
}

interface Drag {
  id: number;
  x: number;
  y: number;
  time: number;
  dx: number;
  /** Decided once the finger passes SLOP_PX: sideways is ours, up and down is the page's. */
  sideways?: boolean;
}

/** A motion token (tokens.css) for the Web Animations API. */
function token(name: '--dur-base' | '--ease-out'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function durationMs(value: string): number {
  const number = Number.parseFloat(value);
  if (Number.isNaN(number)) return 200;
  return value.endsWith('ms') ? number : number * 1000;
}

function animate(element: HTMLElement, keyframes: Keyframe[]): void {
  if (!motionWanted()) return;
  element.animate(keyframes, {
    duration: durationMs(token('--dur-base')),
    easing: token('--ease-out') || 'ease-out',
  });
}

/** Back to rest, from where the finger let go. */
function release(target: HTMLElement, dx: number): void {
  target.style.removeProperty('translate');
  if (dx !== 0) animate(target, [{ translate: `${dx}px 0` }, { translate: '0 0' }]);
}

/**
 * Sideways swipes with a finger (UX_SPEC.md §4.4: prev/next on phones). The element follows the
 * finger, with resistance where there is nothing to turn to. Past DISTANCE_PX, or on a quick
 * flick, `onSwipe` turns the page and the new `page` slides in from that side; otherwise the
 * element springs back. Give the element `touch-action: pan-y`, so up and down still scroll.
 */
export function useSwipe(
  page: string,
  canSwipe: (direction: SwipeDirection) => boolean,
  onSwipe: (direction: SwipeDirection) => void,
): SwipeHandlers {
  const drag = useRef<Drag | null>(null);
  /** A swipe turned the page away from `from`: the new one slides in once it shows. */
  const turning = useRef<{ element: HTMLElement; direction: SwipeDirection; from: string } | null>(
    null,
  );

  // The new page comes in from the side the finger pulled it from
  useLayoutEffect(() => {
    const turn = turning.current;
    if (!turn || turn.from === page) return;
    turning.current = null;
    animate(turn.element, [
      { translate: `${turn.direction === 'next' ? 48 : -48}px 0`, opacity: 0 },
      { translate: '0 0', opacity: 1 },
    ]);
  }, [page]);

  return {
    onPointerDown(event) {
      if (event.pointerType !== 'touch' || !event.isPrimary) return;
      drag.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
        dx: 0,
      };
    },
    onPointerMove(event) {
      const current = drag.current;
      if (current?.id !== event.pointerId) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (current.sideways === undefined) {
        if (Math.hypot(dx, dy) < SLOP_PX) return;
        current.sideways = Math.abs(dx) > Math.abs(dy);
      }
      if (!current.sideways) return;
      // Half the finger's way, a sixth where there is no card to turn to
      current.dx = dx * (canSwipe(dx < 0 ? 'next' : 'prev') ? 0.5 : 0.16);
      event.currentTarget.style.translate = `${current.dx}px 0`;
    },
    onPointerUp(event) {
      const current = drag.current;
      if (current?.id !== event.pointerId) return;
      drag.current = null;
      if (!current.sideways) return;
      swallowNextClick(); // the lift must not open the fullscreen view
      const dx = event.clientX - current.x;
      const direction: SwipeDirection = dx < 0 ? 'next' : 'prev';
      const speed = Math.abs(dx) / Math.max(1, event.timeStamp - current.time);
      const far =
        Math.abs(dx) >= DISTANCE_PX || (Math.abs(dx) >= SLOP_PX * 2 && speed > FLICK_PX_PER_MS);
      if (far && canSwipe(direction)) {
        turning.current = { element: event.currentTarget, direction, from: page };
        event.currentTarget.style.removeProperty('translate');
        onSwipe(direction);
      } else {
        release(event.currentTarget, current.dx);
      }
    },
    onPointerCancel(event) {
      const current = drag.current;
      if (current?.id !== event.pointerId) return;
      drag.current = null;
      release(event.currentTarget, current.dx);
    },
  };
}
