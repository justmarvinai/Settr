# Settr: Data Sources, Catalog Pipeline and Licensing

> Status: **Draft v0.1 (planning)** · Research date: 2026-09-23 (TCGdex repo commit `a211f11`, 2026-09-22).
> Evidence labels: **[V]** verified by us in source data or compiler output · **[V-src]** verified in server/SDK source code · **[3P]** dated live measurements published by other projects · **[D]** vendor docs · **[U]** unverified.
> Our cloud environment blocked live HTTP checks to most hosts (see `CLAUDE.md`), so all **[3P]** items must be re-verified from an unrestricted network in M0/M1.

---

## 1. Summary and recommendations

| Need | Primary | Fallback / supplement | Never |
|---|---|---|---|
| **Card data, DE/EN** | **TCGdex** (compiled from the `tcgdex/cards-database` repo at build time) | TCGdex live API (CORS `*`) for ad-hoc checks | pokemontcg.io (English-only, **shutting down 1 Mar 2027**) |
| **Card data, JA** | TCGdex (`M6a` complete: 176 cards) | `type-null/PTCG-database` for gaps | — |
| **Card data, ZH-TW** | TCGdex has **no Mega-era zh-tw data** → **JP card list + Traditional Chinese names** from `type-null/PTCG-database` (`data_tc`) | Manual curation from the official TW site | — |
| **Card data, ZH-CN** | `duanxr/PTCG-CHS-Datasets` has `30thC` (176 cards) **but is non-commercial, no redistribution: permission required** | Manual entry or custom items | TCGdex zh-cn (empty shells or copies of Traditional text) |
| **Card images** | TCGdex assets CDN (webp, 245×337 low / 600×825 high; **CORS `*` on 200**) | See §5: official-site URLs (JP/TW), user photos, placeholder | Cardmarket's image CDN |
| **Sealed products** | **Curated by us**: skeleton from **Cardmarket's public product catalog file** (IDs, names, categories), enriched by hand (DE names, contents, dates, UVP) | TCGCSV (TCGplayer EN/JP catalog) for product images and names; Bulbapedia for details | Paid APIs (Scrydex $29+/month) |
| **Cardmarket linking** | `idProduct` per card variant from TCGdex (`30th` 161/161, `30th-c` 30/30, `M6a` 173/176) and per sealed product from Cardmarket's nonsingles file | Search URL | The official Cardmarket API (closed to new applicants) |
| **Search aliases** (Pokémon names in DE/JA/ZH) | PokéAPI species CSV (names in de, ja, zh-Hant, zh-Hans, ko) | — | — |

**No data API is called at runtime.** Everything above is consumed by the **build-time catalog pipeline** (§6). The browser loads only Settr's static JSON and card images.

---

## 2. The v1 set across sources [V]

| Source | International (EN/DE/FR/IT/ES/PT) | Japanese | Traditional Chinese | Simplified Chinese |
|---|---|---|---|---|
| **TCGdex** | `30th`: official 128, 161 cards (001–158 + R/G/B). `30th-c`: 30 (Classic Collection). Energies: `mee` 009–016 (stamp `30th-anniversary`). DE name "30 Jahre" / "30 Jahre: Klassische Sammlung" | `M6a` "30th CELEBRATION": official 103, 176 cards (Classic Collection 136–165, R/G/B, 8 Energy). `MF` premium deck set: 49 | ✗ (zh-tw data ends at SV10, May 2025) | ✗ |
| **Cardmarket** (expansion IDs) | 6601: 191 singles (161 + 30), **45 sealed** | 6602: 176 singles, 4 sealed. 6628: `MF` 49 singles, 1 sealed | (sold as JP products + language filter "T-Chinese") | 6603: 176 singles, 11 sealed |
| **pokemontcg.io** | `me55` (161), `me55c` (30), English only | — | — | — |
| **type-null/PTCG-database** | — | ✓ up to M6a (official image URLs) | ✓ up to M6a (official TW image URLs) | — |
| **duanxr/PTCG-CHS-Datasets** | — | — | — | `30thC` 176 cards (license restricted) |

