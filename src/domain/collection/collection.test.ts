import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { CatalogCard } from '../catalog';
import { money } from '../money';
import type { Disposal, Holding } from '../schemas/holding';
import {
  allocateOpeningCost,
  collectionSearchSchema,
  costTotal,
  disposalCost,
  findCardsByNumber,
  freeSlots,
  groupRows,
  matchesFilter,
  nextFreeSlot,
  occupiedSlots,
  ownedByCard,
  parseQuickAdd,
  pickVariant,
  realizedResult,
  remainingCost,
  setCompletion,
  slotAfter,
  slotCell,
  sortRows,
  summarize,
  unitCosts,
  type LotFilter,
  type LotRow,
} from './index';

let seq = 0;
function lot(patch: Partial<Holding> = {}): Holding {
  seq += 1;
  const stamp = `2026-09-${String(10 + (seq % 20)).padStart(2, '0')}T10:00:00.000Z`;
  return {
    id: `0192f1c3-7b2a-7c0e-9d3f-${String(seq).padStart(12, '0')}`,
    createdAt: stamp,
    updatedAt: stamp,
    item: { kind: 'card', id: 'intl:30th:025' },
    setId: 'intl:30th',
    print: 'intl',
    snapshot: { name: 'Pikachu' },
    language: 'de',
    variant: 'std',
    condition: 'NM',
    quantity: 1,
    acquisition: { type: 'purchase' },
    disposals: [],
    tags: [],
    mediaIds: [],
    ...patch,
  };
}

const eur = (minor: number) => money(minor, 'EUR');
const disposal = (patch: Partial<Disposal>): Disposal => ({
  id: `0192f1c3-7b2a-7c0e-9d3f-d${String((seq += 1)).padStart(11, '0')}`,
  type: 'sale',
  date: '2026-09-20',
  quantity: 1,
  ...patch,
});

describe('lot cost basis (DATA_MODEL §6.2)', () => {
  it('adds fees to the price and knows unknown costs', () => {
    expect(
      costTotal(
        lot({ acquisition: { type: 'purchase', priceTotal: eur(1000), feesTotal: eur(125) } }),
      ),
    ).toEqual(eur(1125));
    expect(costTotal(lot())).toBeUndefined();
    // Pulls and gifts cost nothing unless a price was recorded.
    expect(costTotal(lot({ acquisition: { type: 'pull' } }))).toEqual(eur(0));
    expect(costTotal(lot({ acquisition: { type: 'gift' } }))).toEqual(eur(0));
  });

  it('splits the cost per unit and charges disposals in order', () => {
    const sale = disposal({ quantity: 1, proceedsTotal: eur(800), feesTotal: eur(50) });
    const h = lot({
      quantity: 3,
      acquisition: { type: 'purchase', priceTotal: eur(1000) },
      disposals: [sale],
    });
    expect(unitCosts(h)).toEqual([eur(334), eur(333), eur(333)]);
    expect(disposalCost(h, sale.id)).toEqual(eur(334));
    expect(remainingCost(h)).toEqual(eur(666));
    expect(realizedResult(h, sale)).toEqual(eur(800 - 50 - 334));
  });

  it('never loses or creates a cent', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 1, max: 50 }),
        fc.array(fc.integer({ min: 1, max: 5 }), { maxLength: 10 }),
        (price, quantity, parts) => {
          const disposals: Disposal[] = [];
          let left = quantity;
          for (const part of parts) {
            if (part > left) break;
            disposals.push(disposal({ quantity: part }));
            left -= part;
          }
          const h = lot({
            quantity,
            acquisition: { type: 'purchase', priceTotal: eur(price) },
            disposals,
          });
          const disposed = disposals.reduce((n, d) => n + (disposalCost(h, d.id)?.minor ?? 0), 0);
          expect(disposed + (remainingCost(h)?.minor ?? 0)).toBe(price);
        },
      ),
    );
  });
});

const card = (
  id: string,
  section: CatalogCard['section'],
  patch: Partial<CatalogCard> = {},
): CatalogCard => ({
  id,
  setId: 'intl:30th',
  localId: id.split(':').at(-1) ?? id,
  printedNumber: '',
  section,
  sort: 0,
  name: { de: id },
  category: 'pokemon',
  variants: [{ id: 'std' }],
  languages: ['de', 'en'],
  images: {},
  ...patch,
});

