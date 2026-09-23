import { resolveSettings, settingsSchema, type Settings } from '@/domain/schemas';
import type { SettrDB } from '../db';

const SETTINGS = 'settings';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};
export type SettingsPatch = DeepPartial<Settings>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge(
  target: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
  }
  return out;
}

/** Stored settings merged with the defaults (new settings appear automatically). */
export async function getSettings(db: SettrDB): Promise<Settings> {
  const row = await db.kv.get(SETTINGS);
  return resolveSettings(row?.value);
}

/** Deep-merges a patch, validates the result and stores it. Throws on invalid values. */
export async function updateSettings(db: SettrDB, patch: SettingsPatch): Promise<Settings> {
  return db.transaction('rw', db.kv, async () => {
    const current = await getSettings(db);
    const next = settingsSchema.parse(deepMerge(current, patch));
    await db.kv.put({ key: SETTINGS, value: next });
    return next;
  });
}
