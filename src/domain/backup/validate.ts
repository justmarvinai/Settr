import type { z } from 'zod';
import {
  customItemSchema,
  holdingSchema,
  locationSchema,
  priceEntrySchema,
  resolveSettings,
  settingsSchema,
  tagSchema,
  tombstoneSchema,
  wishlistItemSchema,
} from '../schemas';
import {
  backupMediaSchema,
  type BackupData,
  type CardmarketOverrides,
  type RecordTable,
} from './format';

/**
 * Validation of an imported backup's data (IMPORT_EXPORT.md §1.5, §4 step 5): every record passes
 * its Zod schema. Invalid records are reported precisely (table, position, id, field, reason) and
 * left out; they're never written.
 */

export type IssueCode = 'invalid' | 'duplicate-id' | 'duplicate-name';

export interface RecordIssue {
  table: RecordTable | 'overrides';
  /** Position in the file's list, 0-based. */
  index: number;
  id?: string | undefined;
  /** Field path like `acquisition.priceTotal.minor`; empty for the record as a whole. */
  field: string;
  code: IssueCode;
  /** Zod's reason (German once the worker has set Zod's locale). */
  message?: string | undefined;
}

/** How many issues are kept for display; all of them are counted. */
export const MAX_ISSUES = 200;

export interface ValidationResult {
  data: BackupData;
  issues: RecordIssue[];
  /** Records left out, all tables. */
  invalid: number;
  /** The settings didn't fully validate; invalid parts fell back to the defaults. */
  settingsReset: boolean;
}

export class BackupShapeError extends Error {
  readonly table: string;
  constructor(table: string) {
    super(`"${table}" is not a list`);
    this.name = 'BackupShapeError';
    this.table = table;
  }
}

interface Sink {
  issues: RecordIssue[];
  invalid: number;
}

function report(sink: Sink, issue: RecordIssue): void {
  sink.invalid++;
  if (sink.issues.length < MAX_ISSUES) sink.issues.push(issue);
}

const idOf = (record: unknown): string | undefined =>
  typeof record === 'object' && record !== null && 'id' in record && typeof record.id === 'string'
    ? record.id
    : undefined;

function listOf(data: Record<string, unknown>, table: string): unknown[] {
  const list = data[table];
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list)) throw new BackupShapeError(table);
  return list;
}

function validateTable<T extends { id: string }>(
  table: RecordTable,
  list: readonly unknown[],
  schema: z.ZodType<T>,
  sink: Sink,
  unique?: (record: T) => string,
): T[] {
  const valid: T[] = [];
  const ids = new Set<string>();
  const keys = new Set<string>();
  list.forEach((raw, index) => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const [first] = parsed.error.issues;
      report(sink, {
        table,
        index,
        id: idOf(raw),
        field: first ? first.path.map(String).join('.') : '',
        code: 'invalid',
        message: first?.message,
      });
      return;
    }
    const record = parsed.data;
    if (ids.has(record.id)) {
      report(sink, { table, index, id: record.id, field: 'id', code: 'duplicate-id' });
      return;
    }
    const key = unique?.(record);
    if (key !== undefined && keys.has(key)) {
      report(sink, { table, index, id: record.id, field: 'name', code: 'duplicate-name' });
      return;
    }
    ids.add(record.id);
    if (key !== undefined) keys.add(key);
    valid.push(record);
  });
  return valid;
}

/** Tag names are unique regardless of case (Dexie's `&name` index plus the app's own rule). */
export const nameKey = (name: string) => name.trim().toLocaleLowerCase('de');

function validateOverrides(raw: unknown, sink: Sink): CardmarketOverrides {
  const out: CardmarketOverrides = {};
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  Object.entries(raw).forEach(([key, value], index) => {
    if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) out[key] = value;
    else report(sink, { table: 'overrides', index, id: key, field: key, code: 'invalid' });
  });
  return out;
}

/**
 * Validates migrated backup data. Throws BackupShapeError when a table isn't a list at all (the
 * file is damaged); single bad records only become issues.
 */
export function validateBackupData(data: Record<string, unknown>): ValidationResult {
  const sink: Sink = { issues: [], invalid: 0 };
  const settings = settingsSchema.safeParse(data.settings ?? {});
  const overrides =
    typeof data.overrides === 'object' && data.overrides !== null && 'cardmarket' in data.overrides
      ? data.overrides.cardmarket
      : undefined;
  const result: BackupData = {
    holdings: validateTable('holdings', listOf(data, 'holdings'), holdingSchema, sink),
    prices: validateTable('prices', listOf(data, 'prices'), priceEntrySchema, sink),
    wishlist: validateTable('wishlist', listOf(data, 'wishlist'), wishlistItemSchema, sink),
    tags: validateTable('tags', listOf(data, 'tags'), tagSchema, sink, (t) => nameKey(t.name)),
    locations: validateTable('locations', listOf(data, 'locations'), locationSchema, sink),
    customItems: validateTable('customItems', listOf(data, 'customItems'), customItemSchema, sink),
    media: validateTable('media', listOf(data, 'media'), backupMediaSchema, sink),
    tombstones: validateTable('tombstones', listOf(data, 'tombstones'), tombstoneSchema, sink),
    settings: settings.success ? settings.data : resolveSettings(data.settings),
    overrides: { cardmarket: validateOverrides(overrides, sink) },
  };
  return {
    data: result,
    issues: sink.issues,
    invalid: sink.invalid,
    settingsReset: !settings.success,
  };
}
