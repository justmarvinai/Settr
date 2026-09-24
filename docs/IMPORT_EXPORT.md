# Settr: Import, Export and Backups

> Status: **v0.4, as built in M5** · Last updated: 2026-09-24
> Settr has no server, so the backup file **is** the user's safety net and the only way to move data between devices. This document specifies the format and the guarantees.
> Entities → [`DATA_MODEL.md`](./DATA_MODEL.md). References like (Q7.1) or (R2.9) point to decisions in [`USER_QUESTIONS.md`](../USER_QUESTIONS.md). All three question rounds are answered (R3.x = round 3, 2026-09-23).

---

## 1. Guarantees (non-negotiable)

1. **Lossless round-trip.** `export → import (replace)` on an empty browser reproduces *exactly* the same user data: every record, field, setting and photo. This is enforced by automated round-trip tests on generated datasets (property-based).
2. **Forward migration.** A backup made with any older Settr version imports into any newer version. Backup fixtures of every released `schemaVersion` live in `tests/fixtures/backups/` and are imported in CI.
3. **Refuse the future safely.** A backup from a *newer* Settr version is rejected with a clear message ("Bitte Settr aktualisieren"). It's never partially imported.
4. **Nothing is destroyed without a safety net.** Before any import, Settr stores an automatic **pre-import snapshot** of the current data and offers one-click restore.
5. **Validated input.** Every imported record passes the Zod schemas. Invalid records are reported precisely (table, id, field, reason) and never written silently.
6. **Private.** Export and import happen entirely in the browser. No upload anywhere.

---

## 2. Full backup format: `*.settr.json`

A single UTF-8 JSON file. The filename pattern is `settr-backup-2026-09-23-1012.settr.json`.

```jsonc
{
  "format": "settr-backup",          // magic string
  "formatVersion": 1,                // envelope version (changes rarely)
  "schemaVersion": 1,                // user-data schema version (= Dexie version)
  "app": { "name": "Settr", "version": "1.0.0", "catalogVersion": "2026.09.23.1" },
  "exportedAt": "2026-09-23T10:12:00.000Z",
  "installId": "0192f1c3-…",         // identifies the source device/browser profile
  "options": { "includesMedia": true },
  "counts": { "holdings": 312, "prices": 1840, "wishlist": 12, "tags": 5, "locations": 4,
              "customItems": 2, "media": 9, "tombstones": 40 },
  "checksum": { "algorithm": "SHA-256", "value": "…" },  // over canonical JSON of `data`
  "data": {
    "holdings":    [ /* Holding[] */ ],
    "prices":      [ /* PriceEntry[] */ ],
    "wishlist":    [ /* WishlistItem[] */ ],
    "tags":        [ /* Tag[] */ ],
    "locations":   [ /* Location[] */ ],
    "customItems": [ /* CustomItem[] */ ],
    "media":       [ { "id": "…", "mime": "image/webp", "width": 1200, "height": 1600, "bytes": 184233,
                       "createdAt": "…", "updatedAt": "…", "base64": "…" } ],
    "settings":    { /* Settings */ },
    "overrides":   { "cardmarket": { /* itemKey → idProduct, user corrections */ } },
    "tombstones":  [ /* Tombstone[] */ ]
  }
}
```

**Notes**
- Derived tables (`priceLatest`, caches) are **not** exported. They're rebuilt after import. Per-device UI preferences (`kv ui:*`) and the transient price-session state aren't exported either.
- `snapshot` fields on records make the file **human-readable** and let it survive catalog changes.
- Photos are embedded as base64 (+33 % size). The export offers *"Fotos einschließen"* (default on) once there are photos; v1 has none yet (COL-10 is post-v1). If files become large, a ZIP container (`.settr.zip`, via `fflate`) is the planned upgrade path (`formatVersion: 2`).
- **Canonical JSON** for the checksum uses keys sorted recursively, no insignificant whitespace, and UTF-8. A checksum mismatch produces a warning ("Datei wurde verändert"), not a hard error, so hand-edited files can still be imported after validation.
- Optional **password encryption** (⟶ I-17) would wrap the file as `{ format: "settr-backup-encrypted", kdf: "PBKDF2-SHA256", iterations: 600000, salt, iv, ciphertext }` using the WebCrypto API with AES-256-GCM.