**Data quirks to handle (pipeline overrides)**
- Every 30th card is **foil**, but TCGdex marks many as `normal`. We override to a single `std` variant per card.
- `30th-c` local IDs 001–030 are TCGdex's own order. The **printed numbers are the original collector numbers** (e.g. Charizard "4/102"), and Limitless lists them as CC1–CC30. Curate `printedNumber` explicitly.
- The **RGB Mews** (R/G/B) have no anniversary stamp and their own rarity. pokemontcg.io wrongly labels them "Common".
- JP rarity marks: only RR/AR/SAR/FUR cards print a symbol. The other 123 have none. Keep TCGdex's rarity but display "—" when nothing is printed.
- The JP Classic Collection lists "サーナイトEX" at 156, while English databases list "M Gardevoir-EX". Verify against the official list **[U]**.

---

## 3. TCGdex (primary source)

### 3.1 Facts

- **License:** the database repository is **MIT** [V]. Card images and text are © Nintendo / The Pokémon Company / Creatures / GAME FREAK, and TCGdex doesn't license the artwork **[U]**. We credit TCGdex prominently.
- **Languages (18):** `en fr es es-mx it pt pt-br pt-pt de nl pl ru ja ko zh-tw id th zh-cn` [V-src].
- **Two pools:** international (`data/`) and Asian (`data-asia/`, i.e. `ja ko zh-tw id th zh-cn`). IDs don't cross pools (`swsh3-136` 404s in `ja`) [3P]. Asian languages share card files (e.g. `SV8/001.ts` holds ja + zh-tw + zh-cn names) [V].
- **Coverage (cards with data):** de 20,259 · en 23,747 · ja 13,006 · zh-tw 7,436 (≤ SV10) · zh-cn 877 (copies of Traditional text) [V]. *Pokémon TCG Pocket* (series `tcgp`) is mixed in and must be filtered out.
- **Freshness:** DE/EN/JA arrive within days of release (30th EN data added 2026-09-17, M6a 2026-09-20) [V]. The live API cache lags up to 24 h [V-src].

### 3.2 Card model highlights [V-src]

```jsonc
{
  "id": "me05-001", "localId": "001", "name": "Tropius",
  "image": "https://assets.tcgdex.net/de/me/me05/001",          // base URL (no quality/extension)
  "rarity": "Häufig", "types": ["Pflanze"], "stage": "Basis",     // ⚠ localized values in de, English in ja/zh
  "dexId": [357], "illustrator": "Akino Fukuji", "regulationMark": "J",
  "variants_detailed": [
    { "type": "Normal",  "size": "Standard", "variantId": "endfynwn4n10gzq", "thirdParty": { "cardmarket": 895789, "tcgplayer": 704758 } },
    { "type": "Reverse", "size": "Standard", "variantId": "cm4kqul3x1bwlz1f", "thirdParty": { "cardmarket": 895789, "tcgplayer": 704758 } }
  ],
  "pricing": { "cardmarket": { "idProduct": 895789, "trend": "…" } }  // present in the API; Settr ignores prices (manual by design)
}
```

- **Variant key:** use TCGdex's **`variantId`** (a stable hash of the English values) as the upstream reference. Map it to Settr's readable `VariantId` (`DATA_MODEL.md` §3).
- **Localized enum values:** `rarity`, `types`, `stage` and variant `type`/`foil` come **translated in `de`** (`Häufig`, `Pflanze`, `Meisterball`) and **English in `ja`/`zh`**. The pipeline reads the **English values** into Settr's controlled vocabularies, and harvests the German strings as the source for our DE labels (`I18N.md` §6).
- **Cardmarket product IDs:** `variants_detailed[].thirdParty.cardmarket`. A plain reverse holo shares the normal card's product ID, while **pattern reverses (Poké Ball, Master Ball) are separate products**. TCGdex issue #2325 (open) reports some wrong IDs, so **users can override the Cardmarket ID per item**.
- `legal` follows international rules and is meaningless for JP cards, so the UI hides it.

