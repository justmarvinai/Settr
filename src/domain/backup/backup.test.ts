import { describe, expect, it } from 'vitest';
import { sha256Hex } from '@/lib/hash';
import { holding, price, tag, tombstone } from '../../../tests/factories';
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from '../schemas';
import {
  BACKUP_FORMAT,
  backupState,
  canonicalJson,
  countsOf,
  emptyTables,
  jsonErrorIndex,
  lineColumnAt,
  migrateData,
  MigrationError,
  readBackup,
  REMIND_AFTER_CHANGES,
  validateBackupData,
  type BackupData,
} from './index';

function data(patch: Partial<BackupData> = {}): BackupData {
  return {
    ...emptyTables(),
    settings: DEFAULT_SETTINGS,
    overrides: { cardmarket: {} },
    ...patch,
  };
}

async function file(payload: BackupData, patch: Record<string, unknown> = {}): Promise<string> {
  return JSON.stringify({
    format: BACKUP_FORMAT,
    formatVersion: 1,
    schemaVersion: SCHEMA_VERSION,
    app: { name: 'Settr', version: '0.5.0', catalogVersion: '2026.09.23.5' },
    exportedAt: '2026-09-24T08:00:00.000Z',
    installId: 'install-a',
    options: { includesMedia: true },
    counts: countsOf(payload),
    checksum: { algorithm: 'SHA-256', value: await sha256Hex(canonicalJson(payload)) },
    data: payload,
    ...patch,
  });
}

describe('jsonErrorIndex', () => {
  it('finds where a JSON text breaks, or -1 when it is valid', () => {
    expect(jsonErrorIndex('{"a":[1,2.5e3,-0.1,true,false,null,"x\\u00e4\\n"],"b":{}}')).toBe(-1);
    expect(jsonErrorIndex(' [] ')).toBe(-1);
    expect(jsonErrorIndex('{"a":1,}')).toBe(7);
    expect(jsonErrorIndex('{"a":1 "b":2}')).toBe(7);
    expect(jsonErrorIndex('[1,2')).toBe(4);
    expect(jsonErrorIndex('')).toBe(0);
    expect(jsonErrorIndex('{"a":01}')).toBe(6);
    expect(jsonErrorIndex('{"a":"\\x"}')).toBe(6);
    expect(jsonErrorIndex('{"a":tru}')).toBe(5);
    expect(jsonErrorIndex('[1] x')).toBe(4);
    expect(jsonErrorIndex('"a\nb"')).toBe(2);
  });

  it('handles deep nesting without recursion', () => {
    const deep = `${'['.repeat(100_000)}${']'.repeat(100_000)}`;
    expect(jsonErrorIndex(deep)).toBe(-1);
    expect(jsonErrorIndex(deep.slice(0, -1))).toBe(199_999);
  });

  it('turns an index into line and column', () => {
    const text = '{\n  "a": 1,\n  "b": x\n}';
    const at = jsonErrorIndex(text);
    expect(lineColumnAt(text, at)).toEqual({ line: 3, column: 8 });
    expect(lineColumnAt('abc', 3)).toEqual({ line: 1, column: 4 });
  });
});