---

## 3. Export flow

1. Einstellungen › Daten › **Backup exportieren** (also ⌘K › *Aktionen* › *Backup exportieren*, the sidebar backup pill, *Jetzt sichern* in the reminder toast, and the *Alle Daten löschen* dialog).
2. Options: *Fotos einschließen* ☑ · (future) *Mit Passwort verschlüsseln* ☐.
3. Settle queued writes, then read all tables in one read-only transaction, which gives a consistent snapshot.
4. Build the envelope, compute counts and the checksum, then serialize.
5. Save. **Backups are downloads** (R2.9, ADR-027):
   - Desktop: a Blob download via `<a download>` with the suggested name. Brave's "Ask where to save each file" is on by default, so a Save-As dialog opens and Marvin can keep his backups in one folder.
   - `showSaveFilePicker()` is only an optional extra where it exists. Feature-detect the picker function itself (`'showSaveFilePicker' in window`), never `FileSystemHandle`: Brave disables the File System Access API by default.
   - No Web Share on desktop: Brave on Windows refuses `.json` files (`NotAllowedError`, although `canShare()` says yes), so desktop offers no "share backup".
   - iPhone: the **Web Share API** with files ("In Dateien sichern", AirDrop, etc.) when supported, otherwise (or when the share is rejected) a download.
6. Update `meta.lastBackupAt` (and `meta.backupDataVersion`, the change counter at that moment) when the download starts. The sidebar backup status resets (it's amber only when a backup is due, §8). A cancelled Save-As dialog can't be detected by a web page, so the toast says *"Backup-Download gestartet"* and offers *Erneut speichern* for a few seconds.

---

## 4. Import flow

```
Pick file ─▶ Parse ─▶ Envelope check ─▶ Migrate ─▶ Validate ─▶ Preview & choose mode ─▶ Safety snapshot ─▶ Write ─▶ Rebuild derived ─▶ Done
```

1. **Pick:** file input or drag & drop onto the Daten page, which work in every browser. `showOpenFilePicker()` is used only where the function exists (Brave disables it by default, ADR-027). `.settr.json` and `.json` are accepted.
2. **Parse:** `JSON.parse` in a Web Worker (keeps the UI responsive for large files). Syntax errors show line/column.
3. **Envelope check:** `format` must match. If `formatVersion` or `schemaVersion` is newer than supported, **abort** with an update hint.
4. **Migrate:** pure functions `migrate_vN_to_vN+1(data)` are applied in sequence (the same functions Dexie upgrades use).
5. **Validate:** Zod per record. Results are *valid*, *invalid (with reasons)*, and *warnings* (e.g. an unknown catalog ID, which is kept with its snapshot and shown as "nicht im Katalog").
6. **Preview:** counts per table, backup date, source app version, and the checksum status. For **merge** mode it also shows the numbers of new, updated, unchanged and conflicting records and incoming deletions.
7. **Choose mode:**
   - **Ersetzen (Replace):** wipe all user tables, then insert the backup. Recommended when moving to a new device.
   - **Zusammenführen (Merge):** see §5. Recommended when combining data from two devices.
8. **Safety snapshot:** the current data is serialized in the same format and stored in a separate IndexedDB database `settr-snapshots` (the last 3 are kept). The user can also download it.
9. **Write:** one `rw` transaction across all tables using `bulkPut`, with progress UI. Any failure rolls back completely.
10. **Rebuild** `priceLatest`, bump the data-version counter (invalidates memoized analytics) and set `meta.lastImportAt`.
11. **Done:** a summary toast plus **"Import rückgängig machen"** (restores the snapshot), available until the next import.

**As built (M5, ADR-041):**
- *Backup einspielen* on the Daten page takes a file by button or drag and drop (`.json`, `.settr.json`) and reads it in a module worker (`workers/backup.worker.ts`). Refusals say why:
  - the file isn't JSON (with line and column);
  - it isn't a Settr backup;
  - it's encrypted;
  - it's from a newer Settr (*Bitte Settr aktualisieren*, with its version);
  - it's damaged (a table that isn't a list);
  - it's over 200 MB.