describe('set completion (DATA_MODEL §6.6)', () => {
  const cards = [
    card('s:001', 'main'),
    card('s:002', 'main'),
    card('s:129', 'secret'),
    card('s-c:001', 'subset'),
    card('e:009', 'energy'),
    card('s:P1', 'promo'),
  ];

  it('counts Basis, Komplett and Master per language and for any language', () => {
    const holdings = [
      lot({ item: { kind: 'card', id: 's:001' }, language: 'de' }),
      lot({ item: { kind: 'card', id: 's:129' }, language: 'en' }),
      lot({ item: { kind: 'card', id: 'e:009' }, language: 'de' }),
      lot({ item: { kind: 'card', id: 's:P1' }, language: 'de' }), // promos don't count
    ];
    expect(setCompletion(cards, holdings, { language: 'de' })).toEqual({
      basis: { owned: 1, total: 2 },
      komplett: { owned: 1, total: 3 },
      master: { owned: 2, total: 5 },
    });
    expect(setCompletion(cards, holdings)).toEqual({
      basis: { owned: 1, total: 2 },
      komplett: { owned: 2, total: 3 },
      master: { owned: 3, total: 5 },
    });
  });

  it('ignores closed lots and, if asked, graded copies', () => {
    const sold = lot({
      item: { kind: 'card', id: 's:001' },
      disposals: [disposal({ quantity: 1 })],
    });
    const graded = lot({
      item: { kind: 'card', id: 's:002' },
      grading: { company: 'PSA', grade: '10' },
    });
    expect(setCompletion(cards, [sold, graded]).basis).toEqual({ owned: 1, total: 2 });
    expect(setCompletion(cards, [sold, graded], { includeGraded: false }).basis.owned).toBe(0);
  });

  it('counts only cards and variants that exist in the language', () => {
    const asia = [
      card('a:001', 'main', { languages: ['ja', 'zh-cn'] }),
      card('a:002', 'main', {
        languages: ['ja'],
        variants: [{ id: 'std' }, { id: 'reverse', languages: ['ja'] }],
      }),
    ];
    expect(setCompletion(asia, [], { language: 'zh-cn' }).master.total).toBe(1);
    expect(setCompletion(asia, [], { language: 'ja' }).master.total).toBe(3);
  });

  it('matches the documented totals for 30 Jahre (128 / 161 / 199)', () => {
    const big = [
      ...Array.from({ length: 128 }, (_, i) => card(`m:${i}`, 'main')),
      ...Array.from({ length: 33 }, (_, i) => card(`x:${i}`, 'secret')),
      ...Array.from({ length: 30 }, (_, i) => card(`c:${i}`, 'subset')),
      ...Array.from({ length: 8 }, (_, i) => card(`e:${i}`, 'energy')),
    ];
    const totals = setCompletion(big, [], { language: 'de' });
    expect([totals.basis.total, totals.komplett.total, totals.master.total]).toEqual([
      128, 161, 199,
    ]);
  });

  it('skips stamped variants and counts variant-less lots for single-variant cards', () => {
    const stamped = [
      card('s:001', 'main', { variants: [{ id: 'holo' }, { id: 'holo+pokemon-center' }] }),
      card('s:002', 'main'),
    ];
    const legend = [
      { id: 'holo', kind: 'finish' as const },
      { id: 'holo+pokemon-center', kind: 'stamp' as const },
    ];
    const bare = lot({ item: { kind: 'card', id: 's:002' } });
    delete bare.variant;
    const result = setCompletion(stamped, [bare], { variantsLegend: legend });
    expect(result.master).toEqual({ owned: 1, total: 2 });
  });

  it('sums copies per card for the grid badges', () => {
    const owned = ownedByCard([
      lot({
        item: { kind: 'card', id: 's:001' },
        quantity: 3,
        disposals: [disposal({ quantity: 1 })],
      }),
      lot({ item: { kind: 'card', id: 's:001' }, language: 'en' }),
    ]);
    expect(owned.get('s:001')?.count).toBe(3);
    expect([...(owned.get('s:001')?.languages ?? [])]).toEqual(['de', 'en']);
  });
});