### 3.3 Images [3P unless noted]

| Asset | URL pattern |
|---|---|
| Card | `https://assets.tcgdex.net/{lang}/{serie}/{set}/{localId}/{low|high}.{webp|png|jpg}`. Low = 245×337 (~20 KB webp), high = 600×825 (~63 KB webp) |
| Set logo | `https://assets.tcgdex.net/{lang}/{serie}/{set}/logo.{ext}` |
| Set symbol | `https://assets.tcgdex.net/univ/{serie}/{set}/symbol.{ext}` |
| Asian | `https://assets.tcgdex.net/ja/{Serie}/{Set}/{zero-padded localId}/…` (unpadded 404s) |

- **CORS:** **200 responses send `Access-Control-Allow-Origin: *`**. 404s send no CORS header. Only GET/OPTIONS are allowed (no HEAD from browsers).
- **Coverage caveats that matter for v1:**
  - The API emits an `image` field only when the asset is listed in `https://assets.tcgdex.net/datas.json`. **Exception:** set `30th` is hard-coded to always emit image URLs (a "temporary hack"), so **30th URLs may 404**.
  - **DE:** main sets from BW to Mega Evolution are 100 % covered, **but `mee` and `30th-c` are at 0 %** (as of 2026-09-20).
  - **JA:** the **M-series (M2–M6) has 0 images** (2026-09-13), so assume **no JP images for `M6a`** at launch.
  - **ZH-TW:** partial. **ZH-CN:** none.
- **Conclusion:** image availability is computed **at build time** from `datas.json` plus GET checks in CI, stored per card and language in the catalog, and refreshed weekly (§6).

### 3.4 API (reference only; not used at runtime)

- REST: `https://api.tcgdex.net/v2/{lang}/{cards|sets|series}[/{id}]`, with filters `field=op:value` (`like`, `eq`, `neq`, `gt`, `lt`, `null:`, `notnull:`), `sort:field`, `sort:order`, `pagination:page`, `pagination:itemsPerPage`. It sends CORS `*` and has no published rate limit ("cache and be considerate") [V-src/D].
- GraphQL: `POST https://api.tcgdex.net/v2/graphql` with the `@locale(lang:"de")` directive. It has no pricing, thirdParty or variantId fields [V-src].
- SDK: `@tcgdex/sdk` 2.9.0 (MIT) [V].

---

## 4. Supplementary sources

| Source | Use in Settr | Terms / caveats |
|---|---|---|
| **Cardmarket product catalog** (`https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json` 13.6 MB; `…/products_nonsingles_6.json` 0.95 MB) | Sealed catalog skeleton: `idProduct`, English name, `categoryName` (Booster, Display, Elite Trainer Box, Box Set, Blisters, Tins, Theme Decks, …), `idExpansion`, `idMetacard` (links the same card across prints!), `dateAdded` | Public, no auth, updated daily (≈ 02:48 CEST). **No CORS**, so build/CI only. No images, numbers or languages. German sealed = international product + language filter |
| **Cardmarket price guide** (`…/priceGuide/price_guide_6.json`, 15.5 MB) | **Not used** (manual prices by design). Only relevant if you opt in to Q6.6 (a daily build-time snapshot limited to catalog products, shown only as a suggestion) | Public, daily, no CORS |
| **type-null/PTCG-database** (GitHub) | JP and **Traditional Chinese** card data up to M6a, plus **official image URLs** (`pokemon-card.com`, `asia.pokemon-card.com/tw/…`) | MIT code. Data scraped from official sites. Hotlinking official images needs your consent (⟶ Q4.6) |
| **duanxr/PTCG-CHS-Datasets** (GitHub) | **Simplified Chinese**: 232 products incl. `30thC` (176 cards) with images | **Non-commercial, no redistribution.** Ask the maintainer before use ⟶ Q3.5 |
| **TCGCSV** (`tcgcsv.com`; TCGplayer categories 3 = EN, 85 = JP) | Product names and **images of EN/JP sealed products** (`tcgplayer-cdn…/product/{id}_in_1000x1000.jpg`), matched to Cardmarket products by name | Free, no key, needs its own User-Agent, max 10k requests/day, daily updates. Build step only |
| **PokéAPI** (CSV in its GitHub repo) | Pokémon species names in de/ja/zh-Hant/zh-Hans/ko for **search aliases** ("Glurak" ⇄ "Charizard" ⇄ "リザードン" ⇄ "噴火龍") | Free, open |
| **Bulbapedia / Serebii / PokeBeach / official galleries** | Manual research for sealed contents, release waves, promos | Read-only research; no scraping into the product |
| **Limitless TCG** | Printed Classic Collection numbers (CC1–CC30), and as a reference | No API; image CDN terms unclear, so not used |
| **pokemontcg.io** | ✗ Deprecated. Offline on **1 Mar 2027**, no new keys, English only | — |
| **Scrydex / JustTCG / PokemonPriceTracker** | ✗ Paid or keyed, price-focused | — |

