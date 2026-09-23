# Changelog

All notable changes to Settr are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/) (0.x during development; 1.0.0 = first complete release, see `ROADMAP.md`).

Every PR adds its entry under **Unreleased**. A release moves those entries into a new version section.
Categories: *Added · Changed · Deprecated · Removed · Fixed · Security · Docs*.

## [Unreleased]

### Docs
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
