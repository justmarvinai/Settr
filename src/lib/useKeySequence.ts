import { useEffect, useRef } from 'react';
import { inDialog, isPlain, isTyping } from './keys';

/** How long the second key of a sequence may take. */
const SEQUENCE_MS = 1500;

/**
 * Two-key shortcuts (UX_SPEC.md §7): `prefix`, then one of `actions`' keys within 1.5 s, e.g. G then
 * O for Übersicht. It listens in the capture phase, so the second key never reaches a focused tile's
 * own shortcut (G then P goes to Preise instead of opening the tile's price sheet). Any other key
 * ends the sequence. Quiet while typing and inside dialogs.
 */
export function useKeySequence(
  prefix: string,
  actions: Readonly<Record<string, () => void>>,
  enabled = true,
): void {
  const pendingUntil = useRef(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        !isPlain(event) ||
        isTyping(event.target) ||
        inDialog(event.target)
      ) {
        pendingUntil.current = 0;
        return;
      }
      const key = event.key.toLowerCase();
      if (pendingUntil.current > Date.now()) {
        pendingUntil.current = 0;
        if (!Object.hasOwn(actions, key)) return;
        event.preventDefault();
        event.stopPropagation();
        actions[key]?.();
      } else if (key === prefix) {
        pendingUntil.current = Date.now() + SEQUENCE_MS;
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [prefix, actions, enabled]);
}