describe('readBackup', () => {
  it('reads a backup: header, valid records, counts, checksum', async () => {
    const payload = data({
      holdings: [holding(), holding({ quantity: 3 })],
      prices: [price()],
      tags: [tag('Favoriten')],
      overrides: { cardmarket: { 'card|intl:30th:025|de|normal': 907_757 } },
    });
    const result = await readBackup(await file(payload), sha256Hex);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { backup } = result;
    expect(backup.header).toEqual({
      formatVersion: 1,
      schemaVersion: 1,
      appVersion: '0.5.0',
      catalogVersion: '2026.09.23.5',
      exportedAt: '2026-09-24T08:00:00.000Z',
      installId: 'install-a',
      includesMedia: true,
    });
    expect(backup.checksum).toBe('ok');
    expect(backup.counts).toMatchObject({ holdings: 2, prices: 1, tags: 1, media: 0 });
    expect(backup.issues).toEqual([]);
    expect(canonicalJson(backup.data)).toBe(canonicalJson(payload));
  });

  it('accepts a byte-order mark and warns about an edited file', async () => {
    const text = await file(data({ holdings: [holding()] }));
    const edited = text.replace('"quantity":1', '"quantity":2');
    const result = await readBackup(`﻿${edited}`, sha256Hex);
    expect(result.ok && result.backup.checksum).toBe('mismatch');
    expect(result.ok && result.backup.data.holdings[0]?.quantity).toBe(2);
  });

  it('treats a backup date that is no timestamp as unknown', async () => {
    const result = await readBackup(await file(data(), { exportedAt: 'gestern' }), sha256Hex);
    expect(result.ok && result.backup.header.exportedAt).toBeUndefined();
  });

  it('reads a file without a checksum', async () => {
    const result = await readBackup(await file(data(), { checksum: undefined }), sha256Hex);
    expect(result.ok && result.backup.checksum).toBe('missing');
  });

  it('reports JSON syntax errors with line and column', async () => {
    const result = await readBackup('{\n  "format": "settr-backup",\n  "data": x\n}', sha256Hex);
    expect(result).toEqual({ ok: false, error: { kind: 'syntax', line: 3, column: 11 } });
    expect(await readBackup('{"a":', sha256Hex)).toEqual({
      ok: false,
      error: { kind: 'syntax', line: 1, column: 6 },
    });
  });

  it('refuses files that are no backup, encrypted or damaged', async () => {
    expect(await readBackup('[1,2]', sha256Hex)).toEqual({
      ok: false,
      error: { kind: 'not-backup' },
    });
    expect(await readBackup('{"format":"collectr"}', sha256Hex)).toEqual({
      ok: false,
      error: { kind: 'not-backup' },
    });
    expect(await readBackup('{"format":"settr-backup-encrypted"}', sha256Hex)).toEqual({
      ok: false,
      error: { kind: 'encrypted' },
    });
    const noData = await readBackup(
      '{"format":"settr-backup","formatVersion":1,"schemaVersion":1}',
      sha256Hex,
    );
    expect(!noData.ok && noData.error.kind).toBe('damaged');
    const notAList = await readBackup(await file(data(), { data: { holdings: {} } }), sha256Hex);
    expect(notAList).toMatchObject({ ok: false, error: { kind: 'damaged' } });
  });

  it('refuses a backup from a newer Settr as a whole', async () => {
    const newerSchema = await file(data({ holdings: [holding()] }), {
      schemaVersion: SCHEMA_VERSION + 1,
      app: { name: 'Settr', version: '2.0.0' },
    });
    expect(await readBackup(newerSchema, sha256Hex)).toEqual({
      ok: false,
      error: { kind: 'newer', appVersion: '2.0.0' },
    });
    const newerFormat = await file(data(), { formatVersion: 2, data: 'zip' });
    expect(await readBackup(newerFormat, sha256Hex)).toMatchObject({
      ok: false,
      error: { kind: 'newer' },
    });
  });

  it('leaves invalid records out and says which, where and why', async () => {
    const good = holding();
    const text = await file(
      data({
        holdings: [
          good,
          { ...holding(), quantity: 0 },
          good,
          {
            ...holding(),
            acquisition: { type: 'purchase', priceTotal: { minor: 1.5, currency: 'EUR' } },
          },
        ],
        tags: [tag('Favoriten'), tag('favoriten ')],
        overrides: { cardmarket: { a: 5, b: -1 } },
      }),
    );
    const result = await readBackup(text, sha256Hex);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.counts.holdings).toBe(1);
    expect(result.backup.counts.tags).toBe(1);
    expect(result.backup.invalid).toBe(5);
    expect(result.backup.issues).toMatchObject([
      { table: 'holdings', index: 1, field: 'quantity', code: 'invalid' },
      { table: 'holdings', index: 2, id: good.id, field: 'id', code: 'duplicate-id' },
      { table: 'holdings', index: 3, field: 'acquisition.priceTotal.minor', code: 'invalid' },
      { table: 'tags', index: 1, field: 'name', code: 'duplicate-name' },
      { table: 'overrides', id: 'b', code: 'invalid' },
    ]);
    expect(result.backup.issues[0]?.message).toBeTruthy();
    expect(result.backup.data.overrides.cardmarket).toEqual({ a: 5 });
  });

  it('keeps valid settings and falls back per setting when some are invalid', async () => {
    const settings = { ...DEFAULT_SETTINGS, defaultCardLanguage: 'ja' as const };
    const valid = await readBackup(await file(data({ settings })), sha256Hex);
    expect(valid.ok && valid.backup.data.settings.defaultCardLanguage).toBe('ja');
    expect(valid.ok && valid.backup.settingsReset).toBe(false);

    const broken = await readBackup(
      await file(data(), {
        data: { ...data(), settings: { defaultCardLanguage: 'ja', theme: 42, price: 'x' } },
      }),
      sha256Hex,
    );
    expect(broken.ok && broken.backup.settingsReset).toBe(true);
    expect(broken.ok && broken.backup.data.settings.defaultCardLanguage).toBe('ja');
    expect(broken.ok && broken.backup.data.settings.price).toEqual(DEFAULT_SETTINGS.price);
  });

  it('treats missing tables as empty', async () => {
    const result = await readBackup(
      JSON.stringify({ format: BACKUP_FORMAT, formatVersion: 1, schemaVersion: 1, data: {} }),
      sha256Hex,
    );
    expect(result.ok && result.backup.counts).toEqual(countsOf(emptyTables()));
    expect(result.ok && result.backup.header.includesMedia).toBe(false);
  });
});

