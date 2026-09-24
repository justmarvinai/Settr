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
| 009 | shadcn/ui on Base UI + Tailwind v4 + OKLCH tokens | Accepted (amended by ADR-031) |
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
| 021 | Simplified Chinese as a language of M6a, with derived names | Accepted (Q3.2, Q3.5; R2.8 revised; amended by ADR-026, ADR-034) |
| 022 | Private deployment: unlisted + noindex, no Impressum while private | Accepted (Q1.2) |
| 023 | Binder-aware storage locations (layout, page, slot) | Accepted (Q5.7) |
| 024 | Liquid Glass as a material for chrome only | Accepted (Q9.5) |
| 025 | Reference price = Near Mint or better, plus per-copy values | Accepted (R2.2) |
| 026 | Traditional Chinese cards as a language of M6a | Accepted (R2.3) |
| 027 | Brave (Chromium) as the primary browser | Accepted (R2.9) |
| 028 | Catalog growth: 30 Jahre first, then set by set and era by era; no Collectr import | Accepted (R2.5) |
| 029 | Public repository: what may be committed | Accepted (R3.2) |
| 030 | Performance budgets re-baselined on the measured M1 build | Accepted (M1) |
| 031 | UI primitives hand-written on Base UI (no shadcn CLI under TypeScript 7) | Accepted (M1; amends ADR-009) |
| 032 | Pre-paint UI state in localStorage (theme mirror, privacy mode) | Accepted (M1) |
| 033 | Catalog pipeline: pinned sources offline, network facts in CI only | Accepted (M2) |
| 034 | Simplified Chinese names converted from the official Traditional ones | Accepted (M2; amends ADR-021) |
| 035 | Catalog URLs and search: cards under their set, ids with colons, one worker index | Accepted (M2) |
| 036 | Collection lists without a table library: one domain pipeline + TanStack Virtual | Accepted (M3) |
| 037 | Startup bundle hygiene: route-owned features and a lean shell | Accepted (M3; amends ADR-030) |
| 038 | Hand-written SVG charts instead of Recharts | Accepted (M4; supersedes ADR-010) |
| 039 | Portfolio time series on the main thread (no worker yet) | Accepted (M4) |
| 040 | Price entry as a sheet; price-guide values stored as `from`/`trend` with `origin: 'guide'` | Accepted (M4) |
| 041 | Import as built: read in a worker, safety snapshots in their own database, one guarded transaction | Accepted (M5; amends ADR-016) |
| 042 | Merge rules as built: instants, tombstone hygiene, conservative name folding | Accepted (M5; amends ADR-016) |
| 043 | Backup reminders: the pill says due, the toast waits for a settled install, once a day | Accepted (M5) |
| 044 | Keyboard as built: one tab stop per grid with list semantics, two-key sequences, page keys first | Accepted (M6) |
| 045 | The error log lives in localStorage, not IndexedDB | Accepted (M6) |
| 046 | First run: a localStorage flag, and a device with lots counts as onboarded | Accepted (M6) |
| 047 | Grid → card morph with view transitions: one named picture, typed back and forward | Accepted (M6) |
| 048 | Phone gestures: long press on set tiles, swipe on the card picture | Accepted (M6) |
| 049 | Quality gates as built: visual baselines made in CI, Lighthouse on the local build, a nightly browser matrix | Accepted (M6) |
| 050 | Third-party notices generated at build time (`licenses.txt`) | Accepted (M6) |
| 051 | Asian card names: artwork pairing per set, name donors, a Japanese-name dictionary | Accepted (Mega Evolution) |
| 052 | Card variants from TCGdex's detailed model; promotional prints outside Master | Accepted (Mega Evolution) |
| 053 | Asian prints of the Mega Evolution series: Traditional Chinese mirrors, no Simplified Chinese ones, Japanese-only promos | Accepted (Mega Evolution; extends ADR-021, ADR-026) |
| 054 | Marvin's older sets: international cards only, galleries as subsets, the Base Set's Unlimited print | Accepted (Your sets, R10) |
| 055 | Variants before Scarlet & Violet: promotional holos, print runs, extra cards | Accepted (Your sets; extends ADR-052) |
| 056 | Cardmarket for international sets: the expansion from TCGdex, products by name where TCGdex has no id | Accepted (Your sets) |

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

### ADR-010 · Recharts 3 as the single chart library (superseded by ADR-038)
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
  - **R2.8 revised (2026-09-23):** the dataset's own terms reserve consent for redistribution to the **official owner or an authorized entity** (they point to Pokémon Shanghai), not to the maintainer, so a request to the maintainer can't unlock it. Settr therefore **doesn't use `duanxr/PTCG-CHS-Datasets`**: nothing from it is committed or shipped. SC names are derived (since M2: converted from the official TC names, ADR-034).
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
  - TC names come from `type-null/PTCG-database` (`data_tc`, covers M6a; MIT, verified in M2). The fallback is PokéAPI `zh-Hant` species names labeled *übersetzt*. Numbering mirrors M6a.
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

### ADR-030 · Performance budgets re-baselined on the measured M1 build (Accepted, M1)
- **Context:** `QUALITY.md` §4 set *initial JS ≤ 170 KB gzip* and *fonts on first render ≤ 2 files, ≤ 90 KB* before any code existed. The M1 build (initial JS = entry script + its modulepreloads) measures **209 KB gzip**: react-dom 64, Dexie 31, Zod 25, TanStack Router 25, Base UI 15 (mostly the toast layer), app code 14, Phosphor icons 12, tailwind-merge 9. Fonts: Mona Sans latin with both axes (weight + width, needed for the wide display type) is 98 KB; Geist Mono latin is 23 KB and renders on first paint on desktop (the `Strg K` hint, later card numbers).
- **Already applied:** route-level code splitting; the search dialog and the phone "Mehr" sheet load on first use; one module per UI primitive, so settings-only controls stay in the settings chunk; startup code never imports a feature barrel that re-exports pages (`features/appearance` and `features/pwa` are separate small features).
- **Decision:** initial JS **≤ 220 KB** gzip, fonts on first render **≤ 2 files, ≤ 125 KB**. Per-route chunks (≤ 80 KB) and CSS (≤ 35 KB) are unchanged. `size-limit` enforces them in CI; `.size-limit.mjs` reads the built `index.html` to find the entry and its modulepreloads.
- **Levers, cheapest first, when the budget gets tight:** load the toast layer on the first toast (≈ 12 KB), a generated icon subset with only the Phosphor weights in use (≈ 8 KB), `zod/mini` (≈ 8–11 KB), dropping tailwind-merge (≈ 9 KB). TanStack Query (≈ 12 KB) joins the initial bundle with the M2 catalog loader.
- **Consequences:** about 10 ms more parse time on a phone than the original target, for an app the service worker serves from cache after the first visit. The budget still catches regressions.
- **Alternatives:** pulling all four levers now (less readable code for little user benefit), dropping budgets (regressions go unnoticed).
- **Amendment (M2):** with the catalog, the entry measures **224 KB** gzip: TanStack Query (≈ 9 KB) and the catalog loader, schemas and labels (≈ 5 KB) joined as planned. Catalog pages stay in their route chunks: route files import only components from feature barrels, and anything a route needs outside its split components (search-param schemas, the pending view) lives in `src/catalog` or the route file, because TanStack Router doesn't split `pendingComponent` and a barrel imported by the entry drags every page it re-exports along. Initial JS budget: **≤ 230 KB**. The levers above are unchanged.