describe('binder slots (DATA_MODEL §5.6)', () => {
  const nine = { columns: 3, rows: 3 };

  it('finds the first free pocket and wraps to the next page', () => {
    expect(nextFreeSlot([], nine)).toEqual({ page: 1, slot: 1 });
    const firstPage = Array.from({ length: 9 }, (_, i) => ({ page: 1, slot: i + 1 }));
    expect(nextFreeSlot(firstPage, nine)).toEqual({ page: 2, slot: 1 });
    expect(nextFreeSlot([...firstPage.slice(0, 2), ...firstPage.slice(3)], nine)).toEqual({
      page: 1,
      slot: 3,
    });
    expect(nextFreeSlot(firstPage, nine, 1)).toBeUndefined(); // a full one-page binder
  });

  it('fills a 12-pocket page (3×4) before the next one', () => {
    const twelve = { columns: 3, rows: 4 };
    const taken = Array.from({ length: 11 }, (_, i) => ({ page: 1, slot: i + 1 }));
    expect(nextFreeSlot(taken, twelve)).toEqual({ page: 1, slot: 12 });
    expect(nextFreeSlot([...taken, { page: 1, slot: 12 }], twelve)).toEqual({ page: 2, slot: 1 });
    expect(slotCell(12, twelve)).toEqual({ row: 4, column: 3 });
  });

  it('lists free pockets in reading order for bulk moves', () => {
    const taken = [
      { page: 1, slot: 1 },
      { page: 1, slot: 3 },
    ];
    expect(freeSlots(taken, nine, undefined, 3)).toEqual([
      { page: 1, slot: 2 },
      { page: 1, slot: 4 },
      { page: 1, slot: 5 },
    ]);
    expect(freeSlots(taken, nine, 1, 20)).toHaveLength(7); // a one-page binder runs out
    expect(freeSlots([], nine, undefined, 11).at(-1)).toEqual({ page: 2, slot: 2 });
    expect(freeSlots([], nine, undefined, 0)).toEqual([]);
  });

  it('knows reading order and cells', () => {
    expect(slotAfter({ page: 4, slot: 9 }, nine)).toEqual({ page: 5, slot: 1 });
    expect(slotAfter({ page: 4, slot: 9 }, nine, 4)).toBeUndefined();
    expect(slotCell(7, nine)).toEqual({ row: 3, column: 1 });
    expect(slotCell(12, { columns: 4, rows: 3 })).toEqual({ row: 3, column: 4 });
  });

  it('counts only open lots in the binder', () => {
    const binder = '0192f0aa-0000-7000-8000-000000000001';
    const holdings = [
      lot({ location: { id: binder, page: 1, slot: 1 } }),
      lot({ location: { id: binder, page: 1, slot: 2 }, disposals: [disposal({ quantity: 1 })] }),
      lot({ location: { id: 'other', page: 1, slot: 3 } }),
      lot({ location: { id: binder } }),
    ];
    expect(occupiedSlots(holdings, binder)).toEqual([{ page: 1, slot: 1 }]);
  });
});

