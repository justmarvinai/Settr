# Settr: Architecture Decision Log (ADR)

> Each decision records **context → decision → consequences → alternatives**.
> Status: **Accepted** (settled, may be revisited with a new ADR) · **Proposed** (my recommendation, awaiting your confirmation in `USER_QUESTIONS.md`) · **Superseded**.
> New decisions are appended. Old ones are never edited silently: they're superseded by a new ADR.

| # | Decision | Status |
|---|---|---|
| 001 | Local-first, static client-only app on Vercel | Accepted |
| 002 | Vite SPA instead of Next.js / TanStack Start | Accepted |
| 003 | Dexie 4 on IndexedDB for user data | Accepted |
| 004 | Build-time catalog snapshot from TCGdex + curated overlays | Accepted |
| 005 | Prints (`intl`/`asia`), card language on the copy, TCGdex-based variants | Accepted |
| 006 | Lots with disposals, integer money, UUIDv7, tombstones | Accepted |
| 007 | Manual price series and carry-forward valuation | Accepted |
| 008 | Paraglide JS 2 for i18n | Accepted |
| 009 | shadcn/ui on Base UI + Tailwind v4 + OKLCH tokens | Accepted |
| 010 | Recharts 3 as the single chart library | Accepted |
| 011 | TypeScript 7 + Oxlint/oxfmt + Vitest 5 + Playwright | Accepted |
| 012 | MiniSearch in a worker with CJK bigram tokenization | Accepted |
| 013 | Image delivery: direct CORS for TCGdex, same-origin proxy for non-CORS hosts | Accepted (Q8.4) |
| 014 | Clean-room holo effect (no GPL code) | Accepted |
| 015 | Design direction: D · Bold Studio (C's type, B's sidebar, calm color, light + dark) | Accepted (R2.1, R3.1) |
| 016 | Versioned JSON backup, LWW merge with tombstones | Accepted |
| 017 | TanStack Form + Zod 4 | Accepted |
| 018 | Chinese data strategy for v1 | Superseded by ADR-021 |
| 019 | German-only UI, translation-ready | Accepted (Q3.1) |
| 020 | Cardmarket price-guide suggestions via a daily static snapshot | Accepted (Q6.6; storage per ADR-029) |
| 021 | Simplified Chinese as a language of M6a, with derived names | Accepted (Q3.2, Q3.5; R2.8 revised; amended by ADR-026) |
| 022 | Private deployment: unlisted + noindex, no Impressum while private | Accepted (Q1.2) |
| 023 | Binder-aware storage locations (layout, page, slot) | Accepted (Q5.7) |
| 024 | Liquid Glass as a material for chrome only | Accepted (Q9.5) |
| 025 | Reference price = Near Mint or better, plus per-copy values | Accepted (R2.2) |
| 026 | Traditional Chinese cards as a language of M6a | Accepted (R2.3) |
| 027 | Brave (Chromium) as the primary browser | Accepted (R2.9) |
| 028 | Catalog growth: 30 Jahre first, then set by set and era by era; no Collectr import | Accepted (R2.5) |
| 029 | Public repository: what may be committed | Accepted (R3.2) |

---

### ADR-001 · Local-first, static client-only app on Vercel
- **Context:** The brief requires Vercel hosting and "no backend (like a MySQL database)". Data must be importable and exportable to move devices.
- **Decision:** The app is a static SPA. All user data lives in the browser (IndexedDB). There are no server functions at runtime. Backups are files the user controls.
- **Consequences:** Zero running cost, maximal privacy and offline use. Durability depends on the browser, which is mitigated by persistence, PWA installation and backups (`ARCHITECTURE.md` §8.2). There's no multi-device sync without extra work (post-v1 option).
- **Alternatives:** Vercel Functions + Postgres/KV (violates the brief), Dexie Cloud (paid SaaS, a backend by another name).

### ADR-002 · Vite SPA instead of Next.js / TanStack Start
- **Context:** Nothing needs SSR or SEO: it's a private tool, and all data is client-side.
- **Decision:** Vite 8 (Rolldown) + React 19.3 + TanStack Router, deployed as static files.
- **Consequences:** Simplest mental model, fastest builds, no hydration pitfalls with IndexedDB. Next.js' static export would drop rewrites, headers and image optimization anyway.
- **Alternatives:** Next.js 16 (`output: 'export'`), TanStack Start (RC, SSR-oriented), SvelteKit (a different ecosystem).