describe('migrateData', () => {
  it('runs each step from the backup’s version up to the current one', () => {
    const migrations = {
      1: {
        records: { holdings: (r: unknown) => ({ ...(r as object), v2: true }) },
        settings: (s: unknown) => ({ ...(s as object), migrated: 2 }),
      },
      2: { records: { holdings: (r: unknown) => ({ ...(r as object), v3: true }) } },
    };
    const out = migrateData(
      { holdings: [{ id: 'a' }], prices: [{ id: 'p' }], settings: {} },
      1,
      3,
      migrations,
    );
    expect(out).toEqual({
      holdings: [{ id: 'a', v2: true, v3: true }],
      prices: [{ id: 'p' }],
      settings: { migrated: 2 },
    });
    expect(migrateData({ holdings: [] }, SCHEMA_VERSION)).toEqual({ holdings: [] });
    expect(() => migrateData({}, 1, 3, { 1: {} })).toThrow(MigrationError);
  });
});

describe('validateBackupData', () => {
  it('validates tombstones and media too', () => {
    const result = validateBackupData({
      tombstones: [tombstone('x', 'holdings'), { id: 'y' }],
      media: [{ id: 'nope' }],
    });
    expect(result.data.tombstones).toHaveLength(1);
    expect(result.issues.map((i) => i.table)).toEqual(['media', 'tombstones']);
  });
});

describe('backupState', () => {
  const NOW = Date.parse('2026-09-24T12:00:00.000Z');
  const DAY = 86_400_000;
  const base = { hasData: true, dataVersion: 10, remindAfterDays: 7, now: NOW };
  const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

  it('is due at once without any backup, but only with data; the toast waits a day', () => {
    expect(backupState({ ...base, installedAt: ago(0.1) })).toEqual({
      due: true,
      remind: false,
      changes: 10,
    });
    expect(backupState({ ...base, installedAt: ago(2) }).remind).toBe(true);
    expect(
      backupState({ ...base, installedAt: ago(0.1), dataVersion: REMIND_AFTER_CHANGES }).remind,
    ).toBe(true);
    expect(backupState({ ...base, hasData: false })).toEqual({
      due: false,
      remind: false,
      changes: undefined,
    });
  });

  it('is due when the backup is older than the interval and something changed since', () => {
    const last = { lastBackupAt: ago(8), backupDataVersion: 7 };
    expect(backupState({ ...base, ...last })).toEqual({ due: true, remind: true, changes: 3 });
    expect(backupState({ ...base, ...last, remindAfterDays: 14 })).toEqual({
      due: false,
      remind: false,
      changes: 3,
    });
    expect(backupState({ ...base, ...last, backupDataVersion: 10 })).toEqual({
      due: false,
      remind: false,
      changes: 0,
    });
  });

  it('is due after 50 changes, however recent the backup', () => {
    const fresh = { lastBackupAt: ago(1), backupDataVersion: 0 };
    expect(backupState({ ...base, ...fresh, dataVersion: 49 }).due).toBe(false);
    expect(backupState({ ...base, ...fresh, dataVersion: REMIND_AFTER_CHANGES }).due).toBe(true);
  });

  it('assumes changes for a backup made before the counter was kept', () => {
    expect(backupState({ ...base, lastBackupAt: ago(8) })).toEqual({
      due: true,
      remind: true,
      changes: undefined,
    });
    expect(backupState({ ...base, lastBackupAt: ago(2) }).due).toBe(false);
  });
});