---

## 5. Image strategy

**Priority chain per card and language** (resolved at build time, stored in the catalog as the verified URL list):

1. TCGdex asset for the **exact language** (`{lang}` = de/en/ja).
2. TCGdex asset for **another language of the same print** (e.g. an EN image for a DE card), flagged "Bild in Englisch" in the UI.
3. **Cross-print artwork match** (build-time heuristic, manually reviewed): the same card in the other print, matched via Cardmarket `idMetacard` + same illustrator + same expansion family (e.g. JP `M6a` ↔ EN `30th`). It's labeled "Abbildung: englische Ausgabe".
4. *(Only if Q4.6 = yes)* the **official publisher image** (JP `pokemon-card.com`, TW `asia.pokemon-card.com`) via `type-null/PTCG-database` URLs.
5. The **user's own photo** (`media` table), if provided.
6. A **placeholder**: a designed card-back with the set symbol, number and name.

**Loading:** `<img crossorigin="anonymous">` for TCGdex, since it sends CORS `*` on 200. Grids use `low.webp`, detail views `high.webp` with `srcset`. The service worker caches only **CORS-clean** responses (no opaque entries; see `ARCHITECTURE.md` §8.3). Hosts without CORS headers are either proxied through a same-origin Vercel rewrite or left to the browser's HTTP cache (⟶ ADR-013, Q8.4).

**Sealed product images:** TCGCSV (EN/JP) where matched → official product-gallery images (⟶ Q4.6) → user photo → a product-type illustration placeholder.

---

## 6. Catalog pipeline (`scripts/catalog/`)

### 6.1 Inputs

| Input | Form |
|---|---|
| `catalog.config.ts` | Which sets to include, e.g. `{ print: 'intl', tcgdex: ['30th', '30th-c'], energies: { set: 'mee', localIds: ['009'…'016'] } }` and `{ print: 'asia', tcgdex: ['M6a'] }` |
| TCGdex | `tcgdex/cards-database` at a **pinned commit** (git clone, sparse, ~8 s), compiled with its own compiler (Bun) into per-language JSON. The asset index `datas.json` is fetched in CI |
| Cardmarket | `products_nonsingles_6.json` (+ `products_singles_6.json` for `idMetacard` links), downloaded in CI |
| Curated overlays (`data/curated/`) | YAML/JSON, human-edited and reviewed in PRs (§6.3) |

### 6.2 Steps

