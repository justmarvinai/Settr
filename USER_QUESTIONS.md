# Settr: Questions and Decisions

> Last updated: 2026-09-23.
> **Rounds 1–3: answered ✓** (decision records below, incorporated into spec v0.3).
> **Coding: approved on 2026-09-23** ("You can start"). M1 (Foundation) and M2 (Catalog) are built and wait for your check.
> **Round 4 (M2): open**, nothing blocking. These are data points to check when you have a moment; until then my recommendation (⭐) applies.

## How to answer

- Tick options with `[x]`, or write under **Antwort:**. German or English is fine, and so is answering in chat.
- ⭐ = my recommendation. ★ = needed before coding starts.
- As before: anything you leave open, I'll take my recommendation.

---

## Round 4: catalog check (M2, open, nothing blocking)

**R4.1 · German product names.** Where pokemon.de doesn't list a product yet, the German name is my translation and marked "to confirm" in `data/curated/sealed/30th-intl.yaml`: *Knock-Out-Kollektion*, *Tech-Sticker-Kollektion*, *ex-Box*, *Mini-Tin Tag & Nacht*, *Ultra-Premium-Kollektion Tag/Nacht*, *Ditto-Premium-Kollektion*, *Figuren-Kollektion*, *Sammelalbum-Kollektion*, *Booster der Klassischen Sammlung*, *Mini-Tin-Display*.
- [ ] ⭐ Keep them; I correct them when pokemon.de lists the products (or you tell me what the German boxes say).
- [ ] Other: **Antwort:**

**R4.2 · RGB Mews on Cardmarket (JP/SC).** TCGdex has no Cardmarket ids for M6a's three RGB Mews. Cardmarket lists three identical "Mew [Psychic | 30C]" products per expansion; I assumed the same order as in English (R, G, B = consecutive ids). Check: *Katalog › 30th CELEBRATION › R* (Mew) → *Auf Cardmarket ansehen*: is it the red one?
- [ ] ⭐ It's right (or tell me which is which).
- [ ] Other: **Antwort:**

**R4.3 · Sylveon ex 059 and 130 (JP) on Cardmarket.** Cardmarket's data links both SC cards to one Japanese product, so I can't tell which Japanese product belongs to which number. Their Japanese link falls back to a Cardmarket search; SC and TC work.
- [ ] ⭐ Leave it until Cardmarket fixes its data (the weekly sync picks it up).
- [ ] Other: **Antwort:**

**R4.4 · Product pictures.** TCGplayer has pictures for 35 of 52 products. German products show the English box (marked "Bild der Verpackung auf Englisch"); Traditional and Simplified Chinese products and the two Pikachu mini tins show a product-type icon.
- [ ] ⭐ OK for v1; your own photos come later (I-12).
- [ ] Other: **Antwort:**

**R4.5 · Card names in the catalog.** The catalog shows German names by default, also for Japanese and Chinese cards (marked *übersetzt*), with a switch to *Namen wie gedruckt* on set pages (I18N.md §1).
- [ ] ⭐ Keep German as the default.
- [ ] Printed names by default for Asian sets.

---

## Round 3: decisions (answered 2026-09-23)

| ID | Topic | Decision | Src |
|---|---|---|---|
| R3.1 | Direction D | **Confirmed** ("D looks fine now"), accent **Indigo** | M + E |
| R3.2 | Repository visibility | **Stays public for now.** So Cardmarket price-guide snapshots are built at deploy time and never committed, and the deployment URL never goes into the repo (ADR-029) | M |
| R3.3 | `main` branch | Created at the start of M1 from the reviewed spec. You set it as the default branch on GitHub (*Settings* → *General* → *Default branch*) | E |
| R3.4 | Brave data on exit | Your Brave deletes no data on exit. The in-app warnings stay for friends | M |
| R3.5 | Near Mint filter | Verified: `minCondition=2` shows only Near Mint or better offers | M |
| – | Coding | **Approved 2026-09-23** ("You can start") → M1 started | M |

---

## Round 2: decisions (answered 2026-09-23)

