import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Holding } from '../schemas';
import {
  holding,
  holdingArb,
  location,
  price,
  priceArb,
  tablesArb,
  tag,
  tombstone,
} from '../../../tests/factories';
import { canonicalJson } from './canonical';
import { emptyTables, type BackupTables } from './format';
import { incomingWins, mergedTables, mergeTotals, planMerge, type MergeSide } from './merge';

const EARLY = '2026-09-01T10:00:00.000Z';
const MID = '2026-09-10T10:00:00.000Z';
const LATE = '2026-09-20T10:00:00.000Z';

const side = (tables: Partial<BackupTables>, installId = 'install-a'): MergeSide => ({
  tables: { ...emptyTables(), ...tables },
  installId,
});
const here = (tables: Partial<BackupTables>) => side(tables, 'install-a');
const backup = (tables: Partial<BackupTables>) => side(tables, 'install-b');

/** Records by id as canonical JSON, so two table states compare regardless of order. */
function snapshot(tables: BackupTables) {
  const out: Record<string, Record<string, string>> = {};
  for (const [table, list] of Object.entries(tables)) {
    out[table] = Object.fromEntries(
      (list as { id: string }[]).map((r) => [r.id, canonicalJson(r)]),
    );
  }
  return out;
}

describe('planMerge: the rules of IMPORT_EXPORT.md §5', () => {
  it('adds records only in the backup, unless this device deleted them later', () => {
    const fresh = holding();
    const deletedHereLater = holding({ updatedAt: EARLY });
    const deletedHereEarlier = holding({ updatedAt: LATE });
    const plan = planMerge(
      here({
        tombstones: [
          tombstone(deletedHereLater.id, 'holdings', MID),
          tombstone(deletedHereEarlier.id, 'holdings', MID),
        ],
      }),
      backup({ holdings: [fresh, deletedHereLater, deletedHereEarlier] }),
    );
    expect(plan.holdings.put.map((h) => h.id)).toEqual([fresh.id, deletedHereEarlier.id]);
    expect(plan.holdings).toMatchObject({ added: 2, skipped: 1 });
    // A record that's live again loses its tombstone; the other deletion stays.
    expect(plan.tombstones.map((t) => t.id)).toEqual([deletedHereLater.id]);
  });

  it('keeps records only here, unless the backup deleted them later', () => {
    const untouched = holding();
    const deletedThereLater = holding({ updatedAt: EARLY });
    const editedHereAfter = holding({ updatedAt: LATE });
    const plan = planMerge(
      here({ holdings: [untouched, deletedThereLater, editedHereAfter] }),
      backup({
        tombstones: [
          tombstone(deletedThereLater.id, 'holdings', MID),
          tombstone(editedHereAfter.id, 'holdings', MID),
        ],
      }),
    );
    expect(plan.holdings.remove).toEqual([deletedThereLater.id]);
    expect(plan.holdings).toMatchObject({ deleted: 1, put: [] });
    expect(plan.tombstones.map((t) => t.id)).toEqual([deletedThereLater.id]);
  });

  it('lets the later version win, ties going to the larger installId', () => {
    const base = holding({ updatedAt: MID, note: 'hier' });
    const newer = { ...base, updatedAt: LATE, note: 'dort' };
    const older = { ...base, updatedAt: EARLY, note: 'dort' };
    const tie = { ...base, note: 'dort' };

    expect(
      planMerge(here({ holdings: [base] }), backup({ holdings: [newer] })).holdings,
    ).toMatchObject({ updated: 1, put: [newer] });
    expect(
      planMerge(here({ holdings: [base] }), backup({ holdings: [older] })).holdings,
    ).toMatchObject({ kept: 1, put: [] });
    // install-b > install-a: the backup wins the tie; the other way round, this device does.
    expect(
      planMerge(here({ holdings: [base] }), backup({ holdings: [tie] })).holdings.updated,
    ).toBe(1);
    expect(
      planMerge(side({ holdings: [base] }, 'install-z'), backup({ holdings: [tie] })).holdings.kept,
    ).toBe(1);
    expect(
      planMerge(here({ holdings: [base] }), backup({ holdings: [structuredClone(base)] })).holdings,
    ).toMatchObject({ unchanged: 1, put: [] });
  });

  it('compares timestamps as instants, not as text', () => {
    const local = holding({ updatedAt: '2026-09-10T10:00:00.000Z' });
    const sameInstant = { ...local, note: 'x', updatedAt: '2026-09-10T12:00:00.000+02:00' };
    expect(incomingWins(local, sameInstant, 'install-a', 'install-a')).toBe(false);
    expect(incomingWins(local, sameInstant, 'install-a', 'install-b')).toBe(true);
  });

  it('folds tags and Lagerorte made on both devices under one name, remapping references', () => {
    const favHere = tag('Favoriten');
    const favThere = tag('favoriten');
    const binderHere = location('Binder 1');
    const binderThere = location('Binder 1');
    const shelfThere = location('Regal', { kind: 'other', parentId: binderThere.id });
    const lot = holding({
      tags: [favThere.id],
      location: { id: binderThere.id, page: 2, slot: 5 },
    });
    const plan = planMerge(
      here({ tags: [favHere], locations: [binderHere] }),
      backup({ tags: [favThere], locations: [binderThere, shelfThere], holdings: [lot] }),
    );
    expect(plan.remapped).toEqual({ tags: 1, locations: 1 });
    // One tag: the local id stays, and the later version of the two decides its spelling.
    expect(plan.tags.added).toBe(0);
    expect(plan.tags.put.map((t) => t.id)).toEqual([favHere.id]);
    expect(plan.holdings.put[0]?.tags).toEqual([favHere.id]);
    expect(plan.holdings.put[0]?.location).toEqual({ id: binderHere.id, page: 2, slot: 5 });
    expect(plan.locations.put.map((l) => [l.name, l.parentId])).toEqual([['Regal', binderHere.id]]);
  });

  it('never folds Lagerorte that one side keeps apart', () => {
    const a = location('Binder');
    const b = location('Binder');
    const incoming = location('Binder');
    // Two local binders share the name: which one would it be? Neither.
    const ambiguous = planMerge(here({ locations: [a, b] }), backup({ locations: [incoming] }));
    expect(ambiguous.remapped.locations).toBe(0);
    expect(ambiguous.locations.added).toBe(1);
    // The backup has the local binder too, plus a second one of the same name: stays separate.
    const both = planMerge(here({ locations: [a] }), backup({ locations: [a, incoming] }));
    expect(both.remapped.locations).toBe(0);
    expect(both.locations.added).toBe(1);
  });

  it('keeps tag names unique by numbering a backup tag that would clash', () => {
    const t1 = tag('Alt', { updatedAt: EARLY });
    const renamedThere = { ...t1, name: 'Neu', updatedAt: MID };
    const madeHere = tag('neu', { updatedAt: LATE });
    const plan = planMerge(
      here({ tags: [t1, madeHere] }),
      backup({ tags: [renamedThere, madeHere] }),
    );
    expect(plan.renamed).toBe(1);
    expect(plan.tags.put.map((t) => t.name)).toEqual(['Neu (2)']);
  });

  it('adds up what the preview shows', () => {
    const plan = planMerge(
      here({ holdings: [holding()], prices: [price({ updatedAt: EARLY })] }),
      backup({ holdings: [holding(), holding()], prices: [price()] }),
    );
    expect(mergeTotals(plan)).toEqual({
      added: 3,
      updated: 0,
      kept: 0,
      unchanged: 0,
      deleted: 0,
      skipped: 0,
    });
  });
});