- The preview dialog shows:
  - when the backup was made;
  - the Settr version and the device (*Dieses Gerät* / *Ein anderes Gerät*);
  - the checksum (*In Ordnung*, *Datei wurde verändert* with a note, *Keine*);
  - the contents (*312 Positionen · 1.840 Preise · 5 Tags*);
  - how many records are skipped, and a list of which and why (*Positionen, Nr. 5 · quantity: …*, the first 200);
  - settings that fell back to the default.
- Modes: with data on the device, the choice is *Zusammenführen* (the default) or *Ersetzen*.
  - Merge shows *Neu · Aktualisiert · Gelöscht · Unverändert*, what stays because it's newer here, what stays deleted, folded tags and Lagerorte, renamed tags, and the *Einstellungen aus dem Backup übernehmen* checkbox.
  - Replace shows what gets replaced.
  - An empty device just imports (*Einspielen*).
- The toast after an import says *Neu: 12 · Aktualisiert: 3 · Gelöscht: 1* (or the contents for a replace) and offers *Rückgängig* for 15 s.
- *Sicherungen vor Importen* on the Daten page lists the three latest snapshots (*Vor dem Import von anderes-geraet.settr.json*, *Vor einer Wiederherstellung*) to restore, after a confirmation and itself undoable, or to download as a backup file.
- Snapshots live in the separate IndexedDB database `settr-snapshots`.
- The write is one transaction that runs only if nothing changed since the snapshot was read (else *Es wurde nichts eingespielt, bitte versuch es noch einmal*).
- A replace counts the file as the latest backup, and it clears the device's price session.

---

## 5. Merge semantics

The goal is predictable, loss-minimizing merges of two devices' data **without** a server.

| Situation (by record `id`) | Result |
|---|---|
| Only in backup | Insert, *unless* a local tombstone with `deletedAt > record.updatedAt` exists |
| Only local | Keep, *unless* the backup has a tombstone with `deletedAt > local.updatedAt`, in which case delete locally |
| In both, identical | Unchanged |
| In both, different | **Last write wins** by `updatedAt`, with ties broken by the lexicographically larger `installId` (deterministic) |
| Settings | Local settings win, except keys the user explicitly selects in the preview ("Einstellungen aus Backup übernehmen" ☐) |
| Tags/locations with the same `name` but different `id` | De-duplicate by name. References are remapped to the surviving id |

UUIDv7 IDs guarantee that records created independently on two devices never collide.

**As built (M5, ADR-042):**
- `updatedAt` values compare as points in time, not as text.
- After a merge, the device keeps both sides' deletions (the later one per id), except for records that are alive afterwards.
- Folding by name happens only when it's unambiguous (ignoring case):
  - the backup's tag or Lagerort is new here and its name is unique in the backup;
  - exactly one local record has that name, and the backup doesn't contain that record.
- When a tag folds, references are remapped: lot tags, a lot's Lagerort, a Lagerort's parent.
- A backup tag that would still clash gets a number (*Favoriten (2)*), because tag names are unique.
- Cardmarket corrections from both sides are joined, and this device's win.
- `planMerge` (`domain/backup/merge.ts`) is pure and property-tested:
  - merging a dataset into itself changes nothing;
  - merging into an empty device gives the backup;
  - two devices converge whichever merges which.

---

