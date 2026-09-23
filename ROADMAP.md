# Settr: Roadmap

> Last updated: 2026-09-23 · Current phase: **M0 · Planning** ⏳ (spec v0.2: round 1 answered, round 2 + design pick open)
> Feature IDs (e.g. `COL-01`) → [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md). Definition of Done → [`docs/QUALITY.md`](docs/QUALITY.md) §1.
> Legend: ✅ done · ⏳ in progress · ⬜ open · 🔒 blocked (waiting on a decision)

---

## Overview

| Milestone | Goal | Version | Status |
|---|---|---|---|
| **M0 · Planning** | Complete plan, open questions answered, design direction chosen, **coding permission granted** | — | ⏳ |
| **M1 · Foundation** | Running, deployable skeleton with design tokens, app shell, i18n, database and CI | 0.1.0 | 🔒 |
| **M2 · Catalog** | 30 Jahre / 30th Celebration catalog (cards DE/EN/JA/ZH-CN, sealed DE/EN/JP/TC/SC) browsable and searchable | 0.2.0 | 🔒 |
| **M3 · Collection** | Add and manage singles and sealed with purchase prices, plus set completion | 0.3.0 | 🔒 |
| **M4 · Prices & Portfolio** | Manual price tracking, charts, dashboard, P/L, price session | 0.4.0 | 🔒 |
| **M5 · Data Safety** | Backup export/import (replace + merge), CSV, reminders, persistence | 0.5.0 | 🔒 |
| **M6 · Polish & Launch** | Signature design moments, onboarding, PWA polish, audits → **v1.0** | 1.0.0 | 🔒 |
| **v1.1** | Your sets + Collectr import (⟶ R2.5), binder view (⟶ R2.4) | 1.1.0 | 🔒 |
| **Post-v1** | English UI, wishlist and other extras, full Chinese data, optional sync | 1.x | 🔒 |

> **Why data safety (M5) comes before polish:** real data will be entered from M3 onward, so backups must exist before v1 at the latest. A **minimal JSON export** already ships in M3 (DAT-01 "lite") so nothing entered during development can be lost.

---

## M0 · Planning ⏳

