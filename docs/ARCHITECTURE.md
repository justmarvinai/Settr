# Settr: Architecture

> Status: **Draft v0.3** (round-2 answers incorporated) · Last updated: 2026-09-23 · Versions verified against the npm registry on 2026-09-23.
> **Primary platform:** Windows desktop, **Brave** (Chromium; R2.9, ADR-027). **Secondary:** iPhone as an installed PWA (Safari/WebKit). **UI language:** German only (translation-ready).
> Decisions and their alternatives are logged in [`DECISIONS.md`](./DECISIONS.md). Data shapes → [`DATA_MODEL.md`](./DATA_MODEL.md). Data origins → [`DATA_SOURCES.md`](./DATA_SOURCES.md).

---

## 1. Principles

1. **Local-first, static-only.** The app is a static single-page application. There's no server-side code at runtime and no database server. User data lives only in the browser (IndexedDB).
2. **Two data domains.** *Catalog* (read-only, generated at build time, served as static JSON) and *user data* (IndexedDB, backed up by export) are strictly separated.
3. **Pure domain core.** Money, valuation, P/L, completion, merge and migration logic are framework-free TypeScript with exhaustive tests. UI and storage are thin shells around it.
4. **Offline by default.** After the first visit, the app, the catalog and viewed images work without a network.
5. **Progressive enhancement.** Newer browser features (View Transitions, File System Access, BarcodeDetector, Web Share with files, gyroscope) improve the experience but are never required. Brave, the primary browser, disables File System Access by default (ADR-027), so nothing in v1 depends on it.
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
 │   → cm-prices.json · private repo: commit if changed                          │
 │                    · public repo: never committed; deploy hook, then the      │
 │                      build fetches + filters it (ADR-029, R3.2)               │
 └──────────────────────────────────────────────────────────────────────────────┘
                                   │  git push or deploy hook → Vercel build (vite build)
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
 │  Web Worker: search index (MiniSearch); time series on the main thread (ADR-039) │
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
| UI primitives | shadcn-style primitives on **Base UI**, written by hand (ADR-031: the shadcn CLI needs the TS JS API that TS 7 dropped) | Base UI 1.8 | We own the component code and restyle it fully. Base UI is shadcn's default since July 2026, actively maintained, and includes Drawer/Toast/Combobox/NumberField | Radix (development slowed), vaul (unmaintained), MUI/Chakra (opinionated look) |
| Styling | **Tailwind CSS** v4 + CSS custom properties (OKLCH tokens) | 4.3 | Tokens-first theming, container queries, tiny CSS output | CSS-in-JS (runtime cost) |
| Motion | **Motion** (`motion/react`, LazyMotion) + CSS (`@starting-style`, View Transitions) | 13.4 | Layout/gesture animation. Initial cost about 4.6 KB with LazyMotion | GSAP (license, size) |
| Charts | **Hand-written SVG** in `components/domain/charts` (ADR-038; Recharts 3 dropped, ADR-010 superseded) | — | A time chart (line or step, markers, baseline, comparison lines, scrubbing with pointer and keys) and a donut: a few KB, themed by the tokens, SVG with a table view | Recharts 3 (116 KB gzip for the parts we need), TradingView Lightweight Charts 5 (canvas, attribution), visx (low-level) |
| Forms | **TanStack Form** + **Zod 4** | 1.33 · 4.6 | Strong typing. Zod schemas shared with import validation. Zod ships German error messages | react-hook-form 7 (v8 still beta) |
| i18n | **Paraglide JS 2** (inlang) | 2.25 | Compile-time, typed, tree-shakable messages. **German only in v1** (Q3.1), but every string lives in the catalog, so adding English later needs no refactor | i18next (runtime and bundle size), Lingui 6 (needs Babel macros), react-intl (high churn) |
| Dates | **date-fns 4** + `Intl` | 4.4 | Temporal isn't Baseline yet (no Safari). Revisit later | Temporal polyfill (size) |
| Search | **MiniSearch** in a Web Worker | 7.2 | Prefix + fuzzy search, serializable index, custom tokenizer for CJK bigrams | FlexSearch (switch if the index exceeds tens of thousands of docs), Orama (heavier), Fuse.js (no index; fine for palette-only) |
| UI state | **Zustand** (only for small ephemeral state) | 5.0 | Tiny. Filters live in the URL and data in Dexie | Jotai 3, Redux |
| Toasts / command palette | **Base UI** Toast · Autocomplete (as built, M1/M2) | 1.8 | One primitive library; the palette is Base UI's inline Autocomplete | sonner, cmdk (stable but dormant) |
| Lists / virtualization | **TanStack Virtual 3** (window virtualizer); **no table library** (ADR-036) | 3.14 | The grid and the table share one pure filter → sort → group pipeline (`domain/collection/view.ts`); columns are plain config | TanStack Table 9 (a second pipeline beside the grid's), AG Grid (heavy) |
| PWA | **vite-plugin-pwa** (Workbox) | 1.3 · Workbox 7.4 | Precache, runtime caching, update prompt, manifest | Serwist (v10 still preview) |
| File I/O | **browser-fs-access**, Web Share, `CompressionStream` | 0.38 | Save/open pickers with fallbacks. In Brave, where the pickers are off by default, it falls back to downloads and `<input type=file>` (ADR-027, §8.2) | — |
| Share images | **modern-screenshot** | 4.7 | Active. Needs CORS-clean images (see §8.3) | html-to-image (stale) |
| IDs | **UUIDv7** (`uuidv7` package or a 30-line in-house implementation) | — | Time-sortable, merge-safe | nanoid (not sortable), UUIDv4 |
| Lint / format | **Oxlint** (+ `oxlint-tsgolint` type-aware) + **oxfmt** | 1.85 · 0.70 | Works with TS 7 (typescript-eslint doesn't). Very fast. React Compiler lint rules. *Fallback:* Biome 2.5 if oxfmt's beta causes friction | ESLint 10 + typescript-eslint (stuck below TS 6.1), Prettier |
| Unit/component tests | **Vitest 5** (+ Browser Mode with the Playwright provider and `vitest-browser-react`) + fake-indexeddb + fast-check | 5.0 | Same config as Vite, real-browser component tests | Jest |
| E2E | **Playwright** | 1.63 | Chromium, Firefox and WebKit, visual snapshots | Cypress |
| Package manager / runtime | **pnpm** (pinned via `packageManager`) · **Node 24 LTS** (CI, Vercel; `engines` ≥ 22.12) | 10.33 | Fast and strict. M1 pins 10.33 (lockfile v9, installs on Vercel without extra setup); moving to 11/12 is a separate, verified change | npm, bun |
| Hosting | **Vercel** (static), GitHub integration (already connected), preview deployments | Hobby plan | Required by the brief. **Hobby = non-commercial only**, which fits: no monetization (Q8.2). Hobby also deploys from a private repository (ADR-029) | Cloudflare Pages / Netlify (backup options) |

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

### 4.2 Folder structure (as built through M3, plus planned folders)

```
settr/
├─ public/
│  ├─ catalog/v1/…              # generated catalog JSON (committed; cm-prices.json only while the repo is private, ADR-029)
│  ├─ fonts/ icons/ og/         # self-hosted fonts, PWA icons
├─ data/
│  └─ curated/                  # hand-maintained: sealed products, overrides, zh supplement, id aliases
├─ scripts/
│  ├─ catalog/                  # catalog pipeline (Node 24, TypeScript via tsx)
│  ├─ csp-hash.mjs              # CSP hash of the inline pre-paint script (ADR-032)
│  └─ icons.mjs                 # renders the PWA icons
├─ src/
│  ├─ app/                      # providers, router creation, error boundaries, app shell
│  ├─ routes/                   # TanStack Router file routes (thin: compose features)
│  ├─ features/
│  │  ├─ catalog/               # sets, set detail, card detail, sealed catalog, search UI
│  │  ├─ collection/            # what catalog pages share: ownership + completion, holdings panel, lot menu, item info, Lagerorte
│  │  ├─ entry/                 # add/edit, Schnellerfassung, sell, open + pulls, custom items (TanStack Form; loaded by the sheet host, ADR-037)
│  │  ├─ library/               # Sammlung › Karten / Sealed: filters, grid, table, bulk actions (TanStack Virtual; loaded by those routes, ADR-037)
│  │  ├─ prices/                # price panel + chart + entries, Preise hub, price session, price-guide chips (series choice, save, Cardmarket link)
│  │  ├─ portfolio/             # Portfolio: filters, allocation, performance, realized P/L
│  │  ├─ wishlist/
│  │  ├─ data/                  # import/export/CSV/backups/storage, install section
│  │  ├─ settings/              # settings layout and sections
│  │  ├─ appearance/            # theme, transparency, motion (loaded at startup, ADR-030)
│  │  ├─ pwa/                   # install prompt, update toast (loaded at startup)
│  │  ├─ overview/              # Übersicht: welcome or the dashboard (hero chart, tiles)
│  │  └─ onboarding/
│  ├─ components/
│  │  ├─ ui/                    # hand-written shadcn-style primitives on Base UI, one module each (ADR-031); glyphs.tsx = the shell's single-weight icons (ADR-037)
│  │  └─ domain/                # CardImage, CardTile, PLDelta, charts/ (scale.ts, TimeChart, Donut, RangeChips) …
│  ├─ domain/                   # money, allocation, valuation, pl, timeseries, completion, merge, schemas (Zod)
│  ├─ db/                       # Dexie schema, migrations, repositories, live-query hooks, backup export; core.ts = what the shell needs at startup (ADR-037)
│  ├─ catalog/                  # catalog loader, image URL builder, search client
│  ├─ workers/                  # search.worker.ts
│  ├─ i18n/                     # Paraglide project (messages/de.json, en.json), format helpers
│  ├─ lib/                      # small generic utilities (sheets.ts: the sheet request store, useElementBox for virtualizers)
│  └─ styles/                   # tokens.css, globals.css
├─ tests/
│  ├─ e2e/                      # Playwright specs (+ axe, console/CSP guard in fixtures.ts)
│  ├─ fixtures/                 # catalog + backup fixtures (per schema version)
│  └─ factories.ts
├─ docs/                        # this planning suite
└─ vercel.json, vite.config.ts, tsconfig.json, .oxlintrc.json, .size-limit.mjs, lefthook.yml, playwright.config.ts, package.json …
```

---

## 5. State management

| State | Where | How |
|---|---|---|
| **User data** (holdings, prices, …) | IndexedDB via Dexie | Repositories for writes, `useLiveQuery` for reactive reads. Writes are fast and local, so no optimistic-update machinery is needed |
| **Catalog** | Static JSON → memory | TanStack Query with `staleTime: Infinity`, key `[catalogVersion, file]`. The manifest (every set, grouped by series) loads at startup. Per-set chunks load lazily, only for the sets being shown (§9.1). Derived indexes (by id, by set) are memoized |
| **Filters, sort, view, tabs** | URL search params | TanStack Router + Zod `validateSearch`, so views are shareable, bookmarkable and restorable |
| **Settings** | Dexie `kv.settings` | Read via a `useSettings()` live query with Zod defaults merged in |
| **Ephemeral UI** (privacy mode, palette open, sheet stack, install prompt) | Zustand (tiny stores) or component state | Privacy mode is persisted per device in `localStorage`, and display settings are mirrored there, so an inline script applies both before first paint (ADR-032) |
| **Derived analytics** | Memoized selectors / worker | Keyed by a `dataVersion` counter that's bumped on every write transaction |

---

## 6. Key data flows

**Add a holding**
1. A page asks for a sheet through `lib/sheets.ts` (`openSheet({ type: 'add', item })`); the shell mounts the lazy sheet host, which loads `features/entry`.
2. The sheet (TanStack Form + Zod) validates the input.
3. `createHolding()` runs a Dexie `rw` transaction that writes the holding and bumps `dataVersion`.
4. Live queries on the set grid, the card page, Sammlung and (M4) the dashboard re-render automatically.
5. A toast offers *Rückgängig* for 8 s, backed by the inverse repository call (`deleteHolding`, `restoreHoldings`, …). Bulk actions return the lots as they were, so one call undoes them all.

**Record a price**
1. `pricesRepo.add()` runs in a transaction that writes the `prices` row and upserts `priceLatest` (if the entry is the newest in its series).
2. The item chart (live query on `[seriesKey+date]`) and the dashboard valuation update.

**Valuation and dashboard**
1. The live query gathers open holdings plus `priceLatest`, and `domain/valuation` computes totals synchronously (O(n)).
2. The time-series chart runs the event sweep (`DATA_MODEL.md` §6.5) over the lots and all price entries in its render; the React Compiler memoizes it on its inputs, so scrubbing doesn't recompute it (ADR-039: a worker once collections reach the thousands).

**Import**
1. See `IMPORT_EXPORT.md` §4. Parsing and validation run in a worker. The write is one transaction, followed by a derived-table rebuild.

---

## 7. Search architecture

- **Worker-hosted MiniSearch** index built on first use from the **slim global search index** (`/catalog/v1/search-index.json`: one small document per card and product across **all** sets, ADR-028), plus custom items and, optionally, collection notes. Global search therefore never loads every set chunk. It's rebuilt when `catalogVersion` changes and cached in memory.
- **Normalization pipeline** (applied to documents and queries):
  - Unicode NFKC (full-width → ASCII), lowercasing, diacritics folding (`é→e`; umlauts are indexed both as `ü` and `ue`).
  - Katakana → hiragana folding.
  - Stripping `-ex`/`ex` separators so "Pikachu-ex" = "pikachu ex".
- **Tokenizer:** Latin text uses word tokens with prefix search and fuzzy matching (edit distance 1 from 4 chars). CJK text uses **character bigrams** (plus unigrams for 1-char queries), which work consistently across browsers.
- **Fields and boosts:** name (all languages) ×3, number ×3 (exact `025`, `25`, `025/128`), set name/code ×2, illustrator ×1, rarity ×1.
- **Query syntax (power users):** `set:30c`, `lang:ja`, `rarity:sar`, `#025`, and `owned:yes|no` (applied as filters after the text search).
- Optional pinyin search for Chinese names (`pinyin-pro`) is deferred to post-v1.
- **As built (M2, ADR-035):** `src/catalog/search` (engine, query parser, normalization, worker client) and `src/workers/search.worker.ts`. The worker builds the index once per catalog version from MiniSearch's serialized form; names sit in a Latin and a CJK field, CJK runs index bigrams plus each run's last character, and a query term that equals a card number ranks first. `useCatalogSearch` (TanStack Query) serves the palette and Katalog › Karten. `owned:ja|nein` is applied after the search against the ids of items with copies left (`useOwnedItemIds`, M3); the catalog layer itself never reads user data.

---

## 8. Offline, caching and storage

### 8.1 Service worker (Workbox via vite-plugin-pwa)

| Resource | Strategy | Notes |
|---|---|---|
| App shell (`index.html`, JS/CSS chunks, fonts, icons) | **Precache** (revisioned) | `index.html` and `sw.js` are served with `no-cache` so updates are detected |
| `/catalog/v1/manifest.json` | **NetworkFirst** (timeout 3 s) → cache | Detects new catalog versions quickly |
| `/catalog/v1/cm-prices.json` | **StaleWhileRevalidate** | Daily price-guide snapshot (PRC-09). The UI shows its date and hides suggestions older than 3 days |
| `/catalog/v1/sets/*`, `sealed.json`, `search-index.json` | **CacheFirst** keyed by content hash (from the manifest) | Immutable once hashed |
| Card/product images | **CacheFirst**, max ~3 000 entries, 180-day expiry, **CORS-mode only** (see §8.3) | "Set offline verfügbar machen" pre-caches a whole set (CAT-09) |

Updates show a non-blocking toast ("Neue Version verfügbar · Neu laden"). It never auto-reloads while a sheet is open.

### 8.2 Storage durability

| Risk | Mitigation |
|---|---|
| Eviction under storage pressure (all browsers, least-recently-used first) | `navigator.storage.persist()` after onboarding and the first holding, and again after the app is installed (ADR-027). Chromium browsers, Brave included, grant silently (no prompt) if the site is installed as an app or among the user's most-used/bookmarked sites, and only if its cookies aren't blocked or cleared on exit; otherwise `persist()` returns false and is retried later. Firefox **prompts**, Safari uses heuristics |
| **Safari/iOS deletes all script-writable storage after 7 days of Safari use without interaction with the site** | Onboarding strongly recommends **"Zum Home-Bildschirm"** (installed web apps keep their own counter and are effectively exempt). Backup reminders are mandatory UX, and the dashboard shows a warning banner on iOS Safari when the app isn't installed |
| **Brave's delete-on-exit settings** (all off by default): Shields *"Forget me when I close this site"* (per site, or globally in `brave://settings/shields`) wipes all site data ~30 s after the last tab closes, even for installed apps. The *"Delete data on exit"* tab in *Clear browsing data* and a per-site *"clear cookies on exit"* exception erase it too; the exception also makes storage temporary and blocks `persist()` | Onboarding and *Einstellungen › Daten* warn that these settings erase the collection (ADR-027; whether Marvin uses one R3.4). Backups and reminders are the safety net |
| Quotas (Chromium ≤ 60 % of disk per origin, Firefox ≤ 10 % / 10 GiB (50 % when persistent), Safari ≈ 60 %) | Not a practical concern for user data (MBs). Photos are downscaled. `storage.estimate()` usage is shown in Einstellungen › Daten. **Brave always reports `quota` = 2 GiB** (anti-fingerprinting; `usage` is real and the real limit is unchanged), so Settr never relies on the reported quota |
| Browser data cleared by the user | Only backups help, hence the backup pill, reminders and the optional auto-backup folder (post-v1, DAT-06; Chromium with File System Access, in Brave only after enabling `brave://flags/#file-system-access-api`) |

**Backups are downloads (ADR-027).** A backup is a page-initiated download (`<a download>` with a Blob URL). Brave's *"Ask where to save each file"* is on by default, so every backup opens a Save-As dialog and Marvin can keep his backups in one folder. The File System Access pickers (save/open, remembered folders) are only an optional extra: Settr uses them when feature detection finds the picker functions (`'showSaveFilePicker' in window`, `'showDirectoryPicker' in window`), never by checking `FileSystemHandle`. There's no *share backup* via Web Share on desktop, because Brave refuses `.json` files.

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
5. **Emit** `public/catalog/v1/…` with a manifest, one chunk per set, the slim search index and content hashes, and commit it. CI (`catalog-sync.yml`) repeats this weekly and opens a PR with a readable diff.

### 9.1 Multi-set catalog (R2.5, ADR-028)

v1 ships one expansion (*30 Jahre*), but catalog, IDs, routes, search and UI are **multi-set and multi-era from M1**, because Marvin's own sets follow one by one after v1:

- **Series grouping:** the manifest lists every set's summary with its print and `series` (era), so the Sets page can group all sets without loading any set chunk.
- **Per-set chunks:** each set (with its subsets and energies) is one `sets/<setId>.json`, loaded lazily and cached by content hash (§5, §8.1).
- **Slim global search index:** `search-index.json` holds one small document per card and product across all sets, so search never loads every chunk (§7).
- **Per-set completion:** completion is computed per set (`DATA_MODEL.md` §6.6).
- **IDs and routes:** set, card and product IDs are route parameters (`/catalog/sets/$setId`, `UX_SPEC.md` §2.2), and nothing is hard-coded to one set.
- **Adding a set** is pipeline config, a curated overlay and a review (`DATA_SOURCES.md` §6.5), not a refactor.

---

## 10. Routing and code splitting

- File-based routes (`src/routes`) with **lazy route components**. Heavy modules load on demand as separate chunks:
  - the chart components (with the price and overview routes; a few KB, ADR-038)
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
- **Environments:** every PR gets a **preview deployment**, and `main` goes to **production** (`main` is the default branch from M1 on, R3.3). There are no secrets and no environment variables at runtime. The Vercel deploy-hook URL of the public-repository variant below is kept as a GitHub Actions secret, never in the repo.
- **Plan constraint:** Vercel **Hobby is for non-commercial use only** (no ads, no paid features; donations are allowed). Settr stays non-commercial (Q8.2).
- **Domain:** no custom domain for now (Q1.4). It lives at a free `*.vercel.app` name.
- **Private deployment (Q1.2):** `<meta name="robots" content="noindex, nofollow">`, the `X-Robots-Tag` header above, and a `robots.txt` with `Disallow: /`. The URL is shared only with friends and is **never written into the repository** (docs, config or code; ADR-029).
- **Daily price-guide deploys (ADR-020, ADR-029):** how `cm-prices.json` reaches production depends on the repository's visibility. It stays **public** for now (R3.2), so the deploy-hook variant is the one in use:
  - **Private repository (if it's made private later):** the `price-guide.yml` job commits `cm-prices.json` only when it changed, so at most one production deploy per day (well within Hobby limits). GitHub Free includes 2,000 Actions minutes per month for private repositories, which should cover CI, the weekly catalog sync and the daily job (to verify against real CI times).
  - **Public repository:** `cm-prices.json` is **never committed**, because that would republish Cardmarket's data. The daily job calls a Vercel **deploy hook**, and a build step downloads Cardmarket's price guide, filters it to catalog products and writes `cm-prices.json` into the build output. Still at most one extra production deploy per day.
  - **As built (M4):** `pnpm build` = `vite build && tsx scripts/price-guide/index.ts`. The step downloads only on Vercel (`VERCEL=1`, or `PRICE_GUIDE=download`; `PRICE_GUIDE_FILE=<path>` reads a local file); every other build, and any failure, writes an empty snapshot, so a deploy never fails over the guide and the app never requests a missing file. The app loads it through `src/catalog/price-guide.ts` (not the `@/catalog` barrel, so the startup bundle doesn't carry it). `price-guide.yml` runs daily at 03:23 UTC and posts to the `VERCEL_DEPLOY_HOOK` secret (a notice and no failure while it's unset). `.gitignore` guards `cm-prices.json`.

---

## 12. Browser capabilities and fallbacks

| Capability | Used for | Support (Sept 2026) | Fallback |
|---|---|---|---|
| IndexedDB | All user data | Universal | — (required) |
| Service worker + Cache API | Offline | Universal | Online-only |
| PWA install | Installed app on Windows and iPhone | Chromium incl. Brave (install icon in the address bar, or ☰ → *Save and share* → *Install ‹App›…* in Brave's English UI; Shields also run inside app windows), Safari/iOS (*Zum Home-Bildschirm*) | Browser tab |
| `navigator.storage.persist()` | Durability | Chromium incl. Brave (silent: granted for installed apps and most-used/bookmarked sites, not when cookies are blocked or cleared on exit), Firefox (prompt), Safari (heuristic) | Retry after install; backups + reminders |
| `navigator.storage.estimate()` | Storage usage in Einstellungen › Daten | Universal. **Brave always reports `quota` = 2 GiB** (`usage` is real) | Show usage; never rely on the reported quota |
| Same-document View Transitions | Grid → detail morph | Baseline (since Oct 2025) | Cross-fade |
| File System Access pickers | Optional: save/open backups, auto-backup folder (post-v1) | Chromium only (desktop, Android 132+). **Off by default in Brave:** the pickers don't exist unless `brave://flags/#file-system-access-api` is enabled, and even then moving or renaming local files is refused | Downloads (Brave opens a Save-As dialog by default) / `<input type=file>` (via browser-fs-access). Feature-detect the picker functions, never `FileSystemHandle` |
| Web Share (files) | Share backups/images on mobile | Chrome/Android, Safari/iOS, Brave on Windows (but it **refuses `.json` files** with `NotAllowedError` even when `canShare()` says true); not Firefox | Download. No *share backup* on desktop (ADR-027). `.json` isn't in the commonly shareable types, so check `canShare()` first and fall back to a download on any rejection |
| Canvas readback (`getImageData`, `toDataURL`, `toBlob`) | Share images, color sampling | Universal. Brave's default fingerprinting protection adds tiny per-session noise | Fine for images and colors. Never hash canvas output or compare it byte for byte |
| Named system fonts | CJK font stack (system fonts first, `DESIGN_SYSTEM.md` §4) | Brave limits named system fonts to an allowlist (Segoe UI, Consolas and Microsoft YaHei are allowed; others such as Yu Gothic may be hidden) | Self-hosted Noto CJK slices render JA/ZH on their own (checked in the Brave smoke test, `QUALITY.md` §3.1) |
| Hardware and screen values (`hardwareConcurrency`, `deviceMemory`, screen size, `navigator.languages`) | Nothing | Brave randomizes hardware values, rounds screen sizes and reduces `navigator.languages` to the first entry | Never branch on them |
| BarcodeDetector | EAN scan (I-10) | Chrome Android, macOS only | `barcode-detector` WASM ponyfill |
| DeviceOrientation | Holo tilt on phones | iOS needs a permission tap | Pointer/touch drag |
| `Intl.Segmenter` | (optional) CJK tokenization | Baseline | Bigram tokenizer (default) |
| `CompressionStream` | gzip backups (future) | Baseline | Uncompressed JSON |
| Temporal | — | Not Baseline (no Safari) | date-fns |
| `backdrop-filter` (Liquid Glass) | Glass chrome | Baseline (Brave's fingerprinting protection leaves CSS and `backdrop-filter` untouched) | Solid surfaces |
| `prefers-reduced-transparency` | Honor the OS transparency setting | Chromium only | In-app toggle *Transparenz reduzieren* (all browsers) |

---

## 13. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Chinese data missing** from TCGdex (SC and TC for M6a) | Chinese names/images incomplete at launch | SC and TC copies trackable on the M6a list from day one, with JP (M6a) artwork where it exists. TC names from `type-null/PTCG-database` (MIT, all 176), SC names converted from them with OpenCC (ADR-034); `duanxr/PTCG-CHS-Datasets` isn't used (R2.8) |
| **Card images missing** for some languages (a brand-new set, released 16 Sep 2026) | Placeholders instead of art | Verify via HEAD in the pipeline. Fall back to another language of the same print, then the card-back placeholder. Re-sync weekly |
| TCGdex upstream changes or outages | Build-time only (runtime uses our static copy) | Pinned commit, schema validation, id-alias map |
| Browser storage eviction | Data loss | Persistence request, PWA install, backups, reminders, auto-backup (post-v1; Chromium with File System Access, in Brave only behind a flag) |
| **Brave delete-on-exit settings** (off by default, §8.2) | The whole collection is erased when the site or the browser is closed | Warnings in onboarding and *Einstellungen › Daten*, `persist()` after install, backups and reminders (ADR-027; Marvin's setup R3.4) |
| Brave fingerprinting protection | Hidden system fonts, noisy canvas readback, randomized hardware/screen values | Self-hosted Noto CJK slices, no canvas hashing, no logic based on hardware/screen values, manual Brave smoke test before each release (`QUALITY.md` §3.1) |
| Brave Shields blocking Settr's requests | Missing assets or data | Brave's default lists (Brave, EasyList, EasyPrivacy, uBlock lists, and EasyList Germany on German installs) don't match Settr's assets, `/catalog/v1/*.json`, the service worker, fonts or TCGdex images. No analytics scripts: Vercel Analytics is on EasyPrivacy and is never added |
| **Public GitHub repository** (public for now, R3.2) | Cardmarket's price guide republished; the private deployment's URL exposed | Marvin keeps it public for now (R3.2). While it's public, `cm-prices.json` is never committed (deploy hook + build-time fetch, §11), and the deployment URL is never written into the repo (ADR-029) |
| Catalog growth (Marvin's sets and eras after v1) | Bigger downloads, slower search | Per-set lazy chunks, series grouping and a slim global search index from M1 (§9.1, ADR-028). FlexSearch if the index reaches tens of thousands of docs (ADR-012) |
| Vercel Hobby non-commercial rule | Hosting must change if monetized | Static output is portable (Cloudflare Pages / Netlify) |
| TS 7 ecosystem gaps (tools needing the TS JS API) | Tooling friction | Oxlint/tsgolint are TS 7-native. Fall back to TS 6.0 for a specific tool only if unavoidable |
| oxfmt still beta | Formatting churn | Biome 2.5 as a drop-in fallback |
| Dependency churn (fast-moving 2026 ecosystem) | Maintenance | Pinned versions, grouped weekly Renovate PRs, CI gates |
| GPL contamination (holo CSS) | License conflict | Clean-room implementation (`DESIGN_SYSTEM.md` §7) |
| **Glass performance** (many `backdrop-filter` layers over image grids) | Jank on weaker GPUs / Windows laptops | ≤ 3 simultaneous blurred layers. No blur on elements that animate size. Automatic solid fallback when *Transparenz reduzieren* is on. Profiled on Windows in M1/M6 |
| Price-guide scope confusion (global vs "German sellers") | Misleading suggestions | Explicit labels, never auto-saved, `origin: 'guide'` in history. Every price belongs to its card language (R2.6): a value is never shown as if it applied to another language |
