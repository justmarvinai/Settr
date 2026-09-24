import type { Holding, Location, RecordBase, Tag, Tombstone } from '../schemas';
import { canonicalJson } from './canonical';
import { RECORD_TABLES, type BackupTables, type RecordTable } from './format';
import { nameKey } from './validate';

/**
 * Merge import (IMPORT_EXPORT.md §5): combines this device's data with a backup's, without a server.
 * Per record id:
 * - only in the backup: added, unless deleted here after the backup's version;
 * - only here: kept, unless the backup deleted it after this version;
 * - in both, identical: unchanged; different: the later `updatedAt` wins, ties go to the larger
 *   installId, so every device reaches the same result.
 * Tags and Lagerorte created on both devices under the same name become one (the local id stays and
 * the backup's references are remapped). Pure: the db layer writes the plan in one transaction.
 */

export type MergeTable = Exclude<RecordTable, 'tombstones'>;
export const MERGE_TABLES = RECORD_TABLES.filter((t): t is MergeTable => t !== 'tombstones');

export interface TablePlan<T> {
  /** Records to write: new ones and the backup's newer versions. */
  put: T[];
  /** Ids of local records the backup deleted later. */
  remove: string[];
  added: number;
  /** In both and different, the backup's version is newer. */
  updated: number;
  /** In both and different, this device's version is newer. */
  kept: number;
  unchanged: number;
  /** Removed here because the backup deleted them later. */
  deleted: number;
  /** Not added because they were deleted here after the backup's version. */
  skipped: number;
}

export type MergePlan = { [T in MergeTable]: TablePlan<BackupTables[T][number]> } & {
  /** All deletions after the merge: both sides', the later one per id, none for live records. */
  tombstones: Tombstone[];
  /** Backup tags and Lagerorte that turned out to be local ones with the same name. */
  remapped: { tags: number; locations: number };
  /** Backup tags renamed because another tag already has their name here. */
  renamed: number;
};

export interface MergeSide {
  tables: BackupTables;
  installId: string;
}

const time = (iso: string) => Date.parse(iso);

/** True when the incoming version replaces the local one (last write wins, then installId). */
export function incomingWins(
  local: RecordBase,
  incoming: RecordBase,
  localInstall: string,
  incomingInstall: string,
): boolean {
  const a = time(local.updatedAt);
  const b = time(incoming.updatedAt);
  if (a !== b) return b > a;
  return incomingInstall > localInstall;
}

function newPlan<T>(): TablePlan<T> {
  return {
    put: [],
    remove: [],
    added: 0,
    updated: 0,
    kept: 0,
    unchanged: 0,
    deleted: 0,
    skipped: 0,
  };
}

function latestDeletions(list: readonly Tombstone[]): Map<string, Tombstone> {
  const map = new Map<string, Tombstone>();
  for (const t of list) {
    const current = map.get(t.id);
    if (!current || time(t.deletedAt) > time(current.deletedAt)) map.set(t.id, t);
  }
  return map;
}

/**
 * Maps backup ids to local ids for records the two sides created separately under the same name: a
 * backup record whose id isn't here and whose name is unique in the backup, matching exactly one
 * local record whose id the backup doesn't have. So records either side keeps apart never fold.
 */
function sameNameRemap<T extends { id: string; name: string }>(
  local: readonly T[],
  incoming: readonly T[],
): Map<string, string> {
  const localIds = new Set(local.map((r) => r.id));
  const incomingIds = new Set(incoming.map((r) => r.id));
  const group = (list: readonly T[]) => {
    const byName = new Map<string, T[]>();
    for (const r of list) byName.set(nameKey(r.name), [...(byName.get(nameKey(r.name)) ?? []), r]);
    return byName;
  };
  const localByName = group(local);
  const incomingByName = group(incoming);
  const remap = new Map<string, string>();
  for (const r of incoming) {
    if (localIds.has(r.id) || incomingByName.get(nameKey(r.name))?.length !== 1) continue;
    const matches = localByName.get(nameKey(r.name)) ?? [];
    const [match] = matches;
    if (match && matches.length === 1 && !incomingIds.has(match.id)) remap.set(r.id, match.id);
  }
  return remap;
}

