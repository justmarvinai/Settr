# Settr: Design System

> Status: **Draft v0.3**. Direction **D · Bold Studio** chosen (R2.1): C's bold type, B's floating glass sidebar, calmer color, light and dark. The final look is confirmed on the design canvas (⟶ **R3.1**). Last updated: 2026-09-23.
> Screens and flows → [`UX_SPEC.md`](./UX_SPEC.md). Accessibility requirements → [`QUALITY.md`](./QUALITY.md) §5. Platform priority: **Windows desktop first** (Brave, Chromium; R2.9), iPhone second (Q9.8).

---

## 1. Direction: **D · Bold Studio** (Liquid Glass × bold minimalism)

> *Your collection as a calm, luminous gallery: heavy numbers, quiet surfaces, and a glass sidebar floating above the cards.*

**Four words:** **Usable · Bold · Clear · Luminous.**

| Principle | What it means in practice |
|---|---|
| **Usable first** | Marvin's rule (R2.1): *"Usability and user experience is always #1."* When looks and usability conflict, usability wins: legibility, WCAG AA contrast, 44 px touch targets, keyboard paths, and no decoration that hides data |
| **Bold** | Heavy, wide display type for numbers and headlines (the Revolut/Wise punch of direction C). One glance tells you the value, the change and the next action |
| **Clear** | Apple-style minimalism: generous whitespace, one accent, no ornament. Tabular numerals, exact dates, honest data |
| **Luminous** | The **cards bring the color**. Surfaces stay neutral, and **Liquid Glass chrome** (sidebar, toolbar, filter bar, tab bar, sheets) floats above the content |

### 1.1 Foundation

- **Typography:** Mona Sans **900 at `wdth` 125** for display and big numbers, 800–850 for titles, 600–650 for UI text and 500 for running text (§4).
- **Glass is a material for chrome only** (§3.5): navigation, toolbars, the sticky filter bar, sheets, popovers, toasts and the command palette. Content surfaces (card tiles, tables, text) stay solid for legibility.
- **Cards are the hero:** large, crisp, luminous, with a holo viewer on detail pages.
- **Finance-grade charts:** scrubbable, minimal, and honest (§9).
- **Light and dark are equals:** both themes are designed and tested to the same standard. *System* is the default (§11).

### 1.2 The chosen direction: D · Bold Studio (R2.1, ADR-015)

Marvin picked **C · Bold** with **B's sidebar**, more polish, **more subtle coloring**, and **both a light and a dark mode**, with **balanced** glass. D combines exactly that:

| From | What D takes |
|---|---|
| **C · Bold** | Mona Sans 900 at `wdth` 125 for hero numbers and page titles, big stat numbers, pill-shaped buttons and segmented controls, a monochrome "ink pill" for the active segment |
| **B · Studio Glass** | The **floating glass sidebar** (236 px, inset 12 px, radius 24), the floating glass toolbar, and soft tile shadows in light mode |
| **New in D** | **Neutral surfaces instead of C's cobalt blocks**, one restrained accent (§3.1), and a first-class **light and dark** pair |

