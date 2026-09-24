# Settr: Quality, Testing, Performance, Accessibility and Security

> Status: **Draft v0.4** (question rounds 1–7 incorporated) · Last updated: 2026-09-24
> Defines what "done" means and how quality is enforced automatically. Referenced by `AGENTS.md` (Definition of Done) and CI.

---

## 1. Definition of Done (every feature / PR)

A change is **done** only when all of the following hold:

1. **Acceptance criteria** of the referenced feature ID (`PRODUCT_SPEC.md`) are met and demonstrated (screenshot or clip in the PR for UI changes).
2. **Types:** `tsc --noEmit` passes in strict mode. There's no `any`, no `@ts-ignore`/`@ts-expect-error` without a justification comment, and no non-null `!` on external data.
3. **Lint/format** passes: Oxlint with type-aware rules (`oxlint-tsgolint`), plus oxfmt (see `ARCHITECTURE.md` §3).
4. **Tests:** domain logic has unit tests, and user-facing flows touched by the change have E2E coverage. All suites pass.
5. **i18n:** every user-visible string is in the **German** message catalog (the only UI language in v1, Q3.1), with no hard-coded UI text. German copy has been checked in the layout (longest-string test).
6. **Accessibility:** keyboard operable, labelled controls, axe shows zero *serious/critical* violations, and focus management in sheets/dialogs is correct.
7. **Responsive:** verified at 375 / 768 / 1280 / 1920 px, in **light and dark** themes.
8. **Motion:** `prefers-reduced-motion` is respected (no tilt/foil/morph).
9. **Performance budgets** (§4) aren't exceeded (`size-limit` check in CI).
10. **Data safety:** if the persisted user-data shape changed, the change includes a Dexie migration, a backup migration, a new fixture and a passing round-trip test.
11. **Docs:** a `CHANGELOG.md` entry under *Unreleased*, `ROADMAP.md` checkbox(es) ticked, and `DATA_MODEL.md` / `DECISIONS.md` updated if the model or a decision changed.
12. **Preview deployment** on Vercel has been opened and smoke-tested.

---

## 2. Test strategy