### ADR-031 · UI primitives hand-written on Base UI (no shadcn CLI under TypeScript 7) (Accepted, M1; amends ADR-009)
- **Context:** ADR-009 planned shadcn CLI v4 components on Base UI. The CLI transforms component source with the TypeScript compiler API (ts-morph). TypeScript 7 is the Go-native compiler and no longer ships that JavaScript API.
- **Decision:** primitives in `src/components/ui/` are written by hand in shadcn's style: owned source, one module per component, Base UI underneath, `cva` variants and `cn()` (clsx + tailwind-merge). Base UI's bundled docs (`node_modules/@base-ui/react/docs`) are the reference.
- **Consequences:** same ownership and accessibility as planned, no CLI dependency. New primitives are written, not generated (a few minutes each, with a browser-mode test).
- **Alternatives:** running the CLI with TypeScript 5 side by side (two compilers in one repo), Radix-based components (ADR-009 reasons still hold).

### ADR-032 · Pre-paint UI state in localStorage (theme mirror, privacy mode) (Accepted, M1)
- **Context:** IndexedDB is asynchronous, so the app can only read settings after its JavaScript has loaded. Applying the theme, transparency and motion settings, or privacy mode, only then would flash the wrong theme or show amounts that should be hidden.
- **Decision:**
  - Display settings live in `kv.settings` (backed up like every setting) and are **mirrored** to `localStorage['settr:display']` whenever they change.
  - **Privacy mode is per device** and lives only in `localStorage['settr:privacy']`. It is not part of backups (like `kv ui:*`, `IMPORT_EXPORT.md` §2).
  - A small inline script in `index.html` reads both keys and sets `data-theme`, `data-transparency`, `data-motion` and `data-privacy` on `<html>` before first paint. The CSP allows exactly this script by its SHA-256 hash; `pnpm csp` checks the hash against `index.html` and the built `dist/index.html` in CI.
- **Consequences:** no theme flash and no amount flash, including on the very first frame of an installed app. Clearing site data resets privacy mode to off, which is the safe direction for a local app (the collection is gone too in that case).
- **Alternatives:** `kv ui:*` in IndexedDB (async, so it flashes), cookies (sent nowhere, but pointless without a server), a blocking script without CSP hash (weaker CSP).

### ADR-033 · Catalog pipeline: pinned sources offline, network facts in CI only (Accepted, M2)
- **Context:** the development sandbox reaches GitHub and npm but not TCGdex's API or image server, Cardmarket's files or TCGCSV. TCGdex's own compiler needs Bun and its asset index (`datas.json`) lags behind new sets: on 2026-09-23 it listed none of `30th`, `30th-c`, `mee` or `M6a`, and TCGdex's API special-cases `30th` for that reason.
- **Decision:**
  - The pipeline (`scripts/catalog`, tsx) imports the set files of a **pinned** `tcgdex/cards-database` commit directly, plus pinned PTCG-database and PokéAPI commits (`sources.lock.json`). That part runs anywhere and is deterministic.
  - Everything that needs the open web runs in CI only (`catalog-sync.yml`, `--network`): Cardmarket's product files (ID checks, JP↔SC mapping), TCGCSV (sealed pictures) and **GET checks of every picture URL** on TCGdex's and TCGplayer's servers. `datas.json` isn't used.
  - An offline build keeps what the last network build found (pictures, logos, Asian Cardmarket ids, product pictures) per id, so a local run never downgrades a verified catalog; `imagesVerified` in the manifest says whether every picture was checked.
  - The CI report lists what needs curation: unmatched Cardmarket singles, Cardmarket and TCGplayer sealed products with the curated ones marked.
- **Consequences:** the committed catalog is reproducible and reviewable (one JSON line per card). New pictures appear with the weekly sync. Local builds can't verify pictures; they don't pretend to.
- **Alternatives:** TCGdex's compiler (needs Bun, and still the stale asset index), the REST API at build time (unreachable from the sandbox, not pinned), trusting `datas.json` (0 pictures for the v1 set).

### ADR-034 · Simplified Chinese names converted from the official Traditional ones (Accepted, M2; amends ADR-021)
- **Context:** ADR-021 planned Simplified Chinese names derived from PokéAPI `zh-Hans` species names plus curated Trainer and Energy names. In M2 the Traditional Chinese names of all 176 M6a cards turned out to be available and MIT-licensed (`type-null/PTCG-database`, ADR-026), Trainers and card-name suffixes included. Simplified and Traditional Chinese card names differ almost only in script.
- **Decision:** the SC name of an M6a card is its official TC name converted with OpenCC (`tw` → `cn`, `opencc-js`, build time only), labeled *übersetzt* (`nameSource: derived-script`). PokéAPI stays the fallback for missing TC names and the source of search aliases; hand-curated names win over both.
- **Consequences:** every M6a card has an SC name on day one, Trainers included, with the same "übersetzt" honesty as before. Where the official SC name differs from the TC name beyond script, a curated `curatedName` fixes it.
- **Alternatives:** PokéAPI species names only (Trainers and Energies would all need hand-typing), the SC dataset (excluded by R2.8).

