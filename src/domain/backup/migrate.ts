import { SCHEMA_VERSION } from '../schemas';
import { RECORD_TABLES, type RecordTable } from './format';

/**
 * Schema migrations (DATA_MODEL.md §7, IMPORT_EXPORT.md §4 step 4): pure functions that lift user
 * data from schema version n to n + 1. The same record functions run in Dexie's `upgrade()` and on
 * older backups, so both paths always agree.
 */
export interface Migration {
  /** Per table, how one record changes; tables without a function pass through unchanged. */
  records?: Partial<Record<RecordTable, (record: unknown) => unknown>>;
  settings?: (settings: unknown) => unknown;
}

/**
 * Key n migrates schema version n to n + 1. Empty while version 1 is the only released schema; the
 * first change adds `1: { records: { … } }` together with a fixture in tests/fixtures/backups/.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export class MigrationError extends Error {
  readonly from: number;
  constructor(from: number) {
    super(`No migration from schema version ${from}`);
    this.name = 'MigrationError';
    this.from = from;
  }
}

function applyStep(data: Record<string, unknown>, step: Migration): Record<string, unknown> {
  const next: Record<string, unknown> = { ...data };
  for (const table of RECORD_TABLES) {
    const change = step.records?.[table];
    const list = next[table];
    if (change && Array.isArray(list)) next[table] = list.map((record: unknown) => change(record));
  }
  if (step.settings) next.settings = step.settings(next.settings);
  return next;
}

/** Lifts a backup's `data` from schema version `from` to the current one. */
export function migrateData(
  data: Record<string, unknown>,
  from: number,
  to: number = SCHEMA_VERSION,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
): Record<string, unknown> {
  let current = data;
  for (let version = from; version < to; version++) {
    const step = migrations[version];
    if (!step) throw new MigrationError(version);
    current = applyStep(current, step);
  }
  return current;
}