### ADR-003 · Dexie 4 on IndexedDB for user data
- **Context:** We need indexes, transactions, schema migrations, reactive queries and export.
- **Decision:** Dexie 4.4 with `dexie-react-hooks` (`useLiveQuery`). All access goes through repositories in `src/db`.
- **Consequences:** A mature, well-documented stack with reactive UI for free. Dexie Cloud stays an optional future path.
- **Alternatives:** idb (too low-level), RxDB (paid storage plugins), TinyBase (in-memory), SQLite-wasm/PGlite (heavy; COOP/COEP would break cross-origin card images), Evolu/Jazz (API churn).

### ADR-004 · Build-time catalog snapshot from TCGdex + curated overlays
- **Context:**
  - TCGdex is free, open source and multilingual (international EN/DE/FR/… and Asian JA/ZH/KO data), and includes per-variant Cardmarket IDs.
  - Fetching per card at runtime would mean hundreds of requests per set and language, plus a runtime dependency on an external service.
  - Sealed products and Chinese data for the v1 set are **not** in TCGdex.
- **Decision:**
  - A Node pipeline (`scripts/catalog`) reads a **pinned commit** of the `tcgdex/cards-database` repository (and/or its API).
  - It normalizes the data into Settr's schema, merges curated data (`data/curated/`), validates, and emits versioned static JSON into `public/catalog/v1/`, which is committed.
  - The app never calls TCGdex's API at runtime. Only images are loaded from TCGdex's asset CDN (ADR-013).
- **Consequences:**
  - Fast, offline-capable and reproducible.
  - Data can be fixed or augmented locally, and adding sets means changing config and re-running.
  - Catalog freshness is tied to deployments, handled by a weekly sync PR.
- **Alternatives:** Runtime TCGdex API/GraphQL (latency, availability, request count), pokemontcg.io (English-only), scraping (fragile, ToS).

### ADR-005 · Prints, card language on the copy, TCGdex-based variants
- **Context:**
  - Card lists differ between the international and Asian prints: EN 30th Celebration has 128 official cards, JP M6a has 103.
  - Mirrored Asian languages share the JP structure.
  - Variants range from a single standard print to reverse, ball-pattern and stamp variants.
- **Decision:**
  - `Print = intl | asia`, and each set declares its languages.
  - An owned copy is card × **language** × variant × condition/grade.
  - Variants derive from TCGdex's detailed variant model (`type`/`foil`/`stamp`/`size`) with curated overrides, e.g. `std` for all-foil sets.
- **Consequences:** Correct numbering and completion per print. Future sets with reverse or pattern variants need no model change.
- **Alternatives:** One global "card" across all languages (wrong for JP/EN differences), a print per language (duplicates identical intl cards).

### ADR-006 · Lots with disposals, integer money, UUIDv7, tombstones
- **Decision:**
  - Holdings are **lots**, with a `disposals[]` array for partial sales.
  - Money is integer minor units plus a currency, with largest-remainder allocation.
  - Record IDs are UUIDv7.
  - Deletions write **tombstones** in a separate table.
- **Consequences:** Exact P/L, trivial undo, time-series reconstruction, and merge/sync readiness. Queries stay simple because the live tables contain no soft-deleted rows.
- **Alternatives:** Record splitting on sale (rounding and history issues), floats (rounding bugs), soft-delete flags (every query must filter).

### ADR-007 · Manual price series and carry-forward valuation
- **Context:** The brief says prices are entered manually after checking Cardmarket.
- **Decision:**
  - One price series per card × language × variant × grade, or sealed product × language.
  - Valuation uses the latest entry on or before the date.
  - **Unpriced holdings are excluded and counted.**
  - A `priceLatest` materialized table makes valuation fast.
- **Consequences:** Honest numbers, fast dashboards, and step-shaped portfolio curves.
- **Alternatives:** Per-holding prices only (duplicate effort for identical copies), automatic prices (contradicts the brief). *Suggestions* from Cardmarket's price guide were later accepted as an explicit, confirm-to-save aid (ADR-020).

### ADR-008 · Paraglide JS 2 for i18n
- **Decision:** Paraglide JS 2 with German as the base locale and compile-time typed messages. v1 ships German only (ADR-019), and English can be added later as a second locale.
- **Consequences:** Smallest bundle, and missing parameters are type errors. The locale switch needs `{ reload: false }` plus a React re-render.
- **Alternatives:** i18next + react-i18next (runtime and size), Lingui 6 (needs Babel macros under Vite 8), react-intl (churn).