- [x] Research data sources (TCGdex, pokemontcg.io, Cardmarket, sealed-product sources) → `docs/DATA_SOURCES.md`
- [x] Research the 30th-anniversary set across DE/EN/JA/ZH → `docs/PRODUCT_SPEC.md` §5
- [x] Research the current tech stack (Sept 2026) → `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`
- [x] Competitor and design research → `docs/DESIGN_SYSTEM.md`, `USER_QUESTIONS.md` §10
- [x] Product spec, UX spec, data model, import/export spec, quality plan, design system
- [x] Agent instructions (`CLAUDE.md`, `AGENTS.md`), roadmap, changelog
- [x] **You:** answer `USER_QUESTIONS.md` round 1 (2026-09-23)
- [x] Incorporate the answers into all docs (spec v0.2)
- [x] Build the [design canvas](https://claude.ai/artifact/VRE95AH1GZ8yHK8Qb2y5hq): 3 Liquid-Glass directions (A Vault Glass · B Studio Glass · C Bold), each with desktop dashboard, desktop card detail and mobile set grid
- [ ] **You:** pick a design direction on the canvas (R2.1) and answer the other round-2 questions
- [ ] Incorporate round 2 (spec v0.3). Send the Simplified Chinese dataset permission request if approved (R2.8)
- [ ] Verify from an unrestricted network that TCGdex images exist (HEAD checks per language, `DATA_SOURCES.md` §4)
- [ ] **You:** explicit **go** for coding 🔑

**Exit:** design direction picked (R2.1), round 2 incorporated (spec v0.3), and explicit permission ("Go") to start M1.

---

## M1 · Foundation 🔒 → v0.1.0

- [ ] Scaffold: Vite + React + TypeScript (strict) + TanStack Router (file-based) + Tailwind CSS v4 (`ARCHITECTURE.md` §3)
- [ ] Tooling: pnpm, Oxlint (type-aware) + oxfmt, Vitest 5 (+ Browser Mode), Playwright, size-limit, lefthook pre-commit
- [ ] CI (`ci.yml`), Vercel project + preview deployments + security headers (CSP) (`QUALITY.md` §6–7)
- [ ] Design tokens for the chosen direction (`tokens.css`, dark + light), **Liquid Glass materials** + reduced-transparency fallback, self-hosted fonts, and base primitives (Button, Input, Sheet, Dialog, Tabs, Toast, Tooltip). See `DESIGN_SYSTEM.md`
- [ ] App shell: **floating glass sidebar** / rail / glass tab bar, glass toolbar, theme switch, privacy toggle (APP-01, APP-03, PRT-05, DSN-05)
- [ ] i18n setup: **German** message catalog (translation-ready), typed messages, `de-DE` formatting helpers, lint rule against hard-coded strings (APP-02, `I18N.md`)
- [ ] Private deployment: `noindex` meta tag + `X-Robots-Tag` + `robots.txt` (APP-08)
- [ ] Dexie database v1 schema, repositories, tombstones, `priceLatest` (`DATA_MODEL.md` §7)
- [ ] Domain core: `Money`, allocation, IDs (UUIDv7), Zod schemas, with unit tests (`DATA_MODEL.md` §5–6)
- [ ] PWA skeleton: manifest, icons, service worker with app-shell precache, update toast (APP-04)
- [ ] Settings page skeleton (APP-07) and persistent-storage request (DAT-05)

**Exit:** the app deploys on Vercel (not indexed), loads offline, switches themes and transparency, CI is green, budgets hold, and it looks right on Windows Chrome/Edge and iPhone.

---

## M2 · Catalog 🔒 → v0.2.0

- [ ] Catalog pipeline `scripts/catalog/` (`DATA_SOURCES.md` §6):
  - [ ] Ingest TCGdex (`intl:30th`, `intl:30th-c`, 30th energies, `asia:M6a`) into the normalized schema
  - [ ] Curated overlays: sections, variant overrides (all-foil ⇒ `std`), printed numbers for the Classic Collection, id aliases
  - [ ] **Simplified Chinese** on `asia:M6a` (ADR-021):
    - [ ] derived names (PokéAPI) + curated Trainer/Energy names
    - [ ] SC printed rarity marks
    - [ ] SC Cardmarket IDs via `idMetacard` (6602 ↔ 6603)
    - [ ] full dataset only after permission (R2.8)
  - [ ] PokéAPI species names → search aliases + derived German names for Asian-print cards
  - [ ] Image verification (HEAD per language) and fallback flags
  - [ ] Curated **sealed catalog** for DE/EN/JP/**TC/SC**, incl. Pokémon Center exclusives and JP lottery items, with release waves through Dec 2026 (Q4.3). EN/JP images via TCGCSV + the `/img/tcgp` proxy
  - [ ] Manifest with hashes, Zod-validated output, CI job + weekly sync PR
- [ ] Sets overview (CAT-01), set detail with sections and filters (CAT-02)
- [ ] Card detail with language switch (CAT-03), images with fallback chain (CAT-07)
- [ ] Sealed catalog + product detail (CAT-05)
- [ ] Search: cards + sealed, multi-script, numbers, filters (CAT-04, CAT-06) + command palette base (APP-05)
- [ ] Cardmarket deep links (PRC-06): exact product + **copy's language + seller country Germany** (+ condition filter per R2.2)

**Exit:** every card and product of the v1 scope is browsable and searchable in all in-scope languages, with correct images or graceful fallbacks.

---

## M3 · Collection 🔒 → v0.3.0

- [ ] Add/edit card holdings (COL-01) and sealed holdings (COL-02) with MoneyInput/DateInput
- [ ] Edit / duplicate / delete + undo (COL-03)
- [ ] My cards / My sealed: grid + virtualized table, filters, sort, group-by, summary bar, bulk actions (COL-04, COL-05)
- [ ] Set completion Basis / Komplett / Master per language (COL-07)
- [ ] Quick-add mode (COL-06)
- [ ] Tags and **binder-aware storage locations**: 3×3 / 3×4 / 4×3 layouts, page + slot, next-free-slot suggestion (COL-09, ADR-023)
- [ ] Sell/trade/gift disposals (COL-11, Q6.5)
- [ ] Open sealed + optional pull logging with proportional cost allocation (COL-12, Q5.8)
- [ ] Custom items (CAT-08)
- [ ] **DAT-01 lite:** raw JSON export, so development data is safe from day one

**Exit:** the whole personal collection can be entered comfortably. Completion numbers match the manual counts.

---

## M4 · Prices & Portfolio 🔒 → v0.4.0

- [ ] Price entry popover + inline entry (PRC-01), history list with edit/delete (PRC-02)
- [ ] Item price chart with markers, purchase baseline, ranges, language compare (PRC-03)
- [ ] Valuation + P/L engine (pure functions, property-tested) (`DATA_MODEL.md` §6)
- [ ] Portfolio time series (event sweep, Web Worker) (`DATA_MODEL.md` §6.5)
- [ ] Dashboard bento (PRT-01): hero value + scrubbable chart, stale tile, progress, movers, allocation, recent
- [ ] Staleness indicators and a Preise hub (PRC-05)
- [ ] **Price-update session** (PRC-04), with Cardmarket links preset to language + German sellers
- [ ] **Price-guide suggestions** (PRC-09, ADR-020): the `price-guide.yml` daily job, `cm-prices.json`, and suggestion chips with `V` to accept
- [ ] Per-lot value override for LP/damaged copies (PRC-07)
- [ ] Portfolio page: allocation and performance (PRT-02, PRT-03)
- [ ] Realized P/L (PRT-04)

**Exit:** 30 prices can be updated in ≤ 5 min. Dashboard numbers reconcile with a hand-calculated fixture.

---

## M5 · Data Safety 🔒 → v0.5.0

- [ ] Full backup export with checksum, embedded photos option (DAT-01)
- [ ] Import: parse in a worker → migrate → validate → preview → replace/merge → snapshot → undo (DAT-02)
- [ ] CSV export (Excel-DE dialect) (DAT-03)
- [ ] Backup reminders + status pill (DAT-04), storage usage display (DAT-05)
- [ ] Delete all data (DAT-09)
- [ ] Round-trip, migration-fixture and merge property tests in CI

**Exit:** the E2E journeys "export → wipe → import" and "merge with conflicts" pass on Chromium and WebKit on every PR, and on Firefox nightly.

---

## M6 · Polish & Launch 🔒 → v1.0.0

- [ ] Holo card viewer (DSN-01), shared-element transitions (DSN-02), foil progress rings (DSN-03)
- [ ] Onboarding (APP-06, no demo data), empty states, microcopy pass (German review)
- [ ] PWA polish: install prompts (iOS guidance), offline indicator, update flow
- [ ] Accessibility audit (axe + manual keyboard/screen-reader pass), performance audit (Lighthouse CI budgets)
- [ ] "Über & Rechtliches": disclaimer, credits (TCGdex, PokéAPI, Cardmarket data), privacy note. No Impressum while private (APP-08, ADR-022)
- [ ] Glass performance and legibility pass on Windows laptops + iPhone (DSN-05)
- [ ] Visual regression baseline
- [ ] Release **v1.0.0**: tag, changelog, production deployment

**Exit:** all Musts in `PRODUCT_SPEC.md` are done, all quality gates are green, and you've signed off.

---

## v1.1 (recommended right after launch)

| Item | Notes |
|---|---|
| **The sets you own** (⟶ R2.5) | The pipeline is config-driven: add set IDs, curate sealed products |
| **Collectr CSV import** (DAT-07 / I-16) | Preset + condition mapping in `IMPORT_EXPORT.md` §7. Needs Collectr Pro for the export |
| **Binder view** (COL-08 / I-02, ⟶ R2.4) | Uses the binder/page/slot data that v1 already records |

## Post-v1 backlog (ordered by expected value)

| Item | Notes |
|---|---|
| More sets: the rest of the **Mega Evolution** era (EN/DE + JP/SC) | |
| English UI (ADR-019) | One message file + a locale switch |
| Full Simplified Chinese names and images (ADR-021) | After permission, or once TCGdex adds SC |
| Cardmarket purchase import (DAT-10 / I-14) | "Not yet" (your call). Matches `idProduct` → catalog variant |
| Wishlist with target prices (WSH-01 / I-06) | |
| Pack-opening ROI analytics (I-11) | Basic opening + pulls ship in v1 |
| Local photos (COL-10 / I-12) | |
| Auto-backup to folder (DAT-06 / I-15) | Chrome/Edge |
| Barcode scanning of sealed products (I-10) | Needs EANs in the catalog |
| Multi-currency + FX (PRC-08) | |
| Older eras (Scarlet & Violet → vintage) | Larger catalog → per-set lazy loading is already in the design |
| Bring-your-own-cloud sync (DAT-08 / I-18) | Only if you want it |
| Grading tracker (COL-13 / I-09) | |
| Card scanning via camera (I-13) | Experimental |
