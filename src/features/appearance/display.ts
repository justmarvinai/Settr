import { useEffect } from 'react';
import { db, updateSettings, useStoredDisplay } from '@/db/core';
import type { Settings } from '@/domain/schemas';

type Display = Settings['display'];

export const DISPLAY_STORAGE_KEY = 'settr:display';
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');
const transparencyQuery = () => window.matchMedia('(prefers-reduced-transparency: reduce)');

export function resolvedTheme(theme: Display['theme']): 'light' | 'dark' {
  return theme === 'dark' || (theme === 'system' && darkQuery().matches) ? 'dark' : 'light';
}

/**
 * Applies theme, transparency and motion to <html> and mirrors them to localStorage, which the
 * inline script in index.html reads before first paint (no theme flash).
 */
export function applyDisplay(display: Display): void {
  const root = document.documentElement;
  const theme = resolvedTheme(display.theme);
  root.dataset.theme = theme;
  if (display.reduceTransparency || transparencyQuery().matches)
    root.dataset.transparency = 'reduced';
  else delete root.dataset.transparency;
  if (display.motion === 'full') delete root.dataset.motion;
  else root.dataset.motion = display.motion;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = theme === 'dark' ? '#0A0B10' : '#F4F4F7';
  });
  try {
    localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(display));
  } catch {
    // Storage can be unavailable (private mode); the stored settings still apply after load.
  }
}

/** What the user just changed, until the stored settings say the same. */
let pending: Partial<Display> | undefined;

const hasCaughtUp = (stored: Display, change: Partial<Display>) =>
  (change.theme === undefined || stored.theme === change.theme) &&
  (change.reduceTransparency === undefined ||
    stored.reduceTransparency === change.reduceTransparency) &&
  (change.motion === undefined || stored.motion === change.motion) &&
  (change.colorblindPL === undefined || stored.colorblindPL === change.colorblindPL);

/**
 * A display change from the UI: applied at once, then stored. Until the store has it, an older
 * stored value (say, the first read after startup landing late) can't switch the page back or
 * overwrite the pre-paint copy in localStorage.
 */
export function changeDisplay(current: Display, patch: Partial<Display>): Promise<unknown> {
  const change = { ...pending, ...patch };
  pending = change;
  applyDisplay({ ...current, ...patch });
  return updateSettings(db, { display: patch }).catch((error: unknown) => {
    if (pending === change) pending = undefined;
    throw error;
  });
}

/** Keeps <html> in sync with the stored display settings and the OS preferences. */
export function useDisplaySync(): void {
  const display = useStoredDisplay();
  useEffect(() => {
    if (!display) return undefined;
    if (pending) {
      if (!hasCaughtUp(display, pending)) return undefined; // older than the user's change
      pending = undefined;
    }
    applyDisplay(display);
    const onChange = () => applyDisplay(display);
    const queries = [darkQuery(), transparencyQuery()];
    queries.forEach((q) => q.addEventListener('change', onChange));
    return () => queries.forEach((q) => q.removeEventListener('change', onChange));
  }, [display]);
}