| ID | Topic | Decision | Src |
|---|---|---|---|
| R2.1 | Design | **D · Bold Studio**: C's heavy type + B's floating glass sidebar, calmer color, **light and dark** (default: follows the system), balanced glass. Your rule *"Usability and user experience is always #1"* is now the first design principle. Final look → R3.1 | M |
| R2.2 | Condition filter | **Near Mint or better.** Cardmarket links add the NM filter (to verify → R3.5). Worse copies can get an *Eigener Wert* per lot (Q6.2) | E |
| R2.3 | Traditional Chinese cards | **Yes:** ZH-TW is a card language too. Names come from an open Traditional Chinese card database, with derived names as the fallback | E |
| R2.4 | Binder view | **v1.1**, right after v1. v1 already stores binder, page and slot | E |
| R2.5 | Your collection | No Collectr Pro, so there's no CSV export and **no Collectr importer**. Your cards come over by hand. Your sets (mostly Mega Evolution era, some Sword & Shield, some Scarlet & Violet, a German Base Set Charizard, a few Sun & Moon/GX cards) are **added one by one once the core site is fully functional** with *30 Jahre*. The app is built multi-set from day one | M |
| R2.6 | Beating Collectr | Collectr's weak spots: missing languages and fitting prices (English/international only). Settr's core promise: **every price belongs to its card language** | M |
| R2.7 | Short tagline | *"Jede Karte zählt."* | E |
| R2.8 | Chinese dataset | **Revised:** its terms say consent must come from the official owner or an authorized entity (they point to Pokémon Shanghai), not from the maintainer, so a request to the maintainer can't help. Settr doesn't use that dataset; Simplified Chinese names are derived + curated | E (revised) |
| R2.9 | Browser | **Brave** (Chromium) on Windows. Settr works in it; notable: no folder access by default (backups are downloads, and Brave asks where to save them), and Brave's delete-on-exit options would erase your collection (→ R3.4, ADR-027) | M |
| – | Cardmarket link | Verified by you: the link opens Pikachu ex (30C 150) with German sellers (`sellerCountry=7`) and German cards (`language=3`) | M |

---

## Round 1: decisions (answered 2026-09-23)

Source: **M** = your answer · **E** = my recommendation (you chose "go with your recommendation") · **M+** = your answer plus a small addition by me (explained).

### 1. Vision and usage

| ID | Topic | Decision | Src |
|---|---|---|---|
| Q1.1 | Users | Me + a few friends, but mainly me. Everyone keeps their own data locally in their browser | M |
| Q1.2 | Visibility | **Private**: unlisted URL, `noindex`, not advertised. No Impressum while it stays private. A small "Über & Rechtliches" page carries the disclaimer and privacy note. *(Not legal advice: if Settr ever goes public, add an Impressum.)* | M |
| Q1.3 | Devices | **Windows PC (primary)** + iPhone (secondary, installed to the home screen) | M |
| Q1.4 | Domain | No custom domain for now: `*.vercel.app`. Vercel is already connected to GitHub | M |
| Q1.5 | Size | ≈ 200 cards today, growing | M |
| Q1.6 | Current tool | **Collectr**. No Collectr Pro, so no CSV export and no importer (R2.5) | M |

### 2. Navigation, naming, tone

| ID | Topic | Decision | Src |
|---|---|---|---|
| Q2.1 | "Library" | = **your own collection** (Sammlung › Karten / Sealed). Catalog search across all cards and products is separate | E |
| Q2.2 | Navigation | Übersicht · Sammlung · Katalog · Preise · Portfolio · Einstellungen (Wunschliste appears once I-06 ships) | E |
| Q2.3 | Start page | Übersicht | E |
| Q2.4 | Address | *du* | E |

### 3. Languages

