/**
 * Storage durability (DAT-05, ARCHITECTURE.md §8.2). Never rely on the reported quota: Brave always
 * reports 2 GiB (ADR-027). Only `usage` is shown.
 */
export interface StorageStatus {
  supported: boolean;
  persisted: boolean | null;
  usage: number | null;
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!storage?.persisted) return { supported: false, persisted: null, usage: null };
  const [persisted, estimate] = await Promise.all([
    storage.persisted().catch(() => null),
    storage.estimate ? storage.estimate().catch(() => null) : Promise.resolve(null),
  ]);
  return { supported: true, persisted, usage: estimate?.usage ?? null };
}

/**
 * Asks for persistent storage. Chromium (incl. Brave) decides silently: granted for installed apps
 * and often-used sites. Returns false otherwise; it can be retried later, e.g. after installing.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