### ADR-009 · shadcn/ui on Base UI + Tailwind v4 + OKLCH tokens
- **Decision:**
  - shadcn CLI v4 components (owned source) on **Base UI** (the shadcn default since July 2026).
  - Tailwind 4.3 bridged to semantic OKLCH tokens.
  - Phosphor icons and Mona Sans typography (`DESIGN_SYSTEM.md`).
- **Consequences:** Accessible primitives with full visual control, deliberately restyled to avoid the "default shadcn" look.
- **Alternatives:** Radix-based shadcn (maintenance slowed), MUI/Mantine (opinionated look), fully custom primitives (a11y cost).

### ADR-010 · Recharts 3 as the single chart library
- **Decision:** Recharts 3 via shadcn chart components for time series (line/area/step, custom scrubbing), donut, treemap, bars and sparklines.
- **Consequences:** One themeable, SVG-accessible dependency, lazy-loaded (≤ 120 KB chunk budget).
- **Alternatives:** TradingView Lightweight Charts 5 (excellent time series, but mandatory attribution and a second library). This is the fallback if scrubbing performance disappoints. ECharts 6 (heavy), visx (low-level), Nivo/Tremor (slowed/dormant).

### ADR-011 · TypeScript 7 + Oxlint/oxfmt + Vitest 5 + Playwright
- **Decision:**
  - `tsc` 7 (native) for type checks.
  - Oxlint with type-aware rules (tsgolint) for linting, and oxfmt for formatting.
  - Vitest 5 (+ Browser Mode) and Playwright 1.63 for tests.
  - pnpm on Node 24 LTS.
- **Consequences:** Very fast feedback loops. typescript-eslint is unusable with TS 7 anyway. oxfmt is beta, so Biome 2.5 is the fallback.
- **Alternatives:** ESLint 10 + Prettier (typed linting stuck below TS 6.1), Biome only.

### ADR-012 · MiniSearch in a worker with CJK bigram tokenization
- **Decision:** A MiniSearch index in a Web Worker. It uses NFKC, diacritic and kana normalization, and bigrams for CJK.
- **Consequences:** Instant multi-script search off the main thread. Switch to FlexSearch if the catalog grows to tens of thousands of docs.
- **Alternatives:** Fuse.js (no index), Orama (heavier), FlexSearch (more complex API).

### ADR-013 · Image delivery: direct CORS for TCGdex, proxy for non-CORS hosts (Accepted)
- **Context:** Service-worker caching of **opaque** cross-origin responses costs about 7 MB of quota each in Chrome. Canvas features need CORS-clean images. Hotlinking also sends visitors' IPs to a third party.
- **Decision (Q8.4):** TCGdex sends `Access-Control-Allow-Origin: *` on successful responses (third-party measurement; confirm in M1). So **TCGdex images load directly** with `crossorigin="anonymous"`, and the privacy note names the host. Hosts without CORS headers go through a same-origin Vercel rewrite; in v1 that's `/img/tcgp/*` for TCGplayer sealed images.
- **Consequences:** Image URLs are centralized in `catalog/images.ts`, so switching is trivial.

### ADR-014 · Clean-room holo effect
- **Context:** The popular `simeydotme/pokemon-cards-css` is **GPL-3.0**.
- **Decision:** No code from it. We implement our own layered-gradient/blend-mode effect. MIT helpers are allowed (e.g. react-parallax-tilt).
- **Consequences:** No license contamination. A one-card-at-a-time performance policy.

### ADR-015 · Design direction: D · Bold Studio (Accepted, R2.1)
- **Context (Q9.5):** References are Revolut, Apple and Wise, with bold fonts, clean designs, Apple minimalism and Apple's Liquid Glass. Desktop first (Q9.8). Round 2 showed three directions on the design canvas: **A · Vault Glass** (dark, gold), **B · Studio Glass** (light, Apple-minimal) and **C · Bold** (Revolut/Wise energy, cobalt). v0.1's "Terminal" and "Foil Pop" had already been dropped.
- **Decision (R2.1):** Marvin picked **C** with **B's sidebar**, more polish and **more subtle coloring**, in **both light and dark**, with **balanced** glass, adding: *"Usability and user experience is always #1."* The result is direction **D · Bold Studio** (`DESIGN_SYSTEM.md` §1.2):
  - C's heavy, wide display type (Mona Sans 900, `wdth` 125), pill controls and big stat numbers.
  - B's floating glass sidebar and toolbar.
  - Neutral surfaces with one restrained accent (*Indigo* by default); color is information, not decoration.
  - Light and dark as equals, *System* as the default theme.
