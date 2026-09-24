# Changelog

All notable changes to Settr are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/) (0.x during development; 1.0.0 = first complete release, see `ROADMAP.md`).

Every PR adds its entry under **Unreleased**. A release moves those entries into a new version section.
Categories: *Added · Changed · Deprecated · Removed · Fixed · Security · Docs*.

## [Unreleased]

### Added
- **M6 · Polish & Launch (in progress, 2026-09-24).**
  - **Keyboard (UX §7):** `G` then `O`/`S`/`K`/`P`/`F`/`E` goes to a main area, and `V` then `G`/`T` switches between grid and table. `/` searches, `?` lists every shortcut (also from the palette and *Über*), `H` hides values, `N` adds, and `+` adds one copy of the focused set tile. Arrow keys, `Home` and `End` move through card and product grids, which take one tab stop each. On card and product pages, `N` adds that item. A palette pick that opens a page moves focus into the page, not back to the field you came from.
  - **Palette:** *Schnellerfassung* for a set, *Tastenkürzel anzeigen*, *Werte verbergen* and the theme, next to the backup actions from M5.
  - **Offline pill** in the toolbar. **Fehlerbericht kopieren** on error pages and under *Über*: the version, the browser and the last errors from a log on the device, never collection data.
  - **Onboarding (APP-06):** three steps on a fresh device, then the set:
    - the languages you collect;
    - why your data stays here, with persistent storage, installing and the warning about browsers that delete data on exit;
    - your default card language.
    - *Überspringen* and *Ich habe schon ein Backup* are there too. Devices that already hold lots skip it.
  - **Empty states** for Sammlung, Preise and Portfolio, with the next step. On iPhones, a hint to add Settr to the home screen.
  - **Foil progress rings (DSN-03):** Basis progress as a ring on set pages, the Sets page, the Übersicht and in the sidebar, which now lists the sets you collect. At 100 % the ring turns to foil with one sweep, and the set's progress lifts.
  - **Holo card viewer (DSN-01):** on card pages the picture leans towards the pointer, with a glare and a foil for each rarity. It's our own implementation, without GPL code. Phones use the gyroscope after a tap (the iPhone asks first), a tap opens fullscreen, and everything stays still under reduced motion.
  - **Grid → card morph (DSN-02):** the tile's picture grows into the card page and back again (View Transitions), except with reduced motion.
  - **Phones:** a long press on a set tile opens *Hinzufügen …*, *Preis eintragen …* and *Details*. Swiping the card picture turns to the previous or next card.
  - **Über & Rechtliches (APP-08):**
    - the version and catalog;
    - the data sources with their licenses, plus the fonts and libraries;
    - every license text in `licenses.txt`, which the build generates from what Settr ships;
    - the privacy note and the disclaimer;
    - *Tastenkürzel* and *Fehlerbericht kopieren*.
  - **Quality gates (QUALITY.md §2, §4):**
    - e2e journeys 5 (a sealed product's P/L), 9 (offline with the service worker, including a reload without network) and 10 (keyboard only, from adding a card to the price session);
    - every journey nightly in Firefox and on an Android phone (Pixel 7);
    - visual regression for six screens in light and dark (`visual.yml`), with the baselines made on CI's Ubuntu runner;
    - Lighthouse CI on every PR (`lighthouse.yml`): LCP, CLS and blocking time against the budgets, on the production build.
- **M5 · Data Safety (v0.5.0 candidate, 2026-09-24).**
  - **Backup einspielen (DAT-02):**
    - A backup file by button or drag and drop is read in a worker and checked: checksum, migration, every record against its schema.
    - Refusals say why: not JSON (with line and column), not a backup, encrypted, from a newer Settr (*Bitte Settr aktualisieren*), damaged, over 200 MB.
    - The preview shows when and on which device the backup was made, the checksum status, the contents, and which records are skipped and why.
    - *Zusammenführen* shows new, updated, deleted and unchanged records, what stays because it's newer here, and folded tags and Lagerorte, with the option to take the backup's settings. *Ersetzen* shows what gets replaced.
    - Every import saves the state before it; the toast offers *Rückgängig*.
  - **Sicherungen vor Importen:** the last three states before an import or restore, to restore (itself undoable) or to download, in their own database `settr-snapshots`.
  - **Merge (IMPORT_EXPORT §5):** the later version wins, deletions travel both ways, and tags and Lagerorte made on both devices under one name become one when that's unambiguous. Merging into itself changes nothing, and two devices end up with the same data.
  - **CSV für Tabellen (DAT-03):** Sammlung, Preise and Verkäufe as *Excel (Deutschland)* or *International*, plus *CSV* for a Sammlung selection.
  - **Backup reminders (DAT-04):**
    - The pill turns amber once the data changed since the last backup and it's older than 3, 7, 14 or 30 days, or after 50 changes.
    - A toast (*Letztes Backup vor 12 Tagen. Jetzt sichern?*) offers the backup at most once a day. On a new install it waits for the second day.
    - The Daten page counts the changes since the last backup.
  - **Speicher (DAT-05):** what the device holds; persistent storage requested once there's data and when Settr is installed; a toast when the disk is full.
  - **Alle Daten löschen (DAT-09):** typed confirmation, a backup one click away, then a fresh start.
  - **⌘K Aktionen:** *Backup exportieren*, *Backup einspielen …*.
  - **Backup fixture** `tests/fixtures/backups/v1/basic.settr.json` and a nightly workflow (property tests with a random seed, the data journeys in Firefox).
- **M4 · Prices & Portfolio (v0.4.0 candidate, 2026-09-24).**
  - **Prices (PRC-01…03):** card and product pages show the current price with its context (*Deutsch · ab (DE) · NM oder besser*), take a new one inline (`P` focuses it, `Enter` saves, *Unverändert* confirms the last one for today), and chart every entry with shaped markers, the purchase price as a dashed baseline, ranges `1M · 3M · 6M · 1J · Max`, scrubbing and other card languages to compare; the entries list edits and deletes, all undoable. Variant and grade pick the series where a card has them.
  - **Preis eintragen (UX §4.9, ADR-040):** a sheet from `P` on set and Sammlung tiles and table rows, the € button on set tiles and the lot menu, preset to the lot's language, variant and grade; `U` confirms the last price.
  - **Eigener Wert (PRC-07):** a lot's own value per copy with date and note (LP or damaged copies), tagged wherever it's shown.
  - **Übersicht (PRT-01):** Gesamtwert with P/L, *Investiert* and *Realisiert* over a scrubbable step chart (value or P/L, with the invested line), stale prices, set progress, the biggest gains and losses since purchase, the allocation and the latest additions; a notice for lots without a price.
  - **Sammlung:** *Wert* and *Gewinn/Verlust* in the summary, value and P/L on tiles, price columns in the table with a column chooser, and filters for priced, stale, gains and losses.
  - **Preise (PRC-05) and the price session (PRC-04):** how current your prices are, the most valuable stale ones and the latest entries; a session walks stale, unpriced, all or selected series by value, age or set order, opens Cardmarket with `C`, saves with `Enter`, keeps with `U`, skips with `S`, goes back with `←`, pauses with `Esc`, resumes later and sums up what changed.
  - **Price-guide suggestions (PRC-09):** a daily deployment builds a snapshot of Cardmarket's price guide for the catalog's products (never committed, ADR-029); *ab* and *Trend* show as dated, scope-labeled chips on card pages, in the price sheet and in the session, `V` copies one, and nothing is saved until you save it (`origin: 'guide'`).
  - **Portfolio (PRT-02…04):** everything or a part (cards or sealed, a language, a set) over time, the allocation by category, set, language or rarity, the lots that gained and lost most, P/L per set or language, and every sale and trade with its realized result.
  - **Einstellungen › Preise:** default price type, the Cardmarket language filter and minimum condition, suggestions on or off, when a price gets stale, and how unpriced cards count.
- **M3 · Collection (v0.3.0 candidate, 2026-09-23).**
  - **Adding (COL-01, COL-02):** ＋ on set tiles adds one copy in one click (the view's language, NM, no price) with a toast and *Rückgängig*; `N` on a focused tile, *Hinzufügen* on card and product pages and *＋ Hinzufügen* (the palette in add mode) open the add sheet: language, variant, condition or state, quantity, price per copy or for all, date, source, Lagerort with the next free pocket, and fees, grading, tags and note under *Mehr Details*. `Enter` saves, `⇧ Enter` adds and opens the next card. The last-used language, source and Lagerort are remembered per device.
  - **Lots (COL-03, COL-11, COL-12):** *In deiner Sammlung* on card and product pages lists every lot with cost, date, source and place; its menu edits, duplicates, sells or gives away part of a lot, opens sealed products (with optional pulls whose cost is split by their prices, evenly without prices) and deletes, all undoable.
  - **Schnellerfassung (COL-06):** card numbers with modifiers (`25`, `25x3`, `25r`, `25 4,50`, `4/102`, `R`), sticky defaults, binder pockets filled in order, a running list with undo per entry; `Q` on set pages.
  - **Set pages (COL-07):** quantity badges, an owned/missing filter, faded missing cards once you collect a set, and Basis/Komplett/Master progress per language or across languages.
  - **Sammlung › Karten / Sealed (COL-04, COL-05):** a summary that follows the filters (lots, copies, distinct items, invested), search, a filter sheet (set, language, rarity, variant, condition, grading, product type, state, tag, location, purchase dates, closed lots) with removable chips, sort, grouping, grid or table (both virtualized), all in the URL; multi-select with tags, moving to a location (binders fill their next free pockets) and delete, each undoable.
  - **Lagerorte (COL-09):** binders with 3×3, 3×4 or 4×3 pockets and an optional page count, boxes, cases, displays; create, edit, reorder, delete with undo.
  - **Custom items (CAT-08):** cards and products the catalog lacks, found by the ＋ palette afterwards.
  - **Backup (DAT-01 lite):** Einstellungen › Daten exports everything as one `.settr.json` with counts and a checksum: a download on desktop, the share sheet on phones, *Erneut speichern* in the toast; the backup reminder resets.
  - **Search:** `owned:ja` / `owned:nein` in Katalog › Karten and the palette.

  - **Catalog pipeline** (`pnpm catalog:sync`, ADR-033): *30 Jahre* (161 cards + 8 energies), the *Klassische Sammlung* (30) and *30th CELEBRATION* (M6a, 176) from a pinned TCGdex commit; curated Classic Collection numbers and order, name fixes and counterparts; Traditional Chinese names from PTCG-database (MIT) and Simplified Chinese names converted from them (ADR-034); German and English names for Japanese-only cards from the international counterpart or PokéAPI, all marked *übersetzt*; JP rarity marks.
  - **CI catalog sync** (`catalog-sync.yml`, weekly PR or manual commit): GET-checks every picture (DE/EN for 158 of 199 international cards; JA/ZH copies show the international artwork, marked), sorts Cardmarket's JP and SC products by expansion and links them through the metacard, adds TCGplayer pictures for sealed products via TCGCSV, and writes a report of what still needs curating. Offline builds keep what the last network build verified.
  - **Sealed catalog:** 52 products (33 international, 5 Japanese, 3 Traditional and 11 Simplified Chinese) with contents, release dates, MSRP, Pokémon Center and lottery labels, design families (the ten mini tins, two figure collections), Cardmarket IDs (47) and pictures (35).
  - **Katalog (CAT-01…07):** Sets by series with print filter and cover cards; set pages with print and language switches, sections (incl. *Klassische Sammlung*), a sticky filter bar (section, rarity, type, sort, names, tile size, in-set search), grid or list, all in the URL; card pages with the big picture, names in every language, facts, the same artwork in the other print and ← → through the set; sealed list with filters (print, language, type, release window) and product pages with the other designs of a line.
  - **Search (CAT-04, CAT-06, APP-05, ADR-035):** a worker index over every card and product: names in German, English, Japanese (katakana = hiragana) and Chinese, umlauts both ways, card numbers in every form (`25`, `025/128`, `#150`), illustrators and filters like `set:30c`, `lang:ja`, `rarity:sir`. *Katalog › Karten* and the command palette (`Strg K`) use it.
  - **Cardmarket links (PRC-06):** the exact product in the copy's language, German sellers, Near Mint or better; Traditional Chinese copies open the Japanese product with the T-Chinese filter; a search link where no ID is known.
  - **Pictures and fonts:** card-shaped placeholders and "other language"/"same artwork" notes (CAT-07); Japanese and Chinese names tagged `ja`/`zh-Hant`/`zh-Hans` with self-hosted Noto fallbacks that load only where such names show; the service worker caches catalog files and pictures for offline use.
  - **Einstellungen › Über** shows the catalog version and the data credits (TCGdex, PTCG-database, PokéAPI, TCGplayer).
- **M1 · Foundation (v0.1.0 candidate, 2026-09-23).**
  - **Scaffold:** Vite 8 (Rolldown), React 19.3 with the React Compiler, TypeScript 7 (strict), TanStack Router file routes, Tailwind CSS 4.3, pnpm 10.33, Node 24 in CI.
  - **Design system D · Bold Studio in code:** OKLCH tokens for light and dark with the Indigo accent, glass materials with a reduced-transparency fallback, self-hosted Mona Sans and Geist Mono, the type scale, and motion tokens that honor `prefers-reduced-motion` and an in-app switch.
  - **Primitives on Base UI:** Button, IconButton, Input/TextField, Dialog, Sheet, Tabs, Toast, Tooltip, SegmentedControl (track or chips), Switch, ChipGroup, SectionNav and Panel.
  - **App shell:** floating glass sidebar (icon rail on tablets), glass toolbar with the page title, search placeholder (`Strg K`), theme and privacy toggles and *＋ Hinzufügen*; on phones a glass tab bar with the center ＋ and a *Mehr* sheet (Portfolio, Einstellungen, backup status); backup status in the sidebar; skip link, 404 and error pages.
  - **Pages:** Übersicht (welcome and next steps), and Sammlung (Karten | Sealed), Katalog, Preise and Portfolio as honest placeholders. Einstellungen has *Allgemein* (card languages, default language), *Darstellung* (theme, transparency, motion), *Preise* (summary), *Lagerorte* (placeholder), *Daten* (persistent storage, install, delete-on-exit warning) and *Über*.
  - **i18n:** Paraglide JS with the German catalog; `de-DE` formatting for money (true minus sign), percent, dates, relative dates and bytes; money input parsing; a lint rule that rejects hard-coded UI strings.
  - **Domain core:** money in integer minor units with largest-remainder allocation (property-tested), UUIDv7 IDs, price-series keys, and Zod schemas for every stored record and the settings (with defaults).
  - **Database:** Dexie schema v1 as in `DATA_MODEL.md` §7, with repositories for settings, meta, holdings (tombstones, restore) and prices (`priceLatest` kept in the same transaction), plus a `dataVersion` counter.
  - **PWA:** manifest, icons (two layered cards, the front one glass), precached app shell, an update toast with *Neu laden*, offline start, and a one-click *Settr installieren* button in Brave/Chromium.
  - **Private deployment:** `noindex` meta tag, `X-Robots-Tag` and `robots.txt`; CSP and security headers in `vercel.json`, with the inline pre-paint script allowed by its hash (ADR-032).
  - **Quality:** Oxlint (type-aware, layer boundaries) + oxfmt, Vitest unit/integration tests and Browser Mode component tests, Playwright e2e on Chromium (desktop, phone) and WebKit (iPhone) with axe in light and dark plus a console/CSP guard, size-limit budgets, lefthook hooks, and GitHub Actions CI.

### Changed
- M5:
  - `SCHEMA_VERSION` lives in `domain/schemas/version.ts`.
  - `meta` records the change counter at the last backup (`backupDataVersion`, optional, not exported: no schema change).
  - The storage helpers moved to `lib/storage.ts`.
  - The export moved to `features/data/export.ts`.
  - The dev server pre-bundles Zod's German messages for the backup worker.
- Property tests run with one fixed fast-check seed (`tests/setup.ts`; `FC_SEED=random` nightly or to explore, `FC_SEED=<seed>` to replay). Until now the M3/M4 properties drew a new seed on every run.
- Charts are hand-written SVG instead of Recharts (ADR-038); the portfolio time series runs on the main thread (ADR-039).
- `pnpm build` ends with the price-guide step (`scripts/price-guide`), which writes an empty snapshot outside Vercel; the service worker serves `cm-prices.json` stale-while-revalidate. `price-guide.yml` runs daily and calls the Vercel deploy hook in the `VERCEL_DEPLOY_HOOK` secret.
- The lot menu offers *Preis eintragen …*; *Eigener Wert* has its own icon.
- The WebKit e2e project allows 60 s per test: CI renders WebKit in software.
- The shell's icons (sidebar, tab bar, toolbar, backup pill, toasts) are single-weight inline SVG, and the list pages and entry sheets load only with their routes (ADR-037): initial JS is 219.6 KB gzip after M3.
- Initial JS budget 230 KB (TanStack Query joined with the catalog loader, ADR-030 amendment); CSS budgets split into initial (≤ 35 KB) and on-demand (≤ 45 KB per file).
- `vercel.json`: `/catalog/*` app routes reach the SPA (only `/catalog/v1/` is static); `/img/tcgp/*` proxies TCGplayer pictures.

### Fixed
- The CSP (no `'unsafe-eval'`) blocked Zod's `new Function` probe on every page load since M1. Zod caught the error, but browsers reported the violation, and Firefox logged it. Zod now runs jitless (`src/lib/zod.ts`, imported by every schema module, with a lint rule against importing `zod` directly), and the e2e fixture fails on any CSP violation event, in every browser.
- The theme toggle (and *Einstellungen › Darstellung*) could be switched back by the first stored-settings read landing after the click, which also wrote the old theme to the pre-paint copy. It showed as a flaky reload test in CI. Older stored values are now ignored until the store has the change.
- A backup date that isn't a timestamp reads as unknown instead of breaking the import preview.
- On phones a toast could cover an open dialog's buttons; while a dialog or sheet is open, toasts show at the top.
- Einstellungen › Daten works offline again (it no longer asks for the catalog to show the page).
- A picture's loading placeholder pulses three times instead of forever.

### Docs
- **Spec v0.4: question rounds 4–7 decided, 2026-09-24.** Marvin chose every recommendation (⭐): the catalog check (R4.1–R4.5), collection details (R5.1–R5.5), prices and portfolio (R6.1–R6.3) and data safety (R7.1–R7.4). The app already works this way, so nothing changes. The decisions are recorded in `USER_QUESTIONS.md`, `ROADMAP.md`, `DATA_MODEL.md` (R5.3: unpriced pulls get 0 €) and `UX_SPEC.md` (R5.1: the condition starts at NM), and the spec status lines move to v0.4.
- **M5 notes:**
  - ADR-041 (import in a worker, snapshots in their own database, one guarded transaction), ADR-042 (merge rules as built), ADR-043 (backup reminders).
  - `IMPORT_EXPORT.md` v0.4 as built (§2–§6, §8).
  - `DATA_MODEL.md`: `meta.backupDataVersion`, `dataVersion`, the new `ui:*` keys, §5.11 the snapshot database, migrations in `domain/backup/migrate.ts`.
  - `UX_SPEC.md`: backup pill, Daten page, storage pressure, palette actions.
  - `ARCHITECTURE.md`: folders, the second database, the backup worker, the import flow.
  - `QUALITY.md`: the M5 journeys, the fixture, the seed policy, the nightly workflow.
  - `I18N.md`: M5 terms.
  - `USER_QUESTIONS.md` round 7.
- **M4 notes:** ADR-038 (SVG charts, supersedes ADR-010), ADR-039 (time series on the main thread), ADR-040 (price entry as a sheet; guide values keep their type with `origin: 'guide'`). `UX_SPEC.md` §4.1, §4.4, §4.6, §4.9–4.11 and §4.13 as built; `DATA_MODEL.md` (session and UI preferences in `kv`, guide entries, the snapshot as built); `ARCHITECTURE.md` (charts, the price-guide build step, folders `features/prices`, `features/overview`, `features/portfolio`); `QUALITY.md` (e2e for prices, WebKit timeout, budgets); `USER_QUESTIONS.md` round 6.
- **M3 notes:** ADR-036 (collection lists without a table library: one domain pipeline + TanStack Virtual), ADR-037 (startup bundle hygiene: route-owned features, a lean shell). `UX_SPEC.md` §4.6–4.8 as built (Sammlung, add sheet, sell and open, Schnellerfassung); `DATA_MODEL.md` §6.2 (opening split as built, quick adds without date); `ARCHITECTURE.md` (folders `features/entry`, `features/library`, `db/core`, the lists row of the stack, the add flow); `USER_QUESTIONS.md` round 5 (condition default, lots in binders, opening split, missing cards, table columns; nothing blocking).
- **M2 notes:** ADR-033 (pipeline: pinned sources offline, network facts in CI), ADR-034 (SC names converted from the official TC names), ADR-035 (card URLs under their set, ids with colons, one search worker). `DATA_MODEL.md` §4 matches the catalog schema; `DATA_SOURCES.md` records what the CI syncs found and what's resolved (TC licensing, M6a 156, Classic Collection numbers); `UX_SPEC.md` card route; `ARCHITECTURE.md` search as built; `QUALITY.md` budgets; `USER_QUESTIONS.md` round 4 (things to check, nothing blocking).
- **M1 notes:** ADR-030 (budgets re-baselined on the measured build: initial JS ≤ 220 KB, fonts ≤ 125 KB), ADR-031 (primitives hand-written on Base UI because the shadcn CLI needs the TypeScript JS API that TS 7 dropped) and ADR-032 (pre-paint UI state in `localStorage`). Updated `QUALITY.md` (budgets, test layers, CI steps, hooks), `ARCHITECTURE.md` (versions, folders, state), `UX_SPEC.md` (settings routes incl. *Lagerorte*, the phone *Mehr* sheet), `DATA_MODEL.md` (`PriceLatest.createdAt`), `I18N.md` (Paraglide build) and `CLAUDE.md` (phase, commands, sandbox notes).
- **Round 3 answered, M0 complete, coding approved (2026-09-23).** Direction D is confirmed with the *Indigo* accent (R3.1). The repository stays public for now, so ADR-029 is accepted with its public-repo rules (R3.2). `main` is created from the reviewed spec (R3.3). Marvin's Brave keeps site data (R3.4), and `minCondition=2` = Near Mint or better is verified (R3.5). `CLAUDE.md`, `AGENTS.md` and the roadmap now show M1 in progress.
- **Spec v0.3: round-2 answers incorporated, 2026-09-23.**
  - **Design (R2.1):** direction **D · Bold Studio** chosen and built on the design canvas in light and dark (Übersicht, Set, Kartendetail, iPhone set). It takes C's heavy, wide type and B's floating glass sidebar, with neutral surfaces, one restrained accent (Indigo by default) and balanced glass. "Usability and user experience is always #1" is now the first design principle. `DESIGN_SYSTEM.md` has D's tokens for both themes (ADR-015 accepted).
  - **Prices:** the reference price is **Near Mint or better** (R2.2, ADR-025), and worse copies use the existing per-lot value override, shown as *Eigener Wert*. Marvin verified the Cardmarket link format (`language=3` = German, `sellerCountry=7` = Germany); `minCondition=2` is still to verify.
  - **Languages:** **Traditional Chinese** becomes an active card language on `M6a` (R2.3, ADR-026). The Simplified Chinese dataset is dropped: its terms need the official owner's consent, not the maintainer's (R2.8 revised, ADR-021).
  - **Scope:** the binder view is v1.1 (R2.4). There's no Collectr importer, because Marvin has no Collectr Pro and therefore no export (R2.5). Marvin's own sets (Mega Evolution, Scarlet & Violet, Sword & Shield, Sun & Moon, Base Set) are added one by one after v1, and the app is multi-set from day one (ADR-028).
  - **Positioning (R2.6):** every price belongs to its card language, which is what Collectr gets wrong.
  - **Brand:** the short tagline is *"Jede Karte zählt."* (R2.7).
  - **Platform:** Brave (Chromium) on Windows is the primary browser (R2.9, ADR-027). Backups are downloads, and folder access is an optional extra because Brave disables the File System Access API by default. There are warnings about Brave's delete-on-exit settings, and a manual Brave smoke test before releases.
  - **Repository:** the GitHub repository turned out to be public. ADR-029 (proposed) lists what may be committed, and R3.2 asks whether to make it private.
  - `USER_QUESTIONS.md` now holds round 3 (R3.1–R3.5) plus the round-1 and round-2 decision records.
- **Spec v0.2: round-1 answers incorporated, 2026-09-23.**
  - `USER_QUESTIONS.md` is restructured into round 2 (9 open questions, incl. the design pick) plus a decision record for all round-1 questions and feature ideas.
  - **Scope:**
    - The UI is **German only** (translation-ready, ADR-019).
    - Card languages are DE/EN/JA/**Simplified Chinese**, with SC modeled as a language of `M6a`, derived names and a permission-gated dataset (ADR-021).
    - Sealed products are DE/EN/JP/**TC/SC**, incl. Pokémon Center exclusives and JP lottery items.
    - The deployment is **private** (`noindex`, no Impressum while private, ADR-022).
  - **Prices:**
    - The default type is "ab (DE)": the cheapest offer in the copy's language from German sellers.
    - Cardmarket links are preset with language and seller country.
    - New **price-guide suggestions** come from a daily static snapshot (PRC-09, ADR-020).
    - Per-lot value overrides handle LP/damaged copies.
  - **Collection:** binder-aware storage locations (9/12-pocket layouts, page + slot, next free slot; ADR-023). Sales/realized P/L and opening sealed with pull logging are now in v1.
  - **Design:** rebuilt around Revolut/Apple/Wise references as *Liquid Glass × bold minimalism* (glass materials §3.5, bolder type scale, ADR-024), with three candidate directions (A Vault Glass, B Studio Glass, C Bold) on the design canvas. The wordmark is "Settr".
  - **Platform:** Windows desktop (Chrome/Edge) first, then iPhone. Test matrix and budgets were updated.
  - **Later / no:** wishlist, CSV/Collectr import (v1.1 candidate), Cardmarket purchase import ("not yet"), and demo data ("no").
- **M0 planning suite (spec v0.1), 2026-09-23:**
  - Root files: `README.md`, `CLAUDE.md` (agent memory with the planning phase gate), `AGENTS.md` (multi-agent roles, parallelization plan, handoff templates), `ROADMAP.md` (M0–M6 + backlog), `USER_QUESTIONS.md` (≈ 60 questions + 32 feature ideas).
  - Specs in `docs/`: `PRODUCT_SPEC.md`, `UX_SPEC.md`, `DESIGN_SYSTEM.md`, `DATA_MODEL.md`, `DATA_SOURCES.md`, `ARCHITECTURE.md`, `IMPORT_EXPORT.md`, `I18N.md`, `QUALITY.md`, `DECISIONS.md` (ADR-001…018).
  - Research findings:
    - The v1 set is *30 Jahre / 30th Celebration* (TCGdex `30th`, `30th-c`, `M6a`).
    - TCGdex is the primary card source, with per-variant Cardmarket IDs.
    - No Chinese data yet.
    - Image gaps for JP and the Classic Collection.
    - The sealed catalog is built from Cardmarket's public product list.
    - The stack was verified against the npm registry (Sept 2026).
