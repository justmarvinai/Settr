# Settr: UX Specification

> Status: **Draft v0.1 (planning)** · Last updated: 2026-09-23
> Covers the information architecture, navigation, screen specifications, key flows, states and keyboard model.
> Visual language (colors, type, motion) lives in [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md). Feature IDs (`CAT-02`, `PRC-04`, …) refer to [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md).
> Items marked **⟶ Qn** depend on an answer in [`USER_QUESTIONS.md`](../USER_QUESTIONS.md).

---

## 1. UX principles

1. **Cards first.** Card and product imagery is the hero. The UI recedes with hairline borders, calm surfaces and no decorative noise.
2. **Speed of entry is the product.** Prices are entered by hand, so every capture flow is designed for speed: adding a card takes **≤ 3 interactions** and a price update takes **one number and Enter**. Desktop is keyboard-first and mobile is thumb-first.
3. **Numbers you can trust.** Tabular numerals, explicit currency, explicit dates ("Preis vom 12.09.2026"), visible staleness, and no silent assumptions such as treating an unpriced item as worth zero.
4. **Private and safe by default.** Data never leaves the device. Backup status is always visible. Every destructive action can be undone, and imports take a safety snapshot first.
5. **Progressive disclosure.** Smart defaults (language, condition, variant, price type) keep the everyday form short. Grading, fees, storage location, photos and notes sit behind "Mehr Details".
6. **Robust in four scripts.** German strings run about 30 % longer than English, and Japanese/Chinese names need proper CJK typography. Layouts must never truncate prices or card numbers.
7. **Delight with restraint.** Holo foil, shared-element transitions and scrubbable charts are signature moments, but they're used sparingly and are always disabled under `prefers-reduced-motion`.

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
| Wishlist | **Wunschliste** | Wishlist | Wanted items with target prices (feature idea ⟶ I-06) |
| Settings | **Einstellungen** | Settings | Preferences, data (import/export), about/legal |

> ⟶ **Q2.1** asks whether "library" in the brief means *my collection* (assumed) or *the catalog*. The IA supports both readings. Only labels would change.

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
/wishlist                           Wunschliste
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
| `lg` (desktop) | ≥ 1024 px | **Sidebar** (240 px, collapsible) + top bar |
| `xl` | ≥ 1440 px | Same, with wider content and optional right detail panel |

### 3.2 Desktop shell (wireframe)

```
┌──────────────┬──────────────────────────────────────────────────────────────────┐
│ ◆ settr      │  Sammlung › Karten             [ ⌕  Suchen…        ⌘K ]  ◐  👁  [＋ Hinzufügen] │
│              ├──────────────────────────────────────────────────────────────────┤
│ ▣ Übersicht  │                                                                  │
│ ▤ Sammlung   │                          page content                            │
│ ▦ Katalog    │                                                                  │
│ € Preise   3 │                                                                  │
│ ↗ Portfolio  │                                                                  │
│ ♡ Wunschliste│                                                                  │
│              │                                                                  │
│              │                                                                  │
│ ─────────────│                                                                  │
│ ⛁ Backup     │                                                                  │
│   vor 3 Tagen│                                                                  │
│ ⚙ Einstell.  │                                                                  │
└──────────────┴──────────────────────────────────────────────────────────────────┘
```

- **Top bar:** page title/breadcrumb · global search (opens the command palette) · theme toggle (◐) · **privacy toggle (👁)**, which blurs every money value (PRT-05) · primary **＋ Hinzufügen**.
- **Sidebar footer:** backup status pill. It turns amber after N days without a backup and links to `/settings/data`.
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
- Portfolio, Wunschliste and Einstellungen are reached via the avatar-less **"Mehr"** item or from the Übersicht tiles.
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
- **Empty state (first run):** a 3-step welcome ("Set öffnen → Karte hinzufügen → Preis eintragen"), an optional "Demo-Daten laden" button (⟶ I-19), and the backup/persistence explainer.

### 4.2 Katalog › Sets · CAT-01

- A grid of **set tiles**: logo artwork, series, localized name, release date per language, card counts (official/total) and the user's **progress ring**.
- **Print switcher** (segmented): *International (DE/EN/…)* · *Asien (JA/ZH/…)*. The two prints are separate set structures with different card lists and numbering (see `DATA_MODEL.md` §2). A language filter narrows further (e.g. only sets available in `zh-tw`).
- v1 has very few sets. The layout must still scale to 150+ sets later, so it's grouped by series with sticky series headers and a per-series collapse.

