import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorReport, logError, readErrorLog } from './error-log';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('window', {
    location: { pathname: '/catalog/sets/intl:30th', search: '?q=glurak' },
    innerWidth: 1440,
    innerHeight: 900,
    matchMedia: () => ({ matches: false }),
  });
  vi.stubGlobal('navigator', { userAgent: 'test', language: 'de-DE', onLine: true });
});

afterEach(() => vi.unstubAllGlobals());

describe('error log', () => {
  it('keeps errors with their path, never the query', () => {
    logError(new TypeError('boom'), 'boundary');
    const [entry] = readErrorLog();
    expect(entry).toMatchObject({
      kind: 'boundary',
      message: 'TypeError: boom',
      path: '/catalog/sets/intl:30th',
    });
    expect(JSON.stringify(readErrorLog())).not.toContain('glurak');
  });

  it('keeps the last 200 entries and shortens long messages', () => {
    for (let i = 0; i < 205; i += 1) logError(`${i} ${'x'.repeat(500)}`, 'error');
    const log = readErrorLog();
    expect(log).toHaveLength(200);
    expect(log[0]?.message.startsWith('5 ')).toBe(true);
    expect(log[0]?.message.length).toBe(300);
  });

  it('ignores a damaged log', () => {
    localStorage.setItem('settr:errors', '{not json');
    expect(readErrorLog()).toEqual([]);
    localStorage.setItem('settr:errors', JSON.stringify([{ nope: 1 }, { at: 'x', message: 'y' }]));
    expect(readErrorLog()).toHaveLength(1);
  });

  it('reports technical facts and the last 20 errors', () => {
    for (let i = 0; i < 25; i += 1) logError(new Error(String(i)), 'error');
    const report: unknown = JSON.parse(errorReport({ app: '1.0.0' }));
    expect(report).toMatchObject({ app: '1.0.0', language: 'de-DE', viewport: '1440×900' });
    expect(report).toHaveProperty('errors.length', 20);
  });
});
