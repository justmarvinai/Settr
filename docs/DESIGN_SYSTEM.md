# Settr: Design System

> Status: **Draft v0.1 (planning)**. The direction is a *recommendation* awaiting your choice (⟶ **Q9.1**). Last updated: 2026-09-23.
> Screens and flows → [`UX_SPEC.md`](./UX_SPEC.md). Accessibility requirements → [`QUALITY.md`](./QUALITY.md) §5.

---

## 1. Direction: **"Vault"** (recommended)

> *A private gallery for your collection, with the precision of a trading terminal.*

**Three words:** **Precise · Luminous · Calm.**

| Principle | What it means in practice |
|---|---|
| **Precise** | Tabular numerals everywhere, a strict 4 px grid, hairline borders, exact dates on every price, and no rounding surprises |
| **Luminous** | The UI is a dark, quiet "vault". The **cards bring the color**: foil, rim light and an ambient glow sampled from the artwork. One signature accent and a holo-foil gradient reserved for special moments |
| **Calm** | Generous spacing, few surfaces, restrained motion. Density where it helps (tables), air where it's emotional (card detail) |

### 1.1 What we deliberately avoid (the "generic AI app" look)

- Purple-to-blue gradients, gradient-filled headline text, sparkle icons.
- Glassmorphism on every surface. Blur is reserved for overlays.
- Big drop shadows on every card, inconsistent radii, and five accent colors.
- Centered marketing heroes with vague slogans inside an app.
- Emoji as UI icons, stock 3D blobs, rainbow charts.
- Default-everything shadcn look (same Lucide icons, same slate palette, same 0.5 rem radius).

### 1.2 Alternative directions (for your decision ⟶ Q9.1)

| | **A · Vault** (recommended) | **B · Terminal** | **C · Foil Pop** |
|---|---|---|---|
| Mood | Premium gallery + finance precision | Pro trading terminal, maximum density | Playful, vibrant, collector energy |
| Base | Ink-dark, warm-paper light mode | Pure black/white, monospace numerals | Colorful surfaces, bold type-color blocks |
| Accent | *Settr Gold* + holo foil for moments | Single neon (lime) | Energy-type colors everywhere |
| Cards | Hero, with ambient glow and holo viewer | Small, data-first | Big, stickers, bouncy motion |
| Risk | Needs polish to shine | Can feel cold | Can feel childish or cluttered |

---

## 2. Brand

- **Name:** "Settr". The wordmark is lowercase **settr**.
- **Tagline:** DE *"Jede Karte. Jedes Set. Jeder Cent."* · EN *"Every card. Every set. Every cent."* (⟶ Q9.4)
- **Logo concept:** a monogram **S** formed by the negative space of two offset card silhouettes (63∶88 ratio, rounded corners), with a thin holo-foil edge on the front card. The wordmark is set in the display font at wide width, semibold, with −2 % tracking.
- **No Pokémon IP in the brand** (no Poké Ball, no characters, no official energy symbols). It's safer legally and more premium.

---

## 3. Color

All colors are **OKLCH design tokens** (CSS custom properties) mapped into Tailwind v4 via `@theme`. Components only use **semantic** tokens.

### 3.1 Semantic tokens

| Token | Dark "Ink" (default ⟶ Q9.2) | Light "Paper" | Use |
|---|---|---|---|
| `--bg` | `oklch(0.145 0.008 265)` | `oklch(0.985 0.004 85)` | App background |
| `--surface-1` | `oklch(0.180 0.009 265)` | `oklch(1 0 0)` | Panels, tiles |
| `--surface-2` | `oklch(0.215 0.010 265)` | `oklch(0.970 0.005 85)` | Raised/hover, inputs |
| `--surface-3` | `oklch(0.255 0.012 265)` | `oklch(0.945 0.006 85)` | Pressed, selected |
| `--border` | `oklch(1 0 0 / 0.08)` | `oklch(0.20 0.01 265 / 0.10)` | Hairlines |
| `--border-strong` | `oklch(1 0 0 / 0.14)` | `oklch(0.20 0.01 265 / 0.18)` | Inputs, dividers |
| `--text` | `oklch(0.965 0.004 265)` | `oklch(0.200 0.012 265)` | Primary text |
| `--text-muted` | `oklch(0.740 0.010 265)` | `oklch(0.450 0.012 265)` | Secondary |
| `--text-subtle` | `oklch(0.580 0.012 265)` | `oklch(0.580 0.010 265)` | Tertiary, captions |
| `--accent` | `oklch(0.860 0.150 88)` *Settr Gold* | `oklch(0.600 0.130 80)` *Bronze* | Primary actions, active nav, links |
| `--accent-contrast` | `oklch(0.180 0.020 88)` | `oklch(0.990 0.010 88)` | Text on accent |
| `--gain` | `oklch(0.800 0.170 152)` | `oklch(0.560 0.150 152)` | Positive P/L |
| `--loss` | `oklch(0.700 0.190 25)` | `oklch(0.560 0.200 25)` | Negative P/L |
| `--warn` | `oklch(0.780 0.160 60)` | `oklch(0.620 0.160 55)` | Stale price, backup overdue |
| `--info` | `oklch(0.760 0.120 240)` | `oklch(0.520 0.140 250)` | Neutral info |
| `--focus` | `oklch(0.860 0.150 88 / 0.9)` | `oklch(0.600 0.130 80 / 0.9)` | Focus ring |

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
- At most two weights (400, 600).
- Fonts are **self-hosted**, never loaded from Google's CDN (GDPR; see `DATA_SOURCES.md` §8).

