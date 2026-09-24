/**
 * A local error log for bug reports (QUALITY.md §6): Settr has no telemetry, so errors stay on the
 * device, and "Fehlerbericht kopieren" puts a diagnostic JSON on the clipboard for Marvin to send
 * along. It holds no collection data: no lots, prices or names, only error texts, the page's path
 * and technical facts. It lives in localStorage (not IndexedDB), so it survives a broken database
 * and writes synchronously while the page is failing.
 */

const KEY = 'settr:errors';
const MAX_ENTRIES = 200;

export interface ErrorEntry {
  at: string;
  kind: 'error' | 'rejection' | 'boundary';
  message: string;
  stack?: string;
  /** The page's path, without query or hash (search text stays private). */
  path: string;
}

const isEntry = (value: unknown): value is ErrorEntry =>
  typeof value === 'object' && value !== null && 'at' in value && 'message' in value;

export function readErrorLog(): ErrorEntry[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter(isEntry) : [];
  } catch {
    return [];
  }
}

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    const stack = error.stack?.slice(0, 1500);
    return {
      message: `${error.name}: ${error.message}`.slice(0, 300),
      ...(stack ? { stack } : {}),
    };
  }
  return { message: String(error).slice(0, 300) };
}

export function logError(error: unknown, kind: ErrorEntry['kind']): void {
  try {
    const entry: ErrorEntry = {
      at: new Date().toISOString(),
      kind,
      path: window.location.pathname,
      ...describe(error),
    };
    const log = [...readErrorLog(), entry].slice(-MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    // Storage is full or blocked: the console still has the error.
  }
}

/** Call once at startup: uncaught errors and unhandled rejections go to the log. */
export function installErrorLog(): void {
  window.addEventListener('error', (event) => logError(event.error ?? event.message, 'error'));
  window.addEventListener('unhandledrejection', (event) => logError(event.reason, 'rejection'));
}

/** The diagnostic report: app and browser facts plus the last 20 errors, no user data. */
export function errorReport(facts: Record<string, string | undefined>): string {
  return JSON.stringify(
    {
      ...facts,
      at: new Date().toISOString(),
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      language: navigator.language,
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      online: navigator.onLine,
      errors: readErrorLog().slice(-20),
    },
    null,
    2,
  );
}

/** Puts the report on the clipboard; false when the browser refuses (no permission, no focus). */
export async function copyErrorReport(facts: Record<string, string | undefined>): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(errorReport(facts));
    return true;
  } catch {
    return false;
  }
}