- **Color is information, not decoration.** The accent marks only the primary action, active navigation, selection, chart lines, progress, quantity badges and focus rings. Gains and losses always carry sign and arrow as well as color.
- **Accent:** *Indigo* by default. On the canvas you can compare *Kobalt* (C's original, louder) and *Graphit* (no color at all) via the artboards' Tweaks. Final pick ⟶ **R3.1**.
- The D artboards (Übersicht, Set, Kartendetail, iPhone set; light and dark) are on the design canvas. A, B and C stay there for reference.

### 1.3 What we deliberately avoid (the "generic AI app" look)

- Purple-to-blue gradients, gradient-filled headline text, sparkle icons, decorative background gradient washes.
- **Glass on everything** or text over busy glass. Glass is only for floating chrome, and every text/background pair must meet contrast against the worst-case backdrop.
- Big drop shadows on every card, inconsistent radii, and five accent colors.
- Centered marketing heroes with vague slogans inside an app.
- Emoji as UI icons, stock 3D blobs, rainbow charts.
- Default-everything shadcn look (same Lucide icons, same slate palette, same 0.5 rem radius).
- Copying any real company's proprietary design. We borrow *principles* from Revolut, Apple and Wise, not their assets.
- Large saturated color blocks behind data (like C's cobalt hero). In D, color is reserved for meaning.

---

## 2. Brand

- **Name and wordmark: "Settr"** (capital S, Q9.4), set in Mona Sans 900 at `wdth` 125 with −3.5 % tracking.
- **Taglines:**
  - Long: DE *"Jede Karte. Jedes Set. Jeder Cent."* · EN *"Every card. Every set. Every cent."*
  - Short (R2.7): *"Jede Karte zählt."* It sits under the wordmark in the sidebar and is the PWA description.
- **Logo concept:** a monogram **S** formed by the negative space of two offset card silhouettes (63∶88 ratio, rounded corners), with a thin holo-foil edge on the front card. (The canvas uses a simplified stand-in: an accent card behind an ink card.)
- **App icon (PWA, iPhone home screen):** the monogram as **layered glass cards** on ink, in the spirit of the 2025/26 layered icon style, with the front card catching an accent edge light.
- **No Pokémon IP in the brand** (no Poké Ball, no characters, no official energy symbols). It's safer legally and more premium.

---

## 3. Color

All colors are **OKLCH design tokens** (CSS custom properties) mapped into Tailwind v4 via `@theme`. Components only use **semantic** tokens. The table shows **direction D** in both themes (hex values are the canvas values). Because components never see raw values, the accent pick (R3.1) is a token change, not a refactor.

### 3.1 Semantic tokens (direction D · Bold Studio)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `oklch(0.968 0.004 286)` · `#F4F4F7` | `oklch(0.151 0.011 276)` · `#0A0B10` | App background |
| `--surface-1` | `oklch(1 0 0)` · `#FFFFFF` | `oklch(0.197 0.016 274)` · `#13151D` | Tiles, panels |
| `--surface-2` | `oklch(0.953 0.005 275)` · `#EEEFF3` | `oklch(0.237 0.020 272)` · `#1B1E28` | Inputs, raised elements |
| `--hover` | `--text` at 5 % | white at 6 % | Hover, quiet buttons, segmented-control track |
| `--border` | `--text` at 8 % | white at 7 % | Hairlines |
| `--border-strong` | `--text` at 16 % | white at 14 % | Inputs, dividers |
| `--text` | `oklch(0.174 0.027 276)` · `#0D0F1C` | `oklch(0.968 0.005 275)` · `#F3F4F8` | Primary text ("ink") |
| `--text-muted` | `oklch(0.470 0.033 272)` · `#545A6E` | `oklch(0.733 0.027 273)` · `#A3A8BA` | Secondary text |
| `--text-subtle` | `oklch(0.519 0.032 272)` · `#62687C` | `oklch(0.655 0.031 272)` · `#8A90A4` | Tertiary text, captions (still ≥ 4.5∶1) |
| `--accent` | `oklch(0.485 0.214 271)` · `#3A47D5` *Indigo* | `oklch(0.540 0.211 273)` · `#4C59E6` | Primary buttons, badges (fills) |
| `--accent-contrast` | `#FFFFFF` | `#FFFFFF` | Text on accent fills |
| `--accent-text` | = `--accent` | `oklch(0.753 0.128 278)` · `#9CA6FF` | Accent as text: links, active navigation |
| `--accent-line` | = `--accent` | `oklch(0.713 0.151 277)` · `#8C97FF` | Chart lines, progress on dark |
| `--accent-soft` | `--accent` at 10 % | `#7C8AFF` at 14 % | Active navigation background, selection |
| `--gain` | `oklch(0.502 0.121 154)` · `#0E7743` | `oklch(0.777 0.146 162)` · `#46D39A` | Positive P/L |
| `--loss` | `oklch(0.533 0.181 23)` · `#BF2E37` | `oklch(0.737 0.162 17)` · `#FF7A85` | Negative P/L |
| `--warn` | `oklch(0.520 0.121 60)` · `#9A5500` | `oklch(0.821 0.142 80)` · `#F5B94A` | Stale price, backup overdue |
| `--focus` | = `--accent` | = `--accent` | 3 px focus ring with 2 px offset |

- **Soft variants** (`--gain-soft`, `--loss-soft`, `--warn-soft`) are the color at 10–13 % over the surface. Text on them keeps ≥ 4.5∶1 (lowest pair in D: 4.8∶1).
- **Accent alternatives for R3.1:** *Kobalt* `#3445F0` (light) / `#4353FF` (dark); *Graphit* = `--text` as the accent (ink buttons in light, white buttons with ink text in dark).
- Colorblind-safe P/L option: gain `oklch(0.75 0.13 240)` (blue) and loss `oklch(0.76 0.16 60)` (orange).
- All pairs are contrast-checked by an automated token test (`QUALITY.md` §5).

### 3.2 Signature: the holo foil

```css
@property --foil-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
--foil: conic-gradient(from var(--foil-angle),
  oklch(0.86 0.12 200), oklch(0.80 0.14 285), oklch(0.82 0.13 340),
  oklch(0.88 0.12 70),  oklch(0.86 0.13 145), oklch(0.86 0.12 200));
```

It's used **only** for the brand mark, a 100 % set-completion ring, the holo card viewer, the "set complete" celebration and the command palette's focus glow. Scarcity is what makes it special.

### 3.3 Energy types (chips, filters)

Desaturated to sit calmly in the UI. Chips use the color as a dot plus a 14 % tint background.

| Type (DE) | Token | Value |
|---|---|---|
| Pflanze | `--type-grass` | `oklch(0.74 0.14 140)` |
| Feuer | `--type-fire` | `oklch(0.70 0.18 38)` |
| Wasser | `--type-water` | `oklch(0.70 0.13 240)` |
| Elektro | `--type-lightning` | `oklch(0.86 0.15 95)` |
| Psycho | `--type-psychic` | `oklch(0.67 0.15 330)` |
| Kampf | `--type-fighting` | `oklch(0.62 0.13 50)` |
| Finsternis | `--type-darkness` | `oklch(0.45 0.04 260)` |
| Metall | `--type-metal` | `oklch(0.72 0.02 250)` |
| Drache | `--type-dragon` | `oklch(0.66 0.12 80)` |
| Farblos | `--type-colorless` | `oklch(0.86 0.01 90)` |

### 3.4 Data-viz palette

Eight categorical hues at equal perceived lightness (dark L≈0.74, light L≈0.58): hues 250 · 190 · 150 · 95 · 60 · 25 · 330 · 290. Series order is fixed so colors stay stable across charts. Gain/loss colors are **never** reused as categorical colors.

### 3.5 Liquid Glass materials (DSN-05)

Glass is Settr's signature *material* for floating chrome (Q9.5: Apple's Liquid Glass). It's built from `backdrop-filter`, a translucent tint, a specular edge and a soft shadow.

| Token | Light (frosted) | Dark (smoked) | Use |
|---|---|---|---|
| `--glass-fill` | `oklch(1 0 0 / 0.66)` | `oklch(0.212 0.020 276 / 0.62)` | Tint of the pane |
| `--glass-fill-thick` | `oklch(1 0 0 / 0.84)` | `oklch(0.212 0.020 276 / 0.80)` | Sheets, popovers, command palette (text-heavy) |
| `--glass-blur` | `24px` | `24px` | `backdrop-filter: blur()` |
| `--glass-saturate` | `180%` | `180%` | `backdrop-filter: saturate()`, which keeps card colors vivid beneath |
| `--glass-stroke` | `oklch(0.174 0.027 276 / 0.08)` | `oklch(1 0 0 / 0.08)` | 1 px outline |
| `--glass-specular` | `inset 0 1px 0 oklch(1 0 0 / 0.90)` | `inset 0 1px 0 oklch(1 0 0 / 0.10)` | Top-edge light catch |
| `--glass-shadow` | `0 18px 48px -22px oklch(0.174 0.027 276 / 0.24)` | `0 24px 60px -24px oklch(0 0 0 / 0.80)` | Lift |

**Rules**
1. **Chrome only:** floating sidebar, toolbar, the sticky filter bar on list pages, mobile tab bar, sheets, popovers, toasts, command palette, segmented controls over content, and the price-session HUD. **Never** on card tiles, tables or long text.
2. **Content scrolls beneath:** the sidebar and toolbar float with a 12 px inset over the page. Card art scrolling under them tints the glass, which is what makes it feel alive.
3. **Legibility first:** text on glass meets WCAG AA against the **worst-case backdrop** (bright card art). This is guaranteed by the fill-opacity floor and tested with bright fixtures.
4. **Materialize on scroll:** the toolbar is transparent at the top of a page and turns to glass once content passes beneath it (scroll-driven animation where supported, else an IntersectionObserver class toggle).
5. **Reduced transparency:** `prefers-reduced-transparency` (Chromium) or the in-app toggle *Transparenz reduzieren* switches to solid `--surface-2` with the same stroke and radius, and no blur.
6. **Performance:** ≤ 3 blurred layers visible at once. Never animate the size of a blurred element. Profile on Windows laptops (primary platform).

---

## 4. Typography

| Role | Family | License | Loading |
|---|---|---|---|
| UI + display | **Mona Sans** (variable: `wght` 200–900, `wdth` 75–125) | SIL OFL 1.1 | Self-hosted (Fontsource), latin + latin-ext, `font-display: swap`, preload 1 file |
| Numbers / codes | **Geist Mono** (variable) | SIL OFL 1.1 | Self-hosted, loaded lazily (used for set codes, card numbers, keyboard hints) |
| Japanese | Noto Sans JP | OFL | `unicode-range`-sliced subsets, fetched only when JA glyphs render |
| Traditional Chinese | Noto Sans TC | OFL | same |
| Simplified Chinese | Noto Sans SC | OFL | same |

**CJK loading rules** (from measured Fontsource data: Noto Sans JP ships ~124 `unicode-range` slices of 13–44 KB each, while a monolithic Japanese subset is ~1 MB per weight):
- CJK families are assigned **only inside `:lang(ja)`, `:lang(zh-Hant)` and `:lang(zh-Hans)` selectors**, so German and English users never download a CJK byte.
- The stack lists **system fonts first** (Hiragino Sans / Yu Gothic, PingFang TC/SC, Microsoft JhengHei/YaHei) and Noto last. Most users therefore download **zero** CJK font bytes, and the rest fetch only the slices they render.
- **Every CJK string is tagged with its language** (`lang="ja"`, `lang="zh-Hant"`, `lang="zh-Hans"`). Without it, Chromium picks Simplified Chinese glyph forms for Japanese and Traditional text.
- **Brave:** its fingerprinting protection may hide named system fonts outside an allowlist (ADR-027), so the self-hosted Noto slices must render Japanese and Chinese correctly on their own. This is part of the Brave smoke test.
- At most two weights (400, 600).
- Fonts are **self-hosted**, never loaded from Google's CDN (GDPR; see `DATA_SOURCES.md` §8).

*Why Mona Sans:* one variable family covers everything, with the **width axis** as a distinctive brand lever. **Heavy, wide figures** (800–900, `wdth` 115–125) give the bold look you asked for (Q9.5), and normal width keeps UI text calm. It's not the ubiquitous Inter or Geist look, and it's crisp at small sizes on Windows ClearType. It was confirmed as the default in Q9.3.

### 4.1 Scale

| Token | Size / line | Weight | Width | Tracking | Use |
|---|---|---|---|---|---|
| `display-xl` | clamp(48px, 6vw, 84px) / 0.9 | **900** | 125 | −0.045em | Portfolio hero value |
| `display` | clamp(44px, 5vw, 76px) / 0.9 | **900** | 125 | −0.045em | Page heroes (set name, card name) |
| `display-m` | 64 / 0.9 (mobile 30–42) | **900** | 125 | −0.045em | Big stats: completion %, stale count, price |
| `h1` | 26 / 1.0 | 900 | 120 | −0.03em | Page titles in the toolbar |
| `h2` | 20 / 1.1 | 850 | 115 | −0.02em | Section and tile titles |
| `h3` | 16 / 1.25 | 800 | 100 | −0.01em | Item titles (movers, list rows) |
| `body` | 15 / 22 (mobile 16 / 24) | 500 | 100 | 0 | Running text |
| `ui` | 15 / 20 | 650 (buttons 800) | 100 | 0 | Navigation, buttons, controls |
| `small` | 13 / 18 | 600 | 100 | 0 | Meta, table cells |
| `label` | 12 / 16 | 700 | 100 | +0.01em | Field labels, language pills, chips |

- **D takes C's heavy, wide display settings** and keeps UI text at normal width, so tables and forms stay calm.
- **Numerals:** `font-variant-numeric: tabular-nums` globally for money, counts and dates. Proportional numerals only in running text.
- **German:** `hyphens: auto` on `lang="de"` in narrow containers, `text-wrap: balance` for headings and `pretty` for paragraphs. Uppercase is used only for very short section labels (e.g. *SETS* in the sidebar), because German compounds get too wide.

---

## 5. Space, layout, shape, depth

- **Spacing** (4 px base): `0 · 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96`.
- **Layout:** a 12-column fluid grid with content max-width 1440 px. Gutters are 16 (mobile), 24 (tablet) and 32 (desktop).
- **Radius (D):** buttons, chips and segmented controls are **pills** (999) · inputs and selects `14` · inner cards (movers) `22` · tiles `28` · glass sidebar `24` · toolbar and filter bar `20` · sheets `28`. **Card images:** `border-radius: 4.8% / 3.4%`, matching a physical card's corner.
- **Depth:** in light mode, tiles get a hairline plus a soft two-layer shadow (`0 1px 2px` at 4 %, `0 12px 32px -20px` at 16 %). In dark mode, depth comes from **luminance steps and hairlines, not shadows**. Shadows are only for floating layers (popover, sheet, dragged tile): `0 1px 0 oklch(1 0 0 / .04) inset, 0 16px 40px -12px oklch(0 0 0 / .55)`.
- **Glass:** floating chrome uses the Liquid Glass materials of §3.5. Content surfaces stay solid. SVG-refraction variants are Chromium-only and are skipped.
- **Floating layout (desktop):** the sidebar is a glass panel (236 px) inset 12 px from the window edges (radius 24), and the toolbar floats above the content column. The page content has 12 px breathing room, which gives a calm "app window within the window" look, as in current macOS apps.
- **Ambient glow (card/product detail):** a duplicated, heavily blurred copy of the artwork sits behind the hero (`filter: blur(64px) saturate(1.4)`, opacity .22 in light and .32 in dark), so the page takes the card's colors. It needs no canvas and no CORS.

---

## 6. Iconography

- **Phosphor Icons** (MIT), *regular* weight at 20 px by default and *fill* for active navigation states. The choice is deliberate, to avoid the default shadcn/Lucide look.
- **Custom SVG sets** (own drawings, no official artwork):
  - Rarity glyphs (common ●, uncommon ◆, rare ★, double rare ★★, illustration/special/hyper rare variants).
  - Energy-type glyphs as geometric reinterpretations.
  - Product types (booster, display, Top-Trainer-Box, bundle, blister, tin, collection).
  - Grading slab mini-badge.
- Language is shown as **text pills** (`DE`, `EN`, `JA`, `ZH-TW`, `ZH-CN`). **Never flags**, because a language is not a country.

---

## 7. Motion

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 80 ms | Press feedback |
| `--dur-fast` | 140 ms | Hover, toggles |
| `--dur-base` | 200 ms | Popovers, tabs |
| `--dur-slow` | 320 ms | Sheets, page content |
| `--dur-spatial` | 420 ms | Shared-element morphs |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | Entrances |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` | Morphs |
| Spring (sheet) | stiffness 380 · damping 34 | Motion |
| Spring (tilt) | stiffness 220 · damping 22 | Holo viewer |

**Signature moments**

1. **Grid → detail morph:** the View Transitions API (`view-transition-name: card-<id>`). Same-document view transitions have been Baseline since Oct 2025 (Chrome 111+, Safari 18+, Firefox 144+). Older browsers get a cross-fade fallback.
2. **Holo viewer:** pointer or gyroscope tilt (±12°), a glare radial gradient following the pointer, and a rarity-specific foil layer (`mix-blend-mode: color-dodge`/`overlay`, background-position driven by CSS vars). Tilt starts only after a user gesture. On iOS the gyroscope needs an explicit "Holo aktivieren" tap (`DeviceOrientationEvent.requestPermission()`).
   - **Clean-room implementation.** The well-known `simeydotme/pokemon-cards-css` is **GPL-3.0**, so copying its CSS or JS would put Settr under the GPL. We re-implement the *technique* (layered gradients, blend modes, CSS custom properties driven by a spring) in our own code. MIT-licensed helpers are fine for the tilt math (e.g. `react-parallax-tilt`, 2.9 kB, with gyroscope and reduced-motion support).
   - **Performance rules:** animate only the single focused card, never a grid. Set `will-change` only during interaction. Pause when the tab is hidden. Throttle pointer input with `requestAnimationFrame`.
   - **Foil styles per rarity:** Pikachu Rare "fireworks" holo, Illustration/Special Illustration Rare textured, Futuristic Rare metallic, RGB Rare spectral. Each is our own CSS.
3. **Hero number odometer:** rolls on first view only, never on every re-render.
4. **Progress rings:** a stroke animation, with a one-time foil sweep at 100 %.
5. **Price saved:** the new point drops into the chart, and the value briefly flashes the gain/loss color (150 ms).
6. **Glass materialize:** the toolbar fades from transparent to glass as content scrolls beneath it (120 ms), and sheets rise with the sheet spring while their backdrop blur fades in.
7. **Filter changes:** layout animation only for ≤ 60 visible items. Beyond that, an instant swap (performance).

Everything above is disabled under `prefers-reduced-motion: reduce` or the in-app setting *Animationen: aus*.

---

## 8. Component inventory

Built on **shadcn/ui** source components (copied in, fully restyled to these tokens) on accessible headless primitives.

**Primitives:** Button (primary · secondary · ghost · destructive · icon; sm/md/lg) · Input · **MoneyInput** · **DateInput** (German format, keyboard-friendly) · Select · Combobox · SegmentedControl · Chip · Checkbox · Switch · Slider · Tabs · Tooltip · Popover · DropdownMenu · ContextMenu · Dialog · Sheet (side/bottom) · Toast · **CommandPalette** · Skeleton · Badge · Kbd (platform-aware: `Strg` on Windows) · Table (virtualized) · EmptyState · ErrorState.

**Glass primitives (§3.5):** `GlassPanel` (regular/thick) · `GlassSidebar` · `GlassToolbar` (materialize-on-scroll) · `GlassFilterBar` (sticky on list pages) · `GlassTabBar` (mobile floating pill) · `GlassSheet` · `GlassToast`. They all fall back to solid under reduced transparency.

**Domain components:**

| Component | Notes |
|---|---|
| `CardImage` | Language-aware URL builder, fixed 63∶88 slot, card-back shimmer placeholder, fallback chain, `srcset` for DPR |
| `CardTile` / `ProductTile` | Owned/missing/hover states, quantity badge, language pills, `VariantDots`, **quick add (+)** on hover/focus with undo toast |
| `HoloCard` | Tilt + glare + foil per rarity, pointer/gyro, reduced-motion aware |
| `LanguagePill`, `VariantDots`, `ConditionBadge`, `GradeBadge`, `RarityGlyph`, `EnergyTypeChip` | Small, consistent metadata atoms |
| `PriceTag` | Value + date + stale indicator (amber dot and "vor 21 Tagen") |
| `PLDelta` | ± absolute, %, arrow, color, and "—" when undefined |
| `PrivacyValue` | Wraps any money value, blurred in privacy mode |
| `Sparkline`, `PriceChart`, `PortfolioChart`, `AllocationDonut` | See §9 |
| `SetProgressRing`, `SetTile`, `BinderPage`, `PriceSessionPanel`, `BackupPill` | Feature components |

---

## 9. Data visualization

- **No chart junk:** horizontal gridlines only (3–4 "nice" ticks, hairline at 6 % alpha), 12 px muted axis labels, and the y-axis on the right (finance convention) or hidden when the header shows the readout.
- **Scrubbing (finance-app pattern, as in Robinhood, Trade Republic or Revolut):** a crosshair (vertical hairline + dot) updates the header value, the date, **and the change since the start of the range**. It works with touch drag.
- **Line color = the accent** (`--accent-line`), so charts stay calm (D: color is information). The P/L chip above the chart carries the gain/loss color, sign and arrow. A dashed baseline marks the range start or the cost basis. Range chips: `1M · 3M · 6M · 1J · Max`. There's no 1-week range, because manual prices are too sparse for it.
- **Honest data:**
  - *Item price charts* use **linear segments between real observations**, with **every observation marked** (a dot shaped by price type). Purchase price is a dashed baseline, with the area above/below tinted gain/loss.
  - *Portfolio charts* use a **step-after** line, since value truly only changes on events. The optional "Investiert" (invested capital) overlay is dashed and neutral.
- **Area fill:** accent at 20 % → 0 % vertical gradient.
- **Money formatting:** `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', signDisplay: 'exceptZero' })` for deltas produces `+1.234,56 €` and `−12,30 €`.
- **Accessibility:** every chart offers "Als Tabelle anzeigen". Series are distinguishable without color (dash patterns, labels).

---

## 10. Card and product presentation rules

- Fixed **63∶88** slots, so there's zero layout shift. Grids load the **low-quality** image variant; detail views use **high** with DPR-aware `srcset`.
- **Missing** cards: `grayscale(1)`, `opacity: .35`, dashed outline (or hidden via filter).
- **Owned:** full color, quantity badge (bottom-right) and language pills (top-left).
- **Holo effects** appear only in detail/fullscreen. Grid tiles of rare-and-above cards may get a single cheap CSS shine sweep on hover.
- **Sealed products** use contain-fit images on a subtle radial spotlight. When no image exists, a product-type illustration is shown with the name set in the display font.

---

## 11. Theming implementation notes

- Tokens live in `src/styles/tokens.css` as CSS variables under `:root` (light) and `[data-theme="dark"]`; with the theme set to *System*, `prefers-color-scheme: dark` applies the dark set. They are bridged to Tailwind v4 with `@theme inline`. Alpha variants come from `color-mix(in oklch, var(--x) N%, transparent)`.
- `color-scheme` is set per theme for native controls and scrollbars.
- **No theme flash:** a tiny inline script in `index.html` applies the stored theme before first paint. It's allowed by a CSP hash, not `unsafe-inline`.
- Themes: *System* (default) · *Hell* · *Dunkel* (Settings → *Darstellung*, plus the quick toggle in the top bar).
- **Reduced transparency:** `[data-transparency="reduced"]` (set from `prefers-reduced-transparency` or the setting) swaps every glass token for its solid equivalent.
- **Windows polish (primary platform, Brave/Chromium):** thin, token-colored scrollbars (`scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent`), focus rings visible with high-contrast themes (`forced-colors` media query), shortcut labels as `Strg`, and Mona Sans checked with ClearType at 13–15 px.
