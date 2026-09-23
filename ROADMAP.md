# Settr: Roadmap

> Last updated: 2026-09-23 · Current phase: **M0 · Planning** ⏳
> Feature IDs (e.g. `COL-01`) → [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md). Definition of Done → [`docs/QUALITY.md`](docs/QUALITY.md) §1.
> Legend: ✅ done · ⏳ in progress · ⬜ open · 🔒 blocked (waiting on a decision)

---

## Overview

| Milestone | Goal | Version | Status |
|---|---|---|---|
| **M0 · Planning** | Complete plan, open questions answered, design direction chosen, **coding permission granted** | — | ⏳ |
| **M1 · Foundation** | Running, deployable skeleton with design tokens, app shell, i18n, database and CI | 0.1.0 | 🔒 |
| **M2 · Catalog** | 30 Jahre / 30th Celebration catalog (cards + sealed, DE/EN/JA/(ZH)) browsable and searchable | 0.2.0 | 🔒 |
| **M3 · Collection** | Add and manage singles and sealed with purchase prices, plus set completion | 0.3.0 | 🔒 |
| **M4 · Prices & Portfolio** | Manual price tracking, charts, dashboard, P/L, price session | 0.4.0 | 🔒 |
| **M5 · Data Safety** | Backup export/import (replace + merge), CSV, reminders, persistence | 0.5.0 | 🔒 |
| **M6 · Polish & Launch** | Signature design moments, onboarding, PWA polish, audits → **v1.0** | 1.0.0 | 🔒 |
| **Post-v1** | Opted-in extras, more sets, Chinese data, optional sync | 1.x | 🔒 |

> **Why data safety (M5) comes before polish:** real data will be entered from M3 onward, so backups must exist before v1 at the latest. A **minimal JSON export** already ships in M3 (DAT-01 "lite") so nothing entered during development can be lost.

---

## M0 · Planning ⏳

- [x] Research data sources (TCGdex, pokemontcg.io, Cardmarket, sealed-product sources) → `docs/DATA_SOURCES.md`
- [x] Research the 30th-anniversary set across DE/EN/JA/ZH → `docs/PRODUCT_SPEC.md` §5
- [x] Research the current tech stack (Sept 2026) → `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`
- [x] Competitor and design research → `docs/DESIGN_SYSTEM.md`, `USER_QUESTIONS.md` §10
- [x] Product spec, UX spec, data model, import/export spec, quality plan, design system
- [x] Agent instructions (`CLAUDE.md`, `AGENTS.md`), roadmap, changelog
- [ ] **You:** answer `USER_QUESTIONS.md` (at least the ★ questions)
- [ ] **You:** choose a design direction (Vault / Terminal / Foil Pop), optionally after a clickable mockup round (Q9.1)
- [ ] Incorporate the answers into all docs (spec v0.2)
- [ ] Verify from an unrestricted network that TCGdex images exist (HEAD checks per language, `DATA_SOURCES.md` §4)
- [ ] **You:** explicit **go** for coding 🔑

**Exit:** all ★ questions answered, docs updated to v0.2, explicit permission to start M1.

---

## M1 · Foundation 🔒 → v0.1.0

- [ ] Scaffold: Vite + React + TypeScript (strict) + TanStack Router (file-based) + Tailwind CSS v4 (`ARCHITECTURE.md` §3)
- [ ] Tooling: pnpm, Oxlint (type-aware) + oxfmt, Vitest 5 (+ Browser Mode), Playwright, size-limit, lefthook pre-commit
- [ ] CI (`ci.yml`), Vercel project + preview deployments + security headers (CSP) (`QUALITY.md` §6–7)
- [ ] Design tokens (`tokens.css`, dark/light), fonts self-hosted, base primitives (Button, Input, Sheet, Dialog, Tabs, Toast, Tooltip) — `DESIGN_SYSTEM.md`
- [ ] App shell: sidebar / rail / bottom tabs, top bar, theme switch, privacy toggle (APP-01, APP-03, PRT-05)
- [ ] i18n setup: DE (default) + EN message catalogs, typed messages, locale formatting helpers (APP-02, `I18N.md`)
- [ ] Dexie database v1 schema, repositories, tombstones, `priceLatest` (`DATA_MODEL.md` §7)
- [ ] Domain core: `Money`, allocation, IDs (UUIDv7), Zod schemas, with unit tests (`DATA_MODEL.md` §5–6)
- [ ] PWA skeleton: manifest, icons, service worker with app-shell precache, update toast (APP-04)
- [ ] Settings page skeleton (APP-07) and persistent-storage request (DAT-05)

**Exit:** the app deploys on Vercel, loads offline, switches DE/EN and themes, CI is green and budgets hold.

---

## M2 · Catalog 🔒 → v0.2.0

