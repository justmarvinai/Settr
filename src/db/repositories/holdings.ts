import { allocateOpeningCost, disposalCost, type PullShareInput } from '@/domain/collection';
import { newId, nowIso, todayIso } from '@/domain/ids';
import { cardSeriesKey, gradeKey } from '@/domain/series';
import { money } from '@/domain/money';
import {
  disposalSchema,
  holdingSchema,
  isOpen,
  remaining,
  type Disposal,
  type Holding,
} from '@/domain/schemas';
import type { SettrDB } from '../db';
import { bumpDataVersion } from './meta';
import { writeTombstone } from './tombstones';

export type NewHolding = Omit<
  Holding,
  'id' | 'createdAt' | 'updatedAt' | 'disposals' | 'tags' | 'mediaIds'
> &
  Partial<Pick<Holding, 'disposals' | 'tags' | 'mediaIds'>>;

export type HoldingPatch = Partial<Omit<Holding, 'id' | 'createdAt' | 'updatedAt'>>;

export type NewDisposal = Omit<Disposal, 'id'>;

/** Plain objects without undefined values, so optional fields are absent rather than undefined. */
function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (
    value === null ||
    typeof value !== 'object' ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) out[key] = clean(entry);
  }
  return out;
}

/** Write-time invariants beyond the schema (DATA_MODEL.md §8). */
function checkDates(h: Holding, today = todayIso()): void {
  const bought = h.acquisition.date;
  if (bought && bought > today) throw new RangeError('Kaufdatum liegt in der Zukunft');
  for (const d of h.disposals) {
    if (d.date > today) throw new RangeError('Datum liegt in der Zukunft');
    if (bought && d.date < bought) throw new RangeError('Datum liegt vor dem Kaufdatum');
  }
}

function build(input: NewHolding, now: string): Holding {
  const holding = holdingSchema.parse(
    clean({
      disposals: [],
      tags: [],
      mediaIds: [],
      ...input,
      id: newId(),
      createdAt: now,
      updatedAt: now,
    }),
  );
  checkDates(holding);
  return holding;
}

export async function createHolding(db: SettrDB, input: NewHolding): Promise<Holding> {
  const [holding] = await createHoldings(db, [input]);
  if (!holding) throw new Error('Holding was not created');
  return holding;
}

/** Several lots in one transaction (quick add, pulls). */
export async function createHoldings(
  db: SettrDB,
  inputs: readonly NewHolding[],
): Promise<Holding[]> {
  const now = nowIso();
  const holdings = inputs.map((input) => build(input, now));
  await db.transaction('rw', db.holdings, db.kv, async () => {
    await db.holdings.bulkAdd(holdings);
    await bumpDataVersion(db);
  });
  return holdings;
}

function next(current: Holding, patch: HoldingPatch): Holding {
  const holding = holdingSchema.parse(
    clean({
      ...current,
      ...patch,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: nowIso(),
    }),
  );
  checkDates(holding);
  return holding;
}

/**
 * Applies a patch (set a field to undefined to remove it) and returns the lot before and after,
 * so the caller can offer undo.
 */
export async function updateHolding(
  db: SettrDB,
  id: string,
  patch: HoldingPatch,
): Promise<{ before: Holding; after: Holding }> {
  return db.transaction('rw', db.holdings, db.kv, async () => {
    const before = await db.holdings.get(id);
    if (!before) throw new Error(`Holding ${id} not found`);
    const after = next(before, patch);
    await db.holdings.put(after);
    await bumpDataVersion(db);
    return { before, after };
  });
}

/** One patch function for many lots (bulk tag, move); returns the lots as they were. */
export async function updateHoldings(
  db: SettrDB,
  ids: readonly string[],
  patch: (holding: Holding) => HoldingPatch,
): Promise<Holding[]> {
  return db.transaction('rw', db.holdings, db.kv, async () => {
    const found = (await db.holdings.bulkGet([...ids])).filter((h) => h !== undefined);
    await db.holdings.bulkPut(found.map((h) => next(h, patch(h))));
    await bumpDataVersion(db);
    return found;
  });
}

/** A new lot like `id`: same item and details, no sales yet. */
export async function duplicateHolding(db: SettrDB, id: string): Promise<Holding> {
  const source = await db.holdings.get(id);
  if (!source) throw new Error(`Holding ${id} not found`);
  const { id: _id, createdAt: _c, updatedAt: _u, disposals: _d, mediaIds: _m, ...rest } = source;
  return createHolding(db, rest);
}

/** Deletes the row and writes a tombstone in one transaction (DATA_MODEL.md §5.10). */
export async function deleteHolding(db: SettrDB, id: string): Promise<Holding | undefined> {
  const [deleted] = await deleteHoldings(db, [id]);
  return deleted;
}

export async function deleteHoldings(db: SettrDB, ids: readonly string[]): Promise<Holding[]> {
  return db.transaction('rw', db.holdings, db.tombstones, db.kv, async () => {
    const found = (await db.holdings.bulkGet([...ids])).filter((h) => h !== undefined);
    if (!found.length) return [];
    await db.holdings.bulkDelete(found.map((h) => h.id));
    for (const h of found) await writeTombstone(db, 'holdings', h.id);
    await bumpDataVersion(db);
    return found;
  });
}

/** Undo for deletes and edits: puts the lots back as they were and drops their tombstones. */
export async function restoreHolding(db: SettrDB, holding: Holding): Promise<void> {
  await restoreHoldings(db, [holding]);
}

