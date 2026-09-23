import type { CardLanguage, Print } from '../../src/domain/catalog-types';
import type { LocalizedText } from '../../src/domain/catalog/schema';
import type { CardSection, RarityId } from '../../src/domain/catalog/vocab';
import type { SourceSet } from './tcgdex';

/**
 * Which sets the catalog contains (DATA_SOURCES.md §6.1). Adding a set = one entry here plus a
 * curated overlay and a reviewed sync PR (§6.5, ADR-028).
 */

export const SERIES = {
  megaEvolution: {
    id: 'mega-evolution',
    name: { de: 'Mega-Entwicklung', en: 'Mega Evolution', ja: 'MEGA' },
  },
} as const;

export interface ExtraCards {
  /** Cards from another TCGdex set that ship with this set, e.g. the 30 Jahre energies (MEE 009–016). */
  source: SourceSet;
  localIds: string[];
  section: CardSection;
  /** Card ids keep their home set (`intl:mee:009`), so a later full MEE set can adopt them unchanged. */
  idPrefix: string;
}

export interface SetConfig {
  id: string;
  print: Print;
  kind: 'main' | 'subset';
  parentSetId?: string;
  series: { id: string; name: LocalizedText };
  /** Merged over TCGdex's set names (asia sets only have `ja` upstream). */
  name?: LocalizedText;
  code?: string;
  languages: CardLanguage[];
  releaseDates?: Partial<Record<CardLanguage, string>>;
  source: SourceSet;
  /** Card files expected upstream; a different count stops the build. */
  expectedCards: number;
  section: (localId: string) => CardSection;
  /** Denominator printed on numbered cards (`025/128`). */
  printedTotal?: number;
  /** Rarity for every card of the set (TCGdex leaves the Classic Collection at "None"). */
  forceRarity?: RarityId;
  extras?: ExtraCards[];
  /**
   * Cardmarket expansion ids, checked when the product files are available (CI). `expansion` holds
   * the singles (Japanese ones for Asian prints); `sealedExpansions` are extra expansions that only
   * sell this set's sealed products.
   */
  cardmarket?: {
    expansion: number;
    simplifiedChineseExpansion?: number;
    sealedExpansions?: number[];
  };
  /** Japanese rarity marks: only RR/AR/SAR/FUR are printed (DATA_SOURCES.md §2). */
  japaneseRarityMarks?: boolean;
  /**
   * TCGplayer category (3 = Pokémon, 85 = Pokémon Japan) and a group-name fragment, to find the
   * set's sealed products on TCGCSV for their pictures (DATA_SOURCES.md §4).
   */
  tcgplayer?: { category: number; groupName: string };
}

const numeric = (localId: string) => (/^\d+$/.test(localId) ? Number(localId) : null);

export const CATALOG_SETS: SetConfig[] = [
  {
    id: 'intl:30th',
    print: 'intl',
    kind: 'main',
    series: SERIES.megaEvolution,
    code: '30C',
    languages: ['de', 'en'],
    source: { pool: 'data', serie: 'Mega Evolution', set: '30th Celebration' },
    expectedCards: 161,
    printedTotal: 128,
    section: (localId) => ((numeric(localId) ?? 999) <= 128 ? 'main' : 'secret'),
    extras: [
      {
        source: { pool: 'data', serie: 'Mega Evolution', set: 'Mega Evolution Energy' },
        localIds: ['009', '010', '011', '012', '013', '014', '015', '016'],
        section: 'energy',
        idPrefix: 'intl:mee',
      },
    ],
    cardmarket: { expansion: 6601 },
    tcgplayer: { category: 3, groupName: '30th Celebration' },
  },
  {
    id: 'intl:30th-c',
    print: 'intl',
    kind: 'subset',
    parentSetId: 'intl:30th',
    series: SERIES.megaEvolution,
    code: '30C',
    languages: ['de', 'en'],
    source: { pool: 'data', serie: 'Mega Evolution', set: '30th Classic Collection' },
    expectedCards: 30,
    section: () => 'subset',
    forceRarity: 'classic-collection',
    cardmarket: { expansion: 6601 },
  },
  {
    id: 'asia:M6a',
    print: 'asia',
    kind: 'main',
    series: SERIES.megaEvolution,
    name: {
      ja: '30th CELEBRATION',
      'zh-tw': '30th CELEBRATION',
      'zh-cn': '30周年庆典',
      de: '30th CELEBRATION',
      en: '30th CELEBRATION',
    },
    code: 'M6a',
    languages: ['ja', 'zh-cn', 'zh-tw'],
    releaseDates: { ja: '2026-09-16' },
    source: { pool: 'data-asia', serie: 'M', set: 'M6a' },
    expectedCards: 176,
    printedTotal: 103,
    section: (localId) => {
      const n = numeric(localId);
      if (n === null) return ['R', 'G', 'B'].includes(localId) ? 'secret' : 'energy';
      if (n <= 103) return 'main';
      return n >= 136 && n <= 165 ? 'subset' : 'secret';
    },
    // 6628 is MF, the premium deck set's own expansion (its cards stay out of the v1 catalog).
    cardmarket: { expansion: 6602, simplifiedChineseExpansion: 6603, sealedExpansions: [6628] },
    tcgplayer: { category: 85, groupName: '30th Celebration' },
    japaneseRarityMarks: true,
  },
];

/** Japanese rarity marks per rarity id (DATA_SOURCES.md §2); unlisted rarities print no mark. */
export const JAPANESE_RARITY_MARKS: Partial<Record<RarityId, string>> = {
  'double-rare': 'RR',
  'illustration-rare': 'AR',
  'special-illustration-rare': 'SAR',
  'futuristic-rare': 'FUR',
};

/** Japanese basic-energy codes used by TCGdex for M6a. */
export const JAPANESE_ENERGY_CODES: Record<string, string> = {
  GRA: 'grass',
  FIR: 'fire',
  WAT: 'water',
  LIG: 'lightning',
  PSY: 'psychic',
  FIG: 'fighting',
  DAR: 'darkness',
  MET: 'metal',
};