### ADR-035 · Catalog URLs and search: cards under their set, ids with colons, one worker index (Accepted, M2)
- **Context:** a card id alone doesn't say which set chunk to load (ids are never parsed, DATA_MODEL.md §3), and prev/next needs the set's order. Search has to cover every set without loading every chunk (ADR-028).
- **Decision:**
  - The card page lives at `/catalog/sets/$setId/cards/$cardId` (UX_SPEC.md §2.2); a subset URL opens its main set filtered to that section. The router keeps `:` in path params, so URLs read like the ids (`/catalog/sets/intl:30th/cards/intl:30th:150`).
  - Search runs in one module worker over `search-index.json` (MiniSearch, ARCHITECTURE.md §7), built once per catalog version from MiniSearch's serialized form (≈ 0.4 s for 20k cards). Names are indexed in a Latin and a CJK field (the n-grams of Chinese and Japanese names would otherwise drown Latin matches), German umlauts both folded and expanded, katakana folded to hiragana, and card numbers in every written form (`025/128`, `25`, `#025`). The command palette (APP-05) and Katalog › Karten share it; without worker support it runs on the main thread.
- **Consequences:** shareable, readable URLs; global search stays fast as sets are added. The search engine depends on MiniSearch 7's serialized format (pinned; the engine tests catch a break on upgrade).
- **Alternatives:** `/catalog/cards/$cardId` with an id → set lookup through the search index (an extra load per card page), a search index per set (global search would load every set).

### ADR-036 · Collection lists without a table library: one domain pipeline + TanStack Virtual (Accepted, M3)
- **Context:** `ARCHITECTURE.md` planned TanStack Table 9 with TanStack Virtual for the collection table. Sammlung › Karten / Sealed shows the same lots as a grid or a table, with the same search, filters, sort, grouping and selection, all in the URL (UX_SPEC.md §4.6). A table library keeps sorting, filtering and grouping inside its table instance, which the grid can't use, and its stable mutable instance needs the React Compiler's opt-out anyway.
- **Decision:**
  - One pure pipeline in `domain/collection/view.ts` (`matchesFilter` → `sortRows` → `groupRows`, plus `summarize`) over lot rows that the feature resolves from the catalog, custom items or the lot's snapshot. The URL state is `collectionSearchSchema`.
  - The grid and the table are hand-written and virtualized with TanStack Virtual's window virtualizer: the grid by rows of tiles (its column count follows the measured width), the table by rows with spacer rows. Groups are heading rows in both.
  - Table columns are plain config (label, sort key, width, the table width from which a column shows). Which columns render is decided from the measured table width, so group and spacer rows always span exactly the rendered columns.
  - Components that read the virtualizer opt out of compiler memoization (`'use no memo'`).
