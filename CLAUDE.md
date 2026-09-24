# CLAUDE.md: Settr

> Project memory for Claude Code. Keep it **short and current**. Details live in `docs/`. Tool-agnostic agent workflow → [`AGENTS.md`](AGENTS.md).

## 🚦 Phase gate (read first)

**Current phase: M5 · DATA SAFETY ✅ built, waiting for Marvin's check** (M1–M4 too). Coding was approved on 2026-09-23 (Marvin: "You can start"). M1 + M2 are merged into `main` (PR #1), M3 too (PR #2, 2026-09-23). The CI fixes after that merge and M4 are in PR #3 (opened 2026-09-24, squash merge recommended). M5 follows on `claude/great-edison-uri1z0` once PR #3 is merged, and its PR opens when Marvin asks. Vercel is connected (PR #3 got a preview deployment). Open on Marvin's side: add the `VERCEL_DEPLOY_HOOK` secret for the daily price guide, make `main` the default branch, check the app in Brave and on the iPhone (for M5: export, import on the other device, merge back), answer rounds 4–7 in `USER_QUESTIONS.md` when convenient, then say whether to start **M6 · Polish & Launch**.

- Rounds 1–3 are answered and incorporated (spec v0.3). Design direction **D · Bold Studio** is confirmed with the *Indigo* accent (R3.1). Its artboards live on the design canvas "[Settr Design Directions](https://claude.ai/artifact/VRE95AH1GZ8yHK8Qb2y5hq)" (private, owner-only) and are the visual reference.
- Work milestone by milestone. Keep `ROADMAP.md` ticked and `CHANGELOG.md` current in every step, and report to Marvin at the end of each milestone.
- The repository stays **public** for now (R3.2): never commit price-guide snapshots or the deployment URL (ADR-029).

## What Settr is

Settr is a **local-first Pokémon TCG collection tracker** for **singles and sealed** products.

- **UI: German only** (translation-ready).
- **Card languages:** DE, EN, JA, **Simplified Chinese** and Traditional Chinese (R2.3).
- **Deployment:** private, unlisted and `noindex`, for Marvin + a few friends.
- **Platforms:** Windows desktop first (**Brave**, Chromium; R2.9, ADR-027), then iPhone (PWA).

- **Prices are entered manually.** Marvin's rule is *the cheapest offer in the card's language from German sellers* on Cardmarket, **Near Mint or better** (R2.2). **Every price belongs to its card language** (R2.6: what Collectr gets wrong). Entries turn into trends and P/L versus purchase price. A daily Cardmarket price-guide snapshot offers **suggestions** that are never auto-saved (ADR-020).
- It's a static SPA on **Vercel**, with **no backend**. All user data lives in **IndexedDB**, with full import/export.
- **v1 catalog = one expansion:** *30 Jahre / 30th Celebration*, released 16 Sep 2026.
  - EN/DE: `30th` + `30th-c` + 8 energies.
  - JP + Simplified/Traditional Chinese: `M6a`.
  - Sealed: DE/EN/JP/TC/SC.
- **After v1:** Marvin's own sets are added one by one, era by era (ADR-028). Build everything **multi-set** from day one.
- **Design:** direction **D · Bold Studio** (`DESIGN_SYSTEM.md` §1.2): heavy wide type, floating glass sidebar, neutral surfaces with one accent, light + dark. **Usability and UX always come first** (Marvin).

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
- **UI:** Tailwind 4.3 + OKLCH tokens · shadcn-style primitives on **Base UI**, hand-written (ADR-031) · Motion 13 · Recharts 3 · Phosphor icons · Mona Sans / Geist Mono (self-hosted).
- **Libraries:** Paraglide JS 2 (i18n, DE base) · TanStack Form + Zod 4 · TanStack Table 9 / Virtual 3 · MiniSearch (worker) · Zustand (tiny UI state) · vite-plugin-pwa.
- **Tooling:** Oxlint (type-aware) + oxfmt · Vitest 5 (+ Browser Mode) + Playwright + axe · size-limit · lefthook · pnpm 10.33 · Node 24 LTS.
- **Jobs (GitHub Actions):** `ci.yml` (PRs, `main`, manual) · `catalog-sync.yml` (weekly catalog PR; manual run with `commit: true` commits to the branch) · `price-guide.yml` (M4, daily; a deploy hook while the repo is public, ADR-029) · `e2e-nightly.yml` (M5, nightly + manual: property tests with a random seed, the data journeys in Firefox).

## Commands

```bash
pnpm dev             # Vite dev server
pnpm build           # production build → dist/ (regenerates src/routeTree.gen.ts; writes cm-prices.json, real only on Vercel)
pnpm preview         # serve dist/ with the production security headers (CSP)
pnpm typecheck       # Paraglide compile + tsc --noEmit (TS 7)
pnpm lint            # oxlint --type-aware (incl. layer boundaries, no hard-coded strings)
pnpm format          # oxfmt (format:check in CI)
pnpm test            # vitest unit + integration (Node, fake-indexeddb); FC_SEED=random explores, FC_SEED=<n> replays
pnpm test:browser    # vitest browser mode (components, *.test.tsx)
pnpm e2e             # playwright against the built app (run pnpm build first)
pnpm size            # size-limit budgets (after build)
pnpm csp             # CSP hash of the inline pre-paint script (--write to update vercel.json)
pnpm icons           # re-render the PWA icons
pnpm check           # everything CI's first job runs
pnpm catalog:sync    # regenerate public/catalog/v1 from the pinned sources + data/curated (offline; CI adds --network)
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
6. **Design tokens only** (no raw hex/oklch in components). Respect `prefers-reduced-motion`. Keep WCAG 2.2 AA. P/L is never color-only. **Usability beats decoration** (Marvin: "Usability and user experience is always #1").
7. **Licensing:**
   - No GPL code: `pokemon-cards-css` is GPL-3.0, so the holo effect is clean-room.
   - No Pokémon logos, Poké Ball or official symbols in branding.
   - Fonts are self-hosted.
   - Card images only from the approved hosts in `DATA_SOURCES.md`.
8. **Privacy:** no analytics, no trackers, and no third-party requests except TCGdex images (Q8.3/Q8.4). The deployment stays `noindex` (ADR-022).
9. **Definition of Done** = `docs/QUALITY.md` §1. Update `CHANGELOG.md` (Unreleased) and tick `ROADMAP.md` in the same PR.
10. **Unsure about product behavior?** Don't guess silently. Add a question to `USER_QUESTIONS.md` and/or ask in chat. Record architectural choices as a new ADR in `docs/DECISIONS.md`.

## Git

- Work branch for this session: `claude/great-edison-uri1z0`. `main` holds the reviewed spec (created 2026-09-23, R3.3) and becomes the default branch; milestone work merges into it via one PR per milestone (Q8.6), opened when Marvin asks.
- Later: one branch + PR per milestone or feature (`feat/m2-catalog-pipeline`).
- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
- Never force-push shared branches. Never commit secrets or personal collection data.
- The repository stays **public** for now (R3.2). Never commit Cardmarket price-guide snapshots or the deployment URL (ADR-029).

## Environment notes (Claude Code on the web)

- The cloud session's egress policy **blocked** `api.tcgdex.net`, `assets.tcgdex.net`, `pokemon.com`, `vercel.com` and others (403 at the proxy). **GitHub and the npm registry work.**
  - The pipeline clones its pinned sources itself; to reuse existing clones run `TCGDEX_DIR=… PTCG_DIR=… pnpm catalog:sync`. Offline runs keep the pictures and Cardmarket ids of the last CI sync (ADR-033).
  - Cardmarket files, TCGCSV and picture checks run in GitHub Actions: trigger `catalog-sync.yml` (`commit: true`) and read its report in the job log. Also blocked here: Cardmarket's S3, TCGCSV, pokeapi.co and TCGplayer's CDN (card pictures show placeholders locally; e2e tests stub them).
- Node's built-in `fetch` needs `NODE_USE_ENV_PROXY=1` to use the proxy.
- jsDelivr is blocked too, so Paraglide's plugin loads from `node_modules` (`src/i18n/project.inlang/settings.json`).
- Browsers: set `CHROMIUM_PATH=/opt/pw-browsers/chromium` for `pnpm e2e` and `pnpm test:browser`. The sandbox has no WebKit; CI runs the iPhone WebKit project.

## Working style for Claude

- For a milestone: read the relevant docs → plan (plan mode) → implement in small verified steps → run typecheck/lint/tests → update docs.
- Use subagents for independent workstreams (roles in `AGENTS.md` §2) and for broad research. Keep the main context for integration and review.
- When Marvin answers `USER_QUESTIONS.md`, propagate the answers into every affected doc, bump the spec version (v0.3 …) and log changes in `CHANGELOG.md`.
