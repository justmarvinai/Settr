import { create } from 'zustand';

/**
 * The keyboard cheat sheet (UX_SPEC.md §7): `?`, the palette and *Einstellungen › Über* open it,
 * the app shell renders it. `requested` loads it on first use and keeps it mounted afterwards.
 */
export const useShortcuts = create<{ open: boolean; requested: boolean }>(() => ({
  open: false,
  requested: false,
}));

export const showShortcuts = () => useShortcuts.setState({ open: true, requested: true });
export const setShortcutsOpen = (open: boolean) => useShortcuts.setState({ open });