### 4.3 Set detail · CAT-02, COL-07

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [SET LOGO]  <Set name DE>            Release 2026-xx-xx · 000/000 Karten    │
│             <Original name JA>       ◔ Basis 64 %  ◑ Komplett 51 %  ◔ Master 38 % │
│             Sprache: [DE] [EN]                                             │
├──────────────────────────────────────────────────────────────────────────┤
│ [Karten] [Sealed] [Statistik]                                              │
│ ⌕ In Set suchen   Besitz: (Alle|Besitzt|Fehlt)  Seltenheit ▾  Typ ▾  Variante ▾  Sort: Nr. ▾  ▦▦▦ │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                      │
│ │img │ │img │ │░░░░│ │img │ │img │ │░░░░│ │img │ │img │   ░ = missing (ghost) │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                      │
│ 001 ●● 002 ●  003    004 ●  …                            ● = variant owned    │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Card tile:** image with lazy loading and a card-back shimmer placeholder, then number, localized name and a rarity glyph.
  - *Owned:* full color, a quantity badge ("×3"), and **variant dots** (normal, reverse, special patterns) that are filled when owned.
  - *Missing:* a desaturated 35 % "ghost" with a dashed outline. It can be toggled to fully hidden.
  - *Hover (desktop):* a subtle lift and tilt with a **＋** quick-add button and a **€** quick-price button.
  - *Long-press (mobile):* a context sheet with Hinzufügen, Preis eintragen, Zur Wunschliste and Details.
- **Progress definitions** (⟶ Q5.5): *Basis* counts numbered cards up to the printed total, *Komplett* adds secret rares, and *Master* covers every card × variant. They're computed per selected language, with an "any language" option.
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
│      └───────────────┘        │ Aktueller Preis  34,90 €  · Trend · 12.09.   │
│   [DE] [EN]  (print languages) │ [ Preis eintragen … ⏎ ]  [↗ Cardmarket]      │
│                               ├──────────────────────────────────────────┤
│                               │ Preisverlauf    1M 3M 6M 1J Max             │
│                               │ ╭────────────────────────────────────╮     │
│                               │ │ ●───●────────●──●                   │     │
│                               │ ╰────────────────────────────────────╯     │
│                               ├──────────────────────────────────────────┤
│                               │ In deiner Sammlung (2)          [＋ Hinzufügen] │
│                               │ DE · Holo · NM · ×1 · 22,00 € → 34,90 € +58,6 % │
│                               │ DE · Holo · PSA 10 · ×1 · 120 € → 180 € +50 %  │
└───────────────────────────────┴──────────────────────────────────────────┘
```

- **Holo viewer (DSN-01):** pointer and gyroscope tilt, glare, and a rarity-driven foil layer. Click for fullscreen. Only languages available in this print are offered.
- **Series selector:** the language and variant chips (plus a grade selector when graded copies exist) choose which **price series** is shown and edited.
- **Inline price entry (PRC-01):** amount with a German decimal comma, date (default today) and type (default from settings). Enter saves, and the entry pulses into the chart.
- **Cardmarket button (PRC-06):** opens a Cardmarket search/product URL pre-filtered by language (and optionally condition) in a new tab.
- **Holdings list:** every lot of this card shows its cost, current value and P/L, with inline edit and a context menu (Bearbeiten, Verkaufen…, Duplizieren, Löschen).
- **Prev/next:** ← / → keys and swipe on mobile, in set order.
- **Shared-element transition (DSN-02):** the tile image morphs into the hero image.

### 4.5 Sealed product detail · CAT-05

This screen uses the same structure as card detail, but:
- The hero is a product image with a light 3D parallax and no foil. A placeholder with product-type iconography is shown when no image exists.
- **Details:** product type (e.g. *Display*, *Top-Trainer-Box*, *Booster-Bundle*), contents (e.g. "36 Booster à 10 Karten"), release date per language, MSRP (*UVP*) where known, and EAN when curated.
- **Holdings:** language · status (*versiegelt / geöffnet / beschädigt*) · qty · cost → value.
- **Öffnen…** action (COL-12, ⟶ Q5.8 / I-11) turns a sealed holding into an opened one and optionally continues into pull logging.

### 4.6 Sammlung › Karten / Sealed · COL-04, COL-05

- **Summary bar:** item count, distinct cards, *Wert*, *Investiert*, *G/V* (abs and %). It respects the active filters.
- **Views:**
  - *Raster* (grid): tiles as in set detail, plus value and P/L chips.
  - *Tabelle* (table): virtualized. Default columns are Karte (thumb + name), Set, Nr., Sprache, Variante, Zustand, Menge, Einkauf/Stk., Wert/Stk., Wert, G/V, G/V %, and Preis vom. Columns are configurable and sortable.
  - *Binder* (COL-08, ⟶ I-02): 3×3 pocket pages in set order with page flip and missing-pocket placeholders.
- **Filters** (chips + popover): Set, Sprache, Seltenheit, Variante, Zustand, Gradiert, Tags, Lagerort, Bepreist/Unbepreist, Preis veraltet, G/V positiv/negativ, and Kaufdatum range.
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
│ Zustand    MT [NM] EX GD LP PL PO                     │  ← Cardmarket scale; tooltips
│ Menge      [ − 1 + ]                                  │
│ Kaufpreis  [ 4,50 € ]  ( pro Stück | gesamt )         │
│ Kaufdatum  [ 23.09.2026 ]   Quelle [ Cardmarket  ▾ ]  │
│ ▸ Mehr Details (Gebühren/Versand, Grading, Lagerort, Tags, Notiz, Fotos) │
│                                                     │
│        [Hinzufügen & nächste]   [ Hinzufügen ⏎ ]     │
└─────────────────────────────────────────────────────┘
```

