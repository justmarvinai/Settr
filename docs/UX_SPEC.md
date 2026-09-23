# Settr: UX Specification

> Status: **Draft v0.3** (round-2 answers incorporated) · Last updated: 2026-09-23
> Covers the information architecture, navigation, screen specifications, key flows, states and keyboard model.
> Visual language (colors, type, motion) lives in [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md): direction **D · Bold Studio**, light and dark (R2.1). Its artboards on the design canvas are the visual reference for the shell (§3) and the Übersicht, set and card screens (§4.1, §4.3, §4.4); Marvin confirmed the final look with the *Indigo* accent (R3.1). Feature IDs (`CAT-02`, `PRC-04`, …) refer to [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md).
> References like (Q6.3) or (R2.1) point to decisions in [`USER_QUESTIONS.md`](../USER_QUESTIONS.md). All three question rounds are answered (R3.x = round 3, 2026-09-23).
> **Platform priority:** Windows desktop (**Brave**, Chromium; R2.9) first, then iPhone (installed PWA, Safari/WebKit). **UI language:** German only (Q3.1).

---

## 1. UX principles

1. **Usability first.** Marvin's rule (R2.1): *"Usability and user experience is always #1."* When looks and usability conflict, usability wins: legibility, WCAG AA contrast, 44 px touch targets, keyboard paths, and no decoration that hides data.
2. **Cards first.** Card and product imagery is the hero. The UI recedes with hairline borders, calm surfaces and no decorative noise.
3. **Speed of entry is the product.** Prices are entered by hand, so every capture flow is designed for speed: adding a card takes **≤ 3 interactions** in the full form and **one** with quick add (＋) from the grid, and a price update takes **one number and Enter**. Desktop is keyboard-first and mobile is thumb-first. Marvin's existing cards come over by hand (R2.5), so this matters from day one.
4. **Numbers you can trust.** Tabular numerals, explicit currency, explicit dates ("Preis vom 12.09.2026"), visible staleness, **every price tied to its card language** (R2.6), and no silent assumptions such as treating an unpriced item as worth zero.
5. **Private and safe by default.** Data never leaves the device. Backup status is always visible. Every destructive action can be undone, and imports take a safety snapshot first.
6. **Progressive disclosure.** Smart defaults (language, condition, variant, price type) keep the everyday form short. Grading, fees, storage location, photos and notes sit behind "Mehr Details".
7. **Robust in four scripts.** German strings run about 30 % longer than English, and Japanese/Chinese names need proper CJK typography. Layouts must never truncate prices or card numbers.
8. **Delight with restraint.** Holo foil, shared-element transitions and scrubbable charts are signature moments, but they're used sparingly and are always disabled under `prefers-reduced-motion`.

---

## 2. Information architecture

### 2.1 Vocabulary (UI, German-first)

| Concept | German UI label | English UI label | Meaning |
|---|---|---|---|
| Dashboard | **Übersicht** | Overview | Portfolio summary and entry points |
| My collection | **Sammlung** (tabs: *Karten*, *Sealed*) | Collection | Everything you own: the user's "card library" and "sealed library" |
| Catalog | **Katalog** (tabs: *Sets*, *Karten*, *Sealed*) | Catalog | Everything that exists in Settr's database, whether you own it or not |
| Prices | **Preise** | Prices | Price capture hub, price-update session, stale prices |
| Analytics | **Portfolio** | Portfolio | Value over time, P/L, allocation |
| Wishlist | **Wunschliste** | Wishlist | Wanted items with target prices. **Post-v1** (I-06); hidden in v1 |
| Settings | **Einstellungen** | Settings | Preferences, data (import/export), about/legal |

> Decision (Q2.1): the brief's "card library" and "sealed library" = **your own collection** (Sammlung). "Card search" and "sealed search" = the **catalog**. The UI shows German labels only (Q3.1); the English column documents the future translation.

### 2.2 Sitemap and routes

Route slugs are English and language-neutral. Labels are localized.

```
/                                   Übersicht (dashboard)
/collection/cards                   Sammlung › Karten   (views: grid | table | binder)
/collection/sealed                  Sammlung › Sealed   (views: grid | table)
/catalog                            Katalog › Sets      (all supported sets, grouped by series & print)
/catalog/sets/$setId                Set detail          (tabs: Karten | Sealed | Statistik)
/catalog/cards?…                    Card search         (full catalog, filters in URL search params)
/catalog/cards/$cardId              Card detail
/catalog/sealed?…                   Sealed search
/catalog/sealed/$productId          Sealed product detail
/prices                             Preise hub          (stale items, recent entries, start session)
/prices/session?scope=…             Price-update session (focus mode)
/portfolio                          Portfolio           (tabs: Entwicklung | Aufteilung | Performance | Ausgaben)
/wishlist                           Wunschliste         (post-v1, I-06)
/settings                           Einstellungen       (sections: Allgemein | Darstellung | Preise | Daten | Über)
/settings/data                      Daten               (export, import, CSV, storage, reset)
/onboarding                         First-run flow (only until completed)
```

