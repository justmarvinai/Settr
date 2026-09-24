# Settr: Roadmap

> Last updated: 2026-09-24 · Current phase: **v1.x · Your sets**: the **Mega Evolution series** ✅ built, in PR #5 (M1–M6 are merged; the `v1.0.0` tag waits for your go) · question rounds 1–7 decided, rounds 8–9 open without blockers
> Feature IDs (e.g. `COL-01`) → [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md). Definition of Done → [`docs/QUALITY.md`](docs/QUALITY.md) §1.
> Legend: ✅ done · ⏳ in progress · ⬜ open · 🔒 blocked (waiting on a decision)

---

## Overview

| Milestone | Goal | Version | Status |
|---|---|---|---|
| **M0 · Planning** | Complete plan, open questions answered, design direction chosen, **coding permission granted** | — | ✅ |
| **M1 · Foundation** | Running, deployable skeleton with design tokens, app shell, i18n, database and CI | 0.1.0 | ✅ merged (PR #1) · 🔒 your check in Brave/iPhone |
| **M2 · Catalog** | 30 Jahre / 30th Celebration catalog (cards DE/EN/JA/ZH-CN/ZH-TW, sealed DE/EN/JP/TC/SC) browsable and searchable, on a multi-set foundation | 0.2.0 | ✅ merged (PR #1) · 🔒 your check in Brave/iPhone |
| **M3 · Collection** | Add and manage singles and sealed with purchase prices, plus set completion | 0.3.0 | ✅ merged (PR #2) · 🔒 your check in Brave/iPhone |
| **M4 · Prices & Portfolio** | Manual price tracking, charts, dashboard, P/L, price session | 0.4.0 | ✅ merged (PR #3) · 🔒 your check in Brave/iPhone |
| **M5 · Data Safety** | Backup export/import (replace + merge), CSV, reminders, persistence | 0.5.0 | ✅ merged (PR #3) · 🔒 your check in Brave/iPhone |
| **M6 · Polish & Launch** | Signature design moments, onboarding, PWA polish, audits → **v1.0** | 1.0.0 | ✅ merged (PR #4) · 🔒 your go for the `v1.0.0` tag |
| **v1.1** | Binder view (R2.4) | 1.1.0 | 🔒 |
| **v1.x · Your sets** | Your sets, one by one and era by era, once the core is fully functional (R2.5) | 1.x | ⏳ Mega Evolution ✅ built, PR #5 · Scarlet & Violet next |
| **Post-v1** | English UI, wishlist and other extras, optional sync | 1.x | 🔒 |

> **Why data safety (M5) comes before polish:** real data will be entered from M3 onward, so backups must exist before v1 at the latest. A **minimal JSON export** already ships in M3 (DAT-01 "lite") so nothing entered during development can be lost.

---

## M0 · Planning ✅

- [x] Research data sources (TCGdex, pokemontcg.io, Cardmarket, sealed-product sources) → `docs/DATA_SOURCES.md`
- [x] Research the 30th-anniversary set across DE/EN/JA/ZH → `docs/PRODUCT_SPEC.md` §5
- [x] Research the current tech stack (Sept 2026) → `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`
- [x] Competitor and design research → `docs/DESIGN_SYSTEM.md`, `USER_QUESTIONS.md` §10
- [x] Product spec, UX spec, data model, import/export spec, quality plan, design system
- [x] Agent instructions (`CLAUDE.md`, `AGENTS.md`), roadmap, changelog
- [x] **You:** answer `USER_QUESTIONS.md` round 1 (2026-09-23)
- [x] Incorporate the answers into all docs (spec v0.2)
- [x] Build the [design canvas](https://claude.ai/artifact/VRE95AH1GZ8yHK8Qb2y5hq): 3 Liquid-Glass directions (A Vault Glass · B Studio Glass · C Bold), each with desktop dashboard, desktop card detail and mobile set grid
- [x] **You:** pick a design direction (R2.1: C with B's sidebar, calmer color, light + dark) and answer round 2 (2026-09-23)
- [x] Build direction **D · Bold Studio** on the canvas (Übersicht, Set, Kartendetail, iPhone set; light + dark)
- [x] Incorporate round 2 (spec v0.3)
- [x] **You:** answer round 3 (2026-09-23): D confirmed with *Indigo*, the repository stays public, `main` branch, Brave keeps its data, NM filter verified
- [x] **You:** explicit **go** for coding 🔑 (2026-09-23: "You can start")

**Exit:** direction D confirmed (R3.1), round 3 incorporated, and explicit permission ("Go") to start M1.

---

## M1 · Foundation ✅ built → v0.1.0 (waiting for your check)

- [x] Repository setup: `main` created from the reviewed spec (R3.3), repository stays public (R3.2, ADR-029)
  - [ ] **You:** make `main` the default branch (GitHub → Settings → General → Default branch)
- [x] Scaffold: Vite + React + TypeScript (strict) + TanStack Router (file-based) + Tailwind CSS v4 (`ARCHITECTURE.md` §3)
- [x] Tooling: pnpm, Oxlint (type-aware, layer boundaries) + oxfmt, Vitest 5 (+ Browser Mode), Playwright (+ axe), size-limit, lefthook pre-commit/pre-push
- [x] CI (`ci.yml`: checks, components, build, CSP hash, budgets, audit, e2e on Chromium desktop/phone + WebKit iPhone) and security headers (CSP) in `vercel.json` (`QUALITY.md` §6–7)
  - [ ] **You:** import the repository in Vercel (Hobby, framework preset *Vite*, settings come from `vercel.json`), production branch `main`; previews for every other branch
- [x] Design tokens for direction **D · Bold Studio** (`tokens.css`, light + dark, Indigo accent per R3.1), **Liquid Glass materials** + reduced-transparency fallback, self-hosted fonts, and base primitives (Button, Input, Sheet, Dialog, Tabs, Toast, Tooltip, plus SegmentedControl, Switch, ChipGroup). See `DESIGN_SYSTEM.md`
- [x] App shell: **floating glass sidebar** / rail / glass tab bar with "Mehr", glass toolbar, theme switch, privacy toggle (APP-01, APP-03, PRT-05, DSN-05)
- [x] i18n setup: **German** message catalog (translation-ready), typed messages, `de-DE` formatting helpers, lint rule against hard-coded strings (APP-02, `I18N.md`)
- [x] Private deployment: `noindex` meta tag + `X-Robots-Tag` + `robots.txt` (APP-08)
- [x] Dexie database v1 schema, repositories, tombstones, `priceLatest` (`DATA_MODEL.md` §7)
- [x] Domain core: `Money`, allocation, IDs (UUIDv7), Zod schemas, with unit tests (`DATA_MODEL.md` §5–6)
- [x] PWA skeleton: manifest, icons, service worker with app-shell precache, update toast (APP-04), install button in Brave
- [x] Settings page skeleton (APP-07) and persistent-storage request (DAT-05)

**Exit:** the app deploys on Vercel (not indexed), loads offline, switches themes and transparency, CI is green, budgets hold, and it looks right on Windows Brave (Chromium) and iPhone. *Status:* offline, themes, transparency, budgets (ADR-030) and CI are verified; **the Vercel deployment and your look on Brave and the iPhone are open.**

---

## M2 · Catalog ✅ → v0.2.0 (built, waiting for your check)

- [x] Catalog pipeline `scripts/catalog/` (`DATA_SOURCES.md` §6, ADR-033):
  - [x] Ingest TCGdex (`intl:30th` 169 incl. the 8 energies, `intl:30th-c` 30, `asia:M6a` 176) into the normalized schema, from a pinned commit
  - [x] Curated overlays: sections, one `std` variant per card, printed numbers and order of the Classic Collection, name fixes (M6a 156), counterparts, id aliases
  - [x] **Simplified Chinese** on `asia:M6a` (ADR-021, ADR-034):
    - [x] names converted from the official Traditional Chinese ones (OpenCC), marked *übersetzt*
    - [ ] SC printed rarity marks: no source yet (JP marks RR/AR/SAR/FUR are in)
    - [x] SC and JP Cardmarket IDs sorted by expansion and linked through `idMetacard` (171 JP / 173 SC of 176; RGB Mews curated, order to verify; Sylveon ex 059/130 open)
  - [x] **Traditional Chinese** on `asia:M6a` (ADR-026): all 176 names from `type-null/PTCG-database` (MIT, verified)
  - [x] PokéAPI species names → search aliases + German/English names for Asian-print cards without a counterpart
  - [x] Picture verification by GET in GitHub Actions, with the fallback chain (other language, same artwork from the other print, placeholder): DE/EN 158 of 199, JA/ZH 133 of 176 via the international artwork
  - [x] Curated **sealed catalog**: 52 products (33 international, 5 JP, 3 TC, 11 SC) incl. Pokémon Center and lottery items and release waves through Dec 2026; Cardmarket IDs for 47, pictures for 35 (TCGCSV + `/img/tcgp`)
  - [x] Manifest with hashes, Zod-validated output, `catalog-sync.yml` (weekly PR, manual commit) with a report
- [x] **Multi-set foundation** (ADR-028): series grouping, per-set lazy-loaded chunks, a slim global search index, set covers and print links in the manifest
- [x] Sets overview (CAT-01), set detail with sections, filters, sort, tile sizes and list view (CAT-02)
- [x] Card detail with language switch, translated-name marks and prev/next (CAT-03), images with fallback chain (CAT-07)
- [x] Sealed catalog + product detail (CAT-05), sealed filters incl. release window (CAT-06)
- [x] Search: cards + sealed, multi-script, numbers, power-user filters (CAT-04, CAT-06) + command palette (APP-05), in a worker (ADR-035)
- [x] Cardmarket deep links (PRC-06): exact product + **copy's language + seller country Germany** + **Near Mint or better** (`minCondition=2`, R2.2); TC copies on the JP product with the T-Chinese filter
- [x] Japanese and Chinese names with the right glyphs (`lang` by script) and self-hosted Noto fallbacks loaded on demand

**Exit:** every card and product of the v1 scope is browsable and searchable in all in-scope languages, with correct images or graceful fallbacks. ✅ (The open data points of `USER_QUESTIONS.md` round 4 are decided: the recommended defaults, 2026-09-24.)

---

## M3 · Collection ✅ → v0.3.0 (merged as PR #2 on 2026-09-23, waiting for your check)

- [x] Add/edit card holdings (COL-01) and sealed holdings (COL-02) with money and date inputs: one sheet from ＋ Hinzufügen, `N` on a tile and the card/product pages; ＋ quick add on set tiles (R2.1)
- [x] Edit / duplicate / delete + undo (COL-03)
- [x] My cards / My sealed: grid + virtualized table, filters, sort, group-by, summary bar, bulk actions (COL-04, COL-05): filters in a sheet with chips, everything in the URL; tags, move and delete for a selection (ADR-036)
- [x] Set completion Basis / Komplett / Master per language (COL-07), with the owned/missing filter and faded missing cards on set pages
- [x] Quick-add mode (COL-06): number grammar, sticky defaults, running list with undo, `Q` on set pages
- [x] Tags and **binder-aware storage locations**: 3×3 / 3×4 / 4×3 layouts, page + slot, next-free-slot suggestion (COL-09, ADR-023); Lagerorte in Einstellungen
- [x] Sell/trade/gift disposals (COL-11, Q6.5)
- [x] Open sealed + optional pull logging with proportional cost allocation (COL-12, Q5.8; when only some pulls have a price, unpriced pulls get 0 €, R5.3)
- [x] Custom items (CAT-08)
- [x] **DAT-01 lite:** the full backup as one JSON download in Einstellungen › Daten, so development data is safe from day one
- [x] `owned:ja|nein` in card search and the palette
- [x] e2e + axe for the collection flows (desktop and phone Chromium; WebKit in CI)
- [ ] **You:** check M1–M3 in Brave and on the iPhone (rounds 4 and 5 are decided: the recommended defaults)

**Exit:** the whole personal collection can be entered comfortably. Completion numbers match the manual counts.

**Carried forward:** price columns and choosing columns in the table, price filters and the price session for a selection (M4); CSV for a selection (M5); a palette entry for Schnellerfassung and arrow-key grid navigation (M6); the binder view (v1.1).

---

## M4 · Prices & Portfolio ✅ → v0.4.0 (merged as PR #3 on 2026-09-24, waiting for your check)

- [x] Price entry (PRC-01), history list with edit/delete (PRC-02): inline on card and product pages (`P` focuses it); *Preis eintragen* as a sheet (ADR-040) from `P` on set and Sammlung tiles and table rows, the € button on set tiles and the lot menu; `Enter` saves, `U` confirms the last price for today, every change undoable
- [x] Item price chart with markers, purchase baseline, ranges, language compare (PRC-03): hand-written SVG with scrubbing and a table view (ADR-038)
- [x] Valuation + P/L engine (pure functions, property-tested) (`DATA_MODEL.md` §6), checked against a hand-calculated fixture
- [x] Portfolio time series (event sweep) (`DATA_MODEL.md` §6.5): on the main thread, fast enough for v1 collections (ADR-039)
- [x] Dashboard bento (PRT-01): hero value + scrubbable chart (value or P/L, *Investiert* line), stale tile, set progress, movers, allocation, recent, unpriced notice
- [x] Staleness indicators and a Preise hub (PRC-05): counts, the stale list, latest entries, start or resume a session
- [x] **Price-update session** (PRC-04), with Cardmarket links preset to language + German sellers: scopes (stale, unpriced, all, a Sammlung selection), orders, `C`/`U`/`S`/`←`/`Esc`, pause and resume, a summary of what changed
- [x] **Price-guide suggestions** (PRC-09, ADR-020): `price-guide.yml` daily calls a Vercel deploy hook, the build writes `cm-prices.json` (never committed, ADR-029), chips on card pages, the price sheet and the session, `V` to accept, stored with `origin: 'guide'` (ADR-040)
- [x] Per-lot value override for LP/damaged copies (PRC-07): *Eigener Wert* in the lot menu, tagged wherever it's shown
- [x] Portfolio page: allocation and performance (PRT-02, PRT-03): filters for cards/sealed, language and set; allocation by category, set, language or rarity; movers; P/L per set or language
- [x] Realized P/L (PRT-04): every sale and trade with proceeds after fees, cost and result
- [x] Sammlung: value and P/L in the summary, tiles and table; price columns and a column chooser; *Bepreist*, *Preis veraltet* and *G/V* filters; the price session for a selection (from M3)
- [x] Einstellungen › Preise editable: default price type, Cardmarket language filter and minimum condition, suggestions on/off, stale threshold, how unpriced cards count
- [x] e2e + axe for the price flows, Übersicht, Preise, Portfolio, the session and the price sheet
- [ ] **You:** create a Vercel deploy hook for `main` and store it as the Actions secret `VERCEL_DEPLOY_HOOK` (Vercel is connected), check M4 in Brave and on the iPhone (round 6 is decided: the recommended defaults)

**Exit:** 30 prices can be updated in ≤ 5 min (the session: type, `Enter`, next; to confirm on your collection). Dashboard numbers reconcile with a hand-calculated fixture (unit test) and agree across Übersicht, Sammlung and Portfolio (e2e).

**Carried forward:** spending analytics (PRT-06, later); the long-press menu on phone tiles (M6); a worker for the time series if collections grow into the thousands (ADR-039).

---

## M5 · Data Safety ✅ → v0.5.0 (merged as PR #3 on 2026-09-24, waiting for your check)

- [x] Full backup export with checksum, embedded photos option (DAT-01; the export itself ships with M3, M5 adds the options and the ⌘K entry). *As built:* *Fotos einschließen* appears once there are photos (none in v1 yet); ⌘K › *Aktionen* › *Backup exportieren*; the Daten page shows the changes since the last backup
- [x] Import: parse in a worker → migrate → validate → preview → replace/merge → snapshot → undo (DAT-02). *As built (ADR-041, ADR-042):*
  - Refusals say why: not JSON (with line and column), not a backup, encrypted, from a newer Settr, damaged, over 200 MB.
  - The preview lists the skipped records and why, and shows the merge counts.
  - Safety snapshots live in their own database, `settr-snapshots` (the last three), with *Sicherungen vor Importen* to restore or download them.
  - Undo in the toast; one guarded transaction.
- [x] CSV export (Excel-DE dialect) (DAT-03), also for a selection in Sammlung. *As built:* Sammlung (open lots), Preise and Verkäufe from the Daten page, *Excel (Deutschland)* or *International* (remembered), and *CSV* in the Sammlung selection bar
- [x] Backup reminders + status pill (DAT-04), storage usage display (DAT-05). *As built (ADR-043):*
  - A backup is due when the data changed since the last one and it's older than 3/7/14/30 days, or after 50 changes.
  - Without any backup, the pill turns amber at once, but the toast only comes from the install's second day. The toast shows at most once a day and never on the Daten page.
  - Persistent storage is requested once there's data and when Settr is installed.
  - *Gespeichert: …* shows what the device holds.
  - A full disk gets its own toast.
- [x] Delete all data (DAT-09). *As built:* type *LÖSCHEN*, with *Backup exportieren* in the dialog; the snapshots and device preferences go too
- [x] Round-trip, migration-fixture and merge property tests in CI. *As built:*
  - Export → import → export gives the same data and checksum on generated datasets.
  - The v1 fixture `tests/fixtures/backups/v1/basic.settr.json` imports cleanly.
  - Merge properties: self-merge changes nothing, and devices converge.
  - One fixed fast-check seed for all property tests, and a random one nightly.
- [x] e2e (`tests/e2e/data.spec.ts`): export → delete all → import, merge with conflicts and restore, refusals, CSV, the reminder, ⌘K, axe in light and dark
- [ ] **You:** check M5 in Brave and on the iPhone (export, import on the other device, merge back; round 7 is decided: the recommended defaults)

**Exit:** the E2E journeys "export → wipe → import" and "merge with conflicts" pass on Chromium and WebKit on every PR, and on Firefox nightly. *Status:* met on `11ac12e` (2026-09-24).
- `ci.yml` runs them on every PR: Chromium (desktop and phone) and WebKit (iPhone).
- `e2e-nightly.yml` runs them on Firefox, together with the property tests on a random seed.

**Carried forward:** a ZIP container for backups with many photos (`formatVersion: 2`, with photos, post-v1); password-protected backups (I-17); the auto-backup folder (DAT-06, post-v1).

---

## M6 · Polish & Launch ✅ built → v1.0.0 (started 2026-09-24)

- [x] Holo card viewer (DSN-01), shared-element transitions (DSN-02), foil progress rings (DSN-03), with the rings also in the sidebar's sets
- [x] Onboarding (APP-06, no demo data) and empty states
- [x] Microcopy pass (German review): plurals, one term per concept, clearer hints, unused messages removed (I18N.md §5–§6)
- [x] Palette commands (Schnellerfassung, Backup exportieren) and arrow-key navigation in grids (UX_SPEC.md §7)
- [x] PWA polish: install prompts (iOS guidance), offline indicator, update flow
- [x] Accessibility audit (axe on every page in light and dark, the keyboard-only journey, forced colors; the screen-reader pass with VoiceOver is part of your iPhone check), performance audit (Lighthouse CI: desktop is the gate, the phone profile a report, R8.3)
- [x] "Über & Rechtliches": disclaimer, credits (TCGdex, PokéAPI, Cardmarket data), privacy note, license texts. No Impressum while private (APP-08, ADR-022)
- [x] Glass performance and legibility pass (DSN-05): at most three blur layers at once, one while a sheet is open; legibility checked by axe on glass. How it feels on your laptop and iPhone is part of your check
- [x] Visual regression baseline: six screens in light and dark, made on CI's runner (`visual.yml`, ADR-049)
- [ ] Release **v1.0.0**: version and changelog ✅; the tag and the production deployment follow your merge (R8.4)
- [x] Carried forward from M3–M5: the long-press menu on phone tiles and swipe between cards
- [x] Also done: journeys 1, 5, 9 and 10 (all 13 journeys automated), the nightly Firefox and Pixel runs, `N` on card and product pages, the hero odometer, `licenses.txt`

**Exit:** all Musts in `PRODUCT_SPEC.md` are done, all quality gates are green, and you've signed off.

**Exit status (2026-09-24):** every Must is built; `pnpm check` and the full e2e suite are green locally, CI runs desktop, phone and WebKit on the branch, and Lighthouse's desktop gate passes (LCP ≈ 1.1 s). What's left is yours: the Brave smoke test (QUALITY.md §3.1) and the iPhone check (USER_QUESTIONS.md round 8), then the merge; the tag `v1.0.0` and the production deployment follow.

---

## v1.1 (recommended right after launch)

| Item | Notes |
|---|---|
| **Binder view** (COL-08 / I-02, R2.4) | Uses the binder/page/slot data that v1 already records |

## v1.x · Your sets (R2.5, ADR-028)

Sets are added **one by one, era by era, once the core site is fully functional** with *30 Jahre*. Each set is pipeline config + curated overlay (sealed, names, fixes) + review. Your cards come over by hand as their sets arrive.

| Order (to confirm when v1 is done) | Why |
|---|---|
| 1. **Mega Evolution** era (EN/DE + JP/Chinese mirrors) ✅ built 2026-09-24 | Most of your cards |
| 2. **Scarlet & Violet** (*Karmesin & Purpur*) | Some of your cards |
| 3. **Sword & Shield** (*Schwert & Schild*) | Some of your cards |
| 4. **Sun & Moon** (GX era) | A few cards |
| 5. **Base Set** (*Grundset*) | Your German Charizard (*Glurak*); 1st edition vs. unlimited are variants |

### Mega Evolution series ✅ (built 2026-09-24, ADR-051–053)

- [x] International (DE/EN), 1,077 cards: Mega-Entwicklung (+ basic Energy MEE 001–008), Fatale Flammen, Erhabene Helden, Optimale Ordnung, Wachsendes Chaos, Dunkelnacht, Mega-Entwicklung Promos
- [x] Japanese with Traditional Chinese, 1,037 cards: Mega Brave, Mega Symphonia, Inferno X, MEGA Dream ex, Nihil Zero, Ninja Spinner, Abyss Eye; the MEGA promo cards (Japanese only). Simplified Chinese stays with 30th CELEBRATION (ADR-053).
- [x] Variants from TCGdex: normal, holo, reverse holo, reverse patterns, promotional prints outside Master (ADR-052)
- [x] German and English names for every Japanese card: counterparts, name donors, a curated dictionary, checked against Cardmarket (ADR-051)
- [x] Cardmarket ids per variant and language, checked by the network sync; the Japanese expansions pinned
- [x] 139 sealed products (DE/EN, JP, TC) with Cardmarket and TCGplayer ids and pictures
- [x] App: print switch with several Asian prints, counterpart links per set, variants named only where a card has several, reverse holos filtered on Cardmarket only where they share the card's product
- [ ] Your check: round 9 in `USER_QUESTIONS.md` (names, deck prints, sealed names), then the merge of PR #5
- [ ] Later: M6 Storm Emerald (Japanese-only), MC and MF (deck products)

## Post-v1 backlog (ordered by expected value)

| Item | Notes |
|---|---|
| English UI (ADR-019) | One message file + a locale switch |
| Full Simplified Chinese names and images (ADR-021) | Once TCGdex, or another source that allows redistribution, has SC data |
| Cardmarket purchase import (DAT-10 / I-14) | "Not yet" (your call). Matches `idProduct` → catalog variant |
| Generic CSV import (DAT-07 / I-16) | Mapping wizard without a Collectr preset (R2.5) |
| Wishlist with target prices (WSH-01 / I-06) | |
| Pack-opening ROI analytics (I-11) | Basic opening + pulls ship in v1 |
| Local photos (COL-10 / I-12) | |
| Auto-backup to folder (DAT-06 / I-15) | Chromium browsers; in Brave only after enabling `brave://flags/#file-system-access-api` (ADR-027) |
| Barcode scanning of sealed products (I-10) | Needs EANs in the catalog |
| Multi-currency + FX (PRC-08) | |
| Bring-your-own-cloud sync (DAT-08 / I-18) | Only if you want it |
| Grading tracker (COL-13 / I-09) | |
| Card scanning via camera (I-13) | Experimental |
