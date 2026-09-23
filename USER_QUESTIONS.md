# Settr: Questions for Marvin

> Last updated: 2026-09-23 · Status: **waiting for your answers** · No code will be written until you explicitly say so.

## How to answer

- Tick options with `[x]`, or write under **Antwort:**. German or English is fine.
- ⭐ = **my recommendation**. ★ = **needed before coding starts**. Everything else can be answered later.
- **Fast path:** if you agree with all my recommendations, write **"Alle Empfehlungen OK"** at the top and answer only what you want to change, plus the ★ questions that have no recommendation.
- You can also answer in chat. I'll transfer the answers into the docs (spec v0.2).

---

## 0. What I found (context for your answers)

1. **Your set exists and is fresh.** The 30th-anniversary expansion is *Pokémon-Sammelkartenspiel: 30 Jahre* (EN *30th Celebration*, JP *30th CELEBRATION* / M6a). It released **worldwide on 16 Sep 2026**, the first set ever released on the same day in all languages.
   - **EN/DE:** 128 official cards + 33 secret rares (incl. 3 new **RGB Rare** Mews R/G/B), a 30-card **Classic Collection** subset, and 8 foil Energies.
   - **JP:** 176 cards with a *different* list and numbering.
   - **Every card is foil. There are no reverse holos.**
2. **Card data:** **TCGdex** (free, open source, multilingual) already has EN/DE (`30th`, `30th-c`) and JP (`M6a`) data, including **Cardmarket product IDs** per card. That makes exact "open on Cardmarket" links possible. It has **no Chinese data** for this set yet.
3. **Images have gaps at launch.** TCGdex has German/English images for the main set, but so far **none for the Classic Collection and the 30th Energies**, and **no Japanese images for the whole Mega era (incl. M6a)**. Settr will show a designed placeholder or another language's image until they appear (see Q4.6).
4. **Sealed:** there's no free API for sealed products. I'll build the catalog from Cardmarket's public product list (66 products for this expansion, with Cardmarket IDs) and curate German names, contents and dates by hand. **Note:** EN/DE 30 Jahre has **no booster display**. Packs come only in products (Top-Trainer-Box, Booster-Bundle, Blister, Kollektionen, Tins, Kampfdecks, UPCs). Products keep releasing until Dec 2026. Japan sells a 20-pack BOX.
5. **Hosting:** Vercel's free *Hobby* plan is **non-commercial only**.
6. **Data safety:** browser storage can be deleted, especially **Safari/iOS after 7 days without a visit** unless the app is installed to the home screen. That's why backups and the installable app are central in the plan.
7. **Killer idea from research:** Cardmarket's own purchase export (CSV with `idProduct`, price, language, condition) can be matched to Settr's catalog through the Cardmarket IDs. **Your Cardmarket purchases could be imported automatically, with real purchase prices** (see I-14).

---

## 1. Vision and usage

**Q1.1 ★ Who will use Settr?**
- [ ] Only me
- [ ] Me + family/friends
- [ ] Public (anyone can use it with their own local data)
- ⭐ Build it to public quality, but launch it for yourself first.

Antwort:

**Q1.2 ★ Will the site be publicly reachable/shared?** In Germany, a publicly offered website generally needs an **Impressum** (§ 5 DDG / § 18 MStV) and a **privacy notice**. There's a narrow exemption for purely personal/family use. *This is not legal advice.*
- [ ] Private: unlisted URL, `noindex`, only for me and people I give the link to
- [ ] Public: with Impressum + Datenschutzerklärung (I'll prepare templates; you provide name/address)

Antwort:

**Q1.3 Which devices will you mainly use?** For example: Windows PC + Chrome, MacBook + Safari, iPhone, Android.

Antwort:

**Q1.4 Domain and accounts:** Do you want a custom domain (e.g. `settr.app`, `settr.de`) or is `settr.vercel.app` fine? Is your Vercel account already connected to GitHub?

Antwort:

**Q1.5 Roughly how big is your collection?** Number of cards and sealed products today, and expected in 2 years. This sizes performance testing.

Antwort:

**Q1.6 Do you already track your collection somewhere** (Excel, Google Sheets, Collectr, TCG Collector, Cardmarket order history)? Would you like to import it at launch? (see Q7.4, I-14, I-16)

Antwort:

---

## 2. Navigation, naming, tone

**Q2.1 ★ In your brief you wrote "card libraries" and "Sealed library". What does "library" mean for you?**
- [ ] ⭐ **My own collection** (what I own), with separate **search** across *all* cards and products in the database
- [ ] The **catalog** of all existing cards/products (and my collection is something separate)

Antwort:

**Q2.2 Main navigation (German UI).** Is this OK? *Übersicht · Sammlung (Karten | Sealed) · Katalog (Sets | Karten | Sealed) · Preise · Portfolio · Wunschliste · Einstellungen*
- [ ] ⭐ Yes
- [ ] Change: …

Antwort:

**Q2.3 What should Settr open to?**
- [ ] ⭐ Übersicht (dashboard with value, P/L, stale prices)
- [ ] My collection
- [ ] The set page

Antwort:

**Q2.4 How should Settr address you in German?**
- [ ] ⭐ *du* (informal, typical for collector apps)
- [ ] *Sie*

Antwort:

---

## 3. Languages

**Q3.1 ★ UI languages (the app's own text):**
- [ ] German only
- [ ] ⭐ German (default) + English
- [ ] Also Japanese / Chinese UI later

Antwort:

**Q3.2 ★ "Chinese": which Chinese cards do you collect?**
- [ ] Traditional Chinese (Taiwan/Hong Kong; same card list as Japanese)
- [ ] Simplified Chinese (mainland China; own products and sometimes own sets)
- [ ] Both

Antwort:

**Q3.3 Do you own or want other card languages too?** They're cheap to add for the international print (TCGdex has FR/IT/ES/PT names).
- [ ] French · [ ] Italian · [ ] Spanish · [ ] Portuguese · [ ] Korean · [ ] No, only DE/EN/JA/ZH

Antwort:

**Q3.4 Default card language when adding a card:**
- [ ] ⭐ German, but Settr remembers the last language used per session
- [ ] Always ask

Antwort:

**Q3.5 ★ Chinese data gap.** TCGdex has **no Chinese data** for 30th CELEBRATION yet. What should v1 do?
- [ ] (a) I curate a Traditional-Chinese card list (names from official Chinese sources, JP structure)
- [ ] (b) ⭐ Allow Chinese copies on the Japanese card list immediately (JP images/names shown), and upgrade automatically when Chinese data arrives
- [ ] (c) Postpone Chinese to after v1
- [ ] ⭐ (b) now + (a) as soon as data is reliable

Antwort:

**Q3.6 How should card names be shown by default?**
- [ ] ⭐ In the language of *my copy* in my collection, and in German in the catalog
- [ ] Always German where available
- [ ] Always the original print language

Antwort:

---

## 4. Catalog scope (v1)

**Q4.1 ★ Confirm the v1 set: "30 Jahre / 30th Celebration"** with these parts:
- [ ] ⭐ International (DE/EN): main set 001–158 + R/G/B **+ Classic Collection (30) + 8 foil Energies**, shown as sections of one set
- [ ] ⭐ Japanese M6a (176, incl. its Classic Collection)
- [ ] Only the main set, without the Classic Collection/Energies

Antwort:

**Q4.2 Related 30th-anniversary promos?**
- Black Star promos from products: Nidorina (Top-Trainer-Box), Sylveon ex / Greninja ex, Arktos/Zapdos/Lavados, Alola-Kokowei / Lucario, Evoli, Victini / Zeraora, Pikachu ex + Psiana-ex / Nachtara-ex (UPC), Ditto.
- JP card-set promos, gym promos, the stamped Pokémon Day 2026 Pikachu.

- [ ] ⭐ Yes, as a "Promos" section, added as data becomes available
- [ ] No, core set only

Antwort:

**Q4.3 Sealed catalog: which regions and products?**
- [ ] ⭐ German + English + Japanese products in v1
- [ ] Also Traditional/Simplified Chinese products
- [ ] Include Pokémon Center exclusives (e.g. PC Top-Trainer-Box)
- [ ] Include Japanese lottery/specialty items (e.g. FUTURISTIC BOX, Card Sets)

Antwort:

**Q4.4 Should the Japanese "Premium Deck Set Espeon & Umbreon" (TCGdex `MF`, 49 cards) be in the catalog too?**
- [ ] Yes · [ ] ⭐ Later · [ ] No

Antwort:

**Q4.5 Which sets should come after v1?** This helps me size the architecture.
- [ ] ⭐ The rest of the *Mega-Entwicklung* era (DE/EN + JP)
- [ ] All Scarlet & Violet sets
- [ ] Vintage (WotC era)
- [ ] Specific sets: …

Antwort:

**Q4.6 Missing card images:** when TCGdex has no image for a card/language (e.g. all Japanese M6a cards right now), what should Settr show?
- [ ] ⭐ The image of another language of the same print (marked "Bild in Englisch"), or the same artwork from the other print (e.g. the English version of a Japanese card, clearly labeled), else a designed placeholder, plus the option to add my own photo
- [ ] Additionally use the **official publisher images** (pokemon-card.com for JP, the official Taiwan site for Traditional Chinese), linked directly from their servers
- [ ] Placeholder only

Antwort:

---

## 5. Collection details

**Q5.1 Which card attributes do you want to track?**
- [ ] ⭐ Condition (Cardmarket scale MT/NM/EX/GD/LP/PL/PO)
- [ ] ⭐ Grading (company, grade, certificate number)
- [ ] Signed · [ ] Altered · [ ] Misprint/error
- [ ] ⭐ Notes · [ ] ⭐ Tags · [ ] ⭐ Storage location (binder/box/page)
- [ ] Photos of my own copies (I-12)

Antwort:

**Q5.2 Condition:** Do you usually care about condition, or is almost everything Near Mint? Default = NM?

Antwort:

**Q5.3 Graded cards:** Do you own or plan graded cards? Which companies (PSA, BGS, CGC, TAG, ACE, GSG, …)?

Antwort:

**Q5.4 Quantities:**
- [ ] ⭐ Lots: "3× German Pikachu, bought together for 4,50 € each" (one entry with quantity)
- [ ] Every single copy as its own entry

Antwort:

**Q5.5 ★ Set completion: what counts for you?**
- [ ] Basis-Set (the 128 numbered cards)
- [ ] Komplett-Set (incl. secret rares → 161)
- [ ] Master-Set (everything incl. Classic Collection + Energies)
- [ ] ⭐ Show all three
- Per language (e.g. "German master set") or any language?
  - [ ] ⭐ Per language, with an "any language" toggle

Antwort:

**Q5.6 Sealed product states:** Is *versiegelt / beschädigt / geöffnet* enough? Anything else (e.g. "graded sealed", "damaged shrink")?

Antwort:

**Q5.7 Do you use binders/boxes you'd like to map in Settr** (e.g. "Binder A, Seite 3")?

Antwort:

**Q5.8 When you open a sealed product:**
- [ ] Just mark it opened (its cost counts as spent)
- [ ] ⭐ Mark it opened **and optionally log the pulls** (I-11)
- How should the product's cost be split onto pulled cards?
  - [ ] Not at all (pulls = 0 €)
  - [ ] Evenly
  - [ ] ⭐ Proportional to card value at opening

Antwort:

---

## 6. Prices and profit/loss

**Q6.1 ★ Currencies:** Do you buy in other currencies (JPY from Japan, USD, CNY/TWD)?
- [ ] ⭐ EUR only (simplest)
- [ ] Multiple currencies with automatic conversion to EUR at the purchase date (ECB rates via a free API; this would be Settr's **only** runtime network call besides images)
- [ ] Multiple currencies, I enter the rate myself

Antwort:

**Q6.2 ★ What does one price refer to?**
- [ ] ⭐ One reference price (NM) per card + language (graded copies get their own price series)
- [ ] Separate prices per condition
- [ ] Reference price + automatic condition discounts (e.g. EX 85 %, LP 60 %)
- [ ] ⭐ Plus an optional per-copy override for special pieces

Antwort:

**Q6.3 Which Cardmarket value do you usually write down?**
- [ ] ⭐ Preis-Trend
- [ ] "ab" (cheapest offer)
- [ ] 30-Tages-Durchschnitt
- [ ] Other: …

Settr stores the price type with each entry. Your answer sets the default.

Antwort:

**Q6.4 Purchase costs:** Should shipping/fees count toward the purchase price?
- [ ] ⭐ Yes, an optional "fees/shipping" field per entry
- [ ] Yes, and split the shipping of one order across all its cards automatically ("orders")
- [ ] No

Antwort:

**Q6.5 ★ Do you sell or trade cards and want realized profit tracked?**
- [ ] ⭐ Yes: sell/trade (also partially) with sale price and fees, plus realized P/L
- [ ] No, only current holdings

Antwort:

**Q6.6 ★ Stay 100 % manual?** Your brief says prices are entered entirely by hand. Cardmarket publishes a free daily price-guide file. A daily build job could extract the ~300 relevant prices, and the price session would show them as a *suggestion* (e.g. "Trend vom 22.09.: 12,34 € übernehmen?") that you confirm or overwrite.
- [ ] ⭐ 100 % manual (as in the brief), fast thanks to the price session
- [ ] Optional "suggest prices from the Cardmarket price guide", always confirmed by me

Antwort:

**Q6.7 When is a price "stale" and should be refreshed?**
- [ ] 7 days · [ ] ⭐ 14 days · [ ] 30 days · [ ] Other: …

Antwort:

**Q6.8 Items without any price yet:**
- [ ] ⭐ Excluded from total value, shown as "X unbepreist"
- [ ] Counted at purchase price until priced

Antwort:

**Q6.9 "Open on Cardmarket" links:** which filters should be preset?
- [ ] ⭐ Language of my copy
- [ ] Minimum condition (e.g. NM)
- [ ] Seller country Germany
- [ ] Other: …

Antwort:

---

## 7. Data, backups, devices

**Q7.1 Backup reminder:** remind me when my last backup is older than
- [ ] 3 days · [ ] ⭐ 7 days · [ ] 14 days · [ ] Never

Antwort:

**Q7.2 Automatic backup into a folder** (e.g. a Dropbox/OneDrive/iCloud folder on your PC)? Works in Chrome/Edge on desktop only. (I-15)
- [ ] ⭐ Yes, later (post-v1) · [ ] Yes, in v1 · [ ] No

Antwort:

**Q7.3 Do you need the same data on several devices** (PC + phone) at the same time?
- [ ] No, one main device + backup file is fine
- [ ] ⭐ Occasionally: moving via export/import (+ merge) is enough for v1
- [ ] Yes, regularly: I'd like sync later via my own cloud storage (I-18)

Antwort:

**Q7.4 Existing data to import:** If you have files (Collectr CSV, TCG Collector CSV, Cardmarket "ArticlesFromShipment" CSVs, Excel), please describe them or put samples in the repo (with no private data you don't want in Git). I'll build import presets for exactly those.

Antwort:

**Q7.5 Password-protected (encrypted) backups?** (I-17)
- [ ] Yes · [ ] ⭐ Not needed (the files stay on my devices)

Antwort:

---

## 8. Tech, hosting, legal

**Q8.1 Tech stack:** I recommend Vite 8 + React 19 + TypeScript 7 + TanStack Router + Dexie (IndexedDB) + Tailwind 4 + shadcn/Base UI + Paraglide (i18n) + Recharts, as a PWA on Vercel (see `docs/ARCHITECTURE.md`). Any preferences or no-gos?
- [ ] ⭐ Fine
- [ ] Changes: …

Antwort:

**Q8.2 ★ Monetization:** Vercel's free plan forbids commercial use (ads, paid features; donations are OK). Any plans to earn money with Settr?
- [ ] ⭐ No, it stays free and non-commercial (Hobby plan is fine)
- [ ] Maybe donations
- [ ] Maybe paid features/ads later (then Vercel Pro ≈ $20/month or another host)

Antwort:

**Q8.3 Analytics and error tracking:**
- [ ] ⭐ None. Maximum privacy, no cookie banner needed
- [ ] Cookieless page-view stats (Vercel Web Analytics)
- [ ] Error reporting (e.g. Sentry)

Antwort:

**Q8.4 Card images:** TCGdex's image server allows cross-origin loading, so both options work technically, including offline caching.
- [ ] ⭐ Load images directly from TCGdex's server (zero cost; the image host sees visitors' IP addresses, which the privacy notice mentions)
- [ ] Route images through your own Vercel domain (more private; uses some of Vercel's 100 GB/month free bandwidth)

Antwort:

**Q8.5 Network access for the coding phase:** this Claude Code environment's network policy **blocked** the data hosts the catalog pipeline needs: `api.tcgdex.net`, `assets.tcgdex.net`, `downloads.s3.cardmarket.com` and (optionally) `tcgcsv.com`. GitHub and npm work, so I could read TCGdex's source data. This only affects *development*: the finished app itself only loads card images.
- To let me verify images and run the catalog sync directly in these sessions: allow the hosts above in the environment's network settings (the cloud environment menu in the session title bar → Edit → Network access).
- Otherwise the sync runs in GitHub Actions, which has open internet access.
- [ ] I'll allow these hosts
- [ ] ⭐ Run the sync in GitHub Actions (works either way)

Antwort:

**Q8.6 Git workflow:**
- [ ] ⭐ One pull request per milestone (M1…M6) that you review/merge, with Vercel preview links
- [ ] Push directly to a development branch
- [ ] Set up GitHub Actions CI? ⭐ yes

Antwort:

**Q8.7 Source code license:**
- [ ] ⭐ Private repository, all rights reserved (decide later)
- [ ] Open source (e.g. MIT), so others can contribute or self-host

Antwort:

---

## 9. Design

**Q9.1 ★ Design direction** (details in `docs/DESIGN_SYSTEM.md` §1.2):
- [ ] ⭐ **A · Vault**: premium dark gallery with finance precision, one gold accent, holo foil for special moments
- [ ] **B · Terminal**: ultra-dense, monochrome, pro-trader look
- [ ] **C · Foil Pop**: vibrant, playful, colorful
- [ ] Mix: …

And:
- [ ] ⭐ **Before coding, build 2–3 clickable HTML mockups** (dashboard, set page, card detail) so I can compare directions. These are design prototypes only, not app code.
- [ ] Not needed, go with my choice above

Antwort:

**Q9.2 Theme:**
- [ ] ⭐ Follow system setting (dark and light both designed; dark is the "hero" look)
- [ ] Dark only · [ ] Light only

Antwort:

**Q9.3 Fonts and colors:** I propose **Mona Sans** (a modern variable grotesk with a width axis) and a **gold** accent. Any fonts or colors you love or hate?

Antwort:

**Q9.4 Brand:** Is the tagline *"Jede Karte. Jedes Set. Jeder Cent."* OK? Any logo ideas? Wordmark in lowercase "settr" or "Settr"?

Antwort:

**Q9.5 Which apps/websites do you find beautiful?** Any domain: finance apps, Apple, Linear, Collectr, …

Antwort:

**Q9.6 How much motion and holo magic?**
- [ ] Minimal
- [ ] ⭐ Signature moments only (holo on card detail, smooth transitions)
- [ ] Rich (more animation everywhere)

Antwort:

**Q9.7 Pokémon visual references in the UI** (type colors, energy icons)?
- [ ] ⭐ Subtle: type colors in filter chips, otherwise a brand-neutral premium look
- [ ] Strong Pokémon theming

Antwort:

**Q9.8 Design priority:**
- [ ] Desktop first · [ ] Mobile first · [ ] ⭐ Both equally (desktop for price sessions, mobile for browsing and adding)

Antwort:

---

## 10. Feature ideas: do you want them?

Tick per row: **v1** = in the first release · **later** = after v1 · **no** = never. ⭐ marks my recommendation.

| ID | Idea | Why it's valuable | Effort | My rec. | v1 | later | no |
|---|---|---|---|---|---|---|---|
| I-01 | **Price session**: keyboard-driven queue through stale prices, with Cardmarket links | Makes manual pricing fast (30 prices in < 5 min) | M | ⭐ v1 | [ ] | [ ] | [ ] |
| I-02 | **Binder view**: virtual 9-pocket pages in set order | Collector joy, shows gaps visually | M | later | [ ] | [ ] | [ ] |
| I-03 | **Command palette ⌘K** + keyboard shortcuts | Everything reachable in 2 keystrokes | S | ⭐ v1 | [ ] | [ ] | [ ] |
| I-04 | **Holo card viewer** + smooth grid→detail transitions | The "wow" moment | M | ⭐ v1 | [ ] | [ ] | [ ] |
| I-05 | **Privacy mode**: one click blurs all € values | Show your collection without showing its worth | S | ⭐ v1 | [ ] | [ ] | [ ] |
| I-06 | **Wishlist** with target prices + "target reached" | Buy at the right price | S | later | [ ] | [ ] | [ ] |
| I-07 | **Quick-add mode** (`25⏎ 26x2⏎`) | Enter a whole booster box in minutes | S | ⭐ v1 | [ ] | [ ] | [ ] |
| I-08 | **Exact Cardmarket links** (right product, language filter) | Saves searching on Cardmarket | S | ⭐ v1 | [ ] | [ ] | [ ] |
| I-09 | **Grading tracker**: submissions, costs, returned grades | For PSA/CGC submitters | S–M | later | [ ] | [ ] | [ ] |
| I-10 | **Barcode scan** for sealed products (EAN) | Add a Top-Trainer-Box by scanning it | M | later | [ ] | [ ] | [ ] |
| I-11 | **Pack-opening log** + pull ROI ("was opening worth it?") | Fun + honest accounting | M | later | [ ] | [ ] | [ ] |
| I-12 | **Photos of your own copies** (stored locally) | Proof for insurance, graded slabs | M | later | [ ] | [ ] | [ ] |
| I-13 | **Camera card scanning** (experimental, on-device) | Fastest possible entry | L | no (for now) | [ ] | [ ] | [ ] |
| I-14 | **Import Cardmarket purchases** (shipment CSV → holdings with real prices, language, condition) | Your purchase history in seconds, a unique feature | M | ⭐ v1 or right after | [ ] | [ ] | [ ] |
| I-15 | **Auto-backup to a folder** (Chrome/Edge desktop) | Never think about backups again | S–M | later | [ ] | [ ] | [ ] |
| I-16 | **CSV import wizard** (Collectr, TCG Collector, Excel) | Easy migration from other apps | M–L | later | [ ] | [ ] | [ ] |
| I-17 | **Encrypted backups** (password) | Extra safety for cloud-stored backups | S | later | [ ] | [ ] | [ ] |
| I-18 | **Sync via your own cloud** (Google Drive/Dropbox/WebDAV), no Settr server | Same data on PC + phone | L | later | [ ] | [ ] | [ ] |
| I-19 | **Demo data** to explore the app before entering your own | Try every screen instantly | S | ⭐ v1 | [ ] | [ ] | [ ] |
| I-20 | **Tags + storage locations** | Find any card physically | S | ⭐ v1 | [ ] | [ ] | [ ] |
| I-21 | **Spending analytics** (per month, per shop) | Know where the money goes | S | later | [ ] | [ ] | [ ] |
| I-22 | **Make set available offline** (pre-download all images) | Browse your set on a plane | S | later | [ ] | [ ] | [ ] |
| I-23 | **Share images**: set progress / top cards / binder page as a beautiful PNG | Social sharing | S–M | later | [ ] | [ ] | [ ] |
| I-24 | **Duplicates & trade list** ("Doppelte"), shareable via link/QR | Trading with friends | S–M | later | [ ] | [ ] | [ ] |
| I-25 | **Insurance list (PDF)** of the collection with values | Hausrat insurance proof | M | later | [ ] | [ ] | [ ] |
| I-26 | **Tax holding-period hint** (German § 23 EStG: sale after > 1 year; *not tax advice*) | Know when a sale is tax-free | S | later | [ ] | [ ] | [ ] |
| I-27 | **Printable checklists** / missing-card lists / binder placeholders | Offline collecting at events | S–M | later | [ ] | [ ] | [ ] |
| I-28 | **Box EV & pull statistics** (expected value of a product from *your* prices) | Decide "open or keep sealed" | M | later | [ ] | [ ] | [ ] |
| I-29 | **Multiple profiles** in one browser (e.g. you + partner) | Separate collections, one device | M | no | [ ] | [ ] | [ ] |
| I-30 | **Goals** ("5.000 € portfolio", "German master set") with progress | Motivation | S | later | [ ] | [ ] | [ ] |
| I-31 | **Watchlist check reminders** ("check these 10 cards weekly") | Keep key prices fresh | S | later | [ ] | [ ] | [ ] |
| I-32 | **JP ↔ EN counterpart links** (same artwork in other print) | Compare prices across languages | L | later | [ ] | [ ] | [ ] |

**Your own ideas or must-haves I missed:**

Antwort:

---

## 11. Anything else?

Things you definitely **want**, definitely **don't want**, or inspiration (screenshots/links) you'd like me to see:

Antwort:
