# Settr: Questions and Decisions

> Last updated: 2026-09-23.
> **Round 1: answered ✓** (decisions below, incorporated into spec v0.2).
> **Round 2: open** (9 short questions).
> **Coding: not started.** It needs your explicit **"Go"**.

## How to answer

- Tick options with `[x]`, or write under **Antwort:**. German or English is fine, and so is answering in chat.
- ⭐ = my recommendation. ★ = needed before coding starts.
- As before: anything you leave open, I'll take my recommendation.

---

## Round 2: open questions

**R2.1 ★ Design direction.** Open the **design canvas** (link in chat, "Settr Design Directions"). It shows three glass-based directions built from your references (Revolut, Apple, Wise; bold type; Apple minimalism; Liquid Glass): dashboard and card detail on desktop, plus the set grid on mobile. Which one should Settr get?
- [ ] ⭐ **A · Vault Glass**: dark, gold accent, smoked glass
- [ ] **B · Studio Glass**: light, Apple minimalism, frosted glass
- [ ] **C · Bold**: Revolut/Wise energy, heavy type, cobalt "wallet" cards
- [ ] Mix (e.g. "A, but with C's big numbers"): …

How much glass?
- [ ] Subtle
- [ ] ⭐ Balanced (floating sidebar, toolbar, tab bar, sheets)
- [ ] Strong

Antwort:

**R2.2 Condition filter for your "lowest price" check.** Your rule is: the cheapest offer in the card's language from German sellers. Should Settr's Cardmarket links also filter by condition?
- [ ] Any condition (literally the cheapest offer)
- [ ] ⭐ Near Mint or better. The reference price then means "NM", and your LP/damaged copies get a per-copy value when you want one
- [ ] Excellent or better

Antwort:

**R2.3 Traditional Chinese cards.** You collect **Simplified** Chinese cards but also want **Traditional** Chinese sealed products. If you open a Traditional Chinese booster, should those cards be trackable too?
- [ ] ⭐ Yes, enable ZH-TW as a card language as well (no extra effort)
- [ ] No

Antwort:

**R2.4 Binder view.** You use a Withyu 12-pocket and a VaultX 9-pocket binder, and Settr will store binder, page and slot for every card. A virtual binder view could mirror your real binders page by page. When?
- [ ] Already in v1
- [ ] ⭐ Right after v1 (v1.1)
- [ ] Later

Antwort:

**R2.5 Your Collectr collection.** Which sets are your ~200 cards from, roughly? Do you have **Collectr Pro**? It's needed for Collectr's CSV export, which a Settr importer would read. v1 only contains *30 Jahre*, so your other cards would need their sets first:
- [ ] ⭐ Add the sets I own right after v1 (v1.1), plus a Collectr import
- [ ] Before v1 goes live
- [ ] No hurry

Sets / Collectr Pro:

**R2.6 Collectr as a benchmark.** What do you like most about Collectr, and what annoys you? This tells me exactly what Settr has to beat.

Antwort:

**R2.7 Short tagline** (next to *"Jede Karte. Jedes Set. Jeder Cent."*):
- [ ] ⭐ *"Jede Karte zählt."*
- [ ] *"Sammeln mit System."*
- [ ] *"Dein Set. Dein Wert."*
- [ ] Own idea: …

Antwort:

**R2.8 Simplified Chinese data.** TCGdex has no Simplified Chinese data. The only complete source (the GitHub dataset `duanxr/PTCG-CHS-Datasets`, 176 cards for this set, with images) forbids redistribution without the maintainer's permission.
- [ ] ⭐ Yes: draft a short, polite permission request (non-commercial, private tool) that you send from your GitHub account. Until then, Settr uses auto-derived Chinese Pokémon names plus manual names for the few Trainer cards
- [ ] No, manual/auto-derived names only

Antwort:

**R2.9 Which browser on your Windows PC?**
- [ ] Chrome · [ ] Edge · [ ] Firefox · [ ] Other: …

Chrome and Edge also allow automatic backups into a folder (I-15).

Antwort:

**Ready?** When the plan and the design direction look right, write **"Go"** and I'll start milestone **M1 (Foundation)**.

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
| Q1.6 | Current tool | **Collectr**. A Collectr CSV import comes after v1 (I-16; see R2.5) | M |

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
| Q3.3 | Card languages | **DE, EN, JA, ZH (Simplified)**. No FR/IT/ES/PT/KO | M |
| Q3.4 | Default card language | German. Settr remembers the last language used | E |
| Q3.5 | Chinese data gap | Simplified Chinese copies can be tracked **from day one** on the M6a card list (the Simplified Chinese set mirrors it: 176 cards on Cardmarket and in the only SC dataset). Chinese Pokémon names are auto-derived from open data. Full names and images follow once a source is cleared (R2.8) | E (adapted to Simplified) |
| Q3.6 | Name display | Your copy's language in the collection. German in the catalog, including derived German names for Japanese/Chinese cards | E |

### 4. Catalog scope (v1)

| ID | Topic | Decision | Src |
|---|---|---|---|
| Q4.1 | v1 set | *30 Jahre*: EN/DE main set 001–158 + R/G/B, **Classic Collection (30)** and **8 Energies** as sections. Japanese/Simplified Chinese **M6a** (176) | E |
| Q4.2 | Promos | Yes, as a "Promos" section as data becomes available | E |
| Q4.3 | Sealed | **DE + EN + JP + Traditional & Simplified Chinese products.** I also include Pokémon Center exclusives and Japanese lottery/specialty items, because they come with Cardmarket's product list at no extra cost | M+ |
| Q4.4 | JP Premium Deck Set (MF) | Later | E |
| Q4.5 | Sets after v1 | The rest of the *Mega-Entwicklung* era, re-prioritized by the sets you actually own (R2.5) | E |
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
| Q6.9 | Link filters | Language of your copy + seller country Germany (from Q6.3). Condition filter → R2.2 | M/E |

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
| Q8.7 | License | Private repository, all rights reserved | E |

### 9. Design

| ID | Topic | Decision | Src |
|---|---|---|---|
| Q9.1 | Direction | Mockups first: a design canvas with three glass-based directions. Your pick → **R2.1** | E |
| Q9.2 | Theme | Follows the system setting; both themes are designed | E |
| Q9.3 | Fonts/colors | Mona Sans in **bold** weights. Colors per direction (R2.1) | E |
| Q9.4 | Brand | Wordmark **"Settr"**. Tagline *"Jede Karte. Jedes Set. Jeder Cent."* plus a short one → R2.7 | M |
| Q9.5 | References | **Revolut, Apple, Wise.** Bold fonts, clean designs, Apple minimalism, Apple's new **Liquid Glass** look | M |
| Q9.6 | Motion | Signature moments only | E |
| Q9.7 | Pokémon references | Subtle (type colors in chips) | E |
| Q9.8 | Priority | **Desktop first**, with mobile fully supported | M |

### 10. Feature ideas

| ID | Idea | Decision | Src |
|---|---|---|---|
| I-01 | Price session | **v1** | E |
| I-02 | Binder view | Later → R2.4 | E |
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
| I-15 | Auto-backup to folder | Later | E |
| I-16 | CSV import wizard | Later (Collectr preset first) | E |
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
