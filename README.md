# Settr

**Jede Karte. Jedes Set. Jeder Cent.** · *Jede Karte zählt.*

Settr is a local-first collection tracker for Pokémon TCG **singles and sealed products**, covering German, English, Japanese and Chinese (Simplified and Traditional) cards, with a German interface. You record the prices you check on Cardmarket, **per card language**, and Settr turns them into price trends, portfolio value and profit/loss against what you paid. Everything stays private in your browser. There are no accounts and no server database, and you get full import/export.

> **Status: ⏳ M6 · Polish & Launch in progress.** M1–M5 are merged: foundation, catalog, collection, prices and portfolio, data safety. Planning is complete (spec v0.4, seven question rounds decided); coding started on 2026-09-23. The catalog holds *30 Jahre / 30th CELEBRATION* in DE, EN, JA, ZH-CN and ZH-TW with 52 sealed products. The design direction, **D · Bold Studio**, is on the design canvas "[Settr Design Directions](https://claude.ai/artifact/VRE95AH1GZ8yHK8Qb2y5hq)" (private link).
>
> Private project: unlisted deployment, not indexed, shared with a few friends.

## Highlights (planned v1)

- **Catalog:** the 30th-anniversary expansion *30 Jahre / 30th Celebration* (EN/DE incl. Classic Collection and Energies; JP, Simplified and Traditional Chinese *30th CELEBRATION* M6a). More sets follow one by one after v1. Card data comes from TCGdex; sealed DE/EN/JP/TC/SC products are curated.
- **Collection:** singles and sealed, with language, condition, grading, quantity, purchase price, fees and tags, plus **binder, page and slot** for your 9- and 12-pocket binders. Sales and sealed openings are tracked.
- **Prices:** fast manual entry (the cheapest Near Mint offer in your card's language from German sellers), a keyboard-driven price session, exact Cardmarket links with filters preset, daily Cardmarket price-guide *suggestions*, and price history charts.
- **Portfolio:** value over time, invested capital, unrealized/realized P/L, allocation, and set completion (Basis / Komplett / Master).
- **Data safety:** versioned backups (replace or merge), CSV export, persistent storage and backup reminders. It's an installable, offline-capable PWA.
- **Design:** *D · Bold Studio*: heavy, wide type, a floating glass sidebar and calm surfaces, in light and dark (references: Revolut, Apple, Wise), with a holo card viewer and scrubbable finance-grade charts. Usability first. Desktop first (Brave on Windows), and it works great on iPhone.

## Documentation

| Document | Purpose |
|---|---|
| [`USER_QUESTIONS.md`](USER_QUESTIONS.md) | **Round-3 questions (open)** + the decision record of rounds 1 and 2 |
| [`ROADMAP.md`](ROADMAP.md) | Milestones M0–M6 and the post-v1 backlog |
| [`CHANGELOG.md`](CHANGELOG.md) | Changes per version |
| [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) | Vision, scope, feature catalogue, acceptance criteria |
| [`docs/UX_SPEC.md`](docs/UX_SPEC.md) | Information architecture, screens, flows, keyboard model |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Design direction, tokens, typography, motion, components |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Entities, IDs, database schema, valuation and P/L formulas |
| [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) | TCGdex, Cardmarket and other sources, the catalog pipeline, licensing |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Tech stack, layers, caching/offline, deployment |
| [`docs/IMPORT_EXPORT.md`](docs/IMPORT_EXPORT.md) | Backup format, import/merge, CSV |
| [`docs/I18N.md`](docs/I18N.md) | Languages, formatting, DE/EN glossary |
| [`docs/QUALITY.md`](docs/QUALITY.md) | Definition of Done, tests, budgets, accessibility, security |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture decision log |
| [`CLAUDE.md`](CLAUDE.md) · [`AGENTS.md`](AGENTS.md) | Instructions for AI coding agents |

## Stack

Vite 8 · React 19 · TypeScript 7 · TanStack Router/Query/Table/Form · Dexie (IndexedDB) · Tailwind CSS 4 · Base UI · Motion · Recharts · Paraglide JS · MiniSearch · vite-plugin-pwa · Vitest · Playwright. It deploys to Vercel as static files. Details and rationale are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Development

Needs Node 22.12+ (CI uses 24) and pnpm 10 (`corepack enable` picks the pinned version).

```bash
pnpm install      # also installs the git hooks (lefthook)
pnpm dev          # http://localhost:5173
pnpm check        # typecheck, lint, format, unit + component tests, build, CSP, budgets
pnpm e2e          # Playwright against the built app
```

All commands are listed in [`CLAUDE.md`](CLAUDE.md#commands).

## Credits

Card data is provided by [TCGdex](https://tcgdex.net) (MIT-licensed database).

## Disclaimer

Settr is an unofficial fan project and is not affiliated with, endorsed or sponsored by The Pokémon Company, Nintendo, GAME FREAK or Creatures. Pokémon and all related names are trademarks of Nintendo/The Pokémon Company. Card images and text © The Pokémon Company, Nintendo, GAME FREAK and/or Creatures. Settr isn't affiliated with Cardmarket. Prices are user-entered.

## License

All rights reserved (`USER_QUESTIONS.md` Q8.7). The repository is public for now (R3.2).
