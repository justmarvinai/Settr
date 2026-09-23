# Settr: Product Specification (PRD)

> Status: **Draft v0.2**. Round-1 answers are incorporated. Round 2 is open in [`USER_QUESTIONS.md`](../USER_QUESTIONS.md), where references like (Q6.3) point to the decision record. Last updated: 2026-09-23
> Owner: Marvin (product) · Author: Claude (planning)
> Related: [`UX_SPEC.md`](./UX_SPEC.md) · [`DATA_MODEL.md`](./DATA_MODEL.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) · [`ROADMAP.md`](../ROADMAP.md)

---

## 1. Vision

**Settr is the most beautiful and most precise way to track a Pokémon TCG collection.** It covers singles and sealed products in German, English, Japanese and (Simplified) Chinese, has a German interface, and runs privately on your own device.

> DE: *"Jede Karte. Jedes Set. Jeder Cent."*

## 2. Problem

- Collectors in Germany price their cards on **Cardmarket**, but most trackers are built around US prices (TCGplayer/eBay), English-only catalogs, accounts and subscriptions.
- Japanese and Chinese cards, which are a big part of modern collecting, are poorly supported or missing entirely. Sealed products are often an afterthought.
- Automatic prices are often wrong for the exact language, variant and condition you own. Collectors who check Cardmarket by hand have no fast way to **record** those prices and **see trends and profit/loss** over time.
- Many tools look dated, are slow, or hold your data hostage.

## 3. Goals and non-goals

### Goals (v1)
- **G1:** Track every owned card and sealed product with language, variant, condition/grade, quantity and purchase price.
- **G2:** Make manual price tracking **fast**, with Cardmarket as the reference, and turn the entries into price histories and trends.
- **G3:** Show the portfolio honestly: current value, invested capital, and unrealized (optionally realized) P/L over time, broken down by set, language and type.
- **G4:** Browse and search the catalog of cards and sealed products for the supported set(s): cards in DE, EN, JA and ZH-CN, and sealed products in DE, EN, JA, ZH-TW and ZH-CN.
- **G5:** Stay 100 % local and private: full import/export, offline capable, installable.
- **G6:** Ship a design that's recognizably premium and distinct: *"a real competitor"*.

### Non-goals (v1)
- User accounts, servers, cloud databases, server-side sync.
- Automatic price fetching or scraping. Prices are **entered manually** by design.
- Marketplace, trading between users, deck building, gameplay features, social feeds.
- Card scanning via camera (a later idea, see I-13).

## 4. Target users

| Persona | Description | Top needs |
|---|---|---|
| **P1 · Collector-investor** (primary: you) | German collector who buys singles and sealed, collects DE/EN/JA/Simplified-Chinese cards, and plans graded cards. Owns some LP/damaged copies and stores cards in a Withyu 12-pocket and a VaultX 9-pocket binder. Prices = **lowest offer in the card's language from German sellers** on Cardmarket. ~200 cards, growing; currently uses **Collectr**. **Windows PC first**, iPhone second | Fast entry, honest P/L, trends, sealed tracking, multi-language, binder mapping |
| **P1b · Friends** | A few friends who get the private link. Each keeps their own local data | Clear onboarding, zero setup |
| **P2 · Completionist** | Chases full or master sets and cares about every variant | Set progress, missing lists, binder view |
| **P3 · Sealed holder** | Keeps displays and ETBs long-term | Sealed catalog, price history, ROI |

## 5. v1 catalog scope: "30 Jahre" / "30th Celebration"

The first version contains **only** the Pokémon TCG 30th-anniversary expansion, released worldwide on **16 Sep 2026**, the first set ever released on the same day in every print language:

| Language | Set name | Code | Card structure (per research, see `DATA_SOURCES.md` §2) |
|---|---|---|---|
| English | *30th Celebration* | 30C | 128 official + 33 secret (incl. 3 **RGB Rare** Mew R/G/B) = 161, **plus** 30-card **Classic Collection** subset, **plus** 8 foil Basic Energies |
| German | *30 Jahre* | 30C | identical to English (international print) |
| Japanese | *30th CELEBRATION* (MEGA expansion pack) | M6a | 176 incl. Classic Collection (136–165), RGB Mews and Energies. Different list and numbering from EN |
| Chinese (Simplified) ★ | *补充包「30周年庆典」* | M6a (mirror) | mirrors the Japanese M6a list (176 cards on Cardmarket and in the only SC dataset), so it's modeled as a **language of M6a**. Its only difference is printed C/R rarity marks |
| Chinese (Traditional) | *30th CELEBRATION* | M6a (mirror) | sealed products in scope (Q4.3). Cards only if R2.3 = yes |

