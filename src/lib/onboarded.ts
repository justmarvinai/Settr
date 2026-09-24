/**
 * The first-run flag (APP-06): per device, like the display and privacy keys, and cleared with
 * them by "Alle Daten löschen". Tiny and synchronous, so the startup route can check it without
 * loading the onboarding.
 */
const KEY = 'settr:onboarded';

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return true; // without storage the flag can't stick: never trap anyone in the flow
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(KEY, new Date().toISOString());
  } catch {
    // Private mode without storage: the welcome comes back next visit, which is harmless.
  }
}
