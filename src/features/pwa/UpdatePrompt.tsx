import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toastManager } from '@/components/ui/Toasts';
import { m } from '@/i18n';

const HOUR_MS = 3_600_000;

/**
 * Service-worker lifecycle (APP-04). A new version waits until you choose "Neu laden", so an update
 * never interrupts data entry. Installed apps stay open for days, so it also checks hourly.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), HOUR_MS);
    },
  });

  useEffect(() => {
    if (!needRefresh) return undefined;
    const id = toastManager.add({
      title: m.pwa_update_title(),
      description: m.pwa_update_body(),
      timeout: 0, // polite and persistent: it waits until you're ready to reload
      actionProps: {
        children: m.pwa_update_action(),
        onClick: () => void updateServiceWorker(true),
      },
    });
    return () => toastManager.close(id);
  }, [needRefresh, updateServiceWorker]);

  useEffect(() => {
    if (offlineReady) toastManager.add({ title: m.pwa_offline_ready() });
  }, [offlineReady]);

  return null;
}