*Why Mona Sans:* one variable family covers everything, with the **width axis** as a distinctive brand lever. Wide, bold figures set the hero numbers and headings, and normal width sets UI text. It's not the ubiquitous Inter or Geist look, and it's crisp at small sizes. (⟶ Q9.3 if you have a font preference.)

### 4.1 Scale

| Token | Size / line | Weight | Width | Tracking | Use |
|---|---|---|---|---|---|
| `display-xl` | clamp(40px, 5vw, 60px) / 1.0 | 650 | 118 | −0.03em | Portfolio hero value |
| `display` | 40 / 44 | 650 | 112 | −0.025em | Page heroes (set name) |
| `h1` | 30 / 36 | 620 | 106 | −0.02em | Page titles |
| `h2` | 22 / 28 | 600 | 100 | −0.01em | Section titles |
| `h3` | 18 / 24 | 600 | 100 | −0.005em | Tile titles |
| `body` | 15 / 22 (mobile 16 / 24) | 440 | 100 | 0 | Text |
| `small` | 13 / 18 | 450 | 100 | 0 | Meta, table cells |
| `label` | 12 / 16 | 560 | 100 | +0.01em | Field labels, chips |

- **Numerals:** `font-variant-numeric: tabular-nums` globally for money, counts and dates. Proportional numerals only in running text.
- **German:** `hyphens: auto` on `lang="de"` in narrow containers, `text-wrap: balance` for headings and `pretty` for paragraphs. Uppercase labels are avoided because German compounds get too wide.

---

## 5. Space, layout, shape, depth

- **Spacing** (4 px base): `0 · 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96`.
- **Layout:** a 12-column fluid grid with content max-width 1440 px. Gutters are 16 (mobile), 24 (tablet) and 32 (desktop).
- **Radius:** `xs 4` (chips) · `sm 6` (inputs) · `md 10` (buttons, tiles) · `lg 14` (panels) · `xl 20` (sheets). **Card images:** `border-radius: 4.8% / 3.4%`, matching a physical card's corner.
- **Depth:** in dark mode, depth comes from **luminance steps and hairlines, not shadows**. Shadows are only for floating layers (popover, sheet, dragged tile): `0 1px 0 oklch(1 0 0 / .04) inset, 0 16px 40px -12px oklch(0 0 0 / .55)`.
- **Glass, used sparingly:** only *floating* chrome gets a translucent material (`backdrop-filter: blur(16px) saturate(1.4)` plus a 1 px specular top edge): the mobile bottom tab bar, the command palette and sheet backdrops. Everything else stays solid. It's a subtle nod to Apple's 2025 "Liquid Glass" without the gimmick. SVG-refraction variants are Chromium-only and are skipped.
- **Ambient glow (card/product detail):** a duplicated, heavily blurred copy of the artwork sits behind the hero (`filter: blur(64px) saturate(1.4); opacity: .35`), so the page takes the card's colors. It needs no canvas and no CORS.

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
6. **Filter changes:** layout animation only for ≤ 60 visible items. Beyond that, an instant swap (performance).

Everything above is disabled under `prefers-reduced-motion: reduce` or the in-app setting *Animationen: aus*.

---

## 8. Component inventory

Built on **shadcn/ui** source components (copied in, fully restyled to these tokens) on accessible headless primitives.

**Primitives:** Button (primary · secondary · ghost · destructive · icon; sm/md/lg) · Input · **MoneyInput** · **DateInput** (German format, keyboard-friendly) · Select · Combobox · SegmentedControl · Chip · Checkbox · Switch · Slider · Tabs · Tooltip · Popover · DropdownMenu · ContextMenu · Dialog · Sheet (side/bottom) · Toast · **CommandPalette** · Skeleton · Badge · Kbd · Table (virtualized) · EmptyState · ErrorState.

**Domain components:**

| Component | Notes |
|---|---|
| `CardImage` | Language-aware URL builder, fixed 63∶88 slot, card-back shimmer placeholder, fallback chain, `srcset` for DPR |
| `CardTile` / `ProductTile` | Owned/missing/hover states, quantity badge, language pills, `VariantDots`, quick actions |
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
- **Line color = performance of the visible range** (gain or loss token), with a dashed baseline at the range start or at the cost basis. Range chips: `1M · 3M · 6M · 1J · Max`. There's no 1-week range, because manual prices are too sparse for it.
- **Honest data:**
  - *Item price charts* use **linear segments between real observations**, with **every observation marked** (a dot shaped by price type). Purchase price is a dashed baseline, with the area above/below tinted gain/loss.
  - *Portfolio charts* use a **step-after** line, since value truly only changes on events. The optional "Investiert" (invested capital) overlay is dashed and neutral.
- **Area fill:** accent at 22 % → 0 % vertical gradient.
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

- Tokens live in `src/styles/tokens.css` as CSS variables under `:root` (dark default) and `[data-theme="light"]`, bridged to Tailwind v4 with `@theme inline`. Alpha variants come from `color-mix(in oklch, var(--x) N%, transparent)`.
- `color-scheme` is set per theme for native controls and scrollbars.
- **No theme flash:** a tiny inline script in `index.html` applies the stored theme before first paint. It's allowed by a CSP hash, not `unsafe-inline`.
- Themes: *System* (default) · *Dunkel* · *Hell*.