- [ ] Catalog pipeline `scripts/catalog/` (`DATA_SOURCES.md` §6):
  - [ ] Ingest TCGdex (`intl:30th`, `intl:30th-c`, 30th energies, `asia:M6a`) into the normalized schema
  - [ ] Curated overlays: sections, variant overrides (all-foil ⇒ `std`), printed numbers for the Classic Collection, id aliases
  - [ ] Chinese supplement for `zh-tw` (and `zh-cn` if in scope) (⟶ Q3.2 / Q3.5)
  - [ ] Image verification (HEAD per language) and fallback flags
  - [ ] Curated **sealed catalog** for DE/EN/JA/(ZH) with release waves through Dec 2026 (⟶ Q4.3)
  - [ ] Manifest with hashes, Zod-validated output, CI job + weekly sync PR
- [ ] Sets overview (CAT-01), set detail with sections and filters (CAT-02)
- [ ] Card detail with language switch (CAT-03), images with fallback chain (CAT-07)
- [ ] Sealed catalog + product detail (CAT-05)
- [ ] Search: cards + sealed, multi-script, numbers, filters (CAT-04, CAT-06) + command palette base (APP-05)
- [ ] Cardmarket deep links (PRC-06), since the IDs come with the catalog

**Exit:** every card and product of the v1 scope is browsable and searchable in all in-scope languages, with correct images or graceful fallbacks.

---

## M3 · Collection 🔒 → v0.3.0

- [ ] Add/edit card holdings (COL-01) and sealed holdings (COL-02) with MoneyInput/DateInput
- [ ] Edit / duplicate / delete + undo (COL-03)
- [ ] My cards / My sealed: grid + virtualized table, filters, sort, group-by, summary bar, bulk actions (COL-04, COL-05)
- [ ] Set completion Basis / Komplett / Master per language (COL-07)
- [ ] Quick-add mode (COL-06)
- [ ] Tags and storage locations (COL-09)
- [ ] Sell/trade/gift disposals (COL-11) (if Q6.5 = yes)
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
- [ ] **Price-update session** (PRC-04)
- [ ] Portfolio page: allocation, performance, (spending) (PRT-02, PRT-03, PRT-06)
- [ ] Realized P/L (PRT-04) (if COL-11 shipped)

**Exit:** 30 prices can be updated in ≤ 5 min. Dashboard numbers reconcile with a hand-calculated fixture.

---

## M5 · Data Safety 🔒 → v0.5.0

- [ ] Full backup export with checksum, embedded photos option (DAT-01)
- [ ] Import: parse in a worker → migrate → validate → preview → replace/merge → snapshot → undo (DAT-02)
- [ ] CSV export (Excel-DE dialect) (DAT-03)
- [ ] Backup reminders + status pill (DAT-04), storage usage display (DAT-05)
- [ ] Delete all data (DAT-09)
- [ ] Cardmarket purchase import (DAT-10 / I-14), if you opt in for v1
- [ ] Round-trip, migration-fixture and merge property tests in CI

**Exit:** the E2E journeys "export → wipe → import" and "merge with conflicts" pass on all three engines.

---

## M6 · Polish & Launch 🔒 → v1.0.0

- [ ] Holo card viewer (DSN-01), shared-element transitions (DSN-02), foil progress rings (DSN-03)
- [ ] Onboarding (APP-06), empty states, microcopy pass (German review)
- [ ] PWA polish: install prompts (iOS guidance), offline indicator, update flow
- [ ] Accessibility audit (axe + manual keyboard/screen-reader pass), performance audit (Lighthouse CI budgets)
- [ ] Legal/about page: disclaimer, credits (TCGdex etc.), privacy note, Impressum if public (APP-08)
- [ ] Visual regression baseline
- [ ] Release **v1.0.0**: tag, changelog, production deployment

**Exit:** all Musts in `PRODUCT_SPEC.md` are done, all quality gates are green, and you've signed off.

---

## Post-v1 backlog (ordered by expected value; final order after your answers)

| Item | Notes |
|---|---|
| More sets: the rest of the **Mega Evolution** era (EN/DE + JP) | The pipeline is config-driven: add set IDs, curate the sealed products |
| Cardmarket purchase import (DAT-10 / I-14), if not in v1 | Matches `idProduct` → catalog variant |
| Wishlist with target prices (WSH-01 / I-06) | |
| Binder view (COL-08 / I-02) | |
| Pack-opening log + pull ROI (COL-12 / I-11) | |
| Local photos (COL-10 / I-12) | |
| Auto-backup to folder (DAT-06 / I-15) | Chromium only |
| CSV import wizard with presets (DAT-07 / I-16) | Needs sample files |
| Barcode scanning of sealed products (I-10) | Needs EANs in the catalog |
| Multi-currency + FX (PRC-08) | |
| Older eras (Scarlet & Violet → vintage) | Larger catalog → per-set lazy loading is already in the design |
| Bring-your-own-cloud sync (DAT-08 / I-18) | Only if you want it |
| Grading tracker (COL-13 / I-09) | |
| Card scanning via camera (I-13) | Experimental |
