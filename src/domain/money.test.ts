import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { allocate, allocateEvenly } from './allocation';
import { add, compare, money, multiply, negate, subtract, sum } from './money';

describe('money arithmetic', () => {
  it('adds, subtracts and multiplies integer minor units', () => {
    expect(add(money(1050), money(250))).toEqual(money(1300));
    expect(subtract(money(1050), money(2000))).toEqual(money(-950));
    expect(multiply(money(1290), 3)).toEqual(money(3870));
    expect(sum([money(1), money(2), money(3)])).toEqual(money(6));
    expect(negate(money(0))).toEqual(money(0));
    expect(compare(money(1), money(2))).toBe(-1);
  });

  it('refuses floats and mixed currencies', () => {
    expect(() => money(1.5)).toThrow(RangeError);
    expect(() => multiply(money(100), 0.5)).toThrow(RangeError);
    expect(() => add(money(1), money(1, 'JPY'))).toThrow(TypeError);
  });
});

describe('allocate (largest remainder)', () => {
  it('splits proportionally and exactly', () => {
    expect(allocate(1000, [1, 1, 1])).toEqual([334, 333, 333]);
    expect(allocate(100, [3, 1])).toEqual([75, 25]);
    expect(allocate(5499, [9490, 6450, 0])).toEqual([3274, 2225, 0]);
    expect(allocate(-100, [1, 1, 1])).toEqual([-34, -33, -33]);
  });

  it('splits evenly when all weights are zero', () => {
    expect(allocate(10, [0, 0, 0])).toEqual([4, 3, 3]);
    expect(allocateEvenly(10, 4)).toEqual([3, 3, 2, 2]);
  });

  it('rejects negative weights and impossible splits', () => {
    expect(() => allocate(10, [1, -1])).toThrow(RangeError);
    expect(() => allocate(10, [])).toThrow(RangeError);
    expect(allocate(0, [])).toEqual([]);
  });

  it('always sums exactly to the total, with each part within one unit of its exact share', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        fc.array(fc.integer({ min: 0, max: 1_000_000_000 }), { minLength: 1, maxLength: 40 }),
        (total, weights) => {
          const parts = allocate(total, weights);
          expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
          const sumW = weights.every((w) => w === 0)
            ? weights.length
            : weights.reduce((a, b) => a + b, 0);
          parts.forEach((p, i) => {
            const w = weights.every((x) => x === 0) ? 1 : (weights[i] ?? 0);
            const exact = (total * w) / sumW;
            expect(Math.abs(p - exact)).toBeLessThan(1 + 1e-6);
          });
        },
      ),
      { seed: 42, numRuns: 500 },
    );
  });
});