- **Defaults** come from settings and the last-used values: language, condition, source, and variant (the first existing one).
- **Money input** accepts `4,5`, `4,50`, `4.50` and `4,50 €`, and stores **integer cents**. The currency selector appears only when multi-currency is enabled (⟶ Q6.1).
- **"Hinzufügen & nächste"** keeps the sheet open and advances to the next card number, which gives a fast sequential entry mode.
- **Validation:** quantity ≥ 1, price ≥ 0, and date not in the future. A warning (not an error) appears when the price is far above the latest known price.
- **Sealed variant:** no variant or condition. It has *Status* (versiegelt/beschädigt) instead.

### 4.8 Quick-add mode · COL-06

- Entry points: set detail → "Schnellerfassung", or ⌘K → "Schnellerfassung".
- A focus-mode panel with sticky defaults at the top (Sprache, Variante, Zustand, Quelle, Kaufdatum). The main input takes a **card number**: typing `25` shows the card preview, and `Enter` adds 1 copy.
  - Modifiers: `25x3` adds 3 copies, `25r` adds a reverse holo, and `25 4,50` adds one with a purchase price.
- A running list below shows each added item with undo.

### 4.9 Price entry popover · PRC-01

- Opened from a tile's € button, the detail page, a table row or the keyboard shortcut `P`.
- Fields: amount (autofocus), date (default today), type (*Trend*, *ab*, *30-Tage-Ø*, *7-Tage-Ø*, *Verkauft*, *Eigener Wert*, with the default from settings) and an optional note.
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
│                 Neuer Preis  [ 34,90 € ]  Typ: Trend ▾                      │
│                 → +10,8 % seit letztem Preis                               │
│                                                                            │
│   [Überspringen (S)]   [Unverändert (U)]            [Speichern & weiter ⏎] │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Scopes:** all holdings · stale only (> N days) · a set · a selection · the wishlist · top-N by value.
- **Order:** by value descending (default), staleness, or set order.
- **Keyboard:** `C` opens Cardmarket in a background tab when the browser allows it, `Enter` saves and advances, `U` keeps the price unchanged, `S` skips, `←` goes back, and `Esc` pauses. The session can be resumed, and its state persists.
- **On desktop,** a tip suggests arranging Settr and Cardmarket side by side. Cardmarket can't be embedded in an iframe.
- **Summary screen:** number updated, portfolio delta caused by this session, the biggest movers, and "Fertig" or "Weitere veraltete Preise".

### 4.11 Portfolio · PRT-02…06

- **Entwicklung:** a large value-over-time chart (value, invested and P/L modes) with range selector and scrubbing. Filters for singles, sealed, sets and languages.
- **Aufteilung:** allocation by category (singles/sealed/graded), set, language and rarity, shown as a donut plus a ranked bar list (treemap optional).
- **Performance:** a sortable best/worst list (abs and %), P/L per set and per language, and a realized P/L section if sales tracking is enabled (⟶ Q6.5).
- **Ausgaben:** spend per month (bars), spend by source, and average price per card by rarity.

### 4.12 Wunschliste · WSH-01 (⟶ I-06)

- Tiles with a target price and the latest known price, and a "Ziel erreicht" badge when latest ≤ target.
- Actions: start a price session for the wishlist, move to collection ("Gekauft"), and export as plain text for a Cardmarket wants list (⟶ I-06).

### 4.13 Einstellungen · APP-07