| Layer | Tool | Scope | Target |
|---|---|---|---|
| **Unit** | Vitest 5 | `src/domain/**` (money, allocation, valuation, P/L, time series, completion, series keys, CSV, migrations) and `src/lib/**` | ≥ 95 % branch coverage on `src/domain` |
| **Property-based** | fast-check (in Vitest) | Money allocation sums exactly, merge is idempotent (`merge(A,A)=A`) and order-independent for disjoint sets, export→import round-trip identity, time-series sweep = naive computation | Runs in CI with a fixed seed plus a nightly random seed. As built (M5): `tests/setup.ts` sets one seed for every property test; `FC_SEED=random` (nightly, printed) or `FC_SEED=<seed>` to replay a failure. M5 adds: merging into itself changes nothing, into an empty device gives the backup, two devices converge whichever merges which (`merge.test.ts`); export → import (replace) → export gives the same data and checksum on generated datasets (`db/import.test.ts`) |
| **Integration** | Vitest + `fake-indexeddb` | Dexie repositories, transactions, `priceLatest` maintenance, tombstones, import pipeline, catalog loader | All repositories |
| **Component** | Vitest Browser Mode (Playwright provider, `vitest-browser-react`), `*.test.tsx` next to the component | Complex inputs (money input parsing `4,5` → 450), forms, filters, command palette, charts' data mapping | Critical components |
| **E2E** | Playwright | Critical journeys (below). **Every run:** Chromium desktop (the engine of Marvin's Brave on Windows), Chromium at iPhone size and WebKit iPhone emulation. **Nightly:** plus Firefox and Pixel emulation. No retries: a flaky test is a bug to fix. CI renders WebKit in software (frames of 100–600 ms with the glass layers), so the WebKit project allows 60 s per test instead of 30 s. Every test also fails on console errors and CSP violations (the preview server sends the production CSP). As built (M5): the fixture also listens for `securitypolicyviolation` events, because Chromium and WebKit don't log a violation the page catches itself. That's how Zod's `new Function` probe surfaced (only Firefox logged it); Zod now runs jitless (`src/lib/zod.ts`, and a lint rule keeps imports going through it) | All journeys green before merge to `main` |
| **Visual regression** | Playwright `toHaveScreenshot` | Dashboard, set detail, card detail, add sheet, price session, and settings in light/dark | Chromium only, pinned fonts. As built (M6, ADR-049): `tests/visual`, a fixed clock, stubbed pictures and no service worker; the baselines are made and compared on GitHub's Ubuntu runner only (`visual.yml`: nightly, and by hand with `update` to regenerate and commit them) |
| **Accessibility** | `@axe-core/playwright` | Every E2E page state | 0 serious/critical |
| **Performance** | Lighthouse CI on preview URL; `size-limit` | Budgets in §4 | Enforced in CI. As built (M6, ADR-049): Lighthouse CI runs on the production build behind `vite preview` (`lighthouse.yml`, `lighthouserc.json`): LCP and CLS fail the job, blocking time and the performance score warn |
| **Catalog pipeline** | Vitest + Zod | Generated JSON validates. Counts match the manifest. Image URL sampling (HEAD) runs as a non-blocking job | Every catalog PR |
| **Manual Brave check** | Brave (current stable) on Windows, **default Shields** | The Brave smoke test (§3.1): install as app, offline, `persist()`, backup download with Save-As, CJK rendering, glass | Before each release |

### 2.1 Critical E2E journeys

1. First run → onboarding → open set → add a card with a price → dashboard shows the value and P/L.
2. Record prices for 3 items → chart shows the points → dashboard value updates.
3. Price session: scope *stale* → update 3 items (Enter/U/S) → summary is correct.
4. Sell part of a lot → remaining quantity and realized P/L are correct.
5. Add a sealed product → record a price → P/L is correct.
6. Export backup → clear data → import (replace) → the state is identical (deep-equal via an in-page hook).
7. Merge import with conflicting edits → last-write-wins and tombstones are honored.
8. Search in DE / EN / JA / ZH scripts finds the expected cards.
9. Offline: load app → go offline → navigate catalog/collection → add holding → back online, with no errors.
10. Keyboard-only: add card, record price and run the session without a mouse.
11. Price-guide suggestion: the chip shows the snapshot date and values, `V` copies into the input, Enter saves with `origin: guide`, and nothing is saved without confirmation.
12. Binder slots: create a 3×3 and a 3×4 binder, add three cards, and the "next free slot" suggestions are correct.
13. Open sealed with pulls: proportional cost allocation sums exactly to the product cost.

**Automated as of M3** (`tests/e2e/*.spec.ts`, desktop and phone Chromium; WebKit in CI): 4 (the sale; realized P/L arrives with M4), 8, 12 (next-free-slot rules as unit tests for 3×3 and 3×4, the move into a binder in e2e) and 13 (the exact sum as a property test, the flow in e2e). The collection spec also covers quick add with undo, the add sheet, Sammlung filters, table sort, tags, move and delete with undo, the backup download and `owned:` search, with axe on those screens in light and dark. The other journeys arrive with their milestones.

**Added in M4** (`tests/e2e/prices.spec.ts`): 2 (a price on the card page with `P` and `Enter`, the lot's P/L, undo; the price sheet from `P` on a tile), 3 (the session with `Enter` and `S` and its summary; `U` in the price sheet), 11 (guide chips from a stubbed snapshot, `V`, `origin: guide`, a changed amount stays the user's), the value and P/L agreeing across Übersicht, Sammlung and Portfolio (the numbers themselves against the hand-calculated fixture in `valuation.test.ts`), and axe on the card page with prices, Übersicht, Preise, Portfolio, the session and the price sheet in light and dark. Journey 1 waits for onboarding (M6), 5–7 and 9–10 for M5/M6.

**Added in M5** (`tests/e2e/data.spec.ts`):
- Journey 6: export → *Alle Daten löschen* → import. A second export has the same checksum over its data, and the price is back on the card page.
- Journey 7: a merge with a newer, an older, a deleted and a new lot from *another device*, the preview's counts, then *Wiederherstellen* from *Sicherungen vor Importen* back to the exact state before.
- Refusals: a broken JSON file (line and column), a backup from a newer Settr, and an edited file (checksum warning, a skipped record and why).
- CSV: Excel (Deutschland) from Daten, and International for a Sammlung selection.
- The backup pill and the reminder toast (from a day-old install, once a day), and ⌘K *Backup exportieren* and *Backup einspielen …*.
- axe on the Daten page, the import preview and the delete dialog, in light and dark.

Every PR runs these on Chromium (desktop, phone) and WebKit (iPhone); `e2e-nightly.yml` runs them on Firefox (the M5 exit criterion).

**Added in M6** (all 13 journeys are now automated):
- Journey 1 (`onboarding.spec.ts`): the first run through the onboarding into the set, a card with a purchase price and a price, and the Übersicht's value and P/L. It also covers *Überspringen*, the backup path and axe on the steps.
- Journeys 5 and 10 (`journeys.spec.ts`): a sealed product's P/L on its page, in Sammlung › Sealed and the Übersicht; keyboard only, from `N` in the palette through `/`, `P`, `Strg K` and `N` on a card page to the price session.
- Journey 9 (`offline.spec.ts`, Chromium): with the service worker in charge, navigating, adding a lot and reloading without a network. The service worker fetches pictures past the test stubs, so the picture host points at a closed local port.
- `design.spec.ts`: the progress rings, the grid → card morph (a skipped transition fails), the holo card leaning and its fullscreen view, and on phones the long-press menu and swiping between cards (Chromium touch emulation).
- `about.spec.ts`: *Über & Rechtliches* and `licenses.txt`, also with the service worker in charge.
- The nightly run adds every journey in Firefox and on a Pixel 7.

### 2.2 Test data

- `tests/fixtures/catalog/`: a trimmed, frozen catalog (a few cards per print), so tests don't depend on the live pipeline. It contains at least two sets from two series, so no code path can assume a single set (ADR-028).
- `tests/fixtures/backups/v1/…`: backups of every released schema version, used for the migration tests. As built (M5): `backups/v1/basic.settr.json` holds every table and most fields (a sale with fees, a graded copy with its own value, sealed, a custom item, a photo, a tombstone, non-default settings, a Cardmarket correction); `db/import.test.ts` checks it reads with a valid checksum and no issues and imports as it is.
- A factory module (`tests/factories.ts`) builds valid holdings, prices and so on with sensible defaults.

---

## 3. Browser and device support

| Platform | Supported |
|---|---|
| **Brave on Windows** (primary, Q1.3, R2.9) | current stable: Chromium in CI on every PR (Brave's engine), plus the manual Brave smoke test with default Shields before each release (§3.1) |
| **Safari iOS** (secondary; installed PWA) | 17.4+: every PR (WebKit), manual QA on iPhone |
| Chrome / Edge on Windows | last 2 major versions: Chromium in CI on every PR |
| Chrome Android, Safari macOS/iPadOS | last 2 / 17.4+: nightly |
| Firefox | last 2 major versions + current ESR: nightly |
| Samsung Internet | last 2 major versions |

- **Baseline target:** *Baseline widely available*, plus selected *newly available* features used as **progressive enhancements** with fallbacks: View Transitions, File System Access (off by default in Brave, so backups are downloads; ADR-027), BarcodeDetector, Web Share with files, device orientation for the holo tilt, and anchor positioning.
- Minimum viewport is 360 px wide. No horizontal page scroll at any width.

### 3.1 Brave smoke test (manual, before each release)

Chromium in CI covers Brave's engine, but not its privacy features (ADR-027). Before each release, run this checklist in the current stable Brave on Windows with **default Shields** and default fingerprinting protection, and note the Brave version and results in the release PR:

1. **Install as app** (install icon in the address bar, or ☰ → *Save and share* → *Install Settr…*). The app window opens, and Shields block nothing Settr needs (assets, catalog JSON, service worker, fonts, TCGdex images).
2. **Offline:** load the app, go offline, navigate catalog and collection, and add a holding (as in E2E journey 9).
3. **`persist()`:** after installing, persistent storage is granted, and *Einstellungen › Daten* shows it.
4. **Backup download:** *Backup exportieren* opens Brave's Save-As dialog, and the saved file imports again.
5. **CJK rendering:** Japanese, Simplified and Traditional Chinese names render with the self-hosted Noto slices, since Brave may hide named system fonts such as Yu Gothic.
6. **Glass:** sidebar, toolbar, filter bar and sheets blur correctly in light and dark, and *Transparenz reduzieren* switches them to solid.

---

## 4. Performance budgets

| Metric | Budget |
|---|---|
| Initial JS (entry + modulepreloads, gzip) | ≤ 230 KB (re-baselined on the M1 build and again with TanStack Query in M2, ADR-030; M1: 209 KB, M2: 224 KB, M3: 219.6 KB, M4: 220.3 KB, M6: 225.6 KB) |
| Per-route lazy chunk (gzip) | ≤ 80 KB (charts chunk ≤ 120 KB) |
| CSS (gzip) | ≤ 35 KB initial; on-demand CSS ≤ 45 KB per file (one Noto CJK family's `@font-face` rules, loaded only where Japanese or Chinese names show) |
| Web fonts on first render | ≤ 2 files, ≤ 125 KB total (latin subsets, variable; ADR-030). CJK fonts load lazily and only when CJK text is rendered |
| LCP (Lighthouse mobile, simulated 4G) | ≤ 2.0 s |
| INP (P75) | ≤ 200 ms |
| CLS | ≤ 0.05 (image slots have a fixed aspect ratio of 63∶88) |
| Grid scroll | 60 fps with 300+ tiles (virtualized above ~150) |
| Valuation of 10k holdings | ≤ 50 ms |
| Portfolio series (10k holdings, 50k prices, 3 years) | ≤ 300 ms in a worker |
| Warm start offline (desktop) | interactive ≤ 1 s |
| Glass layers | ≤ 3 simultaneous `backdrop-filter` layers. Scrolling a 300-card grid under the glass toolbar stays at 60 fps on a mid-range Windows laptop |

**Techniques:** route-based code splitting, `loading="lazy"` + `decoding="async"` images with low-quality thumbnails in grids, `content-visibility: auto` for off-screen sections, TanStack Virtual for long lists and tables, Web Workers for search indexing and analytics, and memoization keyed by a data-version counter.

---

## 5. Accessibility (WCAG 2.2 AA)

Marvin's rule (R2.1): *"Usability and user experience is always #1."* When looks and usability conflict, usability wins: legibility, AA contrast, 44 px touch targets, keyboard paths, and no decoration that hides data.

- Contrast is ≥ 4.5:1 for text and ≥ 3:1 for UI components and chart strokes, in **both themes of direction D** (light and dark are equals, *System* is the default; `DESIGN_SYSTEM.md` §3.1). It's checked with automated token tests (OKLCH contrast in `tokens.test.ts`) for every token pair, in light and in dark.
- P/L is never color-only: a sign, an arrow and text are always shown. An optional colorblind-safe palette (blue/orange) is available.
- Keyboard: everything is operable, with a visible focus ring (`--focus`: 3 px with a 2 px offset, `DESIGN_SYSTEM.md` §3.1). Grids use a roving tabindex. Sheets/dialogs trap focus and restore it on close. Skip-link to the main content.
- Screen readers: landmarks, `aria-live="polite"` for toasts and price-session progress, and descriptive image alt text ("Pikachu ex, Nr. 025, Deutsch, Reverse Holo"). Charts ship with a data-table alternative ("Als Tabelle anzeigen").
- Motion: `prefers-reduced-motion` disables tilt, foil animation, morph transitions and number tickers. There's also an in-app motion setting.
- **Glass legibility:** text on Liquid Glass meets AA against the worst-case backdrop (bright card art beneath). `prefers-reduced-transparency` and the in-app toggle make glass solid. Windows `forced-colors` mode is supported.
- Touch targets are ≥ 44 × 44 px. No hover-only functionality: every hover action has a tap/long-press or menu equivalent.
- Language tagging: CJK card names get `lang="ja"` / `lang="zh-Hant"` / `lang="zh-Hans"` for correct font selection and screen-reader pronunciation.

---

## 6. Security and privacy

- **No accounts, no server-side user data.** All user data stays in the browser.
- **Content Security Policy** via `vercel.json` headers (draft):
  ```
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://assets.tcgdex.net;          # sealed EN/JP images arrive same-origin via /img/tcgp/*
  font-src 'self';
  connect-src 'self';                                              # no runtime APIs (EUR only; the price guide is a static file)
  worker-src 'self' blob:;
  manifest-src 'self';
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
  ```
  Plus `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=()`, `Cross-Origin-Opener-Policy: same-origin`, and **`X-Robots-Tag: noindex, nofollow`** (private deployment, Q1.2).
- **Untrusted input:** imported files and CSVs are validated with Zod. Data is never rendered as HTML (no `dangerouslySetInnerHTML`). Import size is capped (200 MB) and parsing runs in a worker.
- **External links** (Cardmarket) use `rel="noopener noreferrer"`.
- **Dependencies:** minimal and well-maintained, with a committed lockfile, Renovate for updates (grouped weekly) and `pnpm audit` in CI.
- **Analytics and telemetry:** none (Q8.3). Never add Vercel Analytics (it's on EasyPrivacy, so Brave would block it anyway). Errors go to a local ring-buffer log (200 entries) that the user can copy into a bug report. It contains no collection data. As built (M6, ADR-045): the log lives in localStorage (`settr:errors`), so database failures are logged too.
- **Repository (ADR-029):** no secrets and no personal collection data are ever committed. While the GitHub repository is public (it stays public for now, R3.2), neither are Cardmarket price-guide snapshots (`cm-prices.json`) nor the deployment URL.

---

## 7. CI/CD pipeline (GitHub Actions + Vercel)

| Workflow | Trigger | Steps |
|---|---|---|
| `ci.yml` | PR, push to `main`, manual | pnpm install (cached) → Paraglide compile + `tsc --noEmit` (TS 7) → `oxlint --type-aware` + `oxfmt --check` → unit/integration (Vitest) → components (Vitest Browser Mode, Chromium) → build → CSP hash check (`pnpm csp`) → size-limit → `pnpm audit` (prod, high) → Playwright on the built app: desktop and phone on Chromium, iPhone on WebKit → reports uploaded on failure |
| `e2e-nightly.yml` | nightly + manual | Property tests with a random seed (`FC_SEED=random`), and every journey on Firefox and a Pixel 7 (the `firefox` and `pixel` Playwright projects, enabled by `NIGHTLY=1`; M6) |
| `visual.yml` | nightly + manual | Visual regression on desktop Chromium (`VISUAL=1`, `tests/visual`). By hand with `update`: regenerate the baselines and commit them to the branch (ADR-049) |
| `catalog-sync.yml` | weekly + manual | Run the catalog pipeline → validate → if there are changes, open a PR with a diff summary (new sets/cards, changed names, image coverage) |
| `price-guide.yml` | daily (~05:00 CET) | Download Cardmarket's price guide → filter to catalog products → **private repo:** commit `cm-prices.json` if changed; **public repo:** never commit it, only call the Vercel deploy hook so the build fetches and filters the guide (ADR-029, R3.2). Opens an issue after 3 consecutive failures (`DATA_SOURCES.md` §8.3) |
| Vercel Git integration | every push/PR | Preview deployment per PR; `main` → production |
| `lighthouse.yml` | PR + manual | Lighthouse CI on the production build behind `vite preview`, with the budgets of §4 (ADR-049; planned against the Vercel preview, which deployment protection would block) |

Local git hooks (`lefthook.yml`, installed by `pnpm install`): **pre-commit** formats and lints the staged files, **pre-push** runs the typecheck and the unit tests.

Branch protection on `main` requires green CI and a review (`main` is the default branch from M1 on, R3.3). Before each release, the manual Brave smoke test (§3.1) must pass.

In a private repository, GitHub Free includes 2,000 Actions minutes per month, which should cover CI, the weekly catalog sync and the daily price-guide job (to verify against real CI times, ADR-029).