- **Consequences:** Tokens for both themes are cut in M1 from `DESIGN_SYSTEM.md` §3. The D artboards on the canvas are the visual reference. Marvin confirmed them with the *Indigo* accent (R3.1).
- **Alternatives:** A (the earlier recommendation; dark-first, gold), B as-is (calm but less distinctive), C as-is (too loud for long data-entry sessions).

### ADR-016 · Versioned JSON backup, LWW merge with tombstones
- **Decision:** A single `.settr.json` envelope with `formatVersion`, `schemaVersion` and a checksum. Import supports *replace* and *merge* (last write wins by `updatedAt`, plus tombstones), and takes a pre-import snapshot (`IMPORT_EXPORT.md`).
- **Alternatives:** ZIP container (planned for when photos make files large), CRDTs (overkill without live sync).

### ADR-017 · TanStack Form + Zod 4
- **Decision:** TanStack Form 1.x with Zod 4 schemas, shared with import validation. Zod's German error locale is used.
- **Alternatives:** react-hook-form 7 (v8 still beta).

### ADR-018 · Chinese data strategy for v1 (Superseded by ADR-021)
- **Context:** TCGdex has **no** `zh-tw`/`zh-cn` data for Mega-era sets yet (its zh-tw data ends at SV10, May 2025, and zh-cn at CSV9.5C, Jun 2026). The Traditional Chinese 30th CELEBRATION mirrors the JP `M6a` structure. The Simplified Chinese version's structure and count are unconfirmed.
- **Options:**
  - (a) A curated `zh-tw` supplement: `M6a` card list + TC names, with images only if a legitimate source exists.
  - (b) Allow ZH holdings on `M6a` cards with JP images and names until data arrives.
  - (c) Postpone ZH to post-v1.
  - (d) Custom items.
- **Proposal (v0.1):** (b) at launch plus (a) as data becomes available. Superseded after Q3.2 chose **Simplified** Chinese, see ADR-021.

### ADR-019 · German-only UI, translation-ready (Accepted, Q3.1)
- **Decision:** v1 ships only German UI text. Paraglide stays, with `de` as the base and only locale, and **every** string lives in `messages/de.json` (lint rule against hard-coded text).
- **Consequences:** No English maintenance cost now. Adding English later is purely additive (one message file + a locale switch).
- **Alternatives:** Hard-coded German strings (cheaper today, costly refactor later).

### ADR-020 · Cardmarket price-guide suggestions via a daily static snapshot (Accepted, Q6.6)
- **Context:** Marvin wants suggestions from Cardmarket's public price guide. The file has no CORS headers (browser fetch impossible) and is 15.5 MB, and Settr has no backend.
- **Decision:** A daily GitHub Action (`price-guide.yml`) downloads the file, filters it to catalog products (a few KB) and commits `public/catalog/v1/cm-prices.json` only if it changed, which triggers a Vercel deploy. The UI shows *ab* and *Trend* as **suggestions** (dated, scope-labeled) that are **never saved without confirmation**. Accepted values are stored with `origin: 'guide'`.
- **Consequences:** Static, private and free. At most one commit/deploy per day. The guide is global for international products (all languages and countries), which the UI states explicitly.
- **Alternatives:** Vercel Function proxy (a backend, violates the brief), the user uploading the 15 MB file manually (clunky), scraping (ToS).

### ADR-021 · Simplified Chinese as a language of M6a, with derived names (Accepted, Q3.2/Q3.5)
- **Context:** Marvin collects **Simplified** Chinese cards. The SC *30周年庆典* mirrors JP `M6a` (176 cards on Cardmarket expansion 6603 and in `duanxr/PTCG-CHS-Datasets`). TCGdex has no SC data.
- **Decision:**
  - `asia:M6a.languages = ['ja', 'zh-cn']`. SC printed rarity marks are handled via `printedRarity`.
  - Chinese Pokémon names are **derived** from PokéAPI species names (+ `ex` suffix), labeled *übersetzt*. The few Trainer/Energy names are curated.
  - SC Cardmarket product IDs are mapped via `idMetacard` (6602 ↔ 6603).
  - **R2.8 revised (2026-09-23):** the dataset's own terms reserve consent for redistribution to the **official owner or an authorized entity** (they point to Pokémon Shanghai), not to the maintainer, so a request to the maintainer can't unlock it. Settr therefore **doesn't use `duanxr/PTCG-CHS-Datasets`**: nothing from it is committed or shipped. SC names are derived (PokéAPI `zh-Hans`) plus hand-curated Trainer/Energy names.
