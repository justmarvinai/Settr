import { MAX_BACKUP_BYTES, readBackup, type BackupReadResult } from '@/domain/backup';
import { sha256Hex } from '@/lib/hash';
import type { BackupWorkerResponse } from '@/workers/backup.worker';

/** What reading a picked file gives: the backup, or why it can't be imported. */
export type BackupFileResult =
  | BackupReadResult
  | { ok: false; error: { kind: 'too-large'; bytes: number } }
  | { ok: false; error: { kind: 'unreadable'; message: string } };

function inWorker(file: Blob): Promise<BackupWorkerResponse> {
  const worker = new Worker(new URL('../../workers/backup.worker.ts', import.meta.url), {
    type: 'module',
  });
  return new Promise<BackupWorkerResponse>((resolve) => {
    worker.addEventListener('message', (event: MessageEvent<BackupWorkerResponse>) =>
      resolve(event.data),
    );
    worker.addEventListener('error', (event) => resolve({ type: 'error', message: event.message }));
    worker.postMessage(file);
  }).finally(() => worker.terminate());
}

/**
 * Reads a backup file (IMPORT_EXPORT.md §4 steps 1–5) in a worker; where workers are missing, on
 * the main thread. Files over 200 MB are refused before reading.
 */
export async function readBackupFile(file: Blob): Promise<BackupFileResult> {
  if (file.size > MAX_BACKUP_BYTES) {
    return { ok: false, error: { kind: 'too-large', bytes: file.size } };
  }
  try {
    const response =
      typeof Worker === 'undefined'
        ? { type: 'result' as const, result: await readBackup(await file.text(), sha256Hex) }
        : await inWorker(file);
    return response.type === 'result'
      ? response.result
      : { ok: false, error: { kind: 'unreadable', message: response.message } };
  } catch (error) {
    return {
      ok: false,
      error: {
        kind: 'unreadable',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
