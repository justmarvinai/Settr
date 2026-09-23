/**
 * Largest-remainder allocation (DATA_MODEL.md §5.1, §6.2). Apart from money.ts, which the app
 * loads at startup for formatting, because only the collection's cost math needs it.
 */

function assertSafeInteger(value: number, what: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${what} must be a safe integer, got ${value}`);
  }
}

/**
 * Splits an integer total into parts proportional to integer weights, using the largest-remainder
 * method, so the parts always sum exactly to the total (DATA_MODEL.md §5.1, §6.2).
 * All-zero weights split evenly. Ties go to the earlier index. BigInt keeps it exact for large values.
 */
export function allocate(total: number, weights: readonly number[]): number[] {
  assertSafeInteger(total, 'total');
  if (weights.length === 0) {
    if (total !== 0) throw new RangeError('Cannot allocate a non-zero total to no parts');
    return [];
  }
  for (const w of weights) {
    assertSafeInteger(w, 'weight');
    if (w < 0) throw new RangeError(`Weights must not be negative, got ${w}`);
  }
  const allZero = weights.every((w) => w === 0);
  const ws = (allZero ? weights.map(() => 1) : weights).map((w) => BigInt(w));
  const sumW = ws.reduce((a, b) => a + b, 0n);
  const sign = total < 0 ? -1n : 1n;
  const abs = BigInt(Math.abs(total));

  const parts = ws.map((w) => (abs * w) / sumW);
  const remainders = ws.map((w, index) => ({ index, rest: (abs * w) % sumW }));
  let leftover = abs - parts.reduce((a, b) => a + b, 0n);
  remainders.sort((a, b) => (a.rest === b.rest ? a.index - b.index : a.rest > b.rest ? -1 : 1));
  for (const { index } of remainders) {
    if (leftover === 0n) break;
    parts[index] = (parts[index] ?? 0n) + 1n;
    leftover -= 1n;
  }
  return parts.map((p) => Number(p * sign));
}

/** Splits an integer total into n parts that differ by at most one unit. */
export function allocateEvenly(total: number, parts: number): number[] {
  assertSafeInteger(parts, 'parts');
  if (parts < 0) throw new RangeError('parts must not be negative');
  return allocate(
    total,
    Array.from({ length: parts }, () => 1),
  );
}