export async function restoreHoldings(db: SettrDB, holdings: readonly Holding[]): Promise<void> {
  if (!holdings.length) return;
  const now = nowIso();
  await db.transaction('rw', db.holdings, db.tombstones, db.kv, async () => {
    await db.holdings.bulkPut(holdings.map((h) => holdingSchema.parse({ ...h, updatedAt: now })));
    await db.tombstones.bulkDelete(holdings.map((h) => h.id));
    await bumpDataVersion(db);
  });
}

export async function listOpenHoldings(db: SettrDB): Promise<Holding[]> {
  return (await db.holdings.toArray()).filter(isOpen);
}

/** Lots of the given sets (a set chunk: main set, subsets, energies). */
export async function listHoldingsInSets(
  db: SettrDB,
  setIds: readonly string[],
): Promise<Holding[]> {
  return db.holdings
    .where('setId')
    .anyOf([...setIds])
    .toArray();
}

/** Lots stored in a location (for binder pockets). */
export async function listHoldingsAt(db: SettrDB, locationId: string): Promise<Holding[]> {
  return db.holdings.where('location.id').equals(locationId).toArray();
}

export async function listHoldingsOfItem(db: SettrDB, itemId: string): Promise<Holding[]> {
  return db.holdings.where('item.id').equals(itemId).toArray();
}

/**
 * Records a sale, trade, gift or loss of some units (COL-11). Throws when more units leave than
 * the lot still has. Returns the new disposal for undo.
 */
export async function addDisposal(
  db: SettrDB,
  holdingId: string,
  input: NewDisposal,
): Promise<{ holding: Holding; disposal: Disposal }> {
  return db.transaction('rw', db.holdings, db.kv, async () => {
    const current = await db.holdings.get(holdingId);
    if (!current) throw new Error(`Holding ${holdingId} not found`);
    if (input.quantity > remaining(current)) {
      throw new RangeError('Mehr Exemplare als vorhanden');
    }
    const disposal = disposalSchema.parse(clean({ ...input, id: newId() }));
    const holding = next(current, { disposals: [...current.disposals, disposal] });
    await db.holdings.put(holding);
    await bumpDataVersion(db);
    return { holding, disposal };
  });
}

export async function removeDisposal(
  db: SettrDB,
  holdingId: string,
  disposalId: string,
): Promise<Holding> {
  return db.transaction('rw', db.holdings, db.kv, async () => {
    const current = await db.holdings.get(holdingId);
    if (!current) throw new Error(`Holding ${holdingId} not found`);
    const holding = next(current, {
      disposals: current.disposals.filter((d) => d.id !== disposalId),
    });
    await db.holdings.put(holding);
    await bumpDataVersion(db);
    return holding;
  });
}

/** Pulls logged from an opened product lot (COL-12). */
export async function listPulls(db: SettrDB, productHoldingId: string): Promise<Holding[]> {
  return db.holdings.filter((h) => h.acquisition.fromHoldingId === productHoldingId).toArray();
}

/** A pull's value at opening: the latest price of its series × its copies (DATA_MODEL.md §6.3). */
async function pullValues(db: SettrDB, pulls: readonly Holding[]): Promise<Map<string, number>> {
  const values = new Map<string, number>();
  for (const pull of pulls) {
    if (pull.item.kind !== 'card' || !pull.variant) continue;
    const key = cardSeriesKey(pull.item.id, pull.language, pull.variant, gradeKey(pull.grading));
    const latest = await db.priceLatest.get(key);
    if (latest) values.set(pull.id, latest.price.minor * pull.quantity);
  }
  return values;
}

/**
 * Splits what the opened units of a product lot cost across its pulls (Q5.8, DATA_MODEL.md §6.2)
 * and writes each share as the pull's purchase price. `values` are the pulls' values at opening
 * (by holding id); by default the latest prices. Returns the pulls as they were, for undo.
 */
export async function allocatePullCosts(
  db: SettrDB,
  productHoldingId: string,
  values?: ReadonlyMap<string, number>,
): Promise<Holding[]> {
  return db.transaction('rw', db.holdings, db.priceLatest, db.kv, async () => {
    const product = await db.holdings.get(productHoldingId);
    if (!product) throw new Error(`Holding ${productHoldingId} not found`);
    const pulls = await listPulls(db, productHoldingId);
    if (!pulls.length) return [];
    const opened = product.disposals.filter((d) => d.type === 'opened');
    const cost = opened.reduce((n, d) => n + (disposalCost(product, d.id)?.minor ?? 0), 0);
    const currency = product.acquisition.priceTotal?.currency ?? 'EUR';
    const sorted = pulls.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
    const known = values ?? (await pullValues(db, sorted));
    const inputs: PullShareInput[] = sorted.map((pull) => {
      const value = known.get(pull.id);
      return {
        quantity: pull.quantity,
        value: value === undefined ? undefined : money(value, currency),
      };
    });
    const shares = allocateOpeningCost(money(cost, currency), inputs);
    await db.holdings.bulkPut(
      sorted.map((pull, index) =>
        next(pull, {
          acquisition: {
            ...pull.acquisition,
            type: 'pull',
            priceTotal: shares[index] ?? money(0, currency),
          },
        }),
      ),
    );
    await bumpDataVersion(db);
    return pulls;
  });
}
