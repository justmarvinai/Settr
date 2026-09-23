# Settr: Architecture

> Status: **Draft v0.2** (round-1 answers incorporated) · Last updated: 2026-09-23 · Versions verified against the npm registry on 2026-09-23.
> **Primary platform:** Windows desktop, Chrome/Edge (⟶ R2.9). **Secondary:** iPhone Safari as an installed PWA. **UI language:** German only (translation-ready).
> Decisions and their alternatives are logged in [`DECISIONS.md`](./DECISIONS.md). Data shapes → [`DATA_MODEL.md`](./DATA_MODEL.md). Data origins → [`DATA_SOURCES.md`](./DATA_SOURCES.md).

---

## 1. Principles

1. **Local-first, static-only.** The app is a static single-page application. There's no server-side code at runtime and no database server. User data lives only in the browser (IndexedDB).
2. **Two data domains.** *Catalog* (read-only, generated at build time, served as static JSON) and *user data* (IndexedDB, backed up by export) are strictly separated.
3. **Pure domain core.** Money, valuation, P/L, completion, merge and migration logic are framework-free TypeScript with exhaustive tests. UI and storage are thin shells around it.
4. **Offline by default.** After the first visit, the app, the catalog and viewed images work without a network.
5. **Progressive enhancement.** Newer browser features (View Transitions, File System Access, BarcodeDetector, Web Share with files, gyroscope) improve the experience but are never required.
6. **Boring where it matters, bold where it shows.** Proven tools hold the data. Innovation goes into UX and design.

---

## 2. System context

```
                         BUILD TIME (local or GitHub Actions)
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │ scripts/catalog  ──reads──▶ TCGdex cards-database (git, pinned commit)        │
 │                  ──reads──▶ data/curated/* (sealed products, overrides, zh)   │
 │                  ──writes─▶ public/catalog/v1/*.json (+ manifest, hashes)     │
 │ price-guide.yml (daily) ──▶ Cardmarket price_guide_6.json ──filter──▶         │
 │                              public/catalog/v1/cm-prices.json (commit if changed)│
 └──────────────────────────────────────────────────────────────────────────────┘
                                   │  git push → Vercel build (vite build)
                                   ▼
 ┌────────────────────────────── Vercel (static) ───────────────────────────────┐
 │  /index.html, /assets/* (immutable), /sw.js, /manifest.webmanifest            │
 │  /catalog/v1/*  (catalog JSON + daily cm-prices.json)                          │
 │  /img/tcgp/*  ──rewrite (proxy for non-CORS hosts, §8.3)──▶ TCGplayer CDN      │
 │  Security headers (CSP, noindex), SPA fallback rewrite                          │
 └──────────────────────────────────────────────────────────────────────────────┘
                                   │ HTTPS
                                   ▼
 ┌──────────────────────────────── Browser ─────────────────────────────────────┐
 │  React SPA ──▶ TanStack Router ──▶ feature modules                            │
 │     │  useLiveQuery                       │ TanStack Query (catalog JSON)     │
 │     ▼                                     ▼                                   │
 │  Dexie ─▶ IndexedDB "settr" (user data)   in-memory catalog + search worker   │
 │  Service worker (Workbox): app shell precache, catalog SWR, image cache       │
 │  Web Workers: search index (MiniSearch), analytics (time series)              │
 └──────────────────────────────────────────────────────────────────────────────┘
       ▲ user opens Cardmarket links in a new tab (no API integration)
```

---

## 3. Technology stack (Sept 2026)