**Notable for the data model:**
- **Every card is foil. There are no reverse holos and no ball-pattern variants in this set.** Each card has exactly one standard variant, so the variant selector hides itself. The model still fully supports reverse and pattern variants for future sets.
- The set has **sub-sections** (main, secret, Pikachu Rare 023–052 in EN, Classic Collection, RGB, Energy). They're shown as sections and used for completion metrics.
- **Images at launch are incomplete.** TCGdex has DE/EN main-set images, but none yet for the Classic Collection and Energies, and **no Japanese images for the Mega era**. Decision (Q4.6): the fallback chain (other language → same artwork from the other print → own photo → placeholder) is part of v1.
- **Chinese data isn't in TCGdex** (its zh data stops before the Mega series). Decision (Q3.2/Q3.5): **Simplified Chinese copies are trackable from day one** on the M6a card list. Chinese Pokémon names are auto-derived from open data (PokéAPI species names), plus manual names for the few Trainer cards. Full names and images follow once a source is cleared (⟶ R2.8).
- **Sealed products** differ per region. EN/DE have *no booster display*; packs come only inside products (Top-Trainer-Box, Booster-Bundle, Blister, Kollektionen, Tins, Kampfdecks, Ultra-Premium-Kollektionen …). Japan sells a 20-pack BOX. Release waves continue until Dec 2026, so the catalog must support adding products over time. Decision (Q4.3): **DE, EN, JP, Traditional and Simplified Chinese products**, including Pokémon Center exclusives and Japanese lottery/specialty items.
- **Related promos** (MEP Black Star Promos from products, Japanese card-set promos, gym promos) sit outside the core set list. Decision (Q4.2): they appear as a **Promos** section once data is available.

## 6. Feature catalogue

Priority uses **MoSCoW** for v1: **M**ust, **S**hould, **C**ould, **W**on't (v1, i.e. later). The IDs are referenced in the roadmap, tests and PRs. "I-xx" refers to a feature idea, and "Qx.y"/"R2.x" to a question in `USER_QUESTIONS.md`.

### 6.1 Catalog and search (CAT)