- **All filter, sort and view state lives in typed URL search params** (TanStack Router). Views are therefore shareable and bookmarkable, and the back button behaves as expected.
- Detail pages open as **full pages**. Add/edit flows open as **sheets** (right side panel on desktop, bottom sheet on mobile) so context is never lost.

---

## 3. Global layout

### 3.1 Breakpoints

| Name | Width | Shell |
|---|---|---|
| `sm` (phone) | < 640 px | Top app bar + **bottom tab bar** + center **＋** action |
| `md` (tablet) | 640–1023 px | Collapsed **icon rail** (64 px) + top bar |
| `lg` (desktop) | ≥ 1024 px | **Floating glass sidebar** (236 px, collapsible) + floating toolbar |
| `xl` | ≥ 1440 px | Same, with wider content and optional right detail panel |

### 3.2 Desktop shell (wireframe)

```
┌──────────────┬──────────────────────────────────────────────────────────────────┐
│ ◆ Settr      │  Sammlung › Karten           [ ⌕  Suchen…     Strg K ]  ◐  👁  [＋ Hinzufügen] │
│ Jede Karte   ├──────────────────────────────────────────────────────────────────┤
│ zählt.       │                                                                  │
│ ▣ Übersicht  │                          page content                            │
│ ▤ Sammlung   │                                                                  │
│ ▦ Katalog    │                                                                  │
│ € Preise   3 │                                                                  │
│ ↗ Portfolio  │                                                                  │
│ SETS         │                                                                  │
│ ◔ 30 Jahre   │                                                                  │
│ ─────────────│                                                                  │
│ ⛁ Backup     │                                                                  │
│   fällig     │                                                                  │
│ ⚙ Einstell.  │                                                                  │
└──────────────┴──────────────────────────────────────────────────────────────────┘
```

- **Liquid Glass chrome (DSN-05, *Balanced*, R2.1):** the sidebar is a **floating glass panel** (236 px, inset 12 px from the window edges, radius 24), and the top bar is a floating glass toolbar (radius 20). List pages add a **sticky glass filter bar** (§4.3). Content scrolls **beneath** them, so card art tints the glass. It's solid when *Transparenz reduzieren* is on. Details in `DESIGN_SYSTEM.md` §3.5.
- **Top bar:** page title/breadcrumb · global search (opens the command palette; shortcut labels are platform-aware, e.g. **Strg K** on Windows and ⌘K on Mac/iPad) · theme toggle (◐, a quick light/dark switch; the setting lives in Einstellungen › Darstellung) · **privacy toggle (👁)**, which blurs every money value (PRT-05) · primary **＋ Hinzufügen**.
- **Sidebar:** the wordmark with the short tagline *"Jede Karte zählt."* underneath (R2.7) · navigation (Übersicht, Sammlung, Katalog, Preise, Portfolio) · a **Sets** quick-access section with pinned and recently opened sets, each with its progress ring, so it stays useful as sets are added after v1 (R2.5) · footer with the backup status and Einstellungen.
- **Backup status (DAT-04):** a pill in the sidebar footer, e.g. *"Backup vor 3 Tagen"*. Once a backup is due (after N days, default 7, Q7.1) it turns amber and reads *"Backup fällig · Letztes vor 12 Tagen"*. It links to `/settings/data`.
- The badge on **Preise** shows the number of stale prices.

### 3.3 Mobile shell

```
┌───────────────────────────┐
│ Sammlung            ⌕  👁 │  ← top app bar (large title collapses on scroll)
├───────────────────────────┤
│                           │
│        content            │
│                           │
├───────────────────────────┤
│  ▣     ▤     (＋)    ▦   € │  ← bottom tabs: Übersicht · Sammlung · Add · Katalog · Preise
└───────────────────────────┘
```

- **＋** opens a bottom sheet with a search field (autofocus): pick a card or product and the add form follows.
- Portfolio and Einstellungen are reached via the **"Mehr"** item or from the Übersicht tiles.
- The tab bar is a **floating glass pill** (safe-area aware on iPhone).
- Bottom sheets use snap points (50 % / 92 %), and drag-to-dismiss is supported.

---

## 4. Screen specifications

