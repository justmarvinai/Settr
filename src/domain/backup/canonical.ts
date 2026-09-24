/**
 * Canonical JSON (IMPORT_EXPORT.md §2), the checksum's input: object keys sorted at every level (by
 * UTF-16 code units), no whitespace, undefined values left out.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return entry;
    return Object.fromEntries(
      Object.entries(entry).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
  });
}
