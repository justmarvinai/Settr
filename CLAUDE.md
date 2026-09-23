# CLAUDE.md: Settr

> Project memory for Claude Code. Keep it **short and current**. Details live in `docs/`. Tool-agnostic agent workflow → [`AGENTS.md`](AGENTS.md).

## 🚦 Phase gate (read first)

**Current phase: M0 · PLANNING.**

- Round-1 answers received 2026-09-23 and incorporated (spec v0.2).
- Design mockups are approved (Q9.1 → recommendation) and live on the design canvas "Settr Design Directions".
- Open: round-2 questions (`USER_QUESTIONS.md`), including the design pick (R2.1).
- **Coding is NOT approved yet.**

**Do NOT write application code**, scaffold projects, install dependencies, create `src/` files or run generators **until Marvin explicitly grants permission in chat** (e.g. "Go", "Leg los", "Start coding").

Allowed now: editing planning docs (`*.md`), answering questions, research, and design mockups on the design canvas (not in `src/`).

When permission is granted, update this block with the date and the approved scope (e.g. "M1 approved on 2026-10-01").

## What Settr is

Settr is a **local-first Pokémon TCG collection tracker** for **singles and sealed** products.

- **UI: German only** (translation-ready).
- **Card languages:** DE, EN, JA and **Simplified Chinese** (ZH-TW only for sealed products).
- **Deployment:** private, unlisted and `noindex`, for Marvin + a few friends.
- **Platforms:** Windows desktop first (Chrome/Edge), then iPhone (PWA).

- **Prices are entered manually.** Marvin's rule is *the cheapest offer in the card's language from German sellers* on Cardmarket. Entries turn into trends and P/L versus purchase price. A daily Cardmarket price-guide snapshot offers **suggestions** that are never auto-saved (ADR-020).
- It's a static SPA on **Vercel**, with **no backend**. All user data lives in **IndexedDB**, with full import/export.
- **v1 catalog = one expansion:** *30 Jahre / 30th Celebration*, released 16 Sep 2026.
  - EN/DE: `30th` + `30th-c` + 8 energies.
  - JP + Simplified Chinese: `M6a`.
  - Sealed: DE/EN/JP/TC/SC.
- **Design:** Liquid Glass × bold minimalism, with references Revolut, Apple and Wise (`DESIGN_SYSTEM.md`). The direction is picked on the canvas (R2.1).

## Where things are

| Need | Read |
|---|---|
| What to build, priorities, acceptance criteria | `docs/PRODUCT_SPEC.md` (feature IDs `CAT-/COL-/PRC-/PRT-/DAT-/APP-/DSN-`) |
| Screens, flows, keyboard model, microcopy | `docs/UX_SPEC.md` |
| Entities, IDs, Dexie schema, valuation/P&L formulas | `docs/DATA_MODEL.md` (normative) |
| Stack, layers, folders, caching, deployment | `docs/ARCHITECTURE.md` |
| Catalog sources, pipeline, licensing | `docs/DATA_SOURCES.md` |
| Tokens, glass materials, typography, motion, components | `docs/DESIGN_SYSTEM.md` |
| i18n (German only), formatting, DE/EN glossary | `docs/I18N.md` |
| Backup format, import/merge | `docs/IMPORT_EXPORT.md` |
| DoD, tests, budgets, a11y, CSP, CI | `docs/QUALITY.md` |
| Why a decision was made | `docs/DECISIONS.md` (ADR log) |
| Plan and progress | `ROADMAP.md` · `CHANGELOG.md` |
| Open questions and the decision record (round 1) | `USER_QUESTIONS.md` |

## Stack (verified 2026-09-23)

- **Core:** Vite 8 (Rolldown) · React 19.3 + React Compiler · TypeScript 7 (strict) · TanStack Router (file routes, Zod search params) · TanStack Query (catalog JSON).
- **Data:** Dexie 4.4 + `useLiveQuery` (user data).
- **UI:** Tailwind 4.3 + OKLCH tokens · shadcn/ui (CLI v4) on **Base UI** · Motion 13 · Recharts 3 · Phosphor icons · Mona Sans / Geist Mono (self-hosted).
- **Libraries:** Paraglide JS 2 (i18n, DE base) · TanStack Form + Zod 4 · TanStack Table 9 / Virtual 3 · MiniSearch (worker) · Zustand (tiny UI state) · vite-plugin-pwa.
- **Tooling:** Oxlint (type-aware) + oxfmt · Vitest 5 (+ Browser Mode) + Playwright · pnpm · Node 24 LTS.
- **Jobs (GitHub Actions):** `ci.yml` · `catalog-sync.yml` (weekly TCGdex/Cardmarket catalog PR) · `price-guide.yml` (daily `cm-prices.json`).