describe('quick-add input (COL-06)', () => {
  it('reads numbers with quantity, variant and price', () => {
    expect(parseQuickAdd('25')).toEqual({ ok: true, command: { number: '25', quantity: 1 } });
    expect(parseQuickAdd(' #025x3 ')).toEqual({
      ok: true,
      command: { number: '025', quantity: 3 },
    });
    expect(parseQuickAdd('25r')).toEqual({
      ok: true,
      command: { number: '25', quantity: 1, variant: 'reverse' },
    });
    expect(parseQuickAdd('25 4,50')).toEqual({
      ok: true,
      command: { number: '25', quantity: 1, priceText: '4,50' },
    });
    expect(parseQuickAdd('25 x2 h 4.5€')).toEqual({
      ok: true,
      command: { number: '25', quantity: 2, variant: 'holo', priceText: '4.5€' },
    });
    expect(parseQuickAdd('4/102')).toEqual({ ok: true, command: { number: '4/102', quantity: 1 } });
    expect(parseQuickAdd('R')).toEqual({ ok: true, command: { number: 'R', quantity: 1 } });
    expect(parseQuickAdd('GRA')).toEqual({ ok: true, command: { number: 'GRA', quantity: 1 } });
  });

  it('rejects what it can’t read', () => {
    expect(parseQuickAdd('  ')).toEqual({ ok: false, error: 'empty' });
    expect(parseQuickAdd('25x0')).toEqual({ ok: false, error: 'quantity' });
    expect(parseQuickAdd('25x1000')).toEqual({ ok: false, error: 'quantity' });
    expect(parseQuickAdd('25 foo')).toEqual({ ok: false, error: 'unknown', token: 'foo' });
    expect(parseQuickAdd('2-5')).toEqual({ ok: false, error: 'unknown', token: '2-5' });
  });

  const set = [
    card('intl:30th:004', 'main', { localId: '004', printedNumber: '004/128', sort: 4 }),
    card('intl:30th:009', 'main', { localId: '009', printedNumber: '009/128', sort: 9 }),
    card('intl:30th:129', 'secret', { localId: '129', printedNumber: '129/128', sort: 129 }),
    card('intl:30th:R', 'secret', { localId: 'R', printedNumber: 'R', sort: 1000 }),
    card('intl:30th-c:001', 'subset', { localId: '001', printedNumber: '4/102', sort: 2 }),
    card('intl:mee:009', 'energy', { localId: '009', printedNumber: '009', sort: 2000 }),
    card('asia:M6a:GRA', 'energy', { localId: 'GRA', printedNumber: '', sort: 2000 }),
  ];
  const ids = (number: string, section?: CatalogCard['section']) =>
    findCardsByNumber(set, number, section).map((c) => c.id);

  it('finds cards by the number printed on them, main set first', () => {
    expect(ids('4')).toEqual(['intl:30th:004', 'intl:30th-c:001']);
    expect(ids('4/102')).toEqual(['intl:30th-c:001']);
    expect(ids('004/128')).toEqual(['intl:30th:004']);
    expect(ids('4', 'subset')).toEqual(['intl:30th-c:001']);
    expect(ids('9')).toEqual(['intl:30th:009', 'intl:mee:009']);
    expect(ids('9', 'energy')).toEqual(['intl:mee:009']);
    expect(ids('129')).toEqual(['intl:30th:129']);
    expect(ids('r')).toEqual(['intl:30th:R']);
    expect(ids('gra')).toEqual(['asia:M6a:GRA']);
    expect(ids('77')).toEqual([]);
  });

  it('picks the hinted, preferred or first variant', () => {
    const reverse = { variants: [{ id: 'normal' }, { id: 'reverse-pokeball' }] };
    expect(pickVariant(reverse)).toBe('normal');
    expect(pickVariant(reverse, 'reverse')).toBe('reverse-pokeball');
    expect(pickVariant(reverse, 'holo')).toBeUndefined();
    expect(pickVariant(reverse, undefined, 'reverse-pokeball')).toBe('reverse-pokeball');
    expect(pickVariant({ variants: [{ id: 'std' }] }, undefined, 'holo')).toBe('std');
  });
});

describe('opening cost (Q5.8)', () => {
  it('splits by value, or evenly per card when nothing is priced', () => {
    expect(
      allocateOpeningCost(eur(15000), [
        { quantity: 1, value: eur(8000) },
        { quantity: 1, value: eur(1000) },
        { quantity: 3 },
      ]),
    ).toEqual([eur(13333), eur(1667), eur(0)]);
    expect(allocateOpeningCost(eur(1000), [{ quantity: 2 }, { quantity: 1 }])).toEqual([
      eur(667),
      eur(333),
    ]);
    expect(allocateOpeningCost(eur(1000), [])).toEqual([]);
  });

  it('always hands out the whole cost', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.array(
          fc.record({
            quantity: fc.integer({ min: 1, max: 10 }),
            value: fc.option(fc.integer({ min: 0, max: 100_000 }), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 12 },
        ),
        (cost, pulls) => {
          const shares = allocateOpeningCost(
            eur(cost),
            pulls.map((p) => ({
              quantity: p.quantity,
              value: p.value === undefined ? undefined : eur(p.value),
            })),
          );
          expect(shares.reduce((n, s) => n + s.minor, 0)).toBe(cost);
        },
      ),
    );
  });
});

const row = (holding: Holding, patch: Partial<LotRow> = {}): LotRow => ({
  holding,
  name: holding.snapshot.name,
  nameLang: 'de',
  searchText: holding.snapshot.name,
  setId: holding.setId,
  setName: '30 Jahre',
  inCatalog: true,
  ...patch,
});

const namesOf = (rows: readonly LotRow[], filter: LotFilter) =>
  rows.filter((r) => matchesFilter(r, filter)).map((r) => r.name);

