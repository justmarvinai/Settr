import { describe, expect, it } from 'vitest';
import { isQuotaError } from './toasts';

describe('isQuotaError', () => {
  it('recognizes a full disk, also when Dexie wraps it', () => {
    const quota = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    expect(isQuotaError(quota)).toBe(true);
    const wrapped = Object.assign(new Error('Dexie'), { name: 'AbortError', inner: quota });
    expect(isQuotaError(wrapped)).toBe(true);
    expect(isQuotaError(new Error('x', { cause: quota }))).toBe(true);
    expect(isQuotaError(new Error('nope'))).toBe(false);
    expect(isQuotaError('QuotaExceededError')).toBe(false);
    expect(isQuotaError(undefined)).toBe(false);
  });
});
