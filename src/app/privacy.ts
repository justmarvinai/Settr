import { create } from 'zustand';

const KEY = 'settr:privacy';

function readInitial(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

function apply(on: boolean): void {
  if (on) document.documentElement.dataset.privacy = 'on';
  else delete document.documentElement.dataset.privacy;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Ignore: privacy mode then lasts for this session only.
  }
}

interface PrivacyState {
  on: boolean;
  toggle: () => void;
}

/**
 * Privacy mode (PRT-05) blurs every `.money` value, e.g. when sharing the screen. It's per device
 * and stored in localStorage so it applies before first paint (index.html).
 */
export const usePrivacy = create<PrivacyState>((set, get) => ({
  on: readInitial(),
  toggle: () => {
    const on = !get().on;
    apply(on);
    set({ on });
  },
}));
