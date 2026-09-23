# Changelog

All notable changes to Settr are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/) (0.x during development; 1.0.0 = first complete release, see `ROADMAP.md`).

Every PR adds its entry under **Unreleased**. A release moves those entries into a new version section.
Categories: *Added · Changed · Deprecated · Removed · Fixed · Security · Docs*.

## [Unreleased]

### Docs
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
