import { newId, nowIso } from '@/domain/ids';
import { metaSchema, type Meta } from '@/domain/schemas';
import { SCHEMA_VERSION, type SettrDB } from '../db';

const META = 'meta';
const DATA_VERSION = 'dataVersion';

/** Creates the install's meta record on first start. */
export async function ensureMeta(db: SettrDB): Promise<Meta> {
  return db.transaction('rw', db.kv, async () => {
    const row = await db.kv.get(META);
    const parsed = metaSchema.safeParse(row?.value);
    if (parsed.success) return parsed.data;
    const meta: Meta = {
      installId: newId(),
      createdAt: nowIso(),
      schemaVersion: SCHEMA_VERSION,
      catalogVersionSeen: null,
    };
    await db.kv.put({ key: META, value: meta });
    return meta;
  });
}

export async function getMeta(db: SettrDB): Promise<Meta | undefined> {
  const row = await db.kv.get(META);
  const parsed = metaSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : undefined;
}

export async function markBackupDone(db: SettrDB, at: string = nowIso()): Promise<void> {
  const meta = await ensureMeta(db);
  await db.kv.put({ key: META, value: { ...meta, lastBackupAt: at } satisfies Meta });
}

/** Bumped by every write transaction; derived caches and analytics key on it (ARCHITECTURE.md §5). */
export async function bumpDataVersion(db: SettrDB): Promise<number> {
  const row = await db.kv.get(DATA_VERSION);
  const next = (typeof row?.value === 'number' ? row.value : 0) + 1;
  await db.kv.put({ key: DATA_VERSION, value: next });
  return next;
}

export async function getDataVersion(db: SettrDB): Promise<number> {
  const row = await db.kv.get(DATA_VERSION);
  return typeof row?.value === 'number' ? row.value : 0;
}
