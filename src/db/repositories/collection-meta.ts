import { newId, nowIso } from '@/domain/ids';
import {
  customItemSchema,
  holdingSchema,
  locationSchema,
  tagSchema,
  type CustomItem,
  type Holding,
  type Location,
  type Tag,
} from '@/domain/schemas';
import type { SettrDB } from '../db';
import { bumpDataVersion } from './meta';
import { writeTombstone } from './tombstones';

/**
 * Tags, storage locations and custom items (DATA_MODEL.md §5.6, §5.7). Deleting one removes its
 * references from the lots in the same transaction, and returns everything needed for undo.
 */

const sameName = (a: string, b: string) =>
  a.trim().localeCompare(b.trim(), 'de', { sensitivity: 'accent' }) === 0;

// ── Tags ────────────────────────────────────────────────────────────────────────────────────────

/** Returns the tag with this name (case-insensitive) or creates it. */
export async function ensureTag(db: SettrDB, name: string): Promise<Tag> {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  return db.transaction('rw', db.tags, db.kv, async () => {
    const existing = (await db.tags.toArray()).find((t) => sameName(t.name, trimmed));
    if (existing) return existing;
    const now = nowIso();
    const tag = tagSchema.parse({ id: newId(), createdAt: now, updatedAt: now, name: trimmed });
    await db.tags.add(tag);
    await bumpDataVersion(db);
    return tag;
  });
}

export async function renameTag(db: SettrDB, id: string, name: string): Promise<Tag> {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  return db.transaction('rw', db.tags, db.kv, async () => {
    const current = await db.tags.get(id);
    if (!current) throw new Error(`Tag ${id} not found`);
    const clash = (await db.tags.toArray()).find((t) => t.id !== id && sameName(t.name, trimmed));
    if (clash) throw new RangeError('Diesen Tag gibt es schon');
    const tag = tagSchema.parse({ ...current, name: trimmed, updatedAt: nowIso() });
    await db.tags.put(tag);
    await bumpDataVersion(db);
    return tag;
  });
}

export interface DeletedTag {
  tag: Tag;
  /** Lots as they were before the tag was removed from them. */
  holdings: Holding[];
}

export async function deleteTag(db: SettrDB, id: string): Promise<DeletedTag | undefined> {
  return db.transaction('rw', db.tags, db.holdings, db.tombstones, db.kv, async () => {
    const tag = await db.tags.get(id);
    if (!tag) return undefined;
    const holdings = await db.holdings.where('tags').equals(id).toArray();
    const now = nowIso();
    await db.holdings.bulkPut(
      holdings.map((h) =>
        holdingSchema.parse({ ...h, tags: h.tags.filter((t) => t !== id), updatedAt: now }),
      ),
    );
    await db.tags.delete(id);
    await writeTombstone(db, 'tags', id);
    await bumpDataVersion(db);
    return { tag, holdings };
  });
}

// ── Locations ───────────────────────────────────────────────────────────────────────────────────

export type NewLocation = Omit<Location, 'id' | 'createdAt' | 'updatedAt'>;

export async function createLocation(db: SettrDB, input: NewLocation): Promise<Location> {
  const now = nowIso();
  return db.transaction('rw', db.locations, db.kv, async () => {
    const sort = input.sort ?? (await db.locations.count());
    const location = locationSchema.parse({
      ...input,
      name: input.name.trim(),
      sort,
      id: newId(),
      createdAt: now,
      updatedAt: now,
    });
    await db.locations.add(location);
    await bumpDataVersion(db);
    return location;
  });
}

export async function updateLocation(
  db: SettrDB,
  id: string,
  patch: Partial<NewLocation>,
): Promise<{ before: Location; after: Location }> {
  return db.transaction('rw', db.locations, db.kv, async () => {
    const before = await db.locations.get(id);
    if (!before) throw new Error(`Location ${id} not found`);
    const merged: Record<string, unknown> = { ...before, ...patch, id, updatedAt: nowIso() };
    for (const [key, value] of Object.entries(merged)) if (value === undefined) delete merged[key];
    const after = locationSchema.parse(merged);
    await db.locations.put(after);
    await bumpDataVersion(db);
    return { before, after };
  });
}

/** Undo for an edit: the location as it was. */
export async function restoreLocation(db: SettrDB, location: Location): Promise<void> {
  await db.transaction('rw', db.locations, db.kv, async () => {
    await db.locations.put(locationSchema.parse({ ...location, updatedAt: nowIso() }));
    await bumpDataVersion(db);
  });
}