function remapHolding(h: Holding, tags: Map<string, string>, places: Map<string, string>): Holding {
  const tagIds = h.tags.map((id) => tags.get(id) ?? id);
  const place = h.location ? places.get(h.location.id) : undefined;
  const changed = tagIds.some((id, i) => id !== h.tags[i]) || place !== undefined;
  if (!changed) return h;
  return {
    ...h,
    tags: [...new Set(tagIds)],
    ...(h.location && place ? { location: { ...h.location, id: place } } : {}),
  };
}

function remapLocation(l: Location, places: Map<string, string>): Location {
  const parent = l.parentId ? places.get(l.parentId) : undefined;
  return parent ? { ...l, parentId: parent } : l;
}

/** A remapped record keeps only one version per id: the one that had the id to begin with wins. */
function withRemappedIds<T extends { id: string }>(
  list: readonly T[],
  remap: Map<string, string>,
): T[] {
  const own = new Set(list.map((r) => r.id));
  const out: T[] = [];
  const seen = new Set<string>();
  for (const r of list) {
    const id = remap.get(r.id);
    if (id === undefined) {
      out.push(r);
      seen.add(r.id);
    }
  }
  for (const r of list) {
    const id = remap.get(r.id);
    if (id === undefined || own.has(id) || seen.has(id)) continue;
    out.push({ ...r, id });
    seen.add(id);
  }
  return out;
}

function planTable<T extends RecordBase>(
  local: readonly T[],
  incoming: readonly T[],
  localDeleted: Map<string, Tombstone>,
  incomingDeleted: Map<string, Tombstone>,
  installs: { local: string; incoming: string },
): TablePlan<T> {
  const plan = newPlan<T>();
  const localById = new Map(local.map((r) => [r.id, r]));
  const incomingIds = new Set<string>();
  for (const r of incoming) {
    incomingIds.add(r.id);
    const mine = localById.get(r.id);
    if (!mine) {
      const deleted = localDeleted.get(r.id);
      if (deleted && time(deleted.deletedAt) > time(r.updatedAt)) {
        plan.skipped++;
      } else {
        plan.put.push(r);
        plan.added++;
      }
    } else if (canonicalJson(mine) === canonicalJson(r)) {
      plan.unchanged++;
    } else if (incomingWins(mine, r, installs.local, installs.incoming)) {
      plan.put.push(r);
      plan.updated++;
    } else {
      plan.kept++;
    }
  }
  for (const r of local) {
    if (incomingIds.has(r.id)) continue;
    const deleted = incomingDeleted.get(r.id);
    if (deleted && time(deleted.deletedAt) > time(r.updatedAt)) {
      plan.remove.push(r.id);
      plan.deleted++;
    }
  }
  return plan;
}

/**
 * Tag names stay unique (case-insensitive, like the app and Dexie's `&name` index): a backup tag
 * that would end up with a name another tag already has here gets a number, "Favoriten (2)".
 */
function uniqueTagNames(local: readonly Tag[], plan: TablePlan<Tag>): number {
  const putIds = new Set(plan.put.map((t) => t.id));
  const removed = new Set(plan.remove);
  const taken = new Set(
    local.filter((t) => !putIds.has(t.id) && !removed.has(t.id)).map((t) => nameKey(t.name)),
  );
  let renamed = 0;
  plan.put = plan.put.map((tag) => {
    let name = tag.name;
    for (let n = 2; taken.has(nameKey(name)); n++) name = `${tag.name} (${n})`;
    taken.add(nameKey(name));
    if (name === tag.name) return tag;
    renamed++;
    return { ...tag, name };
  });
  return renamed;
}

