/**
 * What the app needs at startup (shell, theme, backup status). Startup code imports this instead
 * of '@/db', so the entry bundle doesn't reach the collection repositories (ADR-030 budget).
 */
export { db } from './instance';
export { SCHEMA_VERSION } from './db';
export { ensureMeta, getMeta, markBackupDone } from './repositories/meta';
export { getSettings, updateSettings, type SettingsPatch } from './repositories/settings';
export { useDataVersion, useHoldingCount, useMeta, useSettings, useStoredDisplay } from './hooks';