1. **Fetch:** check out the TCGdex commit, download the Cardmarket files and `datas.json` (and TCGCSV groups when sealed images are needed).
2. **Compile:** run the TCGdex compiler for the configured languages.
3. **Normalize** into Settr's schema (`DATA_MODEL.md` §4): Settr IDs, `print`, `section`, `sort`, `printedNumber`, controlled vocabularies (English values → Settr IDs), variants (`variantId` → Settr `VariantId`, with overrides), and per-variant Cardmarket IDs.
4. **Overlay** curated data: sealed products, zh-tw names, printed numbers (Classic Collection), promos, rarity-display rules, name fixes, and Cardmarket ID corrections.
5. **Resolve images:** apply the §5 chain. Keep only URLs that are listed in `datas.json` **and** pass a CI GET check.
6. **Validate:** Zod schemas, counts vs official counts (e.g. `30th` = 161, `30th-c` = 30, `M6a` = 176), unique IDs, every sealed product has ≥ 1 set, and every `idProduct` exists in the Cardmarket file.
7. **Emit** `public/catalog/v1/manifest.json`, `sets/*.json` and `sealed.json` with SHA-256 hashes and `catalogVersion`.
8. **Report:** a Markdown diff summary (new/changed/removed cards and products, image coverage per language, and ID changes, which **must** be aliased) posted to the PR.

### 6.3 Curated overlay formats (examples)

```yaml
# data/curated/sealed/30th-intl.yaml
- id: intl:30th-etb
  type: etb
  setIds: [intl:30th]
  name: { de: "Top-Trainer-Box 30 Jahre", en: "30th Celebration Elite Trainer Box" }
  languages: [de, en, fr, it, es, pt]
  releaseDates: { de: 2026-09-16, en: 2026-09-16 }
  contents: { packs: 9, cardsPerPack: 6, promos: ["Nidorina (MEP 101)"], description: { de: "9 Booster, Promokarte, 65 Kartenhüllen, 16 Energiekarten, Würfel, Leitfaden" } }
  msrp: { de: { minor: 5499, currency: EUR }, en: { minor: 4999, currency: USD } }
  refs: { cardmarket: 895551 }
```

```yaml
# data/curated/cards/30th-c-printed-numbers.yaml   (Classic Collection)
intl:30th-c:001: { printedNumber: "4/102", classicIndex: 1 }   # Charizard (Base Set)
```

### 6.4 Automation

- `pnpm catalog:sync` runs locally (with network access) or in **GitHub Actions** (`catalog-sync.yml`: weekly plus manual). The workflow opens a PR containing the regenerated catalog and the diff report. It is never auto-merged.
- The upstream commit is recorded in the manifest (`sources[].version`) for reproducibility.

---

## 7. Sealed catalog for v1: "30 Jahre / 30th Celebration"

Released or announced as of 2026-09-23. **To be finalized with you (⟶ Q4.3)** and checked against Cardmarket's 66 products for this expansion (intl 45 incl. per-design variants, JP 4, SC 11, ID/TH 5, MF 1).

### 7.1 International (DE/EN)

| Wave | Product (DE / EN) | Contents (EN research) | Price |
|---|---|---|---|
| 16.09.2026 | **Booster** / Booster pack | 5 foil cards (one always a Pikachu) + 1 foil Energy + code card. **Only sold inside products** | — |
| 16.09.2026 | **Top-Trainer-Box 30 Jahre** / Elite Trainer Box | 9 boosters, full-art Nidorina promo (MEP 101), 65 sleeves, 16 Energy, dice, guide | UVP **54,99 €** · $49.99 |
| 16.09.2026 | Pokémon Center Top-Trainer-Box ◐ / Pokémon Center ETB | 11 boosters, 2 Nidorina promos (one PC-stamped). DE availability unconfirmed | $59.99 |
| 16.09.2026 | ex-Box ◐ / Pokémon ex Box | 4 boosters, Sylveon ex **or** Greninja ex promo + oversize card | $21.99 |
| 16.09.2026 | **Poster-Kollektion** / Poster Collection | 3 boosters, Arktos/Zapdos/Lavados promos, poster | $14.99 |
| 16.09.2026 | Tech-Sticker-Kollektion ◐ / Tech Sticker Collection | 3 boosters, Alola-Kokowei **or** Lucario promo, stickers | $14.99 |
| 16.09.2026 | **2er-Pack-Blister** / 2-Pack Blister · Knock Out Collection ◐ | 2 boosters, foil Evoli promo, coin | $9.99 |
| 02.10.2026 | **Booster-Bundle** | 6 boosters | ≈ $26.94 |
| 02.10.2026 | **Mini-Tins** Tag & Nacht / Day & Night Mini Tins (10 designs) | 2 boosters, sticker sheet, art card | $9.99 |
| 30.10.2026 | **Kampfdeck 30 Jahre: Psiana-ex / Nachtara-ex** / Battle Decks | All-foil 60-card deck, Victini/Zeraora promo, playmat, deck box, coin | $19.99 |
| 06.11.2026 | **Ultra-Premium-Kollektionen Tag / Nacht** | Pikachu ex + Psiana-ex/Nachtara-ex promos, 29 boosters + 1 Classic Collection pack | $179.99 |
| 06.11.2026 | Ditto-Premium-Kollektion ◐ | 8 boosters, acrylic display | $39.99 |
| 06.11.2026 | Mewtu & Mew Figuren-Kollektion ◐ | 5 boosters, figure | $29.99 |
| 04.12.2026 | Sammelalbum-Kollektion ◐ / Binder Collection | 5 boosters, binder | $31.99 |
| 04.12.2026 | **ex-Tins** (Sylveon ex / Greninja ex) | 4 boosters | $21.99 |