- **Consequences:** SC copies are trackable at launch with correct numbers and Cardmarket links. Names and images improve without migrations.
- **Alternatives:** Waiting for TCGdex (unknown timeline), scraping pokemon.cn (ToS and fragility).

### ADR-022 · Private deployment (Accepted, Q1.2)
- **Decision:** An unlisted `*.vercel.app` URL shared only with friends. `noindex` via meta tag, `X-Robots-Tag` header and `robots.txt`. An "Über & Rechtliches" page with the disclaimer, credits and privacy note. **No Impressum while private.**
- **Caveat:** not legal advice. Sharing with friends goes beyond the strict "personal/family" exemption, so the residual risk is low but not zero. If Settr ever goes public, an Impressum is added first.

### ADR-023 · Binder-aware storage locations (Accepted, Q5.7)
- **Decision:** `Location` has `layout {columns, rows}` and `pages`. A holding's `location` stores `{id, page, slot}`, and Settr suggests the next free slot (occupancy is a warning, not a constraint).
- **Consequences:** Matches Marvin's Withyu 12-pocket and VaultX 9-pocket binders, and enables the virtual binder view in v1.1 (COL-08, R2.4) without data changes.

### ADR-024 · Liquid Glass as a material for chrome only (Accepted, Q9.5)
- **Decision:**
  - Glass (backdrop blur + saturation + translucent tint + specular edge) is used **only** for floating chrome: sidebar, toolbar, tab bar, sheets, popovers and the command palette.
  - Content stays solid.
  - Reduced transparency (OS preference or the in-app toggle) switches to solid surfaces.
  - At most 3 blurred layers are visible at once.
- **Consequences:** It delivers the macOS/iOS 26 feel Marvin likes without sacrificing legibility or performance on Windows laptops.
- **Alternatives:** Glass everywhere (illegible, slow), no glass (misses the stated taste).

### ADR-025 · Reference price = Near Mint or better, plus per-copy values (Accepted, R2.2)
- **Context:** Marvin's rule is "the cheapest offer in the card's language from German sellers" (Q6.3). Without a condition filter, the cheapest offer is often a played copy, which would undervalue his NM cards. He also owns LP and damaged copies (Q5.2).
- **Decision:**
  - The reference price (*ab (DE)*) means **Near Mint or better**. Cardmarket deep links add `minCondition=2` (verified by Marvin, R3.5), and price entries store `context.minCondition = 'NM'`.
  - Copies in worse condition use the existing per-lot **value override** (`Holding.valueOverride = { price, date, note? }`, PRC-07, Q6.2; UI: *Eigener Wert*). It replaces the reference price for that lot only, goes stale like any price and is tagged "eigener Wert" wherever it's shown.
- **Consequences:** One price series per card/language/variant/grade stays simple, and worse copies are valued honestly when Marvin wants. Valuation already reads `valueOverride` first, then the carry-forward series price (`DATA_MODEL.md` §6).
- **Alternatives:** Separate price series per condition (more entry work for every card), any condition (misleading for NM copies).

### ADR-026 · Traditional Chinese cards as a language of M6a (Accepted, R2.3; amends ADR-021)
- **Context:** Marvin wants Traditional Chinese sealed products (Q4.3). Opening one yields TC cards, which need a home.
- **Decision:**
  - `asia:M6a.languages = ['ja', 'zh-cn', 'zh-tw']`. Active card languages are **DE, EN, JA, ZH-CN and ZH-TW**.
  - TC names come from `type-null/PTCG-database` (`data_tc`, covers M6a; its data licensing is to verify). The fallback is PokéAPI `zh-Hant` species names labeled *übersetzt*, with Trainer names curated by hand. Numbering mirrors M6a.
  - Cardmarket links for TC copies use the JP product with Cardmarket's T-Chinese language filter.
- **Consequences:** TC copies are trackable from launch with correct numbers. Names are tagged `lang="zh-Hant"` and rendered with Noto Sans TC (`DESIGN_SYSTEM.md` §4).
- **Alternatives:** Sealed-only TC (opened cards would have nowhere to go).

