import { useRef, type MouseEvent, type PointerEvent } from 'react';
import { swallowNextClick } from './swallowClick';

/** How long a finger rests before the menu opens; Android's own long press may come sooner. */
const HOLD_MS = 500;
/** How far the finger may drift before the press counts as scrolling. */
const SLOP_PX = 10;

export interface LongPressHandlers {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
}

/**
 * A finger resting on a tile (UX_SPEC.md §4.3): after HOLD_MS without moving, or at Android's
 * own long press (`contextmenu`), `onLongPress` runs instead of the browser's link menu, and the
 * click that may follow the lift is swallowed. Mouse and pen are left alone: they have the hover
 * buttons, the keys and their own context menu. Pair it with `-webkit-touch-callout: none` on the
 * element, so iOS doesn't show its link preview.
 */
export function useLongPress(onLongPress: () => void): LongPressHandlers {
  const press = useRef<{ id: number; x: number; y: number; timer: number } | null>(null);

  const cancel = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const fire = () => {
    cancel();
    swallowNextClick();
    // A short tick on Android (iPhones have no vibration API), once the page may use it
    if ('vibrate' in navigator && navigator.userActivation.hasBeenActive) navigator.vibrate(8);
    onLongPress();
  };

  return {
    onPointerDown(event) {
      if (event.pointerType !== 'touch' || !event.isPrimary) return;
      cancel();
      press.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        timer: window.setTimeout(fire, HOLD_MS),
      };
    },
    onPointerMove(event) {
      const current = press.current;
      if (current?.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > SLOP_PX) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onContextMenu(event) {
      if (!press.current) return; // a mouse's right click keeps the browser's menu
      event.preventDefault();
      fire();
    },
  };
}