| Concern | Choice | Version* | Why | Rejected alternatives |
|---|---|---|---|---|
| UI runtime | **React** + **React Compiler** | 19.3 · compiler 1.0 | Largest ecosystem. Automatic memoization for data-heavy grids. `<ViewTransition>` is stable | Svelte 5, Solid (smaller ecosystems for the component library we want) |
| Build | **Vite** (Rolldown + Oxc) | 8.3 · plugin-react 6.1 | Fast builds, static output ideal for Vercel. Compiler runs via `@rolldown/plugin-babel` + `reactCompilerPreset()`; switch to the Oxc compiler once it leaves experimental | **Next.js 16**: static export drops rewrites, headers and image optimization, so it adds complexity with zero benefit for a client-only app. **TanStack Start**: SSR not needed |
| Language | **TypeScript** (strict) | 7.0 (Go-native `tsc`) | Type checks about 10× faster. Tools needing the TS API are avoided until 7.1 | TS 6.x only if a critical tool needs the JS API |
| Routing | **TanStack Router** (file-based) | 1.170 | Type-safe routes. **Zod-validated URL search params** for all filters. Built-in view-transition support | React Router 7 (weaker typed search params) |
| Catalog fetching | **TanStack Query** | 5.103 | Caching and deduplication of static catalog JSON. Keyed by `catalogVersion` | Hand-rolled fetch cache |
| Local database | **Dexie** + dexie-react-hooks | 4.4 | Mature IndexedDB layer: indexes, versioned migrations, transactions and **live queries** (reactive UI) | idb (too low-level), RxDB (paid storage plugins), TinyBase (in-memory), SQLite-wasm/PGlite (heavy, and COOP/COEP would block card images), Evolu/Jazz (API churn) |
| UI primitives | **shadcn/ui** (CLI v4) on **Base UI** | CLI 4.21 · Base UI 1.8 | We own the component code and restyle it fully. Base UI is shadcn's default since July 2026, actively maintained, and includes Drawer/Toast/Combobox/NumberField | Radix (development slowed), vaul (unmaintained), MUI/Chakra (opinionated look) |
| Styling | **Tailwind CSS** v4 + CSS custom properties (OKLCH tokens) | 4.3 | Tokens-first theming, container queries, tiny CSS output | CSS-in-JS (runtime cost) |
| Motion | **Motion** (`motion/react`, LazyMotion) + CSS (`@starting-style`, View Transitions) | 13.4 | Layout/gesture animation. Initial cost about 4.6 KB with LazyMotion | GSAP (license, size) |
| Charts | **Recharts 3** via shadcn chart components | 3.10 | One library for line/area/step, donut, treemap, bars and sparklines. Themed by the same CSS variables. SVG, so accessible | *Fallback:* TradingView Lightweight Charts 5 for time series (fast, finance-grade crosshair, but requires TradingView attribution). ECharts 6 (heavy). visx (too low-level for the timeline) |
| Forms | **TanStack Form** + **Zod 4** | 1.33 · 4.6 | Strong typing. Zod schemas shared with import validation. Zod ships German error messages | react-hook-form 7 (v8 still beta) |
| i18n | **Paraglide JS 2** (inlang) | 2.25 | Compile-time, typed, tree-shakable messages. **German only in v1** (Q3.1), but every string lives in the catalog, so adding English later needs no refactor | i18next (runtime and bundle size), Lingui 6 (needs Babel macros), react-intl (high churn) |
| Dates | **date-fns 4** + `Intl` | 4.4 | Temporal isn't Baseline yet (no Safari). Revisit later | Temporal polyfill (size) |
| Search | **MiniSearch** in a Web Worker | 7.2 | Prefix + fuzzy search, serializable index, custom tokenizer for CJK bigrams | FlexSearch (switch if the index exceeds tens of thousands of docs), Orama (heavier), Fuse.js (no index; fine for palette-only) |
| UI state | **Zustand** (only for small ephemeral state) | 5.0 | Tiny. Filters live in the URL and data in Dexie | Jotai 3, Redux |
| Toasts / command palette | **sonner** · **cmdk** *or* Base UI Autocomplete | 2.0 · 1.1 | cmdk is stable but dormant, so we prefer the Base UI Autocomplete-based palette and keep cmdk only if it's clearly better in prototyping | — |
| Tables / virtualization | **TanStack Table 9** + **TanStack Virtual 3** | 9.2 · 3.14 | Headless, tree-shakable, virtualized grids and tables | AG Grid (heavy) |
| PWA | **vite-plugin-pwa** (Workbox) | 1.3 · Workbox 7.4 | Precache, runtime caching, update prompt, manifest | Serwist (v10 still preview) |
| File I/O | **browser-fs-access**, Web Share, `CompressionStream` | 0.38 | Save/open pickers with fallbacks | — |
| Share images | **modern-screenshot** | 4.7 | Active. Needs CORS-clean images (see §8.3) | html-to-image (stale) |
| IDs | **UUIDv7** (`uuidv7` package or a 30-line in-house implementation) | — | Time-sortable, merge-safe | nanoid (not sortable), UUIDv4 |
| Lint / format | **Oxlint** (+ `oxlint-tsgolint` type-aware) + **oxfmt** | 1.85 · 0.70 | Works with TS 7 (typescript-eslint doesn't). Very fast. React Compiler lint rules. *Fallback:* Biome 2.5 if oxfmt's beta causes friction | ESLint 10 + typescript-eslint (stuck below TS 6.1), Prettier |
| Unit/component tests | **Vitest 5** (+ Browser Mode) + Testing Library + fake-indexeddb + fast-check | 5.0 | Same config as Vite, real-browser component tests | Jest |
| E2E | **Playwright** | 1.63 | Chromium, Firefox and WebKit, visual snapshots | Cypress |
| Package manager / runtime | **pnpm** (pinned via `packageManager`) · **Node 24 LTS** | 11.x or 12.x | Fast and strict. Pin 11.x if Vercel's pnpm 12 support is unconfirmed at M1 | npm, bun |
| Hosting | **Vercel** (static), GitHub integration (already connected), preview deployments | Hobby plan | Required by the brief. **Hobby = non-commercial only**, which fits: no monetization (Q8.2) | Cloudflare Pages / Netlify (backup options) |

\* Versions as of 2026-09-23. Exact versions are pinned at scaffold time (M1).

---

## 4. Application architecture

### 4.1 Layers and dependency rules

```
 routes/ ──▶ features/* ──▶ components/domain ──▶ components/ui
                 │                  │
                 ▼                  ▼
               db/  ◀───────── domain/  ◀── (pure TS, no React/Dexie/DOM)
                 │
                 ▼
             IndexedDB                       catalog/ (loader, indexes, search worker client)
```

- `domain/` imports nothing from React, Dexie, the DOM or other app layers. It's pure and fully unit-tested.
- `db/` is the **only** code that touches Dexie/IndexedDB. It exposes repositories and live-query hooks.
- `catalog/` is the **only** code that fetches catalog JSON or builds image URLs.
- `features/<name>/` exposes a public `index.ts`. Features never import another feature's internals.
- `components/ui/` (design-system primitives) has no domain knowledge.
- These rules are enforced with Oxlint import restrictions (`no-restricted-imports` patterns) and reviewed in PRs.

### 4.2 Folder structure (planned)

```
settr/
├─ public/
│  ├─ catalog/v1/…              # generated catalog JSON (committed)
│  ├─ fonts/ icons/ og/         # self-hosted fonts, PWA icons
├─ data/
│  └─ curated/                  # hand-maintained: sealed products, overrides, zh supplement, id aliases
├─ scripts/
│  └─ catalog/                  # catalog pipeline (Node 24, TypeScript via tsx)
├─ src/
│  ├─ app/                      # providers, router creation, error boundaries, app shell
│  ├─ routes/                   # TanStack Router file routes (thin: compose features)
│  ├─ features/
│  │  ├─ catalog/               # sets, set detail, card detail, sealed catalog, search UI
│  │  ├─ collection/            # holdings CRUD, views, filters, completion, quick-add
│  │  ├─ prices/                # price entry, history, charts, price session
│  │  ├─ portfolio/             # dashboard, analytics
│  │  ├─ wishlist/
│  │  ├─ data/                  # import/export/CSV/backups/storage
│  │  ├─ settings/
│  │  └─ onboarding/
│  ├─ components/
│  │  ├─ ui/                    # restyled shadcn/Base UI primitives
│  │  └─ domain/                # CardImage, CardTile, HoloCard, PLDelta, PriceChart …
│  ├─ domain/                   # money, allocation, valuation, pl, timeseries, completion, merge, schemas (Zod)
│  ├─ db/                       # Dexie schema, migrations, repositories, hooks
│  ├─ catalog/                  # catalog loader, image URL builder, search client
│  ├─ workers/                  # search.worker.ts, analytics.worker.ts (Comlink)
│  ├─ i18n/                     # Paraglide project (messages/de.json, en.json), format helpers
│  ├─ lib/                      # small generic utilities
│  └─ styles/                   # tokens.css, globals.css
├─ tests/
│  ├─ e2e/                      # Playwright specs
│  ├─ fixtures/                 # catalog + backup fixtures (per schema version)
│  └─ factories.ts
├─ docs/                        # this planning suite
└─ vercel.json, vite.config.ts, tsconfig.json, oxlintrc.json, package.json …
```

---

## 5. State management

| State | Where | How |
|---|---|---|
| **User data** (holdings, prices, …) | IndexedDB via Dexie | Repositories for writes, `useLiveQuery` for reactive reads. Writes are fast and local, so no optimistic-update machinery is needed |
| **Catalog** | Static JSON → memory | TanStack Query with `staleTime: Infinity`, key `[catalogVersion, file]`. Per-set files load lazily. Derived indexes (by id, by set) are memoized |
| **Filters, sort, view, tabs** | URL search params | TanStack Router + Zod `validateSearch`, so views are shareable, bookmarkable and restorable |
| **Settings** | Dexie `kv.settings` | Read via a `useSettings()` live query with Zod defaults merged in |
| **Ephemeral UI** (privacy mode, palette open, sheet stack) | Zustand (tiny stores) or component state | Privacy mode is also persisted per device (`kv ui:*`) |
| **Derived analytics** | Memoized selectors / worker | Keyed by a `dataVersion` counter that's bumped on every write transaction |

---

## 6. Key data flows

**Add a holding**
1. The sheet (TanStack Form + Zod) validates the input.
2. `holdingsRepo.create()` runs a Dexie `rw` transaction that writes the holding, bumps `dataVersion` and records an undo entry in memory.
3. Live queries on the set grid, collection and dashboard re-render automatically.
4. A toast offers *Rückgängig*, which calls `holdingsRepo.delete()` plus a tombstone cleanup.

**Record a price**
1. `pricesRepo.add()` runs in a transaction that writes the `prices` row and upserts `priceLatest` (if the entry is the newest in its series).
2. The item chart (live query on `[seriesKey+date]`) and the dashboard valuation update.

**Valuation and dashboard**
1. The live query gathers open holdings plus `priceLatest`, and `domain/valuation` computes totals synchronously (O(n)).
2. The time-series chart posts `{holdings, prices}` to the analytics worker, which runs the event sweep (`DATA_MODEL.md` §6.5) and returns the series. Results are cached by `dataVersion` and range.

**Import**
1. See `IMPORT_EXPORT.md` §4. Parsing and validation run in a worker. The write is one transaction, followed by a derived-table rebuild.

---

## 7. Search architecture

- **Worker-hosted MiniSearch** index built from the loaded catalog (plus custom items and, optionally, collection notes) on first use. It's rebuilt when `catalogVersion` changes and cached in memory.
- **Normalization pipeline** (applied to documents and queries):
  - Unicode NFKC (full-width → ASCII), lowercasing, diacritics folding (`é→e`; umlauts are indexed both as `ü` and `ue`).
  - Katakana → hiragana folding.
  - Stripping `-ex`/`ex` separators so "Pikachu-ex" = "pikachu ex".
- **Tokenizer:** Latin text uses word tokens with prefix search and fuzzy matching (edit distance 1 from 4 chars). CJK text uses **character bigrams** (plus unigrams for 1-char queries), which work consistently across browsers.
- **Fields and boosts:** name (all languages) ×3, number ×3 (exact `025`, `25`, `025/128`), set name/code ×2, illustrator ×1, rarity ×1.
- **Query syntax (power users):** `set:30c`, `lang:ja`, `rarity:sar`, `#025`, and `owned:yes|no` (applied as filters after the text search).
- Optional pinyin search for Chinese names (`pinyin-pro`) is deferred to post-v1.

---

## 8. Offline, caching and storage

### 8.1 Service worker (Workbox via vite-plugin-pwa)

| Resource | Strategy | Notes |
|---|---|---|
| App shell (`index.html`, JS/CSS chunks, fonts, icons) | **Precache** (revisioned) | `index.html` and `sw.js` are served with `no-cache` so updates are detected |
| `/catalog/v1/manifest.json` | **NetworkFirst** (timeout 3 s) → cache | Detects new catalog versions quickly |
| `/catalog/v1/cm-prices.json` | **StaleWhileRevalidate** | Daily price-guide snapshot (PRC-09). The UI shows its date and hides suggestions older than 3 days |
| `/catalog/v1/sets/*`, `sealed.json` | **CacheFirst** keyed by content hash (from the manifest) | Immutable once hashed |
| Card/product images | **CacheFirst**, max ~3 000 entries, 180-day expiry, **CORS-mode only** (see §8.3) | "Set offline verfügbar machen" pre-caches a whole set (CAT-09) |

Updates show a non-blocking toast ("Neue Version verfügbar · Neu laden"). It never auto-reloads while a sheet is open.

### 8.2 Storage durability

| Risk | Mitigation |
|---|---|
| Eviction under storage pressure (all browsers, least-recently-used first) | `navigator.storage.persist()` after onboarding and the first holding. Chrome grants silently based on engagement, Firefox **prompts**, Safari uses heuristics |
| **Safari/iOS deletes all script-writable storage after 7 days of Safari use without interaction with the site** | Onboarding strongly recommends **"Zum Home-Bildschirm"** (installed web apps keep their own counter and are effectively exempt). Backup reminders are mandatory UX, and the dashboard shows a warning banner on iOS Safari when the app isn't installed |
| Quotas (Chromium ≤ 60 % of disk per origin, Firefox ≤ 10 % / 10 GiB (50 % when persistent), Safari ≈ 60 %) | Not a practical concern for user data (MBs). Photos are downscaled. `storage.estimate()` is shown in Einstellungen › Daten |
| Browser data cleared by the user | Only backups help, hence the backup pill, reminders and the optional auto-backup folder (Chromium) |

### 8.3 Images: the cross-origin question (decision in M1)

Chrome counts every **opaque** (non-CORS) cross-origin response stored by a service worker as **~7 MB** of quota. Caching a few hundred card images that way would exhaust storage. Canvas-based features (share images, color sampling) also require CORS-clean images. There are two options:

| Option | How | Pros | Cons |
|---|---|---|---|
| **A · Direct + CORS** | `<img crossorigin="anonymous" src="https://assets.tcgdex.net/…">`, SW caches in `cors` mode | Zero Vercel bandwidth. Simplest. TCGdex sends `Access-Control-Allow-Origin: *` on 200 responses (third-party measurement; re-verify in M1) | The visitor's IP goes to a third party (privacy notice needed). 404s carry no CORS header, so image errors must be handled gracefully |
| **B · Same-origin proxy** | `vercel.json` rewrite `/img/:path*` → `https://assets.tcgdex.net/:path*` | Always CORS-clean. No third-party request from the browser (GDPR-friendly). CSP stays `img-src 'self'`. The image source can be swapped transparently | Uses Vercel bandwidth (Hobby: 100 GB/month, ample for personal use). Caching of external rewrites must be verified |

**Rule:**
- **Default: A for TCGdex.** It already sends CORS headers. Confirm in M1.
- **B** for image hosts **without** CORS headers. In v1 that means TCGplayer product images for EN/JP sealed products, via `/img/tcgp/*`. Official publisher images aren't used (Q4.6).
- **Decision (Q8.4): TCGdex images load directly (A).** The privacy note names `assets.tcgdex.net`.
- All image URLs are built in one place (`catalog/images.ts`), so switching is a one-line change.

---

## 9. Catalog pipeline (summary)

Details are in `DATA_SOURCES.md` §6.

1. **Ingest** TCGdex sets from a **pinned commit of the open-source `tcgdex/cards-database` repo**, which is reachable in restricted build environments and reproducible, and/or its REST/GraphQL API.
2. **Normalize** into Settr's schema (`DATA_MODEL.md` §4): IDs, sections, variants (`std` override for all-foil sets), printed numbers, per-variant Cardmarket IDs, languages and image base URLs.
3. **Overlay** curated data (`data/curated/`): sealed products, Chinese supplements, name fixes, promos and id aliases.
4. **Verify**: Zod validation, count checks against official counts, and image HEAD checks (sampled, network-permitting).
5. **Emit** `public/catalog/v1/…` with a manifest and content hashes, and commit it. CI (`catalog-sync.yml`) repeats this weekly and opens a PR with a readable diff.

---

## 10. Routing and code splitting

- File-based routes (`src/routes`) with **lazy route components**. Heavy modules load on demand as separate chunks:
  - charts (Recharts)
  - holo viewer
  - import/export and CSV
  - quick-add and price session
  - search worker
- `defaultPreload: 'intent'` preloads route code on hover/focus.
- `defaultViewTransition` is enabled with transition types for grid → detail morphs (respecting reduced motion).

---

## 11. Deployment (Vercel)

- **Build:** `pnpm build` → `dist/`. Vercel's framework preset is "Vite", with the output directory `dist`.
- **`vercel.json` (draft):**
  ```jsonc
  {
    "rewrites": [
      { "source": "/img/tcgp/:path*", "destination": "https://tcgplayer-cdn.tcgplayer.com/:path*" },  // sealed EN/JP images (§8.3 → B)
      { "source": "/((?!assets/|catalog/|img/|fonts/|icons/|sw\\.js|manifest\\.webmanifest).*)", "destination": "/index.html" }
    ],
    "headers": [
      { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
      { "source": "/catalog/v1/sets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=3600, stale-while-revalidate=86400" }] },
      { "source": "/(sw\\.js|index\\.html)", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
      { "source": "/(.*)", "headers": [
          { "key": "X-Robots-Tag", "value": "noindex, nofollow" },           // private deployment (Q1.2)
          /* CSP & security headers, see QUALITY.md §6 */ ] }
    ]
  }
  ```
- **Environments:** every PR gets a **preview deployment**, and `main` goes to **production**. There are no secrets and no environment variables at runtime.
- **Plan constraint:** Vercel **Hobby is for non-commercial use only** (no ads, no paid features; donations are allowed). Settr stays non-commercial (Q8.2).
- **Domain:** no custom domain for now (Q1.4). It lives at `settr.vercel.app`, or the closest free `*.vercel.app` name.
- **Private deployment (Q1.2):** `<meta name="robots" content="noindex, nofollow">`, the `X-Robots-Tag` header above, and a `robots.txt` with `Disallow: /`. The URL is shared only with friends.
- **Daily price-guide deploys:** the `price-guide.yml` job commits `cm-prices.json` only when it changed, so at most one production deploy per day (well within Hobby limits).

---

## 12. Browser capabilities and fallbacks

| Capability | Used for | Support (Sept 2026) | Fallback |
|---|---|---|---|
| IndexedDB | All user data | Universal | — (required) |
| Service worker + Cache API | Offline | Universal | Online-only |
| `navigator.storage.persist()` | Durability | Chrome (silent), Firefox (prompt), Safari (heuristic) | Backups + reminders |
| Same-document View Transitions | Grid → detail morph | Baseline (since Oct 2025) | Cross-fade |
| File System Access pickers | Save/open backups, auto-backup folder | Chromium only (desktop, Android 132+) | Download link / `<input type=file>` (via browser-fs-access) |
| Web Share (files) | Share backups/images on mobile | Chrome/Android, Safari/iOS; not Firefox | Download. Note that `.json` isn't in the commonly shareable types, so check `canShare()` first |
| BarcodeDetector | EAN scan (I-10) | Chrome Android, macOS only | `barcode-detector` WASM ponyfill |
| DeviceOrientation | Holo tilt on phones | iOS needs a permission tap | Pointer/touch drag |
| `Intl.Segmenter` | (optional) CJK tokenization | Baseline | Bigram tokenizer (default) |
| `CompressionStream` | gzip backups (future) | Baseline | Uncompressed JSON |
| Temporal | — | Not Baseline (no Safari) | date-fns |
| `backdrop-filter` (Liquid Glass) | Glass chrome | Baseline | Solid surfaces |
| `prefers-reduced-transparency` | Honor the OS transparency setting | Chromium only | In-app toggle *Transparenz reduzieren* (all browsers) |

---

## 13. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Simplified Chinese data missing** from TCGdex | Chinese names/images incomplete at launch | SC copies trackable on the M6a list from day one. Names derived from PokéAPI + curated Trainer names. Full data after permission (⟶ R2.8) |
| **Card images missing** for some languages (a brand-new set, released 16 Sep 2026) | Placeholders instead of art | Verify via HEAD in the pipeline. Fall back to another language of the same print, then the card-back placeholder. Re-sync weekly |
| TCGdex upstream changes or outages | Build-time only (runtime uses our static copy) | Pinned commit, schema validation, id-alias map |
| Browser storage eviction | Data loss | Persistence request, PWA install, backups, reminders, auto-backup (Chromium) |
| Vercel Hobby non-commercial rule | Hosting must change if monetized | Static output is portable (Cloudflare Pages / Netlify) |
| TS 7 ecosystem gaps (tools needing the TS JS API) | Tooling friction | Oxlint/tsgolint are TS 7-native. Fall back to TS 6.0 for a specific tool only if unavoidable |
| oxfmt still beta | Formatting churn | Biome 2.5 as a drop-in fallback |
| Dependency churn (fast-moving 2026 ecosystem) | Maintenance | Pinned versions, grouped weekly Renovate PRs, CI gates |
| GPL contamination (holo CSS) | License conflict | Clean-room implementation (`DESIGN_SYSTEM.md` §7) |
| **Glass performance** (many `backdrop-filter` layers over image grids) | Jank on weaker GPUs / Windows laptops | ≤ 3 simultaneous blurred layers. No blur on elements that animate size. Automatic solid fallback when *Transparenz reduzieren* is on. Profiled on Windows in M1/M6 |
| Price-guide scope confusion (global vs "German sellers") | Misleading suggestions | Explicit labels, never auto-saved, `origin: 'guide'` in history |