Each screen lists its **purpose**, **layout**, **key interactions** and **states**.

### 4.1 Übersicht (Dashboard) · PRT-01

**Purpose:** answer "What's my collection worth, am I up or down, and what needs my attention?" in one glance.

```
┌───────────────────────────────────────────────┬───────────────────────────┐
│ Gesamtwert                            1M 3M 6M 1J Max │ Preise veraltet            │
│ 4.812,40 €                                     │  37 Positionen > 14 Tage   │
│ +612,15 € (+14,6 %) · Investiert 4.200,25 €    │  [Preis-Session starten →] │
│ ╭──────────────────────────────────────────╮  ├───────────────────────────┤
│ │      ___/‾‾\__/‾‾‾‾‾‾\___/‾‾‾‾‾‾‾‾        │  │ Set-Fortschritt            │
│ │ ___/                                     │  │  ◔ 30th DE   64 %          │
│ ╰──────────────────────────────────────────╯  │  ◑ 30th JA   48 %          │
├──────────────────────┬────────────────────────┴───────────────────────────┤
│ Top-Gewinner         │ Aufteilung              │ Zuletzt hinzugefügt       │
│ ▲ Pikachu ex SAR +38%│  ◕ Karten 62 % Sealed 38%│ [card][card][card][card]  │
│ ▲ …                  │  nach Sprache ▸          │                            │
│ Top-Verlierer ▼ …    │                          │                            │
└──────────────────────┴──────────────────────────┴───────────────────────────┘
```

- **Hero tile:** a big animated number (tabular, counts up on first load only), P/L in absolute and percent terms using sign, arrow and color (never color alone), and invested capital. The chart has a range selector. **Scrubbing** the chart updates the hero number to the value on that date, Robinhood-style. A toggle switches between *Wert* and *Gewinn/Verlust*, with an optional overlay line for invested capital.
- **Stale prices tile:** a count, plus a CTA that starts the price session scoped to stale items.
- **Set progress tile:** foil rings per set × language. A click opens the set detail.
- **Movers tile:** top 5 gainers and losers since purchase (toggle abs/%), each linking to its card.
- **Allocation tile:** a donut split by singles, sealed and graded. Drilldown goes to Portfolio › Aufteilung.
- **Recently added tile:** a horizontal strip of the last 10 holdings.
- **Unpriced notice:** when holdings have no price, a subtle line such as "12 Positionen ohne Preis. Nicht im Gesamtwert enthalten." links to a filtered collection.
- **Empty state (first run):** a 3-step welcome ("Set öffnen → Karte hinzufügen → Preis eintragen") and the backup/persistence explainer. There's no demo data (I-19 = no).

### 4.2 Katalog › Sets · CAT-01

- A grid of **set tiles**: logo artwork, series, localized name, release date per language, card counts (official/total) and the user's **progress ring**.
- **Print switcher** (segmented): *International (DE/EN/…)* · *Asien (JA/ZH/…)*. The two prints are separate set structures with different card lists and numbering (see `DATA_MODEL.md` §2). A language filter narrows further (e.g. only sets available in `zh-tw`).
- v1 has very few sets. The layout must still scale to 150+ sets later, so it's grouped by series with sticky series headers and a per-series collapse. Screens and routes are multi-set and multi-era from day one (ADR-028), because Marvin's sets are added era by era after v1 (R2.5).