◐ = German product name to be confirmed from pokemon.de. **Bold** = German name confirmed in research.

### 7.2 Japanese

| Release | Product | Contents | Price |
|---|---|---|---|
| 16.09.2026 | 拡張パック「30th CELEBRATION」 (booster) | 6 cards, all foil | ¥360 |
| 16.09.2026 | BOX (display) | 20 packs (lottery sales) | ¥7,200 |
| 16.09.2026 | プレミアムデッキセット エーフィ・ブラッキー (Premium Deck Set Espeon & Umbreon) | 2 × 60-card decks, markers, coins, playmat, tin case | ¥6,200 |
| 16.09.2026 | FUTURISTIC BOX (Pokémon Center Online lottery) | 2 FUR Pikachu ex promos + YOSHIROTTEN supplies | ¥27,500 |
| 16.10.2026 | カードセット (Card Set, 9 versions) | 3 holo starter promos + 2 packs + stand | ¥1,200 each |

### 7.3 Chinese (only if in scope, ⟶ Q3.2/Q4.3)

- **Traditional Chinese (TW/HK):**
  - Booster NT$99 / HK$25.
  - FUTURISTIC BOX NT$7,490.
  - 頂級牌組組合 太陽伊布・月亮伊布 (Premium Deck Set Espeon & Umbreon) NT$1,888.
  - First-Partner special deck / keychain sets.
- **Simplified Chinese (mainland):**
  - Booster ¥18 (6 cards); 20-pack box ¥360.
  - Deluxe deck sets 太阳伊布 (Espeon) / 月亮伊布 (Umbreon), sold separately.
  - Collection display box Espeon ex & Umbreon ex (15 packs).
  - Greninja ex / Sylveon ex display sets.
  - **Charizard figure gift box** ¥780 (China-exclusive).
  - Coin set ¥68.
  - First Partner special-illustration card sets Vol. 1–3.

---

## 8. Cardmarket integration (no API; links and files only)

### 8.1 Deep links [3P, verify in M1]

- **Exact product (preferred):** `https://www.cardmarket.com/{de|en}/Pokemon/Products?idProduct={idProduct}&language={langId}&minCondition={cond}`
- **Fallback search:** `https://www.cardmarket.com/de/Pokemon/Products/Search?searchString={urlencoded name + number}`
- **Cardmarket language IDs:** 1 English · 2 French · **3 German** · 4 Spanish · 5 Italian · **6 S-Chinese** · **7 Japanese** · 8 Portuguese · 9 Russian · 10 Korean · **11 T-Chinese** · 12 Dutch · 13 Polish · 14 Czech · 15 Hungarian · 16 Indonesian · 17 Thai.
- **Condition codes (`minCondition`):** 1 MT · 2 NM · 3 EX · 4 GD · 5 LP · 6 PL · 7 PO.
- Reverse holos: add `isReverseHolo=Y` (same product ID). Pattern reverses have their own product IDs.

