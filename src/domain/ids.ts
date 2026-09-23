import { uuidv7 } from 'uuidv7';

/** Time-sortable, globally unique IDs for user records (DATA_MODEL.md §3). */
export function newId(): string {
  return uuidv7();
}

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isUuidV7(value: string): boolean {
  return UUID_V7.test(value);
}

/** ISO timestamp (UTC) for createdAt/updatedAt. */
export function nowIso(now: Date = new Date()): string {
  return now.toISOString();
}

/** Calendar date 'YYYY-MM-DD' in the user's local time zone. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