- **Consequences:** grid, table, summary and the coming CSV export (M5) and price session for a selection (M4) share one tested pipeline, and no table library ships (TanStack Table would be one more lazy dependency). Configurable columns arrive with M4's price columns as more config, not a library feature.
- **Alternatives:** TanStack Table 9 (a second pipeline beside the grid's), AG Grid (heavy, own look), CSS-only hiding of columns (container queries leave hidden cells counted by `colspan`, so rows no longer line up).

### ADR-037 · Startup bundle hygiene: route-owned features and a lean shell (Accepted, M3; amends ADR-030)
- **Context:** the initial JS budget is 230 KB gzip (ADR-030). Rolldown puts a module in the chunk of every entry that reaches it: a feature barrel imported by several lazy routes merges everything it re-exports into one shared chunk, and a module the startup code imports brings all of its code along. During M3 the startup bundle reached 230.1 KB and the shared collection chunk 81 KB, both over budget.
- **Decision:**
  - Startup modules hold only startup code: `db/core.ts` (settings, meta, holding count) apart from the collection repositories; money-input parsing and collection labels apart from `i18n/format.ts` and `i18n/labels.ts`; URL schemas apart from the pipelines they feed (`domain/collection/search.ts`, loaded by the route tree).
  - Code only some routes need gets its own feature and barrel: `features/entry` (the add, edit, quick-add, sell and open sheets with TanStack Form, loaded by the lazy sheet host) and `features/library` (the Sammlung lists with TanStack Virtual, loaded by the two collection routes). `features/collection` keeps what catalog pages share.
  - Route components are feature components that read their route through `getRouteApi`; route files don't declare components, because a split component that references `Route` pulls the route module into its chunk and splinters shared startup code into extra chunks.
  - The always-loaded shell (sidebar, tab bar, toolbar, backup pill, toasts) draws its icons as single-weight inline SVG (`components/ui/glyphs.tsx`, Phosphor's paths, MIT). Each Phosphor component carries all six weights; pages keep using Phosphor.
- **Consequences:** after M3 the startup JS is 219.6 KB gzip (about 10 KB headroom for M4), the collection chunk 48 KB and the library chunk 32 KB. A new shell icon goes into `glyphs.tsx` with the one weight it shows. `pnpm size` stays the gate; a source-map attribution of the entry and its preloads explains any jump.
- **Alternatives:** raising the budget (hides regressions), manual chunk rules (brittle across Rolldown releases), Zod Mini instead of Zod's classic API (about 4 KB of JSON-schema code would leave startup, but every schema changes; kept in reserve).


### ADR-038 · Hand-written SVG charts instead of Recharts (Accepted, M4; supersedes ADR-010)
- **Context:** ADR-010 chose Recharts 3 for every chart, lazy-loaded within a 120 KB chunk budget. Measured in M4, Recharts 3.10.1 costs about 402 KB minified and 116 KB gzip for just the line, area, pie, axes and tooltip we need: more than the whole 80 KB budget of a lazy chunk (ADR-030), and the dashboard, Settr's start page, would load it on every visit. The charts Settr needs are few and calm (DESIGN_SYSTEM.md §9): an item price line with observation markers and a dashed purchase baseline, a step-after portfolio line with an optional *Investiert* overlay, scrubbing with a crosshair, and one donut.
- **Decision:**
  - Draw them as SVG in `components/domain/charts/`: `scale.ts` holds the pure math (linear scales, "nice" gridlines inside a data-following domain, the range chips `1M · 3M · 6M · 1J · Max`, line and step paths; unit-tested), `TimeChart.tsx` the time chart, and the donut follows the same pattern.
  - Scrubbing uses pointer events (touch drags horizontally, vertical swipes still scroll) plus a visually hidden native range input for keyboard and screen readers; the chart box shows its focus ring. Every chart offers the same data as a table.
  - Colors come from tokens only: the accent line, the gain/loss tint against the baseline, the new `--viz-1…8` palette for comparison lines, which also differ by dash pattern.
- **Consequences:** a few KB instead of 116 KB, the charts look exactly like the design system, and they work offline and without layout libraries. We own the edge cases (flat lines, one point, prices older than the range), which the scale tests cover. Treemaps and other chart types stay out of v1.
- **Alternatives:** Recharts 3 (too heavy, see above), TradingView Lightweight Charts 5 (canvas instead of SVG, mandatory attribution, a second look to theme), visx (low-level pieces we'd assemble anyway), uPlot (canvas, tiny, but no SVG accessibility and its own look).

### ADR-039 · Portfolio time series on the main thread (Accepted, M4)
- **Context:** The roadmap planned the portfolio time series (DATA_MODEL.md §6.5) in a Web Worker. Built in M4, the event sweep is one pass over lots and price entries per grid day. Measured in the build sandbox: 1,500 lots over 600 series with 4,800 prices and two years of daily points take 160–190 ms; a v1 collection (one set, a few hundred lots) takes a few milliseconds.
- **Decision:** `portfolioSeries` runs on the main thread, in the render of the charts that show it (Übersicht, Portfolio). The React Compiler memoizes it on its inputs, so scrubbing the chart doesn't recompute it; a new price, a range or a mode does.
- **Consequences:** no worker protocol, no second copy of the domain code in a worker chunk, and the chart has its data in the first render. With collections in the thousands a range change can take a noticeable moment: that's the signal to move the sweep into a worker (the function is pure and takes plain data, so the move is mechanical).
- **Alternatives:** a worker now (message passing and structured cloning of every lot and price for a computation that is fast at v1 sizes), caching series in IndexedDB (derived data to keep in sync).

### ADR-040 · Price entry as a sheet; guide values stored as `from`/`trend` with `origin: 'guide'` (Accepted, M4)
- **Context:** UX_SPEC.md §4.9 describes a price entry *popover*. The app already opens every collection form as a sheet (right on desktop, from the bottom on phones), and a popover anchored to a tile would be cramped on phones and a second pattern next to the add, sell and value forms. Separately, accepted price-guide suggestions (PRC-09, ADR-020) need a type: Cardmarket's guide `low` is an *ab* price, but over all languages, countries and conditions, not the German-seller, same-language, Near-Mint *ab (DE)* of R2.2.
- **Decision:**
  - *Preis eintragen* is a sheet like the other collection forms: from `P` on a set or Sammlung tile, a table row's name, the € button on set tiles and the lot menu. On card and product pages `P` focuses the inline price field instead.
  - An accepted guide value keeps the price type it is (`from` for *ab*, `trend` for *Trend*) with `origin: 'guide'`, `source: 'cardmarket'` and no `context` (no filters applied). Lists label such entries *Preisführer ab* / *Preisführer Trend*, and the context line never claims a filter the value didn't have. No new price type, so no user-data shape change.
- **Consequences:** one sheet pattern everywhere, keyboard-first on desktop and thumb-friendly on phones. Valuation treats a guide value like any price of its series; the entry says where it came from.
- **Alternatives:** an anchored popover (small, and a second pattern), new price types `guide-low`/`guide-trend` (a user-data shape change with a migration for no gain in valuation).

### ADR-041 · Import as built: read in a worker, safety snapshots in their own database, one guarded transaction (Accepted, M5; amends ADR-016)
- **Context:** `IMPORT_EXPORT.md` §4 lists the import steps. Building them in M5 meant deciding where each step runs, where the pre-import snapshots live, what undo means after a reload, and how to avoid writing a merge that was planned on data that changed in the meantime.
- **Decision:**
  - Reading is pure domain code (`domain/backup`: parse → envelope check → checksum → migrate → validate) that runs in a module worker (`workers/backup.worker.ts`) with Zod's German messages. When `JSON.parse` fails, a small scanner finds the line and column, because browsers word the error differently and WebKit gives no position at all. Files over 200 MB are refused before reading.
  - Migrations are per-record functions per schema step (`domain/backup/migrate.ts`), so Dexie's `upgrade()` and older backups use the same code. Schema 1 needs none; `tests/fixtures/backups/v1/basic.settr.json` has to keep importing in every later version.
  - Safety snapshots are complete backup envelopes in a second IndexedDB database, `settr-snapshots`, which keeps the last three. One is taken before every replace, merge and restore. Undo means restoring a snapshot, and that restore snapshots the current state first, so it can be undone too.
  - Writing is one read-write transaction across all user tables, `priceLatest` and `kv`. It runs only if the change counter still has the value it had when the snapshot was read; otherwise nothing is written and the user is asked to try again. A merge is planned again from the snapshot's data, so what gets written matches what was saved.
  - A replace clears the device's price session and counts the imported file as the data's latest backup, so a device you just moved to doesn't nag for a backup.
- **Consequences:**
  - A large file doesn't freeze the page, and a failed import leaves no trace.
  - Undo survives reloads and stays available until three newer snapshots push it out, which costs up to three times the data size in storage.
  - `Alle Daten löschen` removes the snapshots too.
- **Alternatives:**
  - Snapshots in the main database: they'd be lost with it and would bloat every export.
  - `sessionStorage`: too small, and gone with the tab.
  - Keeping only the last snapshot: a restore would overwrite the only way back.
  - Parsing on the main thread: freezes the page on large files.

### ADR-042 · Merge rules as built: instants, tombstone hygiene, conservative name folding (Accepted, M5; amends ADR-016)
- **Context:** The table in `IMPORT_EXPORT.md` §5 leaves details open: how timestamps compare, when two tags or Lagerorte are the same one, what happens to deletions after a merge, and how tag names stay unique (Dexie's `&name` index).
- **Decision:**
  - Last write wins by `updatedAt`, compared as points in time (`Date.parse`), so a hand-edited offset can't win by spelling. Ties go to the larger `installId`. Two versions count as identical when their canonical JSON matches.
  - Deletions:
    - A backup record is added unless it was deleted here after the backup's version.
    - A local record is removed if the backup deleted it after this version.
    - Afterwards the device keeps both sides' deletions (the later one per id), minus records that are alive after the merge.
  - Tags and Lagerorte folding:
    - A tag or Lagerort made on both devices under the same name (ignoring case) but with different ids becomes the local one, and the backup's references are remapped: lot tags, a lot's Lagerort, a Lagerort's parent.
    - Folding only happens when it's unambiguous: the backup's record is new here and its name is unique in the backup; exactly one local record has that name; and the backup doesn't contain that local record.
    - A backup tag that would still clash with a different tag here gets a number, *Favoriten (2)*.
  - Settings stay this device's unless *Einstellungen aus dem Backup übernehmen* is checked. Cardmarket corrections are joined, and this device's win.
  - The merge is planned purely (`planMerge`), shown in the preview, and written as planned.
- **Consequences:**
  - Property tests show that merging a dataset into itself changes nothing, merging into an empty device gives the backup, and two devices end up with the same data whichever merges which.
  - Folding is cautious: two binders called *Binder* that one device keeps apart stay apart.
- **Alternatives:**
  - Merging field by field: needs a timestamp per field.
  - Always folding by name: could fold two different binders into one.
  - Asking about every conflict: far too many questions for a collection.

### ADR-043 · Backup reminders: the pill says due, the toast waits for a settled install, once a day (Accepted, M5)
- **Context:** `IMPORT_EXPORT.md` §8 turns the sidebar pill amber and shows a toast when the last backup is older than 7 days and something changed since, plus a gentle reminder after 50 changes. In M3 the pill turned amber as soon as there was data without a backup, and nothing counted the changes since a backup.
- **Decision:**
  - `meta` keeps the change counter at the last backup (`backupDataVersion`). A backup is due when:
    - there's data;
    - something changed since the last backup;
    - and that backup is older than the reminder interval (3, 7, 14 or 30 days; 7 by default) or 50 changes have piled up.
  - Without any backup, data is due at once and the pill turns amber. The toast (*Noch kein Backup. Jetzt sichern?*) waits until the install is a day old or 50 changes have piled up, so a first session isn't interrupted.
  - The toast (*Letztes Backup vor 12 Tagen. Jetzt sichern?*):
    - shows at most once a day per device (kv `ui:backup.remindedOn`);
    - waits for 4 quiet seconds;
    - never shows on the Daten page;
    - *Jetzt sichern* exports right away, and the export code only loads then.
  - A backup made before the counter existed counts as changed.
  - Persistent storage is requested once there's data, and again when Settr gets installed as an app.
- **Consequences:**
  - The pill always tells the truth.
  - The toast interrupts at most once a day, and only when saving a backup actually protects something.
  - The rule is pure (`domain/backup/reminder.ts`) and unit-tested.
  - The shell stays within its startup budget.
- **Alternatives:**
  - A toast right away on a new install: it interrupts the first session.
  - Counting settings changes as well: they're rare and small, and they'd need their own counter.
  - A blocking dialog: too heavy-handed for a reminder.

### ADR-044 · Keyboard as built: one tab stop per grid with list semantics, two-key sequences, page keys first (Accepted, M6)
- **Context:** `UX_SPEC.md` §7 asks for arrow keys in grids, `G` then a letter to switch areas, `V` then a letter to switch views, and page keys like `N` and `P` on the focused item. Card grids have up to 199 tiles, each a link with a ＋ and a € button.
- **Decision:**
  - **Grids stay lists.** They're `ul`/`li` with links, plus a roving tab stop: `Tab` enters a grid once, and the arrow keys, `Home` and `End` move by screen position (`src/lib/useRovingFocus.ts`). The active tile's own buttons stay tabbable. `role="grid"` was left out: it promises cell navigation and row semantics that a wrapping card grid doesn't have, and screen readers read a list of links better.
  - **Two-key sequences** (`src/lib/useKeySequence.ts`): `G` or `V` waits 1.5 s for its second key. They listen while capturing, so a page can't swallow the second key. Like every single-key shortcut, they're quiet in fields, inside dialogs and while a sheet is open.
  - **Page keys first:** `N` on a focused set tile, or on a card or product page, adds that item. The page listens while capturing and marks the key handled, so the shell's `N` (the add palette) only runs elsewhere.
  - **Focus follows navigation:** a palette pick that opens a page sends focus into the new page, not back to the field the palette was opened from.
- **Consequences:**
  - A keyboard user needs one `Tab` to pass a grid.
  - The journey "keyboard only" (QUALITY.md §2.1, journey 10) runs without a mouse: from adding a card to the price session.
  - Each key has one owner at a time.
- **Alternatives:**
  - `role="grid"` with cell navigation: heavier markup and semantics the layout doesn't have.
  - Every tile in the tab order: 199 stops per set.
  - `N` always opening the palette: an extra search for the card that's already on screen.

### ADR-045 · The error log lives in localStorage, not IndexedDB (Accepted, M6)
- **Context:** `QUALITY.md` §6 planned a ring buffer of errors in IndexedDB (200 entries) for *Fehlerbericht kopieren*.
- **Decision:** The log lives in localStorage under `settr:errors`, with 200 entries at most. Each entry has the error text, stack, kind and the page's path without query or hash. *Alle Daten löschen* clears it with the other `settr:` keys.
- **Consequences:**
  - The errors most worth reporting (a blocked or full database, a failed migration) are logged even when IndexedDB is the problem.
  - Writes are synchronous, so an error logged just before a crash or reload isn't lost.
  - The size stays small (a few KB), well within localStorage's limits.
- **Alternatives:**
  - IndexedDB: loses exactly the database errors, and writes asynchronously while the page is failing.
  - No log: bug reports would depend on the console, which phones don't show.

### ADR-046 · First run: a localStorage flag, and a device with lots counts as onboarded (Accepted, M6)
- **Context:** APP-06 shows the onboarding on the first run. Devices that used Settr before M6, or that got a backup, already have lots. The check runs before the Übersicht renders, and the startup budget has little room (ADR-037).
- **Decision:**
  - `settr:onboarded` in localStorage marks a finished or skipped onboarding. The `/` route checks it synchronously.
  - Only without the flag does the route load the onboarding module and count the lots. A device with lots gets the flag and goes on to the Übersicht; an empty one goes to `/onboarding`.
  - *Alle Daten löschen* clears the flag, so the fresh start shows the onboarding again.
- **Consequences:**
  - Returning devices never see the onboarding, and the check costs them nothing: no database read and no extra code at startup.
  - The flag is per browser, like the data.
- **Alternatives:**
  - A settings field in IndexedDB: a database read before the first paint, and a user-data shape change for a UI fact.
  - Always counting the lots: loads the database code on every start.

### ADR-047 · Grid → card morph with view transitions: one named picture, typed back and forward (Accepted, M6)
- **Context:** DSN-02 wants the tile's picture to grow into the card page. The View Transitions API does this without keeping both pages mounted, but a `view-transition-name` must be unique on the page, or the browser skips the transition.
- **Decision:**
  - Only the clicked tile's picture gets the name `card-hero`, as it's clicked; the card page's picture carries the same name. On the way back, the grid names the tile of the card you came from (`src/lib/hero.ts`).
  - Links opt in (`viewTransition` on the tile links and the card page's back link). The router adds typed transitions for back and forward between a grid and a card page, only where the browser supports view-transition types; everything else stays instant.
  - Off under reduced motion (the OS or *Darstellung › Animationen*), and where the API is missing.
- **Consequences:**
  - No animation library, and no layout measuring in JavaScript.
  - Browsers without the API (or without types, for back and forward) simply navigate.
  - The e2e test fails on a skipped transition, since duplicate names log an error.
- **Alternatives:**
  - Motion's shared layout animations: both elements must be mounted at once, which route changes don't allow.
  - A FLIP animation by hand: measuring across routes, and more code than the platform feature.

### ADR-048 · Phone gestures: long press on set tiles, swipe on the card picture (Accepted, M6)
- **Context:** `UX_SPEC.md` §4.3 gives set tiles a long-press menu on phones, and §4.4 wants swiping between cards. Browsers have their own long press (Android's link menu, iOS's link preview), and swipes compete with scrolling.
- **Decision:**
  - **Long press** (`src/lib/useLongPress.ts`): a finger resting 500 ms, or Android's own long press (`contextmenu`), opens a sheet with *Hinzufügen …*, *Preis eintragen …* and *Details*. It replaces the browser's menu, and iOS's preview is off on tiles (`-webkit-touch-callout: none`). The click that may follow the lift is swallowed. It's set tiles only, as specified; other grids keep their menus and buttons.
  - **Swipe** (`src/lib/useSwipe.ts`): only on the card picture, with `touch-action: pan-y pinch-zoom`, so the page still scrolls and zooms. The picture follows the finger (resisting where there's no next card), and past 64 px or a quick flick the next card slides in. The lift never opens the fullscreen view.
  - Mouse and pen are left alone.
- **Consequences:**
  - Phones reach the add sheet and the price sheet without the hover buttons.
  - Scrolling is never blocked.
  - The e2e test drives both through Chromium's touch emulation.
- **Alternatives:**
  - Swipe on the whole card page: collides with the chart's scrubbing and the segmented controls.
  - A gesture library: more code than two small hooks.

### ADR-049 · Quality gates as built: visual baselines made in CI, Lighthouse on the local build, a nightly browser matrix (Accepted, M6)
- **Context:** `QUALITY.md` §2 and §7 plan visual regression (Chromium, light and dark), Lighthouse CI against the Vercel preview, and a nightly Firefox and Pixel run.
- **Decision:**
  - **Visual regression** (`visual.yml`, `tests/visual`):
    - six screens in light and dark, with a fixed clock, stubbed pictures and no service worker;
    - the baselines are made and compared only on GitHub's Ubuntu runner, since other machines render text slightly differently;
    - it runs nightly, not on every PR; a manual run with `update` regenerates every baseline and commits them to the branch;
    - a screen may differ by at most 100 pixels (each beyond Playwright's color threshold): stray antialiasing passes, a missing line of text doesn't. Each screen waits until the collection has loaded, not just the catalog.
  - **Lighthouse CI** (`lighthouse.yml`) on every PR, against `vite preview` with the production headers instead of the Vercel preview:
    - Vercel's deployment protection would block it, and the deployment URL stays out of the repository (ADR-029);
    - **desktop is the gate** (Brave on Windows, the primary platform, R2.9): LCP ≤ 2 s, CLS ≤ 0.05, blocking time ≤ 200 ms, performance ≥ 90, accessibility ≥ 95 and best practices ≥ 90 fail the job (measured in M6: LCP about 1.1 s, performance 96–98);
    - **the phone profile is a report**: a slow phone on simulated 4G for a first visit. Only layout shift and accessibility fail; LCP (warns above 4 s), blocking time and the score warn. The first CI run measured LCP about 5.2 s and a score of about 0.67: an app that renders in the browser can't paint before its code (225 KB) has arrived and run on a 4× slowed CPU. Installed, Settr starts from the service worker's cache, so real phones don't wait for the network.
    - The planned mobile budget (LCP ≤ 2 s on simulated 4G) would need prerendered first screens; it's round 8's question R8.3.
  - **Nightly** (`e2e-nightly.yml`): every journey in Firefox and on a Pixel 7 (Chromium), plus the property tests with a random seed.
- **Consequences:**
  - An intended design change needs one manual run to refresh the baselines.
  - A visual regression shows up the next morning, not in the PR.
  - Lighthouse numbers are from a local server: network timing is simulated anyway.
- **Alternatives:**
  - Baselines from a developer machine: flaky diffs in CI.
  - Visual checks on every PR: every design tweak would need a baseline run before its PR could go green.
  - Lighthouse against the preview URL: needs a bypass secret and the URL at runtime.

### ADR-050 · Third-party notices generated at build time (`licenses.txt`) (Accepted, M6)
- **Context:** MIT, Apache-2.0 and OFL ask for their notices to travel with the software. The minified bundle drops license comments, and APP-08's *Über & Rechtliches* credits the main libraries.
- **Decision:**
  - A build plugin (`scripts/licenses.ts`) writes `licenses.txt` with the license text of every package Settr ships to the browser:
    - the runtime dependency tree of `package.json`, workers included;
    - Workbox's service-worker modules;
    - Tailwind's base styles and Paraglide's runtime, without their compilers.
  - *Über & Rechtliches* links to it. The service worker lets it through (not the app shell).
- **Consequences:**
  - The notices stay complete as dependencies change, without a hand-kept list.
  - About 130 KB, fetched only when someone opens it.
- **Alternatives:**
  - A hand-written list: goes stale.
  - A license plugin that scans the bundle: misses what the workers and the service worker ship.

### ADR-051 · Asian card names: artwork pairing per set, name donors, a Japanese-name dictionary (Accepted, Mega Evolution)
- **Context:**
  - TCGdex's Asian data has only Japanese names. For 30 Jahre, German and English names came from the international card with the same artwork (ADR-021).
  - The Mega Evolution series has eight Japanese sets for seven international ones: Mega-Entwicklung combines Mega Brave and Mega Symphonia.
  - MEGA Dream ex and the MEGA promos reprint Scarlet & Violet, XY and Sun & Moon trainers the catalog doesn't carry.
- **Decision:**
  - **Pairing** (`scripts/catalog/crossprint.ts`) looks only in a Japanese set's configured `counterpartSets`:
    - Pokémon pair by Pokédex numbers and first illustrator; ties pair in number order.
    - Trainers and special Energy pair by trainer type (or energy kind), illustrator and tier (numbered or secret), and only when that group is unique on both sides.
    - Curated counterparts win, also across sets: the Phantasmal Flames blister Pokémon are MEP promos internationally.
  - **Name donors:** without a counterpart, an international Scarlet & Violet or Mega Evolution card outside the catalog lends its names (and its picture) when its artwork key matches: Pokémon by Pokédex numbers, HP and artist; trainers by type and artist; Energy by artist. All donors must agree. The names must also fit the Japanese one: the species name PokéAPI derives, and an owner's Pokémon ("Erika's Oddish") only for an owner's Japanese name (エリカの…).
  - **Then**, in this order:
    1. the same Japanese name elsewhere in the catalog;
    2. a curated dictionary, `data/curated/names/japanese.yaml` (an international card to take the names from, or the names of the card's last international print);
    3. PokéAPI's species names, Mega forms included.
  - Every name that isn't official shows as *übersetzt* (`nameSource`). Each network sync lists curated and PokéAPI names next to Cardmarket's product name.
- **Consequences:**
  - Of the Asian names, 1,181 German and English come from counterparts and donors, 36 German and 26 English are curated, and 6 come from PokéAPI.
  - The 2026-09-24 sync matched every one against Cardmarket's product. It also corrected three provisional MEGA promo names: VS Seeker, Grisham and Lida.
  - Traditional Chinese names come from PTCG-database per set and number (ADR-026), without its angle-bracket markup (`<阿響的>凱羅斯` prints as 阿響的凱羅斯).
- **Alternatives:**
  - Pairing across all sets: one artist often draws a Pokémon several times, which gives false pairs.
  - Curating every name by hand: about 1,200 cards.
  - Japanese names only: German-first UI (ADR-019).

### ADR-052 · Card variants from TCGdex's detailed model; promotional prints outside Master (Accepted, Mega Evolution)
- **Context:** 30 Jahre has one variant per card (`std`). Mega Evolution cards come as normal, holo and reverse holo, with more on top:
  - reverse-holo patterns (Erhabene Helden, MEGA Dream ex);
  - Cosmos and league holos;
  - stamps (set logo, staff, Play! Pokémon, retailers);
  - jumbo cards;
  - non-holo Rares from the Build & Battle Boxes (TCGplayer's "Deck Exclusives").
- **Decision** (`scripts/catalog/variants.ts`):
  - **Ids read like the card** (DATA_MODEL.md §2):
    - the type: `normal`, `holo`, `reverse` or `lenticular`;
    - a reverse pattern (`reverse-pokeball`) or a special finish (`holo-cosmos`, `reverse-league`, `holo-gold`);
    - stamps and size appended with `+` (`holo+set-logo+staff`, `lenticular+jumbo`);
    - deck exclusives are `normal+deck`, *Nicht-Holo (Deck)*: a plain non-holo next to a plain holo in a numbered set.
  - Unknown TCGdex values stop the build until they're added. A variant TCGdex lists only for some languages exists only in those.
  - **Kinds decide Master:** `finish` and `pattern` count. `stamp` covers every promotional print (stamps, Cosmos and league holos, jumbo, deck exclusives) and doesn't count. A card that only exists in promotional variants (an MEP promo) counts with its first.
  - 30 Jahre and M6a stay `std` (`variants: 'single'`), so existing holdings keep their variant.
  - **Cardmarket per variant:**
    - Ids come from TCGdex, checked against Cardmarket's product file.
    - A plain reverse holo shares the normal card's product. The link filters for reverse holos and the price guide's `-holo` fields price it, but only when the product really is shared (`isSharedReverse`).
    - Pattern reverses and MEGA Dream ex's reverse holos are products of their own, in expansions the set config lists (`otherExpansions`).
  - Lists, lot lines and toasts name a copy's variant only when its card has several.
- **Consequences:**
  - Master counts, for example, 326 (card, variant) pairs for Mega-Entwicklung and 613 for Erhabene Helden.
  - Variant ids are permanent like card ids: a new stamp adds a variant, it never renames one.
- **Alternatives:**
  - One `std` per card: loses the reverse holos, which collectors track.
  - Counting promotional prints in Master: master sets are what booster packs hold.

### ADR-053 · Asian prints of the Mega Evolution series: Traditional Chinese mirrors, no Simplified Chinese ones, Japanese-only promos (Accepted, Mega Evolution; extends ADR-021, ADR-026)
- **Context:**
  - A mirrored edition is a language of the Japanese set (DATA_MODEL.md §2).
  - The 2026-09-24 sync checked Cardmarket's expansions against the Japanese sets' cards. Traditional Chinese keeps the Japanese lists and numbers (PTCG-database, names checked against PokéAPI).
  - Simplified Chinese and Indonesian/Thai editions cut the sets differently. "Mega Evolution ID/TH" holds half of Mega Brave and half of Mega Symphonia; "Shadow Threat" holds half of Ninja Spinner and half of Abyss Eye. Chinese sets such as CSV10C mix several.
  - Taiwan numbers its promo cards in a series of its own.
- **Decision:**
  - Mega Brave, Mega Symphonia, Inferno X, MEGA Dream ex, Nihil Zero, Ninja Spinner and Abyss Eye carry `ja` and `zh-tw`.
  - `zh-cn` stays with M6a, the only 1:1 Simplified Chinese mirror.
  - The MEGA promo cards (M-P) are Japanese only. Their Traditional Chinese names by number were other cards.
  - The Japanese Cardmarket expansions are pinned per set. The Japanese sealed products include the Traditional Chinese boosters.
  - A set lists every other print of its expansion (`otherPrints`: Mega-Entwicklung ↔ M1L and M1S). A counterpart names its set (`counterpartSets`).
  - Left out for now:
    - M6 (Storm Emerald): Japanese-only, and TCGdex's rarities look unreliable;
    - MC and MF: deck products.
- **Consequences:**
  - Simplified Chinese Mega cards other than 30th CELEBRATION can't be recorded yet. They'd be sets of their own, like TCGdex's `CSV…C` sets, and no open source lists them (R2.8).
  - TC copies are priced on the Japanese product, as before (R2.3).
- **Alternatives:**
  - Simplified Chinese as a language with Japanese numbers: the numbers would be wrong.
  - Separate Simplified Chinese sets now: no open card lists.

### ADR-054 · Marvin's older sets: international cards only, galleries as subsets, the Base Set's Unlimited print (Accepted, Your sets, R10)
- **Context:** Marvin (2026-09-24) listed 21 sets he has cards from, across four series: Scarlet & Violet, Sword & Shield, Sun & Moon and the Base Set. He asked for "only these for now", and for the recommended defaults on any question.
- **Decision** (`scripts/catalog/config.ts`):
  - **International print only (DE/EN), cards only.** No Japanese prints of these sets and no sealed products for now (R10.1, R10.2).
  - **Four series** on the Sets page, newest first: *Karmesin & Purpur*, *Schwert & Schild*, *Sonne & Mond* and *Grundset-Serie*.
  - **Galleries are subsets** of their main set, like the Classic Collection: Crown Zenith's Galarian Gallery, and Lost Origin's and Brilliant Stars' Trainer Galleries. They form the set page's *Galar-Galerie* / *Trainer-Galerie* section. Master counts them; Basis and Komplett don't.
    - Astral Radiance's Trainer Gallery stands alone until Astral Radiance comes (R10.5). Its set id and card ids stay; it then becomes a subset.
  - **Karmesin & Purpur** (SV Base) carries the first basic Energy (SVE 001–008), the way Mega-Entwicklung carries MEE 001–008.
  - **Base Set:** the Unlimited print (R10.4). TCGdex lists the print runs as variant subtypes; `printRun: 'unlimited'` keeps one. 1st Edition, Shadowless and the 1999–2000 copyright print stay out; the jumbo cards and the PokéTour stamp are promotional variants.
  - **Numbers as printed:** Sword & Shield prints three digits (`001/185`) where TCGdex's ids have none; Sun & Moon and the Base Set don't (`4/102`); galleries print `TG05/TG30` and `GG05/GG70`; promos `SWSH001` and `001`. Card ids keep TCGdex's local id (`intl:swsh4:1`), never the printed number.
  - **Promos:**
    - A promo that only came out in English (the Special Delivery cards, the Van Gogh Museum Pikachu) has `languages: [en]` and shows its English name.
    - German names TCGdex lacks come from PokéAPI when the English name is a species with an optional region or suffix (*Paldean Wooper* → *Paldea-Felino*), else from curation. Both show as *übersetzt*.
- **Consequences:**
  - The catalog grows by 3,678 cards to 6,167, in 39 sets. The search index grows to about 330 KB gzip; it still loads on first search.
  - The Classic Collection's `4/102` now also finds the Base Set's Glurak.
- **Alternatives:**
  - Japanese prints too: not asked for, and each needs pairing and names (ADR-051).
  - Sealed products: several hundred for these sets. They follow on request.
  - The Base Set with 1st Edition and Shadowless as variants: not asked for. Cardmarket sells German 1st Editions on the Unlimited product and English ones on the Shadowless product, so they need their own link rules.

### ADR-055 · Variants before Scarlet & Violet: promotional holos, print runs, extra cards (Accepted, Your sets; extends ADR-052)
- **Context:**
  - ADR-052 reads a plain non-holo next to a plain holo as a deck exclusive, since Scarlet & Violet packs carry Rares as holos. Before, packs carry Rares (and Commons) as non-holos, and a holo print of such a card came from a blister or a collection: Burning Shadows' Glumanda, Rebel Clash's Smettbo.
  - The first basic Energy of Scarlet & Violet (SVE 001–008) got Poké Ball patterns in later products.
  - The older sets bring new finishes (Rainbow Rares, Tinsel, Galaxy, Cracked Ice holos), metal cards and stamps (World Championships with placements, player names on the World Championship decks, leagues, the Professor Program, *25 Jahre*).
- **Decision** (`scripts/catalog/variants.ts`, `build.ts`):
  - In a numbered set, when a card has a plain holo and a plain non-holo:
    - packs carry the card as a holo (above Uncommon; Rares only since Scarlet & Violet, `rareIsHolo`): the non-holo is the deck print, `normal+deck`;
    - else the holo is promotional: `holo+promo`, *Holo (Promo)*.
  - Rainbow (the Sword & Shield Secret Rares) and Gold are finishes of the set. Tinsel, Galaxy and Cracked Ice holos, metal cards and lenticular cards are promotional, like Cosmos and league holos.
  - The pattern prints of an extra card (SVE with Poké Ball) are promotional in its host set.
  - A set whose cards come in several print runs needs `printRun`, else the build stops.
- **Consequences:** Master stays what booster packs hold. Variant ids stay permanent (ADR-052): `holo+promo` and the new stamps are new ids, no existing one changes.
- **Alternatives:** a per-card list of promotional holos: many cards, and the rule reads it from the rarity.

### ADR-056 · Cardmarket for international sets: the expansion from TCGdex, products by name where TCGdex has no id (Accepted, Your sets)
- **Context:**
  - TCGdex has no Cardmarket ids for Karmesin & Purpur (SV Base) and Nacht in Flammen (Burning Shadows).
  - Cardmarket's product file has no card numbers. A product's name is the English card name, with abilities and attacks in brackets for Pokémon (*Pikachu [Gnaw | Thunder Jolt]*).
- **Decision** (`scripts/catalog/cardmarket.ts`):
  - An international set's expansion is the configured one, else TCGdex's for the set, else its parent set's.
  - Cards without an id take the expansion's singles that no other card uses, by English name. Abilities and attacks tell different cards of one name apart. Several prints of one card (a full art, a Special Illustration Rare) pair in number order, and only when both sides have the same count: Cardmarket adds a set's products in card order.
  - The product goes to the card's plain variants (normal, holo and the reverse holo, which the link filters for).
  - The sync report lists unmatched cards and the expansion's singles no card points to. A curated `cardmarket` overlay (`en`, one product for DE and EN) wins.
  - Offline builds keep the ids the last network build found.
- **Consequences:** filled in by the first network sync (DATA_SOURCES.md §2.2).
- **Alternatives:**
  - Curating about 430 ids by hand.
  - Search links only: no exact product, no price-guide suggestions (PRC-09).