### 8.2 Purchase import (I-14)

Cardmarket's shipment export (`ArticlesFromShipment….csv`, `;`-separated) has these columns: `idProduct;groupCount;price;idLanguage;condition;isFoil;isSigned;isAltered;isPlayset;isReverseHolo;isFirstEd;isFullArt;isUberRare;isWithDie`.

It maps to Settr like this:
- `idProduct` + `isReverseHolo` → catalog card/variant (or sealed product).
- `idLanguage` → card language.
- `condition` 1–7 → MT…PO.
- `price` × `groupCount` → the lot's purchase price.
- The shipment date is taken from the user or the file name.

Unmatched rows go to a resolution screen.

### 8.3 Price guide (optional ⟶ Q6.6)

If you opt in, CI takes a daily snapshot of `price_guide_6.json`, **filtered to catalog products only** (a few KB instead of 15 MB), into `public/catalog/v1/cm-prices.json`. The price session could then show "Cardmarket-Trend vom 22.09.: 12,34 € übernehmen?". Nothing is ever stored without your confirmation.

---

## 9. Legal and licensing

- **Data:** TCGdex database is MIT. We credit it (About page + README). Cardmarket product catalog files are publicly offered downloads; we use IDs and names only. PokéAPI is open.
- **Artwork and card text:** © The Pokémon Company, Nintendo, GAME FREAK, Creatures. We **hotlink or proxy** (never re-host) images, and show this disclaimer:
  - **DE:** „Settr ist ein inoffizielles Fanprojekt und steht in keiner Verbindung zu The Pokémon Company, Nintendo, GAME FREAK oder Creatures. Pokémon und alle zugehörigen Namen sind Marken von Nintendo/The Pokémon Company. Kartenbilder und -texte © The Pokémon Company, Nintendo, GAME FREAK und/oder Creatures. Keine Verbindung zu Cardmarket. Preise sind Nutzereingaben ohne Gewähr."
  - **EN:** "Settr is an unofficial fan project and is not affiliated with, endorsed or sponsored by The Pokémon Company, Nintendo, GAME FREAK or Creatures. Pokémon and all related names are trademarks of Nintendo/The Pokémon Company. Card images and text © The Pokémon Company, Nintendo, GAME FREAK and/or Creatures. Not affiliated with Cardmarket. Prices are user-entered."
- **Name and branding:** "Pokémon" appears only descriptively ("für Pokémon-Sammelkarten"), never in the app name, logo or domain. No Pokémon logo font and no Poké Ball.
- **Germany-specific** (not legal advice ⟶ Q1.2):
  - A public site generally needs an **Impressum** (§ 5 DDG / § 18 Abs. 1 MStV) and a **Datenschutzerklärung**, which should mention Vercel hosting logs and the image host(s) that receive visitor IPs.
  - **Self-host fonts.** Loading Google Fonts from Google's CDN led to damages (LG München I, 2022).
  - With no analytics and only strictly necessary local storage, **no cookie banner** is needed (§ 25 Abs. 2 TDDDG).
- **Code licensing:** no GPL code (e.g. `pokemon-cards-css` is GPL-3.0). Fontshare fonts (ITF FFL) are avoided in the repo.

---

## 10. Open verification tasks (M0/M1, needs an unrestricted network)

- [ ] GET-check TCGdex images: `https://assets.tcgdex.net/de/me/30th/001/high.webp`, `…/en/me/30th/001/high.webp`, `…/de/me/30th-c/001/high.webp`, `…/ja/M/M6a/001/high.webp`, plus CORS headers.
- [ ] Confirm the Cardmarket deep-link format (`Products?idProduct=…&language=3&minCondition=2`) redirects correctly.
- [ ] Confirm German product names (◐) from pokemon.de product galleries.
- [ ] Decide on Chinese sources (Q3.5): check type-null data_tc for M6a names and ask the duanxr maintainer about SC usage.
- [ ] Spot-check 20 random Cardmarket IDs from TCGdex for the 30th sets (issue #2325).
