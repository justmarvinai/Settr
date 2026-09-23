/**
 * Catalog pipeline (DATA_SOURCES.md §6): `pnpm catalog:sync` (offline: GitHub sources only) or
 * `pnpm catalog:sync --network` (CI: + Cardmarket files, TCGdex asset index and image checks).
 * Writes public/catalog/v1 and .cache/catalog/report.md. Never hand-edit the output.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { CARD_LANGUAGES } from '../../src/domain/catalog-types';
import {
  ENERGY_TYPES,
  PRODUCT_TYPES,
  RARITY_IDS,
  STAGES,
  TRAINER_TYPES,
  type CatalogProduct,
} from '../../src/domain/catalog';
import { buildSets, type BuildProblems } from './build';
import { applyCardmarket, loadCardmarket, type CardmarketReport } from './cardmarket';
import { loadCardOverlays, loadIdAliases, loadSealed } from './curated';
import { emitCatalog } from './emit';
import { fetchSources, updateLock } from './fetch';
import { loadAssetIndex, resolveImages } from './images';
import { loadSpeciesNames } from './names';
import { CACHE, REPORT } from './paths';
import { loadTraditionalChineseNames } from './ptcg';
import { renderReport } from './report';

const args = new Set(process.argv.slice(2));
const network = args.has('--network');
const problems: BuildProblems = { errors: [], warnings: [] };

if (args.has('--update-sources')) {
  const changed = updateLock();
  console.log(
    changed.length ? `Updated sources:\n  ${changed.join('\n  ')}` : 'Sources are up to date.',
  );
}
await fetchSources({ network });
const species = loadSpeciesNames();
const sets = await buildSets(
  {
    species,
    overlays: loadCardOverlays(),
    traditionalChinese: new Map([['M6a', loadTraditionalChineseNames('M6a')]]),
  },
  problems,
);

const curated = loadSealed();
const setIds = new Set(sets.map((s) => s.config.id));
const products: CatalogProduct[] = curated.map(({ note: _note, ...product }) => product);
for (const product of products) {
  for (const setId of product.setIds)
    if (!setIds.has(setId)) problems.errors.push(`${product.id}: unknown set ${setId}`);
  if (!(PRODUCT_TYPES as readonly string[]).includes(product.type))
    problems.errors.push(`${product.id}: unknown product type ${product.type}`);
}

let cardmarket: CardmarketReport | null = null;
const cm = loadCardmarket();
if (cm) cardmarket = applyCardmarket(sets, cm, curated, problems);

const assets = loadAssetIndex();
const images = await resolveImages(sets, assets, { verify: network });

// Strict checks the runtime schema leaves open (vocab.ts) and catalog-wide invariants.
const seen = new Set<string>();
const vocab = (list: readonly string[], value: string | undefined, what: string, id: string) => {
  if (value !== undefined && !list.includes(value))
    problems.errors.push(`${id}: ${what} "${value}" is not in the vocabulary`);
};
for (const card of sets.flatMap((s) => s.cards)) {
  if (seen.has(card.id)) problems.errors.push(`${card.id}: duplicate card id`);
  seen.add(card.id);
  vocab(RARITY_IDS, card.rarity, 'rarity', card.id);
  vocab(STAGES, card.stage, 'stage', card.id);
  vocab(TRAINER_TYPES, card.trainerType, 'trainer type', card.id);
  for (const type of card.types ?? []) vocab(ENERGY_TYPES, type, 'type', card.id);
  for (const lang of [...card.languages, 'de' as const]) {
    if (!card.name[lang]) problems.errors.push(`${card.id}: no ${lang} name`);
  }
  for (const lang of Object.keys(card.name)) vocab(CARD_LANGUAGES, lang, 'language', card.id);
}
for (const product of products) {
  if (seen.has(product.id)) problems.errors.push(`${product.id}: id used twice`);
  seen.add(product.id);
}

if (problems.errors.length) {
  console.error(`Catalog build failed:\n  ${problems.errors.join('\n  ')}`);
  process.exit(1);
}

const result = emitCatalog(sets, products, species, {
  imagesVerified: images.verified,
  generatedAt: new Date().toISOString(),
});

// Catalog ids are permanent (DATA_MODEL.md §3): a vanished id needs an alias.
const aliases = loadIdAliases();
const removed = [...result.previousCardIds].filter((id) => !seen.has(id) && !aliases[id]);
if (removed.length) {
  console.error(
    `Card ids disappeared without an alias in data/curated/id-aliases.json:\n  ${removed.join('\n  ')}`,
  );
  process.exit(1);
}

mkdirSync(CACHE, { recursive: true });
const report = renderReport({
  sets,
  products,
  manifest: result.manifest,
  previousCardIds: result.previousCardIds,
  images,
  cardmarket,
  problems,
  network,
});
writeFileSync(REPORT, report);
console.log(report);
