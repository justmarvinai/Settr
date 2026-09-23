import type { CatalogManifest, CatalogProduct } from '../../src/domain/catalog';
import type { BuildProblems, BuiltSet } from './build';
import type { CardmarketReport } from './cardmarket';
import type { ImageStats } from './images';

/** Markdown summary for the sync PR (DATA_SOURCES.md §6.2 step 8). */
export function renderReport(input: {
  sets: BuiltSet[];
  products: CatalogProduct[];
  manifest: CatalogManifest;
  previousCardIds: Set<string>;
  images: ImageStats;
  cardmarket: CardmarketReport | null;
  problems: BuildProblems;
  network: boolean;
}): string {
  const { sets, products, manifest, previousCardIds, images, cardmarket, problems } = input;
  const cards = sets.flatMap((s) => s.cards);
  const added = cards.filter((c) => previousCardIds.size > 0 && !previousCardIds.has(c.id));
  const lines = [
    `# Catalog ${manifest.catalogVersion}`,
    '',
    `Mode: ${input.network ? 'network (Cardmarket, TCGdex assets, image checks)' : 'offline (GitHub sources only; images unverified)'}`,
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
    images.verified
      ? `Verified with ${images.checked} GET checks.`
      : 'Not verified (offline build).',
    '',
  );
  if (images.verified) {
    lines.push(
      '| Language | exact | other language | other print | none |',
      '|---|---|---|---|---|',
    );
    for (const [lang, c] of Object.entries(images.coverage))
      lines.push(`| ${lang} | ${c.exact} | ${c.otherLanguage} | ${c.counterpart} | ${c.none} |`);
    lines.push('');
  }

  if (cardmarket) {
    lines.push(
      '## Cardmarket',
      '',
      `Card ids checked: ${cardmarket.checked}. Simplified Chinese ids mapped: ${cardmarket.simplifiedChinese.mapped}.`,
      ...(cardmarket.simplifiedChinese.unresolved.length
        ? [
            '',
            'Unresolved SC mappings:',
            ...cardmarket.simplifiedChinese.unresolved.map((u) => `- ${u}`),
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
  if (problems.warnings.length)
    lines.push('## Warnings', '', ...problems.warnings.map((w) => `- ${w}`), '');
  return `${lines.join('\n')}\n`;
}