| Section | Settings |
|---|---|
| **Allgemein** | UI language (DE/EN) · card-name display (*Sprache meiner Karte* / *immer Deutsch* / *Originalsprache*) · default card language · base currency (EUR) · number/date format (auto from locale) · anrede (*du*) |
| **Darstellung** | Theme (System/Dunkel/Hell) · accent · card-tile density · holo/animation level (*voll / reduziert / aus*) · colorblind-safe P/L colors |
| **Preise** | Default price type · stale threshold (days, default 14) · Cardmarket link options (language filter, min. condition) · valuation of unpriced items (*ausschließen* / *Einkaufspreis verwenden*) |
| **Daten** | Export backup · import backup · CSV export · backup reminder interval · storage status (persistent? used/quota) · request persistence · delete all data |
| **Über** | App version · catalog version and date · data sources and credits · keyboard shortcuts · legal (disclaimer, privacy, Impressum if public) |

### 4.14 Onboarding · APP-06

1. **Willkommen:** a one-line value proposition, UI language and base currency.
2. **Deine Daten bleiben bei dir:** explains local storage and asks for **persistent storage** (`navigator.storage.persist()`). On iOS it recommends **"Zum Home-Bildschirm"**, since Safari may clear site data after 7 days without a visit (see `ARCHITECTURE.md` §8).
3. **Los geht's:** pick your default card language(s) and open the 30th Anniversary set.

---

## 5. Key flows

| # | Flow | Steps (happy path) |
|---|---|---|
| F1 | Add a card from set page | Set detail → hover tile → **＋** → sheet (defaults prefilled) → type price → **Enter** → toast "Hinzugefügt · Rückgängig" → tile shows badge |
| F2 | Add via search | **⌘K** → type "pika 25" → pick result → **Enter** opens add sheet → **Enter** |
| F3 | Quick-add many | Set detail → **Schnellerfassung** → set defaults once → `1⏎ 4⏎ 7x2⏎ 25r⏎` … |
| F4 | Record one price | Card detail → price input → `34,9` **Enter** → chart animates the new point |
| F5 | Price session | Übersicht "37 veraltet" → session → `C` (check Cardmarket) → type → **Enter** … → summary |
| F6 | Sell part of a lot | Holding menu → **Verkaufen…** → qty 1 of 3, price, fees, date → lot splits into *sold ×1* + *owned ×2*; realized P/L recorded (⟶ Q6.5) |
| F7 | Open sealed | Sealed holding → **Öffnen…** → confirm → optional "Pulls erfassen" (quick-add bound to the product's set) → cost allocation per setting (⟶ Q5.8) |
| F8 | Export / import | Einstellungen › Daten → **Backup exportieren** → file saved. On another device: **Backup importieren** → preview (counts, date, app version) → *Ersetzen* or *Zusammenführen* → safety snapshot → done |
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
| `⌘K` / `Ctrl K` / `/` | Command palette (search catalog, collection, actions, settings) |
| `N` | New holding (add sheet for the focused card, or palette otherwise) |
| `P` | Record a price for the focused/selected item |
| `Q` | Quick-add mode (in set context) |
| `← / →` | Previous / next card on detail pages |
| `G` then `O / S / K / P / F / W` | Go to Übersicht / Sammlung / Katalog / Preise / Portfolio / Wunschliste |
| `V` then `G / T / B` | Switch view: grid / table / binder |
| `H` | Toggle privacy mode (hide values) |
| `?` | Shortcut cheat sheet |
| Grid navigation | Arrow keys move focus between tiles (roving tabindex), `Enter` opens, `Space` selects |

Shortcuts are suppressed while typing in inputs, and every action is also reachable without a keyboard.

---

## 8. Microcopy and tone

- **German first**, informal **"du"** (⟶ Q2.4), and concise. Collector jargon is used naturally: *Display*, *Top-Trainer-Box*, *Reverse Holo*, *Pull*, *Master Set*.
- Numbers use German formatting: `1.234,56 €`, `+14,6 %`, `23.09.2026`. See `I18N.md`.
- No exclamation-mark spam and no emoji in UI chrome. Celebrations (set complete) are visual, not verbal.
- Examples:
  - Empty collection: *"Noch keine Karten. Öffne ein Set und tippe auf ＋."*
  - Stale price: *"Preis von vor 21 Tagen"*
  - Backup reminder: *"Letztes Backup vor 12 Tagen. Jetzt sichern?"*

---

## 9. Accessibility requirements (summary; details in `QUALITY.md`)

- WCAG 2.2 AA contrast in both themes, including chart strokes and P/L colors.
- P/L is never communicated by color alone: sign, arrow and label are always present, and a colorblind-safe palette is optional.
- Full keyboard operability, visible focus rings (2 px, offset) and logical focus order in sheets and dialogs (focus trap and return).
- Grids use `role="grid"` semantics with a roving tabindex. Images carry meaningful `alt` text ("Pikachu ex, 025, Deutsch").
- Respect `prefers-reduced-motion` (no tilt, foil or morph transitions) and `prefers-contrast`.
- Minimum touch target of 44 × 44 px on mobile.