### 4.3 Set detail · CAT-02, COL-07

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [SET LOGO]  <Serie> · International · Release 2026-xx-xx · 000 Karten    │
│             <SET NAME DE>   (big display title)                          │
│             <Original name JA>                                           │
│             Druck: (International|Asien)   Sprache: (DE|EN)              │
│             Basis 64 % · 000/000        Komplett 51 %   Master 38 %      │
├──────────────────────────────────────────────────────────────────────────┤
│ [Karten] [Sealed] [Statistik]                                              │
│ (Alle 00|Besitzt 00|Fehlt 00)  Bereich ▾  Seltenheit ▾  Typ ▾  Sortierung ▾  ⌕ In Set suchen  ▦|☰ │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                      │
│ │img │ │img+│ │░░░░│ │img │ │img │ │░░░░│ │img │ │img │   ░ = missing (ghost) │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘   + = quick add      │
│ 001 ●● 002 ●  003    004 ●  …                            ● = variant owned    │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Header (R2.1):** a big set title in display type under an eyebrow line (series · print · release date · card count), the **print switch** (*International / Asien*), the card-language switch, and completion: *Basis* as a big percentage, plus *Komplett* and *Master*.
- **Sticky glass filter bar (R2.1):** *Alle / Besitzt / Fehlt* with counts, *Bereich* (section), *Seltenheit*, *Typ*, *Variante* (only for sets with variants), *Sortierung* (number, value, name, recently added), in-set search, and a grid/list toggle. It stays under the toolbar while the grid scrolls beneath it.
- **Card tile:** image with lazy loading and a card-back shimmer placeholder, then number, localized name and a rarity glyph.
  - *Owned:* full color, a quantity badge ("×3"), and **variant dots** (normal, reverse, special patterns) that are filled when owned.
  - *Missing:* a desaturated 35 % "ghost" with a dashed outline. It can be toggled to fully hidden.
  - *Hover or keyboard focus (desktop):* a subtle lift and tilt with a **＋** quick-add button and a **€** quick-price button.
  - **Quick add (R2.1):** **＋** adds one copy immediately with defaults (the language of the current view, NM, no price) and shows an undo toast (*"Hinzugefügt: <Nr.> <Name> · DE · NM"* · *Rückgängig*). It counts as one interaction. The full add sheet (§4.7, ≤ 3 interactions) stays one step away: `N` on the focused tile, *Hinzufügen* on the card page, or the long-press menu on mobile.
  - *Long-press (mobile):* a context sheet with Hinzufügen, Preis eintragen and Details (+ Zur Wunschliste once I-06 ships).
- **Progress definitions** (Q5.5, all three shown): *Basis* counts the numbered main set, *Komplett* adds secret rares, and *Master* adds subsets and energies (every card × variant). They're computed per selected language, with an "any language" toggle.
- **Density control:** S / M / L tile sizes, persisted per device.
- **Sealed tab:** the set's products in the same tile language, showing product images.
- **Statistik tab:** a rarity distribution of owned vs total, the set's value in the collection, and the most valuable cards.

### 4.4 Card detail · CAT-03

```
┌───────────────────────────────┬──────────────────────────────────────────┐
│                               │ Pikachu ex                    ← 024 · 026 → │
│      ┌───────────────┐        │ ピカチュウex · 皮卡丘ex                     │
│      │               │        │ <Set> · Nr. 025/xxx · Special Illustration Rare │
│      │   HOLO CARD   │        │ Elektro · 200 KP · Illus. <Name>            │
│      │  (tilt+foil)  │        ├──────────────────────────────────────────┤
│      │               │        │ Sprache [DE][EN]   Variante [Holo][Reverse]  │
│      └───────────────┘        │ Aktueller Preis  34,90 €  · Deutsch · 12.09. │
│   [DE] [EN]  (print languages) │ ab (DE) · NM oder besser     [↗ Cardmarket] │
│                               │ [ Neuer Preis … ]  [ab (DE) ▾]  [Speichern ⏎]│
│                               │ Preisguide 22.09. · alle Sprachen & Länder   │
│                               │ ab 29,90 € · Trend 33,10 €                   │
│                               ├──────────────────────────────────────────┤
│                               │ Preisverlauf    1M 3M 6M 1J Max             │
│                               │ ╭────────────────────────────────────╮     │
│                               │ │ ●───●────────●──●                   │     │
│                               │ ╰────────────────────────────────────╯     │
│                               ├──────────────────────────────────────────┤
│                               │ In deiner Sammlung (3)          [＋ Hinzufügen] │
│                               │ DE · Holo · NM · ×1 · 22,00 € → 34,90 € +58,6 % │
│                               │ DE · Holo · LP · ×1 · 18,00 € → 20,00 € +11,1 % │
│                               │   ↳ eigener Wert · 20.09.                       │
│                               │ DE · Holo · PSA 10 · ×1 · 120 € → 180 € +50 %  │
└───────────────────────────────┴──────────────────────────────────────────┘
```