## 6. CSV export (spreadsheet-friendly)

For Excel/Numbers/Google Sheets analysis. **CSV isn't a backup format** because it isn't guaranteed to be lossless.

| File | Columns (German headers; English when UI = EN) |
|---|---|
| `settr-sammlung.csv` | ID · Art (Karte/Sealed) · Name · Set · Nr. · Sprache · Variante · Zustand · Grading · Menge (aktuell) · Kaufdatum · Einkauf gesamt · Gebühren · Einkauf/Stk. · Preis/Stk. · Preis vom · Wert · G/V · G/V % · Quelle · Tags · Lagerort · Notiz |
| `settr-preise.csv` | Serie · Name · Set · Nr. · Sprache · Variante · Grade · Datum · Preis · Währung · Preistyp · Quelle · Notiz |
| `settr-verkaeufe.csv` (if sales tracking) | Name · Set · Nr. · Sprache · Menge · Datum · Erlös · Gebühren · Einstand · Realisierter G/V |

- **Dialect:** default *Excel (Deutschland)*: `;` delimiter, decimal comma, `dd.mm.yyyy`, UTF-8 with BOM. The alternative is *International*: `,`, a decimal point and ISO dates.
- **CSV-injection safe:** text cells starting with `= + - @ \t \r` are prefixed with `'`. Numeric columns are written as numbers.
- **Scope:** the whole collection or the current filtered view / multi-selection (UX_SPEC §4.6).

**As built (M5):**
- *CSV für Tabellen* on the Daten page exports three files:
  - *Sammlung*: the open lots, with the columns above plus *Preis/Stk.* and *Preis vom* from the lot's value.
  - *Preise*: every entry, series by series, oldest first; *Grade* is empty for raw copies.
  - *Verkäufe*: sales and trades, with an *Art* and a *Notiz* column.
- The Sammlung selection bar exports the chosen lots, open or closed.
- The dialect is remembered per device (kv `ui:csv.dialect`).
- *G/V %* is a number (`14,6`).
- Names, sets and numbers come from the catalog, else from the record's snapshot, so the export loads the catalog when it runs; the Daten page itself doesn't need it.

---

## 7. CSV import from other apps (⟶ I-16)

This is a **mapping wizard**: upload a CSV, auto-detect the delimiter and encoding, map columns to Settr fields, then **match** rows to catalog items by set + number (fuzzy fallback on name) and show unmatched rows for manual resolution. **Post-v1** (I-16), **generic only**. Matching needs the rows' sets in Settr's catalog.

**No Collectr preset (dropped, R2.5, ADR-028).** Collectr's CSV export is a Collectr Pro feature, and Marvin has no Collectr Pro, so there's no file to import. His ~200 cards come over by hand, set by set, as their sets arrive in the catalog. That's why quick add from the grid and the ≤ 3-interaction add sheet matter (`UX_SPEC.md` §4.3, §4.7).

**Generic mapping rules** (kept for the wizard):
- Prices in another currency (e.g. USD) are converted at an entered rate, because Settr stores EUR.
- Market-price columns are ignored. Settr prices come from your own entries.
- **Condition mapping** for US-style exports (TCGplayer scale → Cardmarket): Near Mint → **NM** · Lightly Played → **EX** · Moderately Played → **GD** · Heavily Played → **PL** · Damaged → **PO**. Cardmarket's *LP* sits between TCGplayer's MP and HP, so the wizard lets you override the mapping per import.

Presets (TCG Collector, Cardmarket stock/shipment exports) follow on demand. There are no files yet (Q7.4).

---

## 8. Keeping data safe day-to-day