## Commands (planned; available after M1)

```bash
pnpm dev             # Vite dev server
pnpm build           # production build → dist/
pnpm preview         # serve dist/
pnpm typecheck       # tsc --noEmit (TS 7)
pnpm lint            # oxlint --type-aware
pnpm format          # oxfmt
pnpm test            # vitest (unit + integration)
pnpm test:browser    # vitest browser mode (components)
pnpm e2e             # playwright
pnpm catalog:sync    # regenerate public/catalog/v1 from TCGdex + data/curated
pnpm size            # size-limit budgets
```

## Architecture rules

- **Layers:** `routes → features → components/domain → components/ui`.
  - `features` and `db` depend on `domain`.
  - `domain/` is **pure TS** (no React, Dexie or DOM).
  - Only `db/` touches IndexedDB, and only `catalog/` fetches catalog JSON or builds image URLs.
  - Features import each other only via their public `index.ts`.
- **State:** user data via Dexie live queries; catalog via TanStack Query; filters/sort/view **in the URL**; Zustand only for ephemeral UI.
- **Catalog:** the app **never calls TCGdex (or any data API) at runtime**. The catalog is generated by `scripts/catalog` into `public/catalog/v1/`.
  - Never hand-edit generated JSON. Change `data/curated/` or the pipeline instead.
  - **Catalog IDs are permanent** (`intl:30th:025`, `asia:M6a:017`), and IDs are never parsed.

## Non-negotiable rules

1. **Money:** integer minor units + currency (`{ minor, currency }`), never floats. Format only via `src/i18n/format.ts`.
2. **User-data shape changes** require a Dexie migration, a backup migration, a new fixture in `tests/fixtures/backups/` and a passing round-trip test.
3. **Writes** go through repositories in transactions. Deletes write **tombstones**. IDs are **UUIDv7**. Every record has `createdAt`/`updatedAt`.
4. **Catalog updates never delete or corrupt user data.** Records keep a display `snapshot`.
5. **No hard-coded UI strings.** Every string goes in the Paraglide message catalog. **German only in v1** (ADR-019), with informal "du".
6. **Design tokens only** (no raw hex/oklch in components). Respect `prefers-reduced-motion`. Keep WCAG 2.2 AA. P/L is never color-only.
7. **Licensing:**
   - No GPL code: `pokemon-cards-css` is GPL-3.0, so the holo effect is clean-room.
   - No Pokémon logos, Poké Ball or official symbols in branding.
   - Fonts are self-hosted.
   - Card images only from the approved hosts in `DATA_SOURCES.md`.
8. **Privacy:** no analytics, no trackers, and no third-party requests except TCGdex images (Q8.3/Q8.4). The deployment stays `noindex` (ADR-022).
9. **Definition of Done** = `docs/QUALITY.md` §1. Update `CHANGELOG.md` (Unreleased) and tick `ROADMAP.md` in the same PR.
10. **Unsure about product behavior?** Don't guess silently. Add a question to `USER_QUESTIONS.md` and/or ask in chat. Record architectural choices as a new ADR in `docs/DECISIONS.md`.

## Git

- Work branch for this session: `claude/great-edison-uri1z0`.
- Later: one branch + PR per milestone or feature (`feat/m2-catalog-pipeline`).
- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
- Never force-push shared branches. Never commit secrets or personal collection data.

## Environment notes (Claude Code on the web)

- The cloud session's egress policy **blocked** `api.tcgdex.net`, `assets.tcgdex.net`, `pokemon.com`, `vercel.com` and others (403 at the proxy). **GitHub and the npm registry work.**
  - Use a **pinned `git clone` of `tcgdex/cards-database`** for the catalog pipeline.
  - Image checks run in GitHub Actions or after Marvin allows those hosts (Q8.5).
- Node's built-in `fetch` needs `NODE_USE_ENV_PROXY=1` to use the proxy.

## Working style for Claude

- For a milestone: read the relevant docs → plan (plan mode) → implement in small verified steps → run typecheck/lint/tests → update docs.
- Use subagents for independent workstreams (roles in `AGENTS.md` §2) and for broad research. Keep the main context for integration and review.
- When Marvin answers `USER_QUESTIONS.md`, propagate the answers into every affected doc, bump the spec version (v0.2 …) and log changes in `CHANGELOG.md`.
