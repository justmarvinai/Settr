import { create } from 'zustand';

/** Chromium's install prompt event (not in the DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface InstallState {
  /** Set while the browser offers installation (Chromium, incl. Brave). Safari never offers it. */
  promptEvent: BeforeInstallPromptEvent | null;
  /** Running as an installed app (standalone window or iPhone home screen). */
  installed: boolean;
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in navigator && navigator.standalone === true);

export const useInstall = create<InstallState>(() => ({ promptEvent: null, installed: false }));

/**
 * Call once at startup: the browser fires `beforeinstallprompt` early, before any settings page is
 * open. Installing matters for data safety: Chromium grants persistent storage to installed apps.
 */
export function listenForInstall(): void {
  useInstall.setState({ installed: isStandalone() });
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // no mini-infobar; Settr offers its own button
    useInstall.setState({ promptEvent: event });
  });
  window.addEventListener('appinstalled', () =>
    useInstall.setState({ promptEvent: null, installed: true }),
  );
}

/** Shows the browser's install dialog. Resolves true if the user installed Settr. */
export async function promptInstall(): Promise<boolean> {
  const event = useInstall.getState().promptEvent;
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  useInstall.setState({ promptEvent: null });
  return outcome === 'accepted';
}