| Mechanism | Behavior |
|---|---|
| **Persistent storage** | Settr requests `navigator.storage.persist()` after onboarding, after the first holding is added (as built: once per session while there's data), and after installation as an app (`appinstalled`). Chromium browsers (incl. Brave) don't prompt: they grant it to installed apps and to often-used or bookmarked sites, and never while the site's cookies are blocked or cleared on exit. A `false` result is retried later. Status is shown in Einstellungen › Daten |
| **Delete-on-exit warning** (Brave, ADR-027) | Brave's Shields *"Forget me when I close this site"* (per site, or globally at `brave://settings/shields`), the *"Delete data on exit"* tab under *Clear browsing data*, and a per-site *"clear cookies on exit"* exception all erase IndexedDB. They're off by default. The first wipes all site data about 30 s after the last tab closes, even for installed apps, and the last also blocks `persist()`. Onboarding and Einstellungen › Daten warn about them (R3.4) |
| **Backup reminder** | The sidebar pill turns amber (*"Backup fällig · Letztes vor 12 Tagen"*) and a toast appears when `lastBackupAt` is older than **7 days** (Q7.1) **and** there were changes since. The interval is configurable (3/7/14/30 days). **As built (ADR-043):** without any backup the pill is amber at once, but the toast waits until the install is a day old (or 50 changes); the toast shows at most once a day, never on the Daten page, and *Jetzt sichern* exports right away |
| **Change counter** | After 50 changes without a backup, a gentle reminder. **As built:** `meta.backupDataVersion` keeps the change counter (kv `dataVersion`) at the last backup; the Daten page shows *12 Änderungen seit dem letzten Backup* |
| **Auto-backup to folder** (I-15, **post-v1** per Q7.2; needs the File System Access API: Chromium browsers, and Brave only after enabling `brave://flags/#file-system-access-api`, ADR-027) | Settr feature-detects the picker functions (`'showDirectoryPicker' in window`), never `FileSystemHandle`, and explains Brave's flag when the picker is missing. The user grants a directory once (the handle is stored in IndexedDB). Settr writes `settr-backup-latest.settr.json` and rotating dated copies (keeps the last 10) after changes (debounced 60 s) and on `visibilitychange: hidden`. Permission is re-requested per session when needed. Without the API, backups stay downloads |
| **iOS/Safari caveat** | Script-writable storage can be evicted after 7 days without use when *not* installed to the home screen. Onboarding recommends installing the PWA. See `ARCHITECTURE.md` §8 |
| **Storage estimate** | `navigator.storage.estimate()`: the **usage** is shown, with what the device holds (*Gespeichert: 312 Positionen · 1.840 Preise · 2 Sicherungen vor Importen*). The reported quota isn't relied on, because Brave always reports 2 GiB (anti-fingerprinting) while the real limit is Chromium's usual one, so there's no 80 % warning. A real `QuotaExceededError` gets its own toast (*Der Speicher ist voll*, *Zu den Daten*; `UX_SPEC.md` §6) |
| **Delete all data** (DAT-09) | *Alle Daten löschen* asks you to type *LÖSCHEN*, offers *Backup exportieren* first, then deletes the collection, prices, tags, Lagerorte, own items, settings, device preferences and the safety snapshots, and starts afresh. The catalog and app files stay cached |

---

## 9. Future: multi-device sync without a backend (post-v1, Q7.3)

Candidates (all client-side, user-owned storage). **None are planned for v1**:

- **File-based sync:** auto-backup into a cloud-synced folder (iCloud Drive/OneDrive/Dropbox desktop app) plus merge-import on the other device. It's zero-infrastructure but needs the File System Access API: desktop Chromium only, and in Brave only after enabling its flag (ADR-027).
- **Bring-your-own-cloud:** Google Drive `appDataFolder`, Dropbox, OneDrive or WebDAV/Nextcloud via OAuth PKCE from the browser, storing an encrypted backup and running the §5 merge logic on pull.
- **Hosted sync service** (e.g. Dexie Cloud or a CRDT service) would contradict "no backend" and cost money, so it's listed only for completeness.

The data model is already sync-ready (UUIDv7, `updatedAt`, tombstones, deterministic merge).