### ADR-027 · Brave (Chromium) as the primary browser (Accepted, R2.9)
- **Context:** Marvin's main browser is **Brave** on Windows (R2.9). Brave runs Chromium's engine (1.95.x = Chromium 153, Sept 2026) but changes some web APIs for privacy. These findings come from Brave's source code at v1.95.104, not from a live install:
  - The **File System Access API is off by default** (flag `brave://flags/#file-system-access-api`). The file and folder pickers don't exist, so remembered folder handles don't work.
  - **Downloads open a Save-As dialog by default**, so a backup download already lets Marvin pick the folder.
  - `persist()` follows Chromium's rules (no prompt; granted for installed apps and often-used sites). `estimate()` always reports a 2 GiB quota.
  - **Delete-on-exit features** (Shields "Forget me when I close this site", "Delete data on exit", per-site "clear cookies on exit") are off by default but would erase IndexedDB.
  - Standard fingerprinting protection adds tiny noise to canvas readback, randomizes hardware values, rounds screen sizes and limits named system fonts to an allowlist. CSS and `backdrop-filter` are untouched.
  - PWA install works. Web Share works on Windows but refuses `.json` files. The default block lists don't touch Settr's assets or TCGdex images.
- **Decision:**
  - Chromium stays the CI reference engine, and a **manual Brave smoke test with default Shields** runs before each release (`QUALITY.md`).
  - **Backups are downloads.** The File System Access API is only an optional extra behind feature detection (check the picker functions). Automatic folder backups (DAT-06, post-v1) explain Brave's flag.
  - Settr requests `persist()` after install, never relies on the reported quota, and warns in onboarding and *Einstellungen → Daten* that delete-on-exit settings erase the collection (R3.4: Marvin doesn't use them; the warnings stay for friends).
  - No canvas hashing or logic based on hardware/screen values. No "share backup" via Web Share on desktop.
  - The self-hosted Noto CJK slices must render Japanese and Chinese names on their own, because Brave may hide named system fonts. Tested in Brave.
- **Consequences:** Nothing in v1 depends on an API that Brave disables. The one real risk, data erased by a delete-on-exit setting, is covered by warnings, persistence and backups.
- **Alternatives:** Asking Marvin to use Chrome or Edge for Settr (unnecessary).

### ADR-028 · Catalog growth: 30 Jahre first, then set by set and era by era; no Collectr import (Accepted, R2.5)
- **Context:** Marvin's ~200 cards are mostly from **Mega Evolution era** sets, some **Sword & Shield**, some **Scarlet & Violet** (*Karmesin & Purpur*), a German **Base Set Charizard** (*Glurak*) and a few **Sun & Moon / GX era** cards. He has **no Collectr Pro**, so Collectr's CSV export isn't available to him.
- **Decision:**
  - v1 ships with *30 Jahre* only. Other sets and eras are added **one by one after the core site is fully functional** (Marvin's plan). Suggested order, to confirm when v1 is done: Mega Evolution → Scarlet & Violet → Sword & Shield → Sun & Moon → Base Set.
  - The **Collectr importer is dropped**. Existing cards are entered by hand, set by set, which makes the fast add flow (quick add from the grid, ≤ 3 interactions for the full form) a priority.
  - From M1 on, catalog, IDs, routes, search and UI are **multi-set and multi-era**: series grouping, per-set lazy-loaded chunks, a slim global search index and per-set completion. Adding a set means pipeline config, a curated overlay and a review, not a refactor.
- **Consequences:** No throwaway work on a Collectr-only importer. A generic CSV import can come back later if friends need it.
- **Alternatives:** Adding Marvin's sets before v1 (delays the core), a Collectr import (no export without Pro).

### ADR-029 · Public repository: what may be committed (Accepted, R3.2)
- **Context:** On 2026-09-23 the GitHub repository `justmarvinai/Settr` was **public**, while the product is private (Q1.2, ADR-022). One planned data flow would republish third-party data through a public repo: the daily Cardmarket price-guide snapshot (ADR-020 commits `cm-prices.json`). A public repo also exposes the planning docs and, later, the deployment's configuration.
- **Proposal (not taken for now):** make the repository **private**. Vercel Hobby deploys private repos, and GitHub Free includes 2,000 Actions minutes per month for private repos, enough for CI, the weekly catalog sync and the daily price-guide job (to verify against real CI times).
- **If it stays public:** `cm-prices.json` is **not** committed. The daily job triggers a Vercel deploy hook instead, and the build downloads and filters the price guide at build time. The deployment URL is never written into the repo.
- **Decision (R3.2, 2026-09-23):** the repository **stays public for now**, so the "If it stays public" rules above apply.
- **Either way:** no secrets and no personal collection data are committed (CLAUDE.md), and `main` is the default branch from M1 on (R3.3).

