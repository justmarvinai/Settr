import type { CatalogManifest, CatalogProduct } from '../../src/domain/catalog';
import type { BuildProblems, BuiltSet } from './build';
import type { CardmarketReport } from './cardmarket';
import type { ImageStats } from './images';
import type { TcgplayerReport } from './tcgcsv';

/** Markdown summary for the sync PR (DATA_SOURCES.md §6.2 step 8). */
export function renderReport(input: {
  sets: BuiltSet[];
  products: CatalogProduct[];
  manifest: CatalogManifest;
  previousCardIds: Set<string>;
  images: ImageStats;
  productImages: TcgplayerReport['images'];
  cardmarket: CardmarketReport | null;
  tcgplayer: TcgplayerReport | null;
  problems: BuildProblems;
  network: boolean;
}): string {
  const { sets, products, manifest, previousCardIds, images, cardmarket, tcgplayer, problems } =
    input;
  const cards = sets.flatMap((s) => s.cards);
  const added = cards.filter((c) => previousCardIds.size > 0 && !previousCardIds.has(c.id));
  const lines = [
    `# Catalog ${manifest.catalogVersion}`,
    '',
    `Mode: ${input.network ? 'network (Cardmarket product files, image checks)' : 'offline (GitHub sources; pictures and Asian Cardmarket ids kept from the last network build)'}`,
    '',
    '| Set | Print | Languages | Cards | Official |',
    '|---|---|---|---|---|',
    ...sets.map(
      (s) =>
        `| ${s.summary.id} | ${s.summary.print} | ${s.summary.languages.join(', ')} | ${s.cards.length} | ${s.summary.counts.official} |`,
    ),
    '',
    `Sealed products: ${products.length}. Cards added since the last build: ${added.length}.`,
    '',
    '## Names that are translations (shown as "übersetzt")',
    '',
  ];
  const sources = new Map<string, number>();
  for (const card of cards)
    for (const [lang, source] of Object.entries(card.nameSource ?? {}))
      sources.set(`${lang} · ${source}`, (sources.get(`${lang} · ${source}`) ?? 0) + 1);
  lines.push(
    ...[...sources].toSorted(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `- ${k}: ${v}`),
    '',
  );

  lines.push(
    '## Images',
    '',
    input.network
      ? `Checked with ${images.checked} GET requests.`
      : images.verified
        ? `Kept from the last network build for all ${images.carried} cards.`
        : `Not verified: ${images.carried} cards kept from the last network build, the rest are unchecked candidates.`,
    `Set logos: ${images.logos} of ${sets.length}. Set symbols: ${images.symbols} of ${sets.length}.`,
    '',
    '| Language | exact | other language | other print | none |',
    '|---|---|---|---|---|',
    ...Object.entries(images.coverage).map(
      ([lang, c]) => `| ${lang} | ${c.exact} | ${c.otherLanguage} | ${c.counterpart} | ${c.none} |`,
    ),
    '',
  );

  if (cardmarket) {
    lines.push(
      '## Cardmarket',
      '',
      `Card ids checked: ${cardmarket.checked}. Singles per expansion: ${
        Object.entries(cardmarket.singlesPerExpansion)
          .map(([id, n]) => `${id}: ${n}`)
          .join(', ') || 'none'
      }.`,
      `Asian card variants with a Japanese product: ${cardmarket.asia.ja}; with a Simplified Chinese product: ${cardmarket.asia['zh-cn']}.`,
      '',
      '### Asian expansions',
      '',
      "Japanese = the expansion used (configured, or where most of TCGdex's ids point). By metacard = expansions selling the same cards as the international counterparts (the Japanese set, Simplified Chinese mirrors, reprints), with the number of this set's cards each covers.",
      '',
      '| Set | Japanese | TCGdex ids | By metacard |',
      '|---|---|---|---|',
      ...cardmarket.expansions.map(
        (e) =>
          `| ${e.setId} | ${e.japanese ?? '?'} | ${e.fromTcgdex.map(([id, n]) => `${id} (${n})`).join(', ') || '—'} | ${e.byMetacard.map(([id, n]) => `${id} (${n})`).join(', ') || '—'} |`,
      ),
      ...(Object.keys(cardmarket.expansionHints).length
        ? [
            '',
            '<details><summary>What these expansions sell (a sealed product of each)</summary>',
            '',
            '| Expansion | Product |',
            '|---|---|',
            ...Object.entries(cardmarket.expansionHints).map(([id, name]) => `| ${id} | ${name} |`),
            '',
            '</details>',
          ]
        : []),
      ...(cardmarket.names.length
        ? [
            '',
            "<details><summary>Asian cards named by curation or PokéAPI, with Cardmarket's product name</summary>",
            '',
            '| Card | Japanese | English | Cardmarket |',
            '|---|---|---|---|',
            ...cardmarket.names.map((n) => `| ${n.cardId} | ${n.ja} | ${n.en} | ${n.cardmarket} |`),
            '',
            '</details>',
          ]
        : []),
      ...(cardmarket.asia.unresolved.length
        ? ['', 'Unresolved:', ...cardmarket.asia.unresolved.map((u) => `- ${u}`)]
        : []),
      ...(cardmarket.unmatchedSingles.length
        ? [
            '',
            '<details><summary>Asian singles no card points to (curate `cardmarket` in data/curated/cards)</summary>',
            '',
            '| idProduct | Expansion | Metacard | Name |',
            '|---|---|---|---|',
            ...cardmarket.unmatchedSingles
              .toSorted((a, b) => a.idExpansion - b.idExpansion || a.idProduct - b.idProduct)
              .map(
                (p) => `| ${p.idProduct} | ${p.idExpansion} | ${p.idMetacard ?? ''} | ${p.name} |`,
              ),
            '',
            '</details>',
          ]
        : []),
      '',
      '<details><summary>Sealed products on Cardmarket for these expansions</summary>',
      '',
      '| idProduct | Expansion | Category | Name |',
      '|---|---|---|---|',
      ...cardmarket.sealedCandidates
        .toSorted((a, b) => a.idExpansion - b.idExpansion || a.idProduct - b.idProduct)
        .map((p) => `| ${p.idProduct} | ${p.idExpansion} | ${p.categoryName ?? ''} | ${p.name} |`),
      '',
      '</details>',
      '',
    );
  }
  lines.push(
    '## Sealed pictures (TCGplayer)',
    '',
    `Products with a TCGplayer id: ${input.productImages.curated}; with a picture: ${input.productImages.found}.`,
    ...(input.productImages.missing.length
      ? ['', 'No picture:', ...input.productImages.missing.map((m) => `- ${m}`)]
      : []),
    '',
  );
  if (tcgplayer) {
    const curated = new Set(products.flatMap((p) => (p.refs?.tcgplayer ? [p.refs.tcgplayer] : [])));
    const groupName = new Map(tcgplayer.groups.map((g) => [g.groupId, g.name]));
    lines.push(
      `Groups: ${tcgplayer.groups.map((g) => `${g.name} (${g.categoryId}/${g.groupId})`).join(', ') || 'none'}.`,
      '',
      '<details><summary>Sealed products on TCGplayer for these groups (curate `refs.tcgplayer`)</summary>',
      '',
      '| productId | Group | Name | Curated |',
      '|---|---|---|---|',
      ...tcgplayer.sealedCandidates
        .toSorted((a, b) => a.groupId - b.groupId || a.productId - b.productId)
        .map(
          (p) =>
            `| ${p.productId} | ${groupName.get(p.groupId) ?? p.groupId} | ${p.name} | ${curated.has(p.productId) ? 'yes' : ''} |`,
        ),
      '',
      '</details>',
      '',
    );
  }
  if (problems.warnings.length)
    lines.push('## Warnings', '', ...problems.warnings.map((w) => `- ${w}`), '');
  return `${lines.join('\n')}\n`;
}
