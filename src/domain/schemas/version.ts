/**
 * Version of the user-data schema: the Dexie version and a backup's `schemaVersion` (DATA_MODEL.md
 * §7, IMPORT_EXPORT.md §2). Every change comes with a migration in `domain/backup/migrate.ts`, a
 * backup fixture and a round-trip test (CLAUDE.md rule 2).
 */
export const SCHEMA_VERSION = 1;