- **Holo viewer (DSN-01):** pointer and gyroscope tilt, glare, and a rarity-driven foil layer. Click for fullscreen. Only languages available in this print are offered.
- **Series selector:** the language and variant chips (plus a grade selector when graded copies exist) choose which **price series** is shown and edited.
- **Price context (R2.2, R2.6):** the panel states what the current price means: card language, price type and condition, e.g. *"Aktueller Preis · Deutsch · ab (DE) · NM oder besser · 12.09."*. A price never appears under another language's series.
- **Inline price entry (PRC-01):** amount with a German decimal comma, date (default today) and type (default **"ab (DE)"**, i.e. the lowest offer in this language from German sellers, **Near Mint or better**, Q6.3/R2.2). **Speichern** or Enter saves, and the entry pulses into the chart.
- **Price-guide suggestion (PRC-09):** a quiet chip under the input, labeled with date and scope: *"Preisguide 22.09. · alle Sprachen & Länder: ab 89,00 € · Trend 97,40 €"*. Its info tooltip reads *"alle Sprachen & Länder"* for international cards. Clicking a value copies it into the input, and Enter saves it (`origin: guide`). It's never saved automatically.
- **Cardmarket button (PRC-06):** opens the exact Cardmarket product in a new tab, pre-filtered by **the copy's language + seller country Germany + Near Mint or better** (R2.2; `minCondition=2` verified by Marvin, R3.5). Traditional Chinese copies open the JP product with Cardmarket's T-Chinese language filter (R2.3).
- **Holdings list:** every lot of this card shows its cost, current value and P/L, with inline edit and a context menu (Bearbeiten, *Eigener Wert…*, Verkaufen…, Duplizieren, Löschen).
  - ***Eigener Wert* (PRC-07, R2.2):** the reference price means Near Mint or better, so a worse copy (LP, damaged) can get its own per-lot value with a date and an optional note. That lot then shows the value with an *"eigener Wert"* tag, and it goes stale like any price.
- **Prev/next:** ← / → keys and swipe on mobile, in set order.
- **Shared-element transition (DSN-02):** the tile image morphs into the hero image.

### 4.5 Sealed product detail · CAT-05

This screen uses the same structure as card detail, but:
- The hero is a product image with a light 3D parallax and no foil. A placeholder with product-type iconography is shown when no image exists.
- **Details:** product type (e.g. *Display*, *Top-Trainer-Box*, *Booster-Bundle*), contents (e.g. "36 Booster à 10 Karten"), release date per language, MSRP (*UVP*) where known, and EAN when curated.
- **Holdings:** language · status (*versiegelt / geöffnet / beschädigt*) · qty · cost → value.
- **Öffnen…** action (COL-12, Q5.8) turns a sealed holding into an opened one and optionally continues into pull logging. The product's cost is split proportionally to the pulls' values.

### 4.6 Sammlung › Karten / Sealed · COL-04, COL-05

- **Summary bar:** item count, distinct cards, *Wert*, *Investiert*, *G/V* (abs and %). It respects the active filters.
- **Views:**
  - *Raster* (grid): tiles as in set detail, plus value and P/L chips.
  - *Tabelle* (table): virtualized. Default columns are Karte (thumb + name), Set, Nr., Sprache, Variante, Zustand, Menge, Einkauf/Stk., Wert/Stk., Wert, G/V, G/V %, and Preis vom. Columns are configurable and sortable.
  - *Binder* (COL-08, v1.1 right after v1, R2.4; v1 already stores binder, page and slot): your real binders page by page (3×3 VaultX, 3×4/4×3 Withyu), or set order with missing-pocket placeholders.
- **Filters** (chips + popover, in the sticky glass filter bar, R2.1): Set, Sprache, Seltenheit, Variante, Zustand, Gradiert, Tags, Lagerort, Bepreist/Unbepreist, Preis veraltet, G/V positiv/negativ, and Kaufdatum range.
- ***Eigener Wert*:** lots with a per-copy value (PRC-07, R2.2) show it with the *"eigener Wert"* tag in tiles and table cells.
- **Group by:** none · Set · Sprache · Seltenheit · Lagerort.
- **Multi-select:** tag, move location, start a price session for the selection, export the selection as CSV, or delete (with undo).
- **Empty state:** an illustrated empty binder with "Öffne ein Set und tippe auf ＋" and a button to the catalog.

### 4.7 Add / edit holding sheet · COL-01, COL-02

```
┌ Karte hinzufügen ─────────────────────────────── ✕ ┐
│ [thumb] Pikachu ex · <Set> · 025/xxx       ändern │
│                                                     │
│ Sprache    [DE] [EN]                                 │  ← only languages of this print
│ Variante   (Holo) (Reverse Holo) (…)                 │  ← only variants that exist
│ Zustand    MT [NM] EX GD LP PL PO                     │  ← Cardmarket scale; tooltips ("PO ≈ Damaged")
│ Menge      [ − 1 + ]                                  │
│ Kaufpreis  [ 4,50 € ]  ( pro Stück | gesamt )         │
│ Kaufdatum  [ 23.09.2026 ]   Quelle [ Cardmarket  ▾ ]  │
│ Lagerort   [ VaultX 9er ▾ ] Seite [4] Platz [7]  ✓ nächster freier │
│ ▸ Mehr Details (Gebühren/Versand, Grading, Tags, Notiz) │
│                                                     │
│        [Hinzufügen & nächste]   [ Hinzufügen ⏎ ]     │
└─────────────────────────────────────────────────────┘
```

