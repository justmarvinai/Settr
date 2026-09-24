import { countHoldings } from '@/db/core';
import { isOnboarded, markOnboarded } from '@/lib/onboarded';

export { markOnboarded };

/**
 * The first run (APP-06, UX_SPEC.md §4.14): Übersicht opens the onboarding on a device that hasn't
 * finished it and holds no lots. A device with lots (from before M6, or a backup brought in) counts
 * as onboarded.
 */
export async function needsOnboarding(): Promise<boolean> {
  if (isOnboarded()) return false;
  if ((await countHoldings()) > 0) {
    markOnboarded();
    return false;
  }
  return true;
}