| ID | Topic | Decision | Src |
|---|---|---|---|
| Q3.1 | UI language | **German only** for now. The code stays translation-ready, so English can be added later without rework | M |
| Q3.2 | Chinese | **Simplified Chinese** (mainland) | M |
| Q3.3 | Card languages | **DE, EN, JA, ZH (Simplified)**, plus ZH-TW (R2.3). No FR/IT/ES/PT/KO | M |
| Q3.4 | Default card language | German. Settr remembers the last language used | E |
| Q3.5 | Chinese data gap | Simplified Chinese copies can be tracked **from day one** on the M6a card list (the Simplified Chinese set mirrors it: 176 cards on Cardmarket and in the only SC dataset). Chinese Pokémon names are auto-derived from open data. The complete SC dataset can't be used (R2.8), so names stay derived + curated | E (adapted to Simplified) |
| Q3.6 | Name display | Your copy's language in the collection. German in the catalog, including derived German names for Japanese/Chinese cards | E |

### 4. Catalog scope (v1)

| ID | Topic | Decision | Src |
|---|---|---|---|
| Q4.1 | v1 set | *30 Jahre*: EN/DE main set 001–158 + R/G/B, **Classic Collection (30)** and **8 Energies** as sections. Japanese/Simplified Chinese **M6a** (176) | E |
| Q4.2 | Promos | Yes, as a "Promos" section as data becomes available | E |
| Q4.3 | Sealed | **DE + EN + JP + Traditional & Simplified Chinese products.** I also include Pokémon Center exclusives and Japanese lottery/specialty items, because they come with Cardmarket's product list at no extra cost | M+ |
| Q4.4 | JP Premium Deck Set (MF) | Later | E |
| Q4.5 | Sets after v1 | Set by set once the core is done, starting with the sets you own (Mega Evolution era first, R2.5) | E |
| Q4.6 | Missing images | Another language of the same print → the same artwork from the other print (labeled) → your own photo → a designed placeholder. No official publisher images | E |

### 5. Collection details

| ID | Topic | Decision | Src |
|---|---|---|---|
| Q5.1 | Attributes | Condition, grading, notes, tags, storage location. Signed/altered/misprint aren't in the v1 UI. Photos come later | E |
| Q5.2 | Condition | **Default NM**, with the full Cardmarket scale for your LP/damaged copies ("Damaged" ≈ *Poor (PO)*) | M |
| Q5.3 | Grading | **Planned**: grading fields (company, grade, certificate) in v1. Graded copies get their own price series | M |
| Q5.4 | Quantities | Lots with quantity | E |
| Q5.5 | Completion | Basis, Komplett and Master, per language with an "any language" toggle | E |
| Q5.6 | Sealed states | versiegelt / beschädigt / geöffnet | M |
| Q5.7 | Binders | **Withyu 12-pocket + VaultX 9-pocket.** Storage locations know the page layout (9 = 3×3, 12 = 3×4 or 4×3) and store **page + slot** per copy. Settr suggests the next free slot | M |
| Q5.8 | Opening sealed | Mark as opened and optionally log the pulls. The product's cost is split proportionally to the cards' values at opening (evenly for unpriced pulls) | E |

### 6. Prices and profit/loss

| ID | Topic | Decision | Src |
|---|---|---|---|
| Q6.1 | Currency | EUR only | E |
| Q6.2 | Price reference | One reference price per card + language (graded copies separate), plus an optional per-copy value, e.g. for your LP/damaged copies | E |
| Q6.3 | Price you record | **The lowest offer in the card's language from sellers in Germany.** The default price type is "ab (DE)", and Cardmarket links open with those filters preset | M |
| Q6.4 | Fees | Optional fees/shipping per entry | E |
| Q6.5 | Sales | Yes: sell/trade (also partially) with realized profit/loss | E |
| Q6.6 | Price-guide suggestions | **Yes.** A daily snapshot of Cardmarket's public price guide feeds *suggestions* on card pages and in the price session. They're never saved without your confirmation. Note: for DE/EN cards the guide mixes all languages and countries, so it's labeled as such | M |
| Q6.7 | Stale after | 14 days | E |
| Q6.8 | Unpriced items | Excluded from totals and shown as "X unbepreist" | E |
| Q6.9 | Link filters | Language of your copy + seller country Germany (from Q6.3) + Near Mint or better (R2.2) | M/E |

### 7. Data and devices