- **Defaults** come from settings and the last-used values: language, condition, source, and variant (the first existing one).
- **Money input** accepts `4,5`, `4,50`, `4.50` and `4,50 €`, and stores **integer cents**. Currency is EUR only (Q6.1).
- **Lagerort (COL-09, Q5.7):** binder (with its page layout) + page + slot. Settr pre-fills the **next free slot** of the last-used binder. Occupied slots are warned about, not blocked (a slot can hold a stack).
- **"Hinzufügen & nächste"** keeps the sheet open and advances to the next card number, which gives a fast sequential entry mode.
- **Validation:** quantity ≥ 1, price ≥ 0, and date not in the future. A warning (not an error) appears when the price is far above the latest known price.
- **Sealed variant:** no variant or condition. It has *Status* (versiegelt/beschädigt) instead.

### 4.8 Quick-add mode · COL-06

- Entry points: set detail → "Schnellerfassung", or the command palette (Strg K) → "Schnellerfassung".
- A focus-mode panel with sticky defaults at the top (Sprache, Variante, Zustand, Quelle, Kaufdatum). The main input takes a **card number**: typing `25` shows the card preview, and `Enter` adds 1 copy.
  - Modifiers: `25x3` adds 3 copies, `25r` adds a reverse holo, and `25 4,50` adds one with a purchase price.
- A running list below shows each added item with undo.

### 4.9 Price entry popover · PRC-01

- Opened from a tile's € button, the detail page, a table row or the keyboard shortcut `P`.
- Fields: amount (autofocus), date (default today), type (*Trend*, *ab*, *30-Tage-Ø*, *7-Tage-Ø*, *Verkauft*, *Eigene Schätzung*, with the default from settings) and an optional note.
- It shows the last price and its date, and a live delta vs last (+/− abs and %).
- `Enter` saves and `Esc` closes. "Unverändert" (`U`) re-confirms the last price with today's date.

### 4.10 Price-update session · PRC-04 (signature feature)

Updating dozens of prices by hand is tedious. The session turns it into a fast, almost satisfying ritual.