export interface DeletedLocation {
  location: Location;
  /** Lots that were stored there, as they were. */
  holdings: Holding[];
}

/** Deletes a location; its lots keep everything but the location. */
export async function deleteLocation(
  db: SettrDB,
  id: string,
): Promise<DeletedLocation | undefined> {
  return db.transaction('rw', db.locations, db.holdings, db.tombstones, db.kv, async () => {
    const location = await db.locations.get(id);
    if (!location) return undefined;
    const holdings = await db.holdings.where('location.id').equals(id).toArray();
    const now = nowIso();
    await db.holdings.bulkPut(
      holdings.map((h) => {
        const { location: _gone, ...rest } = h;
        return holdingSchema.parse({ ...rest, updatedAt: now });
      }),
    );
    await db.locations.delete(id);
    await writeTombstone(db, 'locations', id);
    await bumpDataVersion(db);
    return { location, holdings };
  });
}

/** Undo for deleteTag/deleteLocation: the record and the lots come back as they were. */
export async function restoreTagOrLocation(
  db: SettrDB,
  deleted: DeletedTag | DeletedLocation,
): Promise<void> {
  const now = nowIso();
  await db.transaction('rw', db.tags, db.locations, db.holdings, db.tombstones, db.kv, async () => {
    if ('tag' in deleted) {
      await db.tags.put(tagSchema.parse({ ...deleted.tag, updatedAt: now }));
      await db.tombstones.delete(deleted.tag.id);
    } else {
      await db.locations.put(locationSchema.parse({ ...deleted.location, updatedAt: now }));
      await db.tombstones.delete(deleted.location.id);
    }
    await db.holdings.bulkPut(
      deleted.holdings.map((h) => holdingSchema.parse({ ...h, updatedAt: now })),
    );
    await bumpDataVersion(db);
  });
}

// ── Custom items ────────────────────────────────────────────────────────────────────────────────

export type NewCustomItem = Omit<CustomItem, 'id' | 'createdAt' | 'updatedAt'>;

/** The item id lots use for a custom item (DATA_MODEL.md §3). */
export const customItemRef = (id: string) => `custom:${id}`;

export async function createCustomItem(db: SettrDB, input: NewCustomItem): Promise<CustomItem> {
  const now = nowIso();
  const item = customItemSchema.parse({ ...input, id: newId(), createdAt: now, updatedAt: now });
  await db.transaction('rw', db.customItems, db.kv, async () => {
    await db.customItems.add(item);
    await bumpDataVersion(db);
  });
  return item;
}

export async function updateCustomItem(
  db: SettrDB,
  id: string,
  patch: Partial<NewCustomItem>,
): Promise<CustomItem> {
  return db.transaction('rw', db.customItems, db.kv, async () => {
    const current = await db.customItems.get(id);
    if (!current) throw new Error(`Custom item ${id} not found`);
    const merged: Record<string, unknown> = { ...current, ...patch, id, updatedAt: nowIso() };
    for (const [key, value] of Object.entries(merged)) if (value === undefined) delete merged[key];
    const item = customItemSchema.parse(merged);
    await db.customItems.put(item);
    await bumpDataVersion(db);
    return item;
  });
}

/** Refuses while lots still use the item: they would lose what they are. */
export async function deleteCustomItem(db: SettrDB, id: string): Promise<CustomItem | undefined> {
  return db.transaction('rw', db.customItems, db.holdings, db.tombstones, db.kv, async () => {
    const item = await db.customItems.get(id);
    if (!item) return undefined;
    const used = await db.holdings.where('item.id').equals(customItemRef(id)).count();
    if (used > 0) throw new RangeError(`Noch ${used} Positionen nutzen diesen Eintrag`);
    await db.customItems.delete(id);
    await writeTombstone(db, 'customItems', id);
    await bumpDataVersion(db);
    return item;
  });
}

// ── Per-device UI preferences (kv `ui:*`, not exported) ─────────────────────────────────────────

export async function getUiPref(db: SettrDB, key: string): Promise<unknown> {
  return (await db.kv.get(`ui:${key}`))?.value;
}

export async function setUiPref(db: SettrDB, key: string, value: unknown): Promise<void> {
  await db.kv.put({ key: `ui:${key}`, value });
}
