# Settr: Import, Export and Backups

> Status: **Draft v0.2** (round-1 answers incorporated) · Last updated: 2026-09-23
> Settr has no server, so the backup file **is** the user's safety net and the only way to move data between devices. This document specifies the format and the guarantees.
> Entities → [`DATA_MODEL.md`](./DATA_MODEL.md). References like (Q7.1) point to decisions in [`USER_QUESTIONS.md`](../USER_QUESTIONS.md). **⟶ R2.x** marks a still-open round-2 question.

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
- Photos are embedded as base64 (+33 % size). The export dialog offers *"Fotos einschließen"* (default on). If files become large, a ZIP container (`.settr.zip`, via `fflate`) is the planned upgrade path (`formatVersion: 2`).
- **Canonical JSON** for the checksum uses keys sorted recursively, no insignificant whitespace, and UTF-8. A checksum mismatch produces a warning ("Datei wurde verändert"), not a hard error, so hand-edited files can still be imported after validation.
- Optional **password encryption** (⟶ I-17) would wrap the file as `{ format: "settr-backup-encrypted", kdf: "PBKDF2-SHA256", iterations: 600000, salt, iv, ciphertext }` using the WebCrypto API with AES-256-GCM.

---

## 3. Export flow

1. Einstellungen › Daten › **Backup exportieren** (also reachable via ⌘K and the sidebar backup pill).
2. Options: *Fotos einschließen* ☑ · (future) *Mit Passwort verschlüsseln* ☐.
3. Settle queued writes, then read all tables in one read-only transaction, which gives a consistent snapshot.
4. Build the envelope, compute counts and the checksum, then serialize.
5. Save:
   - Chromium: `showSaveFilePicker()` with a suggested name.
   - Others: a Blob download via `<a download>`.
   - Mobile: the **Web Share API** with files ("In Dateien sichern", AirDrop, etc.) when supported, otherwise a download.
6. Update `meta.lastBackupAt`. The backup pill turns green.

---

## 4. Import flow

```
Pick file ─▶ Parse ─▶ Envelope check ─▶ Migrate ─▶ Validate ─▶ Preview & choose mode ─▶ Safety snapshot ─▶ Write ─▶ Rebuild derived ─▶ Done
```

1. **Pick:** file input, drag & drop onto the Daten page, or `showOpenFilePicker()`. `.settr.json` and `.json` are accepted.
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

---

## 7. CSV import from other apps (⟶ I-16)

This is a **mapping wizard**: upload a CSV, auto-detect the delimiter and encoding, map columns to Settr fields, then **match** rows to catalog items by set + number (fuzzy fallback on name) and show unmatched rows for manual resolution. **Post-v1** (I-16).

**Collectr preset first** (Q1.6: Marvin's current tool; timing ⟶ R2.5). Collectr's CSV export (a **Collectr Pro** feature) has these columns: `Portfolio Name, Category, Set, Product Name, Card Number, Rarity, Variance, Grade, Card Condition, Average Cost Paid, Quantity, Market Price (As of <date>), Price Override, Watchlist, Date Added, Notes`.

| Collectr field | Settr field | Note |
|---|---|---|
| Set + Card Number (+ Product Name) | catalog card | Matching needs the set in Settr's catalog, hence "add your sets" (⟶ R2.5) |
| Category = sealed | sealed product | Matched by name + set |
| Variance | variant | e.g. "Reverse Holofoil" → `reverse` |
| Grade | `grading` | e.g. "PSA 10" |
| Card Condition | condition | TCGplayer scale → Cardmarket scale, below (adjustable in the wizard) |
| Average Cost Paid × Quantity | `acquisition.priceTotal` | USD values are converted at an entered rate (Settr stores EUR) |
| Date Added | `acquisition.date` | |
| Market Price | *(ignored)* | Settr prices come from your own entries |
| Notes | `note` | |

**Proposed condition mapping** (TCGplayer/Collectr → Cardmarket): Near Mint → **NM** · Lightly Played → **EX** · Moderately Played → **GD** · Heavily Played → **PL** · Damaged → **PO**. Cardmarket's *LP* sits between TCGplayer's MP and HP, so the wizard lets you override the mapping per import.

Other presets (TCG Collector, Cardmarket stock/shipment exports) follow on demand. There are no files yet (Q7.4).

---

## 8. Keeping data safe day-to-day

| Mechanism | Behavior |
|---|---|
| **Persistent storage** | Settr requests `navigator.storage.persist()` after onboarding and after the first holding is added. Status is shown in Einstellungen › Daten |
| **Backup reminder** | Pill + toast when `lastBackupAt` is older than **7 days** (Q7.1) **and** there were changes since. The interval is configurable |
| **Change counter** | After 50 changes without a backup, a gentle reminder |
| **Auto-backup to folder** (I-15, **post-v1** per Q7.2; works in Chrome/Edge on Windows) | The user grants a directory once (the handle is stored in IndexedDB). Settr writes `settr-backup-latest.settr.json` and rotating dated copies (keeps the last 10) after changes (debounced 60 s) and on `visibilitychange: hidden`. Permission is re-requested per session when needed |
| **iOS/Safari caveat** | Script-writable storage can be evicted after 7 days without use when *not* installed to the home screen. Onboarding recommends installing the PWA. See `ARCHITECTURE.md` §8 |
| **Storage estimate** | `navigator.storage.estimate()` shown as used/quota. Warns at 80 % |

---

## 9. Future: multi-device sync without a backend (post-v1, Q7.3)

Candidates (all client-side, user-owned storage). **None are planned for v1**:

- **File-based sync:** auto-backup into a cloud-synced folder (iCloud Drive/OneDrive/Dropbox desktop app) plus merge-import on the other device. It's zero-infrastructure but works on desktop Chromium only.
- **Bring-your-own-cloud:** Google Drive `appDataFolder`, Dropbox, OneDrive or WebDAV/Nextcloud via OAuth PKCE from the browser, storing an encrypted backup and running the §5 merge logic on pull.
- **Hosted sync service** (e.g. Dexie Cloud or a CRDT service) would contradict "no backend" and cost money, so it's listed only for completeness.

The data model is already sync-ready (UUIDv7, `updatedAt`, tombstones, deterministic merge).
