# settr

**Jede Karte. Jedes Set. Jeder Cent.**

Settr is a local-first collection tracker for Pokémon TCG **singles and sealed products**, covering German, English, Japanese and Chinese cards. You record the prices you check on Cardmarket, and Settr turns them into price trends, portfolio value and profit/loss against what you paid. Everything stays private in your browser. There are no accounts and no server database, and you get full import/export.

> **Status: 🚧 M0 · Planning.** This repository currently contains the complete product and technical plan. **No application code exists yet.** Coding starts after the open questions are answered and Marvin gives explicit approval.

## Highlights (planned v1)

- **Catalog:** the 30th-anniversary expansion *30 Jahre / 30th Celebration* (EN/DE incl. Classic Collection, JP *30th CELEBRATION* M6a, and Chinese per Q3.5). Card data comes from TCGdex; sealed products are curated.
- **Collection:** singles and sealed, with language, condition, grading, quantity, purchase price, fees, tags and storage location.
- **Prices:** fast manual entry, a keyboard-driven price session, exact Cardmarket links, and price history charts.
- **Portfolio:** value over time, invested capital, unrealized/realized P/L, allocation, and set completion (Basis / Komplett / Master).
- **Data safety:** versioned backups (replace or merge), CSV export, persistent storage and backup reminders. It's an installable, offline-capable PWA.
- **Design:** a premium "Vault" aesthetic with a holo card viewer, scrubbable finance-grade charts, a German-first UI and a light theme.

## Documentation

| Document | Purpose |
|---|---|
| [`USER_QUESTIONS.md`](USER_QUESTIONS.md) | **Open questions and feature ideas; please answer these** |
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

## Planned stack

Vite 8 · React 19 · TypeScript 7 · TanStack Router/Query/Table/Form · Dexie (IndexedDB) · Tailwind CSS 4 · shadcn/ui on Base UI · Motion · Recharts · Paraglide JS · MiniSearch · vite-plugin-pwa · Vitest · Playwright. It deploys to Vercel as static files. Details and rationale are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Credits

Card data is provided by [TCGdex](https://tcgdex.net) (MIT-licensed database).

## Disclaimer

Settr is an unofficial fan project and is not affiliated with, endorsed or sponsored by The Pokémon Company, Nintendo, GAME FREAK or Creatures. Pokémon and all related names are trademarks of Nintendo/The Pokémon Company. Card images and text © The Pokémon Company, Nintendo, GAME FREAK and/or Creatures. Settr isn't affiliated with Cardmarket. Prices are user-entered.

## License

To be decided (see `USER_QUESTIONS.md` Q8.7). Until then: all rights reserved.
