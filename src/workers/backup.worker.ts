import { z } from '@/lib/zod';
import de from 'zod/v4/locales/de.js';
import { readBackup, type BackupReadResult } from '@/domain/backup';
import { sha256Hex } from '@/lib/hash';

/**
 * Backup worker (IMPORT_EXPORT.md §4 steps 2–5): reads, parses, checks, migrates and validates a
 * backup file off the main thread, so a large file doesn't freeze the page. One worker per file;
 * the page terminates it afterwards. Talk to it through features/data/read-backup.ts.
 */

export type BackupWorkerResponse =
  | { type: 'result'; result: BackupReadResult }
  | { type: 'error'; message: string };

interface BackupWorkerScope {
  addEventListener(type: 'message', listener: (event: MessageEvent<Blob>) => void): void;
  postMessage(message: BackupWorkerResponse): void;
}

// Validation reasons in German, like the rest of the app (the list of skipped records shows them).
z.config(de());

const scope: BackupWorkerScope = self;

scope.addEventListener('message', (event) => {
  void (async () => {
    try {
      const text = await event.data.text();
      scope.postMessage({ type: 'result', result: await readBackup(text, sha256Hex) });
    } catch (error) {
      scope.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  })();
});