| ID | Feature | Prio | Notes |
|---|---|---|---|
| CAT-01 | **Sets overview** with logo, release dates, counts and your progress | M | Scales to 150+ sets later |
| CAT-02 | **Set detail**: card grid in number order with owned/missing state, sections, filters (ownership, rarity, type, section), progress | M | |
| CAT-03 | **Card detail**: large image, language switch, data, your holdings, price chart, inline price entry, Cardmarket link | M | |
| CAT-04 | **Card search** across the catalog: names in all languages (incl. JA/ZH scripts), numbers (`25`, `025/128`), set codes, illustrator, rarity, type. Filters and sorting | M | "Card search" from the brief |
| CAT-05 | **Sealed catalog**: products per set/region/language (DE, EN, JP, ZH-TW, ZH-CN; Q4.3), product detail (type, contents, release date, UVP/MSRP) | M | Sealed catalog (the catalog side of the brief's "Sealed library") |
| CAT-06 | **Sealed search** with filters (type, set, language, release window) | M | "Sealed search" from the brief |
| CAT-07 | Language-aware **images with fallback** chain | M | |
| CAT-08 | **Custom items**: add a card or product the catalog lacks, with your own photo | S | Covers promos and Chinese gaps |
| CAT-09 | **Offline set download** (pre-cache all images of a set) | W | Later (I-22) |
| CAT-10 | Cross-print links (JP ↔ EN counterpart of the same artwork) | W | Later |

### 6.2 Collection (COL)

| ID | Feature | Prio | Notes |
|---|---|---|---|
| COL-01 | **Add a card holding**: language, variant, condition, quantity, purchase price (per unit or total), date, source, fees; optional grading, tags, location, note | M | ≤ 3 interactions with defaults |
| COL-02 | **Add a sealed holding**: language, quantity, price, date, source, state (sealed/damaged) | M | |
| COL-03 | **Edit / duplicate / delete** with undo | M | |
| COL-04 | **My cards** ("card library"): grid and table views, filters, sort, group-by, summary bar, multi-select bulk actions | M | |
| COL-05 | **My sealed** ("sealed library"): the same patterns | M | |
| COL-06 | **Quick-add mode**: rapid entry by card number with sticky defaults | S | |
| COL-07 | **Set completion**: Basis / Komplett / Master per language | M | The product is called *Settr* |
| COL-08 | **Binder view**: virtual binder pages (9- and 12-pocket layouts) mirroring your real binders | W | Later, v1.1 recommended (I-02, ⟶ R2.4) |
| COL-09 | **Tags and binder-aware storage locations**: binders with page layout (3×3 = 9, 3×4/4×3 = 12), page + slot per copy, "next free slot" suggestion | S | Q5.7, I-20 |
| COL-10 | **Photos** of your own items (stored locally) | W | Later (I-12) |
| COL-11 | **Sell / trade / gift** part or all of a lot, and record the proceeds | S | Q6.5 = yes |
| COL-12 | **Open sealed**: mark as opened and optionally log the pulls. Cost is split proportionally to value at opening (evenly for unpriced pulls) | S | Q5.8. ROI analytics later (I-11) |
| COL-13 | **Grading tracker** (submissions, costs, returned grades) | W | I-09 |

### 6.3 Prices (PRC)

| ID | Feature | Prio | Notes |
|---|---|---|---|
| PRC-01 | **Manual price entry** per item, language and variant (graded copies get their own series): amount, date, price type, source, note. **Default type "ab (DE)"** = the lowest offer in the copy's language from German sellers | M | Core promise, Q6.3 |
| PRC-02 | **Price history** list with edit/delete | M | |
| PRC-03 | **Price chart** per item (ranges, markers, purchase baseline, compare languages) | M | "Graphical trends" from the brief |
| PRC-04 | **Price-update session**: a keyboard-driven queue across stale or selected items | S | Signature feature, see `UX_SPEC.md` §4.10 |
| PRC-05 | **Staleness** indicators and reminders | S | |
| PRC-06 | **Cardmarket deep links**: exact product (idProduct), preset with **the copy's language + seller country Germany** (+ condition filter per R2.2) | S | IDs from TCGdex / Cardmarket catalog, Q6.3 |
| PRC-07 | Per-lot **value override** (e.g. for LP/damaged copies) | S | Q6.2 |
| PRC-08 | **Multi-currency** purchase prices with FX conversion to EUR | W | EUR only (Q6.1) |
| PRC-09 | **Price-guide suggestions**: a daily snapshot of Cardmarket's public price guide shows *ab* and *Trend* as suggestions on card pages and in the price session. Clearly labeled (for DE/EN cards it mixes all languages and countries), and **never saved without confirmation** | S | Q6.6 = yes |

### 6.4 Portfolio and analytics (PRT)

| ID | Feature | Prio | Notes |
|---|---|---|---|
| PRT-01 | **Dashboard**: value, invested, unrealized P/L (abs/%), value-over-time chart, stale prices, set progress, top movers, recently added | M | |
| PRT-02 | **Allocation**: by category, set, language, rarity | S | |
| PRT-03 | **Performance** tables (best/worst, per set/language) | S | |
| PRT-04 | **Realized P/L** and sales history | S | depends on COL-11 |
| PRT-05 | **Privacy mode**: blur all money values with one toggle | S | Tiny effort, high delight |
| PRT-06 | **Spending analytics** (per month, per source) | W | Later (I-21) |

### 6.5 Wishlist (WSH)

| ID | Feature | Prio | Notes |
|---|---|---|---|
| WSH-01 | **Wishlist** with target price, priority, "target reached" indicator | W | Later (I-06) |

### 6.6 Data and privacy (DAT)

| ID | Feature | Prio | Notes |
|---|---|---|---|
| DAT-01 | **Full export** (versioned JSON backup, checksum) | M | "Import and export all data" from the brief |
| DAT-02 | **Full import** with preview, *replace* or *merge*, safety snapshot and undo | M | |
| DAT-03 | **CSV export** (Excel-DE friendly) | S | |
| DAT-04 | **Backup reminders** and a status pill | S | |
| DAT-05 | **Persistent storage** request and storage usage display | M | Protects against browser eviction |
| DAT-06 | **Auto-backup to a folder** (Chrome/Edge) | W | Later (I-15, Q7.2) |
| DAT-07 | **CSV import** from other apps (mapping wizard). **Collectr preset first** | W | Later (I-16, ⟶ R2.5) |
| DAT-08 | Multi-device **sync** via your own cloud | W | I-18 |
| DAT-09 | **Delete all data** (typed confirmation) | M | |
| DAT-10 | **Cardmarket purchase import**: shipment CSV (`idProduct`, price, language, condition) → holdings with real purchase prices, matched via per-variant Cardmarket IDs | W | Not yet (I-14) |

### 6.7 App shell and platform (APP)

| ID | Feature | Prio | Notes |
|---|---|---|---|
| APP-01 | Responsive shell: desktop sidebar, mobile bottom tabs | M | |
| APP-02 | **UI language: German.** All strings live in message catalogs, so English can be added later without rework | M | Q3.1 |
| APP-03 | Themes: System / Dunkel / Hell | M | |
| APP-04 | **PWA**: installable, offline, update prompt | M | Also mitigates iOS storage eviction |
| APP-05 | **Command palette** (⌘K) and keyboard shortcuts | S | |
| APP-06 | Onboarding (3 steps, no demo data) | S | I-19 = no |
| APP-07 | Settings (defaults, display, prices, data, about) | M | |
| APP-08 | **Private deployment**: `noindex` (meta tag + `X-Robots-Tag` header + `robots.txt`). "Über & Rechtliches" page with disclaimer, credits and privacy note. No Impressum while private | M | Q1.2 |

### 6.8 Signature design moments (DSN)

| ID | Feature | Prio |
|---|---|---|
| DSN-01 | **Holo card viewer** (tilt, glare, rarity foil; gyroscope on mobile) | S |
| DSN-02 | **Shared-element transitions** grid → detail (View Transitions API) | S |
| DSN-03 | **Foil progress rings**, with a set-complete moment | S |
| DSN-04 | **Scrubbable finance-grade charts** | M |
| DSN-05 | **Liquid Glass chrome**: floating glass sidebar, toolbar, mobile tab bar, sheets and popovers, with a reduced-transparency fallback | S |

---

## 7. Key user stories and acceptance criteria

**US-01 · Add a card fast** (COL-01, CAT-02)
> *As a collector, I add a German copy of card 025 that I bought yesterday for 4,50 € on Cardmarket in under 10 seconds.*
- From the set grid: hover or long-press the tile → **＋** → the sheet opens with defaults (language DE, condition NM, variant = the only one, source = last used, date = today).
- Typing `4,5` and pressing **Enter** saves. A toast offers *Rückgängig*. The tile shows the ×1 badge instantly.
- Changing the date to yesterday takes at most 2 extra interactions.

**US-02 · Record a price** (PRC-01, PRC-03, PRC-06)
> *As a collector, I check the cheapest German-language offer from a German seller and record it with one number and Enter.*
- **Auf Cardmarket öffnen** opens the exact product with *language = the copy's language* and *seller country = Germany* preset.
- On card detail the price input is visible without scrolling on desktop. `34,9` + **Enter** stores 3 490 cents for today with the default type "ab (DE)" and its filter context.
- The chart shows the new point immediately. The dashboard value updates without a reload.

**US-03 · See profit and loss** (PRT-01)
> *As a collector, I see total value, invested and P/L on the dashboard and can drill into what drives it.*
- Values follow `DATA_MODEL.md` §6. Unpriced items are excluded and **counted visibly**.
- P/L shows sign, arrow and color. Clicking P/L opens Portfolio › Performance sorted by contribution.

**US-04 · Move to a new device** (DAT-01, DAT-02)
> *As a user, I export everything into one file and import it on another device with an identical result.*
- Export takes ≤ 2 interactions from Einstellungen › Daten or ⌘K.
- *Replace* import on an empty device reproduces counts and content exactly (automated round-trip test).
- An import from a newer app version is refused with a clear message.

**US-05 · Search in any script** (CAT-04)
> *Typing "pika", "ピカチュウ" or "皮卡丘" finds Pikachu cards across languages. "25" finds card number 025.*
- Results appear within 100 ms for the v1 catalog. Search is case- and accent-insensitive (é = e) and matches width variants (Ｐ = P).

**US-06 · Track sealed** (COL-02, PRC-01, PRT-01)
> *I add a German Top-Trainer-Box bought for 54,99 €, record its price over time, and see its trend and P/L.*

**US-07 · Update many prices** (PRC-04)
> *I update 30 stale prices in under 5 minutes.*
- The session queue is ordered by value. `C` opens Cardmarket, then amount + Enter, `U` for unchanged, `S` to skip. The summary shows the portfolio delta.

**US-08 · Complete a set** (COL-07)
> *I see my Basis / Komplett / Master progress per language and a list of exactly what's missing.*

**US-09 · Accept a price suggestion** (PRC-09)
> *On a card page I see yesterday's Cardmarket price-guide values ("ab" and "Trend", labeled with date and scope). One click copies a value into the input, and Enter saves it.*
- Suggestions are **never saved automatically**. An accepted suggestion is stored with `origin: 'guide'` so it's distinguishable in the history.
- If the snapshot is older than 3 days or the product has no guide entry, the chip is hidden.

**US-10 · File a card in my binder** (COL-09)
> *When I add a card, Settr suggests "VaultX 9er · Seite 4 · Platz 7" (the next free slot), and I accept it with one click.*
- Binders are created once with name, layout (3×3 or 3×4/4×3) and page count. The slot suggestion respects occupied slots.

---

## 8. Business rules (summary; normative version in `DATA_MODEL.md` §6)

- **Money** is stored as integer minor units. The base currency is **EUR** and display uses `de-DE` formatting.
- **Cost basis** = purchase price + fees. It's allocated exactly across units (largest remainder).
- **Valuation** uses the latest price entry on or before the valuation date (carry-forward). Graded copies use their own series.
- **Unpriced** holdings are excluded from value and P/L totals but counted. The fallback "use purchase price" is optional.
- **P/L %** is "—" when the cost basis is 0 (pulls, gifts).
- **Stale** = the latest price is older than N days (default 14).
- **Default price type** = "ab (DE)": the lowest offer in the copy's language from German sellers (Q6.3). Each entry stores this filter context.
- **Price-guide suggestions** are hints only. Nothing reaches a price series without an explicit user action.
- Catalog updates never delete or corrupt user data. Every record keeps a display snapshot.

## 9. Constraints

- **Hosting:** Vercel, static only. No server database and no accounts.
- **Data sources:** free/open only (TCGdex primary). No price API calls at runtime; the price-guide snapshot is a static file produced by a scheduled GitHub Action. See `DATA_SOURCES.md`.
- **UI language:** German only in v1 (translation-ready).
- **Primary platform:** Windows desktop (Chrome/Edge) first, then iPhone (Safari, installed PWA).
- **Storage:** browser IndexedDB, which can be evicted. Mitigations are persistence, PWA installation and backups.
- **Legal:** unofficial fan project, with a disclaimer (see `DATA_SOURCES.md` §8).

## 10. Success criteria for v1 (personal, measurable)

| Metric | Target |
|---|---|
| Add a card (from set grid, with price) | ≤ 10 s |
| Update 30 prices via session | ≤ 5 min |
| LCP (mobile, simulated 4G) | ≤ 2.0 s |
| Lighthouse (desktop) Performance / Accessibility / Best Practices | ≥ 95 / 100 / ≥ 95 |
| Backup round-trip fidelity | 100 % (automated) |
| Data loss incidents | 0 |

## 11. Out of scope (explicitly)

Automatic prices, accounts, social features, trading, deck building, card scanning (v1), server sync (v1), non-Pokémon games.