export function planMerge(local: MergeSide, incoming: MergeSide): MergePlan {
  const installs = { local: local.installId, incoming: incoming.installId };
  const localDeleted = latestDeletions(local.tables.tombstones);
  const incomingDeleted = latestDeletions(incoming.tables.tombstones);

  const tagRemap = sameNameRemap(local.tables.tags, incoming.tables.tags);
  const placeRemap = sameNameRemap(local.tables.locations, incoming.tables.locations);
  const tags = withRemappedIds(incoming.tables.tags, tagRemap);
  const locations = withRemappedIds(incoming.tables.locations, placeRemap).map((l) =>
    remapLocation(l, placeRemap),
  );
  const holdings = incoming.tables.holdings.map((h) => remapHolding(h, tagRemap, placeRemap));

  const tagPlan = planTable(local.tables.tags, tags, localDeleted, incomingDeleted, installs);
  const renamed = uniqueTagNames(local.tables.tags, tagPlan);

  const result: MergePlan = {
    holdings: planTable(local.tables.holdings, holdings, localDeleted, incomingDeleted, installs),
    prices: planTable(
      local.tables.prices,
      incoming.tables.prices,
      localDeleted,
      incomingDeleted,
      installs,
    ),
    wishlist: planTable(
      local.tables.wishlist,
      incoming.tables.wishlist,
      localDeleted,
      incomingDeleted,
      installs,
    ),
    tags: tagPlan,
    locations: planTable(
      local.tables.locations,
      locations,
      localDeleted,
      incomingDeleted,
      installs,
    ),
    customItems: planTable(
      local.tables.customItems,
      incoming.tables.customItems,
      localDeleted,
      incomingDeleted,
      installs,
    ),
    media: planTable(
      local.tables.media,
      incoming.tables.media,
      localDeleted,
      incomingDeleted,
      installs,
    ),
    tombstones: [],
    remapped: { tags: tagRemap.size, locations: placeRemap.size },
    renamed,
  };

  // Deletions: both sides' (the later one per id), minus records that are live after the merge.
  const live = new Set<string>();
  for (const table of MERGE_TABLES) {
    const removed = new Set(result[table].remove);
    for (const r of local.tables[table]) if (!removed.has(r.id)) live.add(r.id);
    for (const r of result[table].put) live.add(r.id);
  }
  const deletions = latestDeletions([...local.tables.tombstones, ...incoming.tables.tombstones]);
  result.tombstones = [...deletions.values()].filter((t) => !live.has(t.id));
  return result;
}

function applyTable<T extends { id: string }>(mine: readonly T[], table: TablePlan<T>): T[] {
  const removed = new Set(table.remove);
  const byId = new Map<string, T>();
  for (const r of mine) if (!removed.has(r.id)) byId.set(r.id, r);
  for (const r of table.put) byId.set(r.id, r);
  return [...byId.values()];
}

/** The record tables after writing a plan (what the db layer ends up with; used by tests). */
export function mergedTables(local: BackupTables, plan: MergePlan): BackupTables {
  return {
    holdings: applyTable(local.holdings, plan.holdings),
    prices: applyTable(local.prices, plan.prices),
    wishlist: applyTable(local.wishlist, plan.wishlist),
    tags: applyTable(local.tags, plan.tags),
    locations: applyTable(local.locations, plan.locations),
    customItems: applyTable(local.customItems, plan.customItems),
    media: applyTable(local.media, plan.media),
    tombstones: plan.tombstones,
  };
}

/** Totals over all tables, for the preview. */
export function mergeTotals(plan: MergePlan) {
  const totals = { added: 0, updated: 0, kept: 0, unchanged: 0, deleted: 0, skipped: 0 };
  for (const table of MERGE_TABLES) {
    const p = plan[table];
    totals.added += p.added;
    totals.updated += p.updated;
    totals.kept += p.kept;
    totals.unchanged += p.unchanged;
    totals.deleted += p.deleted;
    totals.skipped += p.skipped;
  }
  return totals;
}
