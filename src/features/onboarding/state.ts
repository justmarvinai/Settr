import { countHoldings } from '@/db/core';

/** Per device, like the display and privacy keys; "Alle Daten löschen" clears it with them. */
const KEY = 'settr:onboarded';

/** The first run is done on this device: Übersicht opens normally from now on. */
export function markOnboarded(): void {
  try {
    localStorage.setItem(KEY, new Date().toISOString());
  } catch {
    // Private mode without storage: the welcome comes back next visit, which is harmless.
  }
}

function onboarded(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return true; // without storage the flag can't stick: never trap anyone in the flow
  }
}

/**
 * The first run (APP-06, UX_SPEC.md §4.14): Übersicht opens the onboarding on a device that hasn't
 * finished it and holds no lots. A device with lots (from before M6, or a backup brought in) counts
 * as onboarded.
 */
export async function needsOnboarding(): Promise<boolean> {
  if (onboarded()) return false;
  if ((await countHoldings()) > 0) {
    markOnboarded();
    return false;
  }
  return true;
}
