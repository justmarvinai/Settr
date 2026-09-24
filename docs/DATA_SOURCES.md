# Settr: Data Sources, Catalog Pipeline and Licensing

> Status: **Draft v0.4** (question rounds 1–7 incorporated) · Last updated: 2026-09-24 · Research date: 2026-09-23 (TCGdex repo commit `a211f11`, 2026-09-22).
> Evidence labels: **[V]** verified by us in source data or compiler output · **[V-src]** verified in server/SDK source code · **[M]** checked live by Marvin (dated) · **[3P]** dated live measurements published by other projects · **[D]** vendor docs · **[U]** unverified.
> References like (Q6.3) or (R2.3) point to decisions in [`USER_QUESTIONS.md`](../USER_QUESTIONS.md). All three question rounds are answered (R3.x = round 3, 2026-09-23).
> Our cloud environment blocked live HTTP checks to most hosts (see `CLAUDE.md`), so all **[3P]** items must be re-verified from an unrestricted network in M0/M1.

---

## 1. Summary and recommendations

| Need | Primary | Fallback / supplement | Never |
|---|---|---|---|
| **Card data, DE/EN** | **TCGdex** (compiled from the `tcgdex/cards-database` repo at build time) | TCGdex live API (CORS `*`) for ad-hoc checks | pokemontcg.io (English-only, **shutting down 1 Mar 2027**) |
| **Card data, JA** | TCGdex (`M6a` complete: 176 cards) | `type-null/PTCG-database` for gaps | — |
| **Card data, ZH-CN** (focus, Q3.2) | **The M6a card list** (SC mirrors it: 176 cards; numbering to spot-check against Cardmarket expansion 6603, §10). **Chinese names:** converted from the official Traditional Chinese names with OpenCC, labeled "übersetzt" (ADR-034); PokéAPI species names (`zh-Hans`) are the fallback. **Images:** the JP (`M6a`) artwork where one exists | Later: TCGdex, or another source that allows redistribution, once it has SC data | TCGdex zh-cn (empty shells or copies of Traditional text) · `duanxr/PTCG-CHS-Datasets` (its terms need the official owner's consent, R2.8; §4) |
| **Card data, ZH-TW** (cards + sealed, R2.3) | JP card list (numbering mirrors M6a) + Traditional Chinese names from `type-null/PTCG-database` (`data_tc`, covers M6a; MIT, verified in M2) | Names derived from PokéAPI species names (`zh-Hant`), labeled "übersetzt"; Trainer names curated by hand (ADR-026) | — |
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
| **duanxr/PTCG-CHS-Datasets** | — | — | — | `30thC` 176 cards (license restricted; **not used**, R2.8) |

**Data quirks to handle (pipeline overrides)**
- Every 30th card is **foil**, but TCGdex marks many as `normal`. We override to a single `std` variant per card.
- `30th-c` local IDs 001–030 are TCGdex's own order. The **printed numbers are the original collector numbers** (e.g. Charizard "4/102"), and Limitless lists them as CC1–CC30. Curate `printedNumber` explicitly.
- The **RGB Mews** (R/G/B) have no anniversary stamp and their own rarity. pokemontcg.io wrongly labels them "Common".
- JP rarity marks: only RR/AR/SAR/FUR cards print a symbol. The other 123 have none. Keep TCGdex's rarity but display "—" when nothing is printed. Simplified and Traditional Chinese marks aren't verified, so they stay empty (no source yet).
- The JP Classic Collection lists "サーナイトEX" at 156, while English databases list "M Gardevoir-EX". **Resolved in M2:** the Taiwanese list (M沙奈朵EX) and the English print (Primal Clash 106) show the Mega form, so the curated JA name is "MサーナイトEX" (`data/curated/cards/asia-M6a.yaml`).
- The **Classic Collection's printed numbers** are the originals (4/102, 58/102, …) in TCGdex's order 001–030; they're curated in `data/curated/cards/intl-30th-c.yaml` with a sort key that follows the reprint order.
- **Cardmarket (found by the first CI sync, M2):** TCGdex's M6a ids point at the Simplified Chinese products; the Japanese ids come from the shared metacard (171 of 176). Open: Sylveon ex 059/130 (two SC products share a metacard with one JP product) and the RGB Mews, whose ids are curated with an inferred R, G, B order (to verify).

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
- **Conclusion:** image availability is computed **at build time** by GET checks against the image server in CI, stored per card and language in the catalog, and refreshed weekly (§6). `datas.json` isn't used: it lags behind new sets (on 2026-09-23 it listed none of `30th`, `30th-c`, `mee` or `M6a`).

### 3.4 API (reference only; not used at runtime)

- REST: `https://api.tcgdex.net/v2/{lang}/{cards|sets|series}[/{id}]`, with filters `field=op:value` (`like`, `eq`, `neq`, `gt`, `lt`, `null:`, `notnull:`), `sort:field`, `sort:order`, `pagination:page`, `pagination:itemsPerPage`. It sends CORS `*` and has no published rate limit ("cache and be considerate") [V-src/D].
- GraphQL: `POST https://api.tcgdex.net/v2/graphql` with the `@locale(lang:"de")` directive. It has no pricing, thirdParty or variantId fields [V-src].
- SDK: `@tcgdex/sdk` 2.9.0 (MIT) [V].

---

## 4. Supplementary sources

| Source | Use in Settr | Terms / caveats |
|---|---|---|
| **Cardmarket product catalog** (`https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json` 13.6 MB; `…/products_nonsingles_6.json` 0.95 MB) | Sealed catalog skeleton: `idProduct`, English name, `categoryName` (Booster, Display, Elite Trainer Box, Box Set, Blisters, Tins, Theme Decks, …), `idExpansion`, `idMetacard` (links the same card across prints!), `dateAdded` | Public, no auth, updated daily (≈ 02:48 CEST). **No CORS**, so build/CI only. No images, numbers or languages. German sealed = international product + language filter |
| **Cardmarket price guide** (`…/priceGuide/price_guide_6.json`, 15.5 MB) | **Suggestions only** (Q6.6 → PRC-09): a daily snapshot limited to catalog products, never saved without confirmation (§8.3). Prices stay manual by design | Public, daily, no CORS. The snapshot isn't committed while the repository is public (ADR-029) |
| **type-null/PTCG-database** (GitHub) | JP gaps and the primary source of **Traditional Chinese** names (`data_tc`, up to M6a; R2.3, ADR-026) | MIT; its README states the repository content is MIT too (verified in M2), credited in Einstellungen › Über. **Its official image URLs are not used** (Q4.6) |
| **duanxr/PTCG-CHS-Datasets** (GitHub) | **Not used** (R2.8, revised). It has 232 Simplified Chinese products incl. `30thC` (176 cards) with names and images, but nothing from it is committed or shipped | **Non-commercial, no redistribution.** Its terms reserve consent for redistribution to **the official owner or an authorized entity** (they point to Pokémon Shanghai), not the maintainer. A request to the maintainer can't grant it, so none is sent |
| **TCGCSV** (`tcgcsv.com`; TCGplayer categories 3 = EN, 85 = JP) | Product names and **images of EN/JP sealed products** (`tcgplayer-cdn…/product/{id}_400w.jpg` and `…_in_1000x1000.jpg`). The CI report lists the sealed products of the matching groups (e.g. *ME: 30th Celebration* 3/24722, *M6a: MEGA Expansion 30th Celebration* 85/24721); their ids are curated as `refs.tcgplayer` | Free, no key, needs its own User-Agent, max 10k requests/day, daily updates. Build step only |
| **PokéAPI** (CSV in its GitHub repo) | Pokémon species names in de/ja/zh-Hant/zh-Hans/ko. Used for (1) **search aliases** ("Glurak" ⇄ "Charizard" ⇄ "リザードン" ⇄ "喷火龙"), (2) the fallback for Chinese names (`zh-Hans`, `zh-Hant`) where the official Traditional Chinese name is missing (ADR-026, ADR-034), and (3) **derived German names** for Asian-print cards ("ピカチュウex" → "Pikachu-ex"). Derived names are flagged in `nameSource` | Free, open |
| **Bulbapedia / Serebii / PokeBeach / official galleries** | Manual research for sealed contents, release waves, promos | Read-only research; no scraping into the product |
| **Limitless TCG** | Printed Classic Collection numbers (CC1–CC30), and as a reference | No API; image CDN terms unclear, so not used |
| **pokemontcg.io** | ✗ Deprecated. Offline on **1 Mar 2027**, no new keys, English only | — |
| **Scrydex / JustTCG / PokemonPriceTracker** | ✗ Paid or keyed, price-focused | — |

---

## 5. Image strategy

**Priority chain per card and language** (resolved at build time, stored in the catalog as the verified URL list):

1. TCGdex asset for the **exact language** (`{lang}` = de/en/ja).
2. TCGdex asset for **another language of the same print**: e.g. an EN image for a DE card, flagged "Bild in Englisch" in the UI, or the JP `M6a` image for an SC or TC card (R2.8, R2.3).
3. **Cross-print artwork match** (build-time heuristic, manually reviewed): the same card in the other print, matched via Cardmarket `idMetacard` + same illustrator + same expansion family (e.g. JP `M6a` ↔ EN `30th`). It's labeled "Abbildung: englische Ausgabe".
4. The **user's own photo** (`media` table), once photos ship (I-12).
5. A **placeholder**: a designed card-back with the set symbol, number and name.

**Loading:** `<img crossorigin="anonymous">` for TCGdex, since it sends CORS `*` on 200. Grids use `low.webp`, detail views `high.webp` with `srcset`. The service worker caches only **CORS-clean** responses (no opaque entries; see `ARCHITECTURE.md` §8.3). Hosts without CORS headers are either proxied through a same-origin Vercel rewrite or left to the browser's HTTP cache (⟶ ADR-013, Q8.4).

Decision (Q4.6): **no official publisher images**. The chain is TCGdex → cross-print artwork → own photo (later, I-12) → placeholder.

**Sealed product images:** TCGplayer product images via TCGCSV for EN/JP products where matched (35 of 52 products in M2; the DE products show the English packaging, labeled as such). That CDN's CORS behavior is unknown, so they're served through the same-origin image proxy (ADR-013 option B). Otherwise a designed product-type placeholder is shown (DE, TC and SC packaging has no free image source). Own photos come later (I-12).

---

## 6. Catalog pipeline (`scripts/catalog/`)

### 6.1 Inputs

| Input | Form |
|---|---|
| `catalog.config.ts` | Which sets to include, e.g. `{ print: 'intl', tcgdex: ['30th', '30th-c'], energies: { set: 'mee', localIds: ['009'…'016'] } }` and `{ print: 'asia', tcgdex: ['M6a'] }` |
| TCGdex | `tcgdex/cards-database` at a **pinned commit** (`scripts/catalog/sources.lock.json`; shallow git fetch). The pipeline imports the set's TypeScript card files directly (tsx), so it needs neither Bun nor TCGdex's compiler |
| Cardmarket | `products_nonsingles_6.json` (sealed skeleton) + `products_singles_6.json` (`idMetacard` links between the **Japanese products in expansion 6602** and the **Simplified Chinese products in expansion 6603**), downloaded in CI |
| Cardmarket price guide | `price_guide_6.json`, fetched **daily** by a separate job (§8.3; committed or built at deploy time per ADR-029) |
| PokéAPI | species-name CSV (derived names and search aliases) |
| Curated overlays (`data/curated/`) | YAML/JSON, human-edited and reviewed in PRs (§6.3) |

### 6.2 Steps

1. **Fetch:** check out the pinned TCGdex, PTCG-database and PokéAPI commits; in CI (`--network`) also download the Cardmarket files (and TCGCSV groups when sealed images are needed).
2. **Load:** import the configured sets' card files from the TCGdex checkout.
3. **Normalize** into Settr's schema (`DATA_MODEL.md` §4): Settr IDs, `print`, `section`, `sort`, `printedNumber`, controlled vocabularies (English values → Settr IDs), variants (`variantId` → Settr `VariantId`, with overrides), and per-variant Cardmarket IDs.
4. **Overlay** curated data: sealed products (DE/EN/JP/TC/SC), Chinese names (TC from `type-null/PTCG-database`, else the TC name of a card with the same JA name; SC converted from TC with OpenCC, labeled *übersetzt*; DE/EN for Asian cards from the international counterpart, PokéAPI or curated), printed numbers (Classic Collection), counterparts, promos, name fixes, and Cardmarket ID corrections (`cardmarket` per language).
   **Per-language Cardmarket IDs:** TCGdex keeps one Cardmarket ID per `asia` card, and for `M6a` it points at the **Simplified Chinese** product. The product's expansion decides the language: a JP product (expansion 6602) goes into `byLanguage.ja`, an SC product (6603) into `byLanguage['zh-cn']`, and the other language is found through the shared `idMetacard` (several prints of one card pair in number order, only when both sides have the same count). Traditional Chinese copies use the JP product with Cardmarket's T-Chinese language filter. Offline builds keep the IDs of the last CI build.
5. **Resolve images:** apply the §5 chain. In CI, keep only URLs that pass a GET check (the same for set logos and symbols). Offline builds keep the pictures of the last CI build; cards it didn't know get their exact-language URL, unverified (`imagesVerified: false` in the manifest).
6. **Validate:** Zod schemas, counts vs official counts (e.g. `30th` = 161, `30th-c` = 30, `M6a` = 176), unique IDs, every sealed product has ≥ 1 set, and every `idProduct` exists in the Cardmarket file.
7. **Emit** `public/catalog/v1/manifest.json` (set summaries grouped by series), one `sets/*.json` chunk per set, `sealed.json` and the slim global `search-index.json` (ADR-028), with SHA-256 hashes and `catalogVersion`.
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
# data/curated/cards/intl-30th-c.yaml   (Classic Collection: printed number and reprint order)
setId: intl:30th-c
cards:
  "001": { printedNumber: 4/102, sort: 2 }   # Charizard (Base Set)
```

Quote YAML values that contain a comma inside `{ … }` or `[ … ]`: flow collections split on commas.

### 6.4 Automation

- `pnpm catalog:sync` runs locally (with network access) or in **GitHub Actions** (`catalog-sync.yml`: weekly plus manual). The workflow opens a PR containing the regenerated catalog and the diff report. It is never auto-merged.
- The upstream commit is recorded in the manifest (`sources[].version`) for reproducibility.

### 6.5 Adding sets after v1 (R2.5, ADR-028)

v1 ships *30 Jahre* only. Marvin's other sets follow **one by one, era by era, once the core site is fully functional** (suggested order, to confirm when v1 is done: Mega Evolution → Scarlet & Violet → Sword & Shield → Sun & Moon → Base Set). Adding a set means:

1. A `catalog.config.ts` entry (TCGdex set IDs per print, plus subsets and energies where they exist).
2. A curated overlay in `data/curated/` (sealed products, name fixes, Cardmarket ID corrections).
3. A reviewed catalog-sync PR (counts, images, Cardmarket IDs).

The output is one more set chunk plus its manifest (series) and search-index entries, not a refactor. Old-set specifics use the existing variant model: Base Set *1st Edition* vs *Unlimited*, for example, are variants of kind `edition`.

---

## 7. Sealed catalog for v1: "30 Jahre / 30th Celebration"

Released or announced as of 2026-09-23. **Scope (Q4.3):** DE, EN, JP, Traditional and Simplified Chinese products, including Pokémon Center exclusives and Japanese lottery/specialty items. The list is checked against Cardmarket's products for this expansion (intl 45 incl. per-design variants, JP 4, SC 11, MF 1; Indonesian/Thai excluded).

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

### 7.3 Chinese (in scope, Q4.3)

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

### 8.1 Deep links

- **Exact product (preferred):** `https://www.cardmarket.com/{de|en}/Pokemon/Products?idProduct={idProduct}&language={langId}&minCondition={cond}`. The `Products?idProduct=` redirect to the product page works **[M, 2026-09-23]**.
- **Fallback search:** `https://www.cardmarket.com/de/Pokemon/Products/Search?searchString={urlencoded name + number}` [3P].
- **Cardmarket language IDs** [3P, except `3` = German: M, 2026-09-23]: 1 English · 2 French · **3 German** · 4 Spanish · 5 Italian · **6 S-Chinese** · **7 Japanese** · 8 Portuguese · 9 Russian · 10 Korean · **11 T-Chinese** · 12 Dutch · 13 Polish · 14 Czech · 15 Hungarian · 16 Indonesian · 17 Thai.
- **Condition codes (`minCondition`)** [3P]: 1 MT · 2 NM · 3 EX · 4 GD · 5 LP · 6 PL · 7 PO. **`minCondition=2` = Near Mint or better is verified** [M, 2026-09-23] (R3.5).
- Reverse holos: add `isReverseHolo=Y` (same product ID) [3P]. Pattern reverses have their own product IDs.
- **Seller country:** `sellerCountry={countryId}`. **Germany = `7`** **[M, 2026-09-23]**.
- **Settr's default link (Q6.3, R2.2):** `…/Products?idProduct={id}&language={langId of the copy}&sellerCountry=7&minCondition=2`. This opens the product with exactly the offers Marvin compares: his language, German sellers, **Near Mint or better**, sorted by price. Traditional Chinese copies link to the JP product with `language=11` (T-Chinese, R2.3).
- **Verified example [M]:** on 2026-09-23 Marvin confirmed that `https://www.cardmarket.com/de/Pokemon/Products?idProduct=907757&language=3&sellerCountry=7` opens **Pikachu ex (30C 150)** filtered to **German sellers** and **German cards**.

### 8.2 Purchase import (I-14)

Cardmarket's shipment export (`ArticlesFromShipment….csv`, `;`-separated) has these columns: `idProduct;groupCount;price;idLanguage;condition;isFoil;isSigned;isAltered;isPlayset;isReverseHolo;isFirstEd;isFullArt;isUberRare;isWithDie`.

It maps to Settr like this:
- `idProduct` + `isReverseHolo` → catalog card/variant (or sealed product).
- `idLanguage` → card language.
- `condition` 1–7 → MT…PO.
- `price` × `groupCount` → the lot's purchase price.
- The shipment date is taken from the user or the file name.

Unmatched rows go to a resolution screen.

### 8.3 Price-guide suggestions (in scope, Q6.6 → PRC-09)

- **Job:** a GitHub Action (`price-guide.yml`) runs daily at ~05:00 CET, after Cardmarket publishes its file at ~02:48 CEST.
  1. Download `price_guide_6.json` (15.5 MB).
  2. Keep only the `idProduct`s referenced by the catalog (cards per variant/language + sealed products): a few KB.
  3. Write `public/catalog/v1/cm-prices.json` (`PriceGuideSnapshot`, `DATA_MODEL.md` §4.1).
  4. Publish it. How depends on the repository's visibility (ADR-029). It stays **public** for now (R3.2), so the public variant applies:
     - **Private repository (if it's made private later):** commit it to `main` **only if changed**. Vercel redeploys automatically; one small commit per day is the accepted cost of staying static.
     - **Public repository:** **never commit it**, because a public repo would republish Cardmarket's data. The job only calls a Vercel **deploy hook** (its URL is kept as a GitHub Actions secret), and steps 1–3 run inside the Vercel build, so the file exists only in the deployment.
- **Semantics** (shown in the UI):
  - **International** products (DE/EN share one product): `low` = the cheapest offer across **all languages, countries and conditions**, and `trend` = Cardmarket's trend. So it's usually *lower* than "cheapest German seller in German", and it's labeled *"alle Sprachen & Länder"*.
  - **JP / SC products** are separate Cardmarket products, so their values don't mix in international offers. Traditional Chinese copies are listed under the JP product (language filter *T-Chinese*, R2.3), so JP values may include TC offers [U: verify].
  - The `-holo` fields are Cardmarket's **reverse-holo** prices for Pokémon. They're used only for `reverse` variants, and 30 Jahre has none [U: verify].
  - **Every price belongs to its card language (R2.6):** each suggestion is labeled with the scope it really covers, and a guide value is never presented as if it applied to a language it doesn't cover.
- **UX:** a suggestion chip with the date, *ab* and *Trend*, and one click to copy a value into the input. It's **never saved automatically**, and an accepted value is stored with `origin: 'guide'`. The chip is hidden when the snapshot is older than 3 days or the product isn't in the guide.
- **Failure handling:** if the download or parse fails, the job keeps the previous snapshot and opens an issue after 3 consecutive failures. The app shows the snapshot's date, so staleness is visible. In the public-repository variant, a failed download must not fail the deploy: the build ships without a snapshot, and the chip stays hidden.

---

## 9. Legal and licensing

- **Data:** TCGdex database is MIT. We credit it (About page + README). Cardmarket product catalog files are publicly offered downloads; we use IDs and names only. PokéAPI is open. `type-null/PTCG-database` is MIT, content included (verified in M2, ADR-026), and credited in Einstellungen › Über. Product pictures come from TCGplayer through TCGCSV and are shown through Settr's own proxy. `duanxr/PTCG-CHS-Datasets` is not used (R2.8).
- **Public repository (ADR-029; public for now, R3.2):** while the GitHub repository is public, Cardmarket's price guide is never committed (`cm-prices.json` is built at deploy time, §8.3), so the repo doesn't republish Cardmarket's data.
- **Artwork and card text:** © The Pokémon Company, Nintendo, GAME FREAK, Creatures. We **hotlink or proxy** (never re-host) images, and show this disclaimer:
  - **DE:** „Settr ist ein inoffizielles Fanprojekt und steht in keiner Verbindung zu The Pokémon Company, Nintendo, GAME FREAK oder Creatures. Pokémon und alle zugehörigen Namen sind Marken von Nintendo/The Pokémon Company. Kartenbilder und -texte © The Pokémon Company, Nintendo, GAME FREAK und/oder Creatures. Keine Verbindung zu Cardmarket. Preise sind Nutzereingaben ohne Gewähr."
  - **EN:** "Settr is an unofficial fan project and is not affiliated with, endorsed or sponsored by The Pokémon Company, Nintendo, GAME FREAK or Creatures. Pokémon and all related names are trademarks of Nintendo/The Pokémon Company. Card images and text © The Pokémon Company, Nintendo, GAME FREAK and/or Creatures. Not affiliated with Cardmarket. Prices are user-entered."
- **Name and branding:** "Pokémon" appears only descriptively ("für Pokémon-Sammelkarten"), never in the app name, logo or domain. No Pokémon logo font and no Poké Ball.
- **Germany-specific** (not legal advice):
  - **Decision (Q1.2): Settr is deployed privately.** It uses an unlisted `*.vercel.app` URL that is shared only with a few friends and never written into the repository (ADR-029), with `noindex` via meta tag, `X-Robots-Tag` header and `robots.txt`. **No Impressum while it stays private.** The exemption in § 18 Abs. 1 MStV covers purely personal or family purposes; sharing with friends is a grey zone, so the risk is low but not zero. If Settr is ever offered publicly, add an **Impressum** (§ 5 DDG / § 18 Abs. 1 MStV).
  - A short **privacy note** ("Datenschutz") is shown regardless: no tracking, data stays local, and Vercel hosting logs plus the image host `assets.tcgdex.net` see IP addresses.
  - **Self-host fonts.** Loading Google Fonts from Google's CDN led to damages (LG München I, 2022).
  - With no analytics and only strictly necessary local storage, **no cookie banner** is needed (§ 25 Abs. 2 TDDDG).
- **Code licensing:** no GPL code (e.g. `pokemon-cards-css` is GPL-3.0). Fontshare fonts (ITF FFL) are avoided in the repo.

---

## 10. Open verification tasks (M0/M1, needs an unrestricted network)

- [x] GET-check TCGdex images (CI, M2): DE and EN pictures exist for 158 of 199 international cards; none yet for the Classic Collection, the energies or M6a (JA/ZH copies show the international artwork, marked). Checked again every week.
- [x] Cardmarket deep-link format: `Products?idProduct=…` redirects correctly, `language=3` = German and `sellerCountry=7` = Germany. Verified by Marvin on 2026-09-23 with Pikachu ex (30C 150), §8.1.
- [x] `minCondition=2` filters to Near Mint or better (verified by Marvin, R3.5).
- [ ] Confirm the price-guide field semantics (`low` scope, `-holo` = reverse holo for Pokémon, and whether JP product values include Traditional Chinese offers).
- [ ] Confirm German product names (◐) from pokemon.de product galleries.
- [ ] Simplified Chinese: verify that the SC card list = M6a numbering (spot-check 20 cards against Cardmarket expansion 6603). No permission request is sent, because `duanxr/PTCG-CHS-Datasets` isn't used (R2.8).
- [x] Traditional Chinese: `type-null/PTCG-database` is MIT, content included (M2).
- [ ] Spot-check 20 random Cardmarket IDs from TCGdex for the 30th sets (issue #2325).