/** A dataset as edited on one device: some records changed, some deleted, some added. */
function editedArb(base: BackupTables) {
  const edits = fc.array(fc.constantFrom('keep', 'edit', 'delete'), {
    minLength: base.holdings.length,
    maxLength: base.holdings.length,
  });
  const at = fc
    .integer({ min: Date.parse('2026-09-01T00:00:00Z'), max: Date.parse('2026-09-30T00:00:00Z') })
    .map((ms) => new Date(ms).toISOString());
  return fc
    .record({
      edits,
      times: fc.array(at, { minLength: base.holdings.length, maxLength: base.holdings.length }),
      added: fc.uniqueArray(holdingArb, { selector: (h) => h.id, maxLength: 3 }),
      prices: fc.uniqueArray(priceArb, { selector: (p) => p.id, maxLength: 3 }),
    })
    .map(({ edits: list, times, added, prices }) => {
      const holdings: Holding[] = [];
      const tombstones = [...base.tombstones];
      base.holdings.forEach((h, i) => {
        const edit = list[i];
        const time = times[i] ?? EARLY;
        if (edit === 'edit') holdings.push({ ...h, note: `note ${time}`, updatedAt: time });
        else if (edit === 'delete') tombstones.push(tombstone(h.id, 'holdings', time));
        else holdings.push(h);
      });
      return {
        ...base,
        holdings: [...holdings, ...added],
        prices: [...base.prices, ...prices],
        tombstones,
      };
    });
}

const plainTablesArb = tablesArb.map((t) => ({
  ...t,
  tags: [],
  locations: [],
  holdings: t.holdings.map(({ location: _place, ...h }) => ({ ...h, tags: [] })),
}));

describe('planMerge: properties', () => {
  it('merging a dataset into itself changes nothing', () => {
    fc.assert(
      fc.property(tablesArb, (tables) => {
        const plan = planMerge(side(tables, 'a'), side(structuredClone(tables), 'b'));
        const totals = mergeTotals(plan);
        expect(totals.added + totals.updated + totals.deleted + totals.skipped).toBe(0);
        expect(snapshot(mergedTables(tables, plan))).toEqual(snapshot(tables));
      }),
      { numRuns: 150 },
    );
  });

  it('merging into an empty device gives the backup', () => {
    fc.assert(
      fc.property(tablesArb, (tables) => {
        const plan = planMerge(side(emptyTables(), 'a'), side(tables, 'b'));
        expect(snapshot(mergedTables(emptyTables(), plan))).toEqual(snapshot(tables));
      }),
      { numRuns: 150 },
    );
  });

  it('two devices reach the same data whichever merges which', () => {
    fc.assert(
      fc.property(
        plainTablesArb.chain((base) => fc.tuple(editedArb(base), editedArb(base))),
        ([a, b]) => {
          const ab = mergedTables(a, planMerge(side(a, 'install-a'), side(b, 'install-b')));
          const ba = mergedTables(b, planMerge(side(b, 'install-b'), side(a, 'install-a')));
          expect(snapshot(ab)).toEqual(snapshot(ba));
          // And merging the result again changes nothing (convergence).
          const again = planMerge(side(ab, 'install-a'), side(ba, 'install-b'));
          expect(mergeTotals(again)).toMatchObject({ added: 0, updated: 0, deleted: 0 });
        },
      ),
      { numRuns: 200 },
    );
  });
});