| ID | Topic | Decision | Src |
|---|---|---|---|
| Q7.1 | Backup reminder | After 7 days | E |
| Q7.2 | Auto-backup to folder | Later (post-v1) | E |
| Q7.3 | Several devices | Export/import (+ merge) in v1. Sync later | E |
| Q7.4 | Import files | None yet | M |
| Q7.5 | Encrypted backups | Not needed | E |

### 8. Tech, hosting, legal

| ID | Topic | Decision | Src |
|---|---|---|---|
| Q8.1 | Stack | As recommended (`docs/ARCHITECTURE.md`) | E |
| Q8.2 | Monetization | None, so the Vercel Hobby plan fits | E |
| Q8.3 | Analytics | None | E |
| Q8.4 | Images | Loaded directly from TCGdex (mentioned in the privacy note) | E |
| Q8.5 | Network for jobs | Catalog sync and price-guide snapshot run in **GitHub Actions** | E |
| Q8.6 | Git workflow | One PR per milestone with Vercel preview links, plus GitHub Actions CI | E |
| Q8.7 | License | Private repository, all rights reserved. *(The repository is public today → R3.2)* | E |

### 9. Design

| ID | Topic | Decision | Src |
|---|---|---|---|
| Q9.1 | Direction | Mockups first: a design canvas with three glass-based directions. Your pick: **D** (R2.1) | E |
| Q9.2 | Theme | Follows the system setting; both themes are designed | E |
| Q9.3 | Fonts/colors | Mona Sans in **bold** weights. D palette with one accent (R2.1, R3.1) | E |
| Q9.4 | Brand | Wordmark **"Settr"**. Tagline *"Jede Karte. Jedes Set. Jeder Cent."* plus the short *"Jede Karte zählt."* (R2.7) | M |
| Q9.5 | References | **Revolut, Apple, Wise.** Bold fonts, clean designs, Apple minimalism, Apple's new **Liquid Glass** look | M |
| Q9.6 | Motion | Signature moments only | E |
| Q9.7 | Pokémon references | Subtle (type colors in chips) | E |
| Q9.8 | Priority | **Desktop first**, with mobile fully supported | M |

### 10. Feature ideas

| ID | Idea | Decision | Src |
|---|---|---|---|
| I-01 | Price session | **v1** | E |
| I-02 | Binder view | **v1.1** (R2.4) | E |
| I-03 | Command palette + shortcuts | **v1** | E |
| I-04 | Holo viewer + transitions | **v1** | E |
| I-05 | Privacy mode | **v1** | E |
| I-06 | Wishlist | Later | E |
| I-07 | Quick-add mode | **v1** | E |
| I-08 | Exact Cardmarket links | **v1** | E |
| I-09 | Grading tracker | Later | E |
| I-10 | Barcode scan | Later | E |
| I-11 | Pack-opening log + ROI | Basic opening + pull logging in **v1** (Q5.8). ROI analytics later | E |
| I-12 | Own photos | Later | E |
| I-13 | Camera scanning | No (for now) | E |
| I-14 | Cardmarket purchase import | **Not yet** (post-v1) | M |
| I-15 | Auto-backup to folder | Later (in Brave only after enabling a browser flag, ADR-027) | E |
| I-16 | CSV import wizard | Later, generic only (no Collectr preset, R2.5) | E |
| I-17 | Encrypted backups | Later | E |
| I-18 | Sync via own cloud | Later | E |
| I-19 | Demo data | **No** | M |
| I-20 | Tags + storage locations | **v1** (binder-aware, Q5.7) | E |
| I-21 | Spending analytics | Later | E |
| I-22 | Offline set download | Later | E |
| I-23 | Share images | Later | E |
| I-24 | Duplicates & trade list | Later | E |
| I-25 | Insurance list (PDF) | Later | E |
| I-26 | Tax holding-period hint | Later | E |
| I-27 | Printable checklists | Later | E |
| I-28 | Box EV & pull statistics | Later | E |
| I-29 | Multiple profiles | No | E |
| I-30 | Goals | Later | E |
| I-31 | Watchlist reminders | Later | E |
| I-32 | JP ↔ EN counterpart links | Later | E |
