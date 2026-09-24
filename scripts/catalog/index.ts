/**
 * Catalog pipeline (DATA_SOURCES.md §6): `pnpm catalog:sync` (offline: GitHub sources only; keeps
 * the pictures and Asian Cardmarket ids of the last network build) or `pnpm catalog:sync --network`
 * (CI: + Cardmarket's product files and image checks against TCGdex's server).
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
import { buildSets, loadDonors, type BuildProblems } from './build';
import {
  applyCardmarket,
  carryOverCardmarket,
  loadCardmarket,
  type CardmarketReport,
} from './cardmarket';
import { CATALOG_SETS, NAME_DONORS } from './config';
import { loadCardOverlays, loadIdAliases, loadJapaneseNames, loadSealed } from './curated';
import { emitCatalog } from './emit';
import { fetchSources, updateLock } from './fetch';
import { createChecker, resolveImages } from './images';
import { loadSpeciesNames } from './names';
import { CACHE, REPORT } from './paths';
import { loadPrevious } from './previous';
import { loadTraditionalChineseNames } from './ptcg';
import { renderReport } from './report';
import { loadTcgdexSerie } from './tcgdex';
import { loadTcgcsv, resolveProductImages, type TcgplayerReport } from './tcgcsv';

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
const previous = loadPrevious();
const species = loadSpeciesNames();
const overlays = loadCardOverlays();
const donors = await loadDonors(NAME_DONORS, loadTcgdexSerie);
const sets = await buildSets(
  {
    species,
    overlays,
    donors,
    japaneseNames: loadJapaneseNames(),
    traditionalChinese: new Map(
      CATALOG_SETS.flatMap((c) =>
        c.traditionalChinese
          ? [[c.traditionalChinese, loadTraditionalChineseNames(c.traditionalChinese)] as const]
          : [],
      ),
    ),
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
const cm = network ? loadCardmarket() : null;
if (cm) cardmarket = applyCardmarket(sets, cm, curated, overlays, problems);
else carryOverCardmarket(sets, previous, overlays);

// The same expansion in the other print: the main set most counterparts point to.
const mainOf = new Map(
  sets.flatMap((s) => s.cards.map((c) => [c.id, s.config.parentSetId ?? s.config.id] as const)),
);
for (const set of sets.filter((s) => s.config.kind === 'main')) {
  const votes = new Map<string, number>();
  for (const card of sets
    .filter((s) => (s.config.parentSetId ?? s.config.id) === set.config.id)
    .flatMap((s) => s.cards))
    for (const partner of card.counterparts ?? []) {
      const main = mainOf.get(partner);
      if (main && main !== set.config.id) votes.set(main, (votes.get(main) ?? 0) + 1);
    }
  // A handful of shared cards (a reprint, a promo) doesn't make the same expansion.
  const ranked = [...votes]
    .toSorted((a, b) => b[1] - a[1])
    .filter(([, n], i) => i === 0 || n >= 5)
    .map(([id]) => id);
  if (ranked[0]) set.summary.otherPrint = ranked[0];
  if (ranked.length > 1) set.summary.otherPrints = ranked;
}

const images = await resolveImages(sets, previous, { verify: network });
for (const set of sets) {
  const cover = set.cards.find((c) => c.localId === set.config.coverCard);
  if (set.config.coverCard && !cover)
    problems.errors.push(`${set.config.id}: cover card ${set.config.coverCard} not found`);
  if (cover) set.summary.cover = { cardId: cover.id, images: cover.images };
}

// Sealed pictures (EN/JP) from TCGplayer via TCGCSV; a TCGCSV outage keeps the last ones.
let tcgplayer: TcgplayerReport | null = null;
let productChecker = network ? createChecker() : null;
if (network) {
  try {
    tcgplayer = { ...(await loadTcgcsv(sets)), images: { curated: 0, found: 0, missing: [] } };
  } catch (error) {
    problems.warnings.push(
      `TCGCSV unavailable, sealed pictures kept from the last build: ${String(error)}`,
    );
    productChecker = null;
  }
}
const productImages = await resolveProductImages(products, previous, productChecker);
if (tcgplayer) tcgplayer.images = productImages;

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
  // The German UI needs a German name, except for a card that only came out in English.
  const englishOnly = card.languages.includes('en') && !card.languages.includes('de');
  for (const lang of [...card.languages, ...(englishOnly ? [] : ['de' as const])]) {
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

const manifest = emitCatalog(sets, products, species, {
  imagesVerified: images.verified,
  generatedAt: new Date().toISOString(),
  previous: previous.manifest,
});

// Catalog ids are permanent (DATA_MODEL.md §3): a vanished id needs an alias.
const aliases = loadIdAliases();
const removed = [...previous.cards.keys()].filter((id) => !seen.has(id) && !aliases[id]);
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
  manifest,
  previousCardIds: new Set(previous.cards.keys()),
  images,
  productImages,
  cardmarket,
  tcgplayer,
  problems,
  network,
});
writeFileSync(REPORT, report);
console.log(report);
