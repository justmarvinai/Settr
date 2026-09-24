import { z } from 'zod';
import { isoTimestampSchema, SCHEMA_VERSION } from '../schemas';
import { canonicalJson } from './canonical';
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_ENCRYPTED,
  BACKUP_FORMAT_VERSION,
  countsOf,
  type BackupCounts,
  type BackupData,
} from './format';
import { jsonErrorIndex, lineColumnAt } from './json-error';
import { MigrationError, migrateData } from './migrate';
import { BackupShapeError, validateBackupData, type RecordIssue } from './validate';

/**
 * Reading a backup file (IMPORT_EXPORT.md §4 steps 2–5): parse → envelope check → checksum →
 * migrate → validate. Pure apart from the hash function passed in; runs in the backup worker.
 */

export type BackupReadError =
  | { kind: 'syntax'; line: number; column: number }
  | { kind: 'not-backup' }
  | { kind: 'encrypted' }
  /** Made by a newer Settr: refused as a whole, never partially imported (§1.3). */
  | { kind: 'newer'; appVersion?: string | undefined }
  | { kind: 'damaged'; detail: string };

export type ChecksumStatus = 'ok' | 'mismatch' | 'missing';

export interface BackupHeader {
  formatVersion: number;
  schemaVersion: number;
  appVersion?: string | undefined;
  catalogVersion?: string | null | undefined;
  exportedAt?: string | undefined;
  installId?: string | undefined;
  includesMedia: boolean;
}

export interface BackupRead {
  header: BackupHeader;
  /** Valid records only, migrated to the current schema. */
  data: BackupData;
  counts: BackupCounts;
  checksum: ChecksumStatus;
  issues: RecordIssue[];
  /** Records left out because they're invalid (issues keep the first MAX_ISSUES). */
  invalid: number;
  settingsReset: boolean;
}

export type BackupReadResult =
  | { ok: true; backup: BackupRead }
  | { ok: false; error: BackupReadError };

const headerSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.number().int().positive(),
  schemaVersion: z.number().int().positive(),
  app: z
    .object({ version: z.string().optional(), catalogVersion: z.string().nullable().optional() })
    .optional(),
  exportedAt: z.string().optional(),
  installId: z.string().optional(),
  options: z.object({ includesMedia: z.boolean().optional() }).optional(),
  checksum: z.object({ algorithm: z.string(), value: z.string() }).optional(),
  data: z.record(z.string(), z.unknown()),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const fail = (error: BackupReadError): BackupReadResult => ({ ok: false, error });

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

export async function readBackup(
  input: string,
  sha256: (text: string) => Promise<string>,
): Promise<BackupReadResult> {
  const text = input.startsWith('﻿') ? input.slice(1) : input;
  const parsed = parseJson(text);
  if (!parsed.ok) {
    const at = jsonErrorIndex(text);
    return fail({ kind: 'syntax', ...lineColumnAt(text, at < 0 ? text.length : at) });
  }
  const raw = parsed.value;
  if (!isRecord(raw)) return fail({ kind: 'not-backup' });
  if (raw.format === BACKUP_FORMAT_ENCRYPTED) return fail({ kind: 'encrypted' });
  if (raw.format !== BACKUP_FORMAT) return fail({ kind: 'not-backup' });

  // Before the shape check: a newer file may be shaped differently, and deserves the update hint.
  const newer =
    (typeof raw.formatVersion === 'number' && raw.formatVersion > BACKUP_FORMAT_VERSION) ||
    (typeof raw.schemaVersion === 'number' && raw.schemaVersion > SCHEMA_VERSION);
  if (newer) {
    const app = isRecord(raw.app) && typeof raw.app.version === 'string' ? raw.app.version : '';
    return fail({ kind: 'newer', appVersion: app || undefined });
  }

  const header = headerSchema.safeParse(raw);
  if (!header.success) {
    const [issue] = header.error.issues;
    return fail({
      kind: 'damaged',
      detail: issue ? `${issue.path.map(String).join('.') || '/'}: ${issue.message}` : '',
    });
  }
  const envelope = header.data;

  let checksum: ChecksumStatus = 'missing';
  if (envelope.checksum?.algorithm === 'SHA-256') {
    const actual = await sha256(canonicalJson(raw.data));
    checksum = actual === envelope.checksum.value.toLowerCase() ? 'ok' : 'mismatch';
  }

  try {
    const migrated = migrateData(envelope.data, envelope.schemaVersion);
    const { data, issues, invalid, settingsReset } = validateBackupData(migrated);
    return {
      ok: true,
      backup: {
        header: {
          formatVersion: envelope.formatVersion,
          schemaVersion: envelope.schemaVersion,
          appVersion: envelope.app?.version,
          catalogVersion: envelope.app?.catalogVersion,
          // A hand-edited date that isn't one reads as unknown (it's shown and may become lastBackupAt).
          exportedAt: isoTimestampSchema.safeParse(envelope.exportedAt).success
            ? envelope.exportedAt
            : undefined,
          installId: envelope.installId,
          includesMedia: envelope.options?.includesMedia ?? data.media.length > 0,
        },
        data,
        counts: countsOf(data),
        checksum,
        issues,
        invalid,
        settingsReset,
      },
    };
  } catch (error) {
    if (error instanceof BackupShapeError) return fail({ kind: 'damaged', detail: error.message });
    if (error instanceof MigrationError) return fail({ kind: 'damaged', detail: error.message });
    throw error;
  }
}