```
┌ Preis-Session · Veraltete Preise · 12 / 37 ─────────────── ▬▬▬▬▬▬░░░░░░ ─ ✕ ┐
│                                                                            │
│   ┌─────────┐   Pikachu ex · 025/xxx · <Set>                               │
│   │  card   │   Deutsch · Holo · Raw (NM)                                  │
│   │  image  │   Letzter Preis: 31,50 € (Trend) · vor 21 Tagen               │
│   └─────────┘   Einkauf: 22,00 €/Stk. · Menge: 2                           │
│                                                                            │
│                 [↗ Auf Cardmarket öffnen  (C)]                             │
│                                                                            │
│                 Neuer Preis  [ 34,90 € ]  Typ: ab (DE) ▾                    │
│                 Guide 22.09.: ab 29,90 € · Trend 33,10 €  (V = übernehmen)  │
│                 → +10,8 % seit letztem Preis                               │
│                                                                            │
│   [Überspringen (S)]   [Unverändert (U)]            [Speichern & weiter ⏎] │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Scopes:** all holdings · stale only (> N days) · a set · a selection · the wishlist · top-N by value.
- **Order:** by value descending (default), staleness, or set order.
- **Keyboard:** `C` opens Cardmarket (exact product, language + seller country DE + Near Mint or better preset) in a new tab, `V` copies the price-guide suggestion into the input, `Enter` saves and advances, `U` keeps the price unchanged, `S` skips, `←` goes back, and `Esc` pauses. The session can be resumed, and its state persists.
- **On desktop,** a tip suggests arranging Settr and Cardmarket side by side. Cardmarket can't be embedded in an iframe.
- **Summary screen:** number updated, portfolio delta caused by this session, the biggest movers, and "Fertig" or "Weitere veraltete Preise".

### 4.11 Portfolio · PRT-02…06

- **Entwicklung:** a large value-over-time chart (value, invested and P/L modes) with range selector and scrubbing. Filters for singles, sealed, sets and languages.
- **Aufteilung:** allocation by category (singles/sealed/graded), set, language and rarity, shown as a donut plus a ranked bar list (treemap optional).
- **Performance:** a sortable best/worst list (abs and %), P/L per set and per language, and a realized P/L section (sales tracking is on, Q6.5).
- **Ausgaben:** spend per month (bars), spend by source, and average price per card by rarity.

### 4.12 Wunschliste · WSH-01 (post-v1, I-06)

- Tiles with a target price and the latest known price, and a "Ziel erreicht" badge when latest ≤ target.
- Actions: start a price session for the wishlist, move to collection ("Gekauft"), and export as plain text for a Cardmarket wants list.

### 4.13 Einstellungen · APP-07

| Section | Settings |
|---|---|
| **Allgemein** | Card-name display (*Sprache meiner Karte* / *immer Deutsch* / *Originalsprache*) · default card language · active card languages (DE, EN, JA, ZH-CN, ZH-TW; R2.3). The UI language is German (a selector appears once English exists) |
| **Darstellung** | Theme (*Hell / Dunkel / System*, default *System*; light and dark are equals, R2.1; the top bar keeps a quick toggle) · card-tile density · holo/animation level (*voll / reduziert / aus*) · **Transparenz reduzieren** (solid instead of glass) · colorblind-safe P/L colors |
| **Preise** | Default price type (**ab (DE)**) · Cardmarket link filters (**seller country: Deutschland**, **language: like the copy**, **min. condition: Near Mint or better**, R2.2) · price-guide suggestions (on/off) · stale threshold (14 days) · valuation of unpriced items (*ausschließen* / *Einkaufspreis verwenden*) |
| **Lagerorte** | Binders and boxes: name, layout (3×3 / 3×4 / 4×3 / custom), page count, sort order |
| **Daten** | Export backup (a download; Brave asks where to save it) · import backup · CSV export · backup reminder interval · **storage status**: persistent yes/no (`persist()`) and used space; the reported quota isn't relied on, since Brave always reports 2 GiB (ADR-027) · request persistence · **install hint**: an installed app gets `persist()` (Brave: the install icon in the address bar, or ☰ → *Save and share* → *Install Settr…*; English menu names, the German ones are to verify) · **delete-on-exit warning**: Brave's Shields *"Forget me when I close this site"*, the *"Delete data on exit"* tab under *Clear browsing data* and a per-site *"clear cookies on exit"* erase the whole collection (all off by default; ADR-027, R3.4) · delete all data |
| **Über** | App version and the long tagline (*"Jede Karte. Jedes Set. Jeder Cent."*) · catalog version and date · data sources and credits · keyboard shortcuts · legal (disclaimer, privacy, Impressum if public) |

### 4.14 Onboarding · APP-06

1. **Willkommen:** a one-line value proposition and the short tagline *"Jede Karte zählt."* (R2.7). Pick the card languages you collect (preset: DE, EN, JA, ZH-CN, ZH-TW).
2. **Deine Daten bleiben bei dir:** explains local storage and asks for **persistent storage** (`navigator.storage.persist()`).
   - On iOS it recommends **"Zum Home-Bildschirm"**, since Safari may clear site data after 7 days without a visit (see `ARCHITECTURE.md` §8).
   - On Windows it recommends installing Settr as an app (in Brave: the install icon in the address bar, or ☰ → *Save and share* → *Install Settr…*), because Chromium grants `persist()` to installed apps without a prompt (ADR-027).
   - It warns that browser settings which delete site data on exit erase the collection (in Brave: Shields *"Forget me when I close this site"*, *"Delete data on exit"*, per-site *"clear cookies on exit"*; all off by default, R3.4).
3. **Los geht's:** pick your default card language(s) and open the 30th Anniversary set.

---

## 5. Key flows

| # | Flow | Steps (happy path) |
|---|---|---|
| F1 | Add a card from set page | **Quick add:** set detail → hover or focus tile → **＋** → one copy added with defaults (the view's language, NM, no price) → toast "Hinzugefügt: … · DE · NM · Rückgängig" → tile shows badge (1 interaction, R2.1). **With a price:** focus tile → `N` → sheet (defaults prefilled) → type price → **Enter** |
| F2 | Add via search | **Strg K** → type "pika 25" → pick result → **Enter** opens add sheet → **Enter** |
| F3 | Quick-add many | Set detail → **Schnellerfassung** → set defaults once → `1⏎ 4⏎ 7x2⏎ 25r⏎` … |
| F4 | Record one price | Card detail → price input → `34,9` **Enter** → chart animates the new point |
| F5 | Price session | Übersicht "37 veraltet" → session → `C` (check Cardmarket) → type → **Enter** … → summary |
| F6 | Sell part of a lot | Holding menu → **Verkaufen…** → qty 1 of 3, price, fees, date → the lot records a **disposal** of 1 (remaining ×2); realized P/L recorded (Q6.5) |
| F7 | Open sealed | Sealed holding → **Öffnen…** → confirm → optional "Pulls erfassen" (quick-add bound to the product's set) → **Abschließen** splits the product cost proportionally to the pulls' values (evenly if unpriced) (Q5.8) |
| F8 | Export / import | Einstellungen › Daten → **Backup exportieren** → download (Brave asks where to save it, so backups can live in one folder). On another device: **Backup importieren** → preview (counts, date, app version) → *Ersetzen* or *Zusammenführen* → safety snapshot → done |
| F9 | First run | Onboarding (3 steps) → set detail |
| F10 | App/catalog update | Service worker finds a new version → non-blocking toast "Neue Version verfügbar · Neu laden" |

---

## 6. States and feedback

- **Loading:** content-shaped skeletons. Card images use a card-back silhouette with a slow shimmer (disabled under reduced motion). Never full-page spinners.
- **Optimistic by nature:** writes go to IndexedDB, which is local and fast, and live queries re-render instantly. No "saving…" states are needed for normal edits.
- **Undo:** every create, update, delete and bulk action shows a toast with **Rückgängig** (8 s) backed by an in-memory inverse operation.
- **Destructive actions:** deleting a lot uses undo only. Deleting a whole set or all data requires a typed confirmation.
- **Errors:** route-level error boundaries with "Neu laden" and "Fehlerbericht kopieren", which copies a diagnostic JSON without user data. Import errors list exactly which records failed validation.
- **Offline:** a small pill ("Offline · alles funktioniert") shows. Only images not yet cached fall back to placeholders.
- **Storage pressure:** `QuotaExceededError` gets a dedicated dialog explaining how to free space and urging a backup.
- **Image fallback chain** (`DATA_SOURCES.md` §5):
  1. The selected language's image.
  2. Another language of the same print, badged "Bild in Englisch".
  3. The same artwork from the other print, badged "Abbildung: englische Ausgabe".
  4. The user's own photo.
  5. A designed placeholder (card back with set symbol, number and name).

---

## 7. Keyboard model (desktop)

| Keys | Action |
|---|---|
| `Strg K` (Windows) / `⌘K` (Mac, iPad) / `/` | Command palette (search catalog, collection, actions, settings) |
| `N` | New holding (add sheet for the focused card, or palette otherwise) |
| `P` | Record a price for the focused/selected item |
| `Q` | Quick-add mode (in set context) |
| `← / →` | Previous / next card on detail pages |
| `G` then `O / S / K / P / F` | Go to Übersicht / Sammlung / Katalog / Preise / Portfolio |
| `V` (price session / price input) | Copy the preselected price-guide suggestion into the input |
| `V` then `G / T / B` | Switch view: grid / table / binder |
| `H` | Toggle privacy mode (hide values) |
| `?` | Shortcut cheat sheet |
| Grid navigation | Arrow keys move focus between tiles (roving tabindex), `Enter` opens, `Space` selects |

Shortcuts are suppressed while typing in inputs, and every action is also reachable without a keyboard.

---

## 8. Microcopy and tone

- **German only** (Q3.1), informal **"du"** (Q2.4), and concise. Collector jargon is used naturally: *Display*, *Top-Trainer-Box*, *Reverse Holo*, *Pull*, *Master Set*.
- Numbers use German formatting: `1.234,56 €`, `+14,6 %`, `23.09.2026`. See `I18N.md`.
- No exclamation-mark spam and no emoji in UI chrome. Celebrations (set complete) are visual, not verbal.
- Examples:
  - Empty collection: *"Noch keine Karten. Öffne ein Set und tippe auf ＋."*
  - Stale price: *"Preis von vor 21 Tagen"*
  - Backup reminder: *"Letztes Backup vor 12 Tagen. Jetzt sichern?"*
  - Backup status pill (due): *"Backup fällig · Letztes vor 12 Tagen"*
  - Price context: *"ab (DE) · NM oder besser"* · per-copy value tag: *"eigener Wert"*
  - Short tagline (sidebar, PWA description): *"Jede Karte zählt."* (R2.7)

---

## 9. Accessibility requirements (summary; details in `QUALITY.md`)

- WCAG 2.2 AA contrast in both themes, including chart strokes and P/L colors.
- P/L is never communicated by color alone: sign, arrow and label are always present, and a colorblind-safe palette is optional.
- Full keyboard operability, visible focus rings (3 px, 2 px offset) and logical focus order in sheets and dialogs (focus trap and return).
- Grids use `role="grid"` semantics with a roving tabindex. Images carry meaningful `alt` text ("Pikachu ex, 025, Deutsch").
- Respect `prefers-reduced-motion` (no tilt, foil or morph transitions) and `prefers-contrast`.
- Minimum touch target of 44 × 44 px on mobile.
