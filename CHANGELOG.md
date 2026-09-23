# Changelog

All notable changes to Settr are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/) (0.x during development; 1.0.0 = first complete release, see `ROADMAP.md`).

Every PR adds its entry under **Unreleased**. A release moves those entries into a new version section.
Categories: *Added · Changed · Deprecated · Removed · Fixed · Security · Docs*.

## [Unreleased]

### Docs
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