describe('collection view pipeline (COL-04)', () => {
  const rows = [
    row(
      lot({ snapshot: { name: 'Glurak' }, language: 'de', createdAt: '2026-09-20T10:00:00.000Z' }),
      {
        number: '004/128',
        setSort: 4,
        rarity: 'rare',
      },
    ),
    row(
      lot({
        snapshot: { name: 'Pikachu-ex' },
        language: 'en',
        quantity: 2,
        acquisition: { type: 'purchase', priceTotal: eur(3000), date: '2026-09-01' },
        createdAt: '2026-09-21T10:00:00.000Z',
      }),
      { number: '150/128', setSort: 150, rarity: 'special-illustration-rare' },
    ),
    row(
      lot({
        snapshot: { name: 'Mew' },
        disposals: [disposal({ quantity: 1 })],
        createdAt: '2026-09-22T10:00:00.000Z',
      }),
      { number: 'R', setSort: 1000 },
    ),
  ];

  it('filters by text, number, language and closed lots', () => {
    expect(namesOf(rows, {})).toEqual(['Glurak', 'Pikachu-ex']);
    expect(namesOf(rows, { closed: true })).toEqual(['Glurak', 'Pikachu-ex', 'Mew']);
    expect(namesOf(rows, { q: 'pika' })).toEqual(['Pikachu-ex']);
    expect(namesOf(rows, { q: '4' })).toEqual(['Glurak']);
    expect(namesOf(rows, { q: '#150' })).toEqual(['Pikachu-ex']);
    expect(namesOf(rows, { lang: 'en' })).toEqual(['Pikachu-ex']);
    expect(namesOf(rows, { from: '2026-09-02' })).toEqual(['Glurak']);
    expect(namesOf(rows, { rarity: 'rare' })).toEqual(['Glurak']);
  });

  it('filters and groups sealed lots by product type', () => {
    const sealed = [
      row(lot({ snapshot: { name: 'Display' } }), { productType: 'booster-box' }),
      row(lot({ snapshot: { name: 'ETB' } }), { productType: 'elite-trainer-box' }),
      row(lot({ snapshot: { name: 'Display 2' } }), { productType: 'booster-box' }),
    ];
    expect(namesOf(sealed, { type: 'booster-box' })).toEqual(['Display', 'Display 2']);
    expect(groupRows(sealed, 'type').map((g) => [g.key, g.rows.length])).toEqual([
      ['booster-box', 2],
      ['elite-trainer-box', 1],
    ]);
  });

  it('groups custom items without a catalog set by their set name', () => {
    const custom = [
      row(lot({ snapshot: { name: 'Messe-Promo' } }), { setId: undefined, setName: 'Messe' }),
      row(lot({ snapshot: { name: 'Fehldruck' } }), { setId: undefined, setName: undefined }),
      row(lot({ snapshot: { name: 'Glurak' } }), { setId: 'intl:30th' }),
    ];
    expect(groupRows(custom, 'set').map((g) => g.key)).toEqual([
      'name:Messe',
      'name:',
      'intl:30th',
    ]);
  });

  it('sorts and groups', () => {
    expect(sortRows(rows).map((r) => r.name)).toEqual(['Mew', 'Pikachu-ex', 'Glurak']);
    expect(sortRows(rows, 'name').map((r) => r.name)).toEqual(['Glurak', 'Mew', 'Pikachu-ex']);
    expect(sortRows(rows, 'number').map((r) => r.name)).toEqual(['Glurak', 'Pikachu-ex', 'Mew']);
    expect(sortRows(rows, 'cost', 'desc')[0]?.name).toBe('Pikachu-ex');
    expect(groupRows(rows, 'language').map((g) => [g.key, g.rows.length])).toEqual([
      ['de', 2],
      ['en', 1],
    ]);
  });

  it('summarizes copies, items and what they cost', () => {
    expect(summarize(rows.slice(0, 2))).toEqual({
      lots: 2,
      copies: 3,
      items: 1,
      invested: eur(3000),
      unknownCost: 1,
    });
  });

  it('falls back to defaults for broken URL values', () => {
    expect(collectionSearchSchema.parse({ sort: 'nope', lang: 'xx', view: 'table' })).toEqual({
      view: 'table',
    });
  });
});
