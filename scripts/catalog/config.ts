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
  /** TCGdex rarity values that mean something else in this set (M1S calls its SRs "Secret Rare"). */
  rarities?: Record<string, RarityId>;
  /**
   * `single`: every card exists once, whatever TCGdex lists (30 Jahre is all foil, DATA_MODEL.md
   * §2), as the variant `std`. `detailed` (default): TCGdex's variants (variants.ts).
   */
  variants?: 'single' | 'detailed';
  extras?: ExtraCards[];
  /**
   * Asian prints: the international sets whose cards show the same artwork (DE/EN names and
   * pictures come from them). Pairing only looks there, so a Pokémon drawn twice by one artist
   * in different sets can't pair across sets.
   */
  counterpartSets?: string[];
  /** Folder in PTCG-database's `data_tc` with the official Traditional Chinese names. */
  traditionalChinese?: string;
  /**
   * Cardmarket expansion ids, checked when the product files are available (CI). `expansion` holds
   * the singles (Japanese ones for Asian prints; found through TCGdex's ids and the international
   * counterparts' metacards when left out); `otherExpansions` hold some of the set's prints
   * Cardmarket files apart (pattern reverse holos, TCGplayer's "Deck Exclusives");
   * `sealedExpansions` are extra expansions that only sell this set's sealed products.
   */
  cardmarket?: {
    expansion?: number;
    otherExpansions?: number[];
    simplifiedChineseExpansion?: number;
    sealedExpansions?: number[];
  };
  /**
   * Japanese rarity marks as printed (DATA_SOURCES.md §2): `all` for regular sets (C, U, R, RR,
   * AR, SR, SAR, MUR), `special` where only RR/AR/SAR/FUR are printed (M6a).
   */
  rarityMarks?: 'all' | 'special';
  /** Names for sections that aren't a subset of their own. */
  sectionNames?: Partial<Record<CardSection, LocalizedText>>;
  /** Local id of the card shown on the set's tile. */
  coverCard?: string;
  /**
   * TCGplayer category (3 = Pokémon, 85 = Pokémon Japan) and a group id or the beginnings of group
   * names (any case: "m1L: Mega Brave"), to find the set's sealed products on TCGCSV for their
   * pictures (DATA_SOURCES.md §4).
   */
  tcgplayer?: { category: number; groupId?: number; groupNames?: string[] };
}

const numeric = (localId: string) => (/^\d+$/.test(localId) ? Number(localId) : null);

/** Numbered main set with secret rares above the printed total. */
const mainAndSecret = (total: number) => (localId: string) =>
  (numeric(localId) ?? 999) <= total ? 'main' : 'secret';

const MEGA = (set: string): SourceSet => ({ pool: 'data', serie: 'Mega Evolution', set });
const M = (set: string): SourceSet => ({ pool: 'data-asia', serie: 'M', set });

/** An international Mega Evolution expansion (DE/EN share one card list, DATA_MODEL.md §2). */
function international(
  id: string,
  set: string,
  options: Pick<SetConfig, 'code' | 'expectedCards' | 'printedTotal' | 'coverCard' | 'extras'> & {
    cardmarket: number;
    /** Expansions Cardmarket files some of the set's prints under (SetConfig.cardmarket). */
    cardmarketOther?: number[];
    tcgplayer?: number;
  },
): SetConfig {
  const { cardmarket, cardmarketOther, tcgplayer, printedTotal, ...rest } = options;
  return {
    id,
    print: 'intl',
    kind: 'main',
    series: SERIES.megaEvolution,
    languages: ['de', 'en'],
    source: MEGA(set),
    section: printedTotal ? mainAndSecret(printedTotal) : () => 'main',
    ...(printedTotal ? { printedTotal } : {}),
    ...rest,
    cardmarket: {
      expansion: cardmarket,
      ...(cardmarketOther ? { otherExpansions: cardmarketOther } : {}),
    },
    ...(tcgplayer ? { tcgplayer: { category: 3, groupId: tcgplayer } } : {}),
  };
}

/**
 * A Japanese Mega Evolution set; Traditional Chinese mirrors it (same list and numbering), except
 * for the promo cards: Taiwan numbers its promos in a series of its own (`mirrored: false`).
 */
function japanese(
  set: string,
  options: Pick<
    SetConfig,
    | 'expectedCards'
    | 'printedTotal'
    | 'coverCard'
    | 'counterpartSets'
    | 'rarities'
    | 'rarityMarks'
    | 'cardmarket'
  > & { name: LocalizedText; tcgplayer?: string; mirrored?: boolean },
): SetConfig {
  const { name, tcgplayer, printedTotal, mirrored = true, ...rest } = options;
  return {
    id: `asia:${set}`,
    print: 'asia',
    kind: 'main',
    series: SERIES.megaEvolution,
    name,
    code: set,
    languages: mirrored ? ['ja', 'zh-tw'] : ['ja'],
    source: M(set),
    section: printedTotal ? mainAndSecret(printedTotal) : () => 'main',
    ...(printedTotal ? { printedTotal } : {}),
    ...(mirrored ? { traditionalChinese: set } : {}),
    ...rest,
    ...(tcgplayer ? { tcgplayer: { category: 85, groupNames: [tcgplayer] } } : {}),
  };
}

/** The basic Energy of the Mega Evolution sets (MEE 001–008), sold in the first expansion's products. */
const MEE_BASIC: ExtraCards = {
  source: MEGA('Mega Evolution Energy'),
  localIds: ['001', '002', '003', '004', '005', '006', '007', '008'],
  section: 'energy',
  idPrefix: 'intl:mee',
};

export const CATALOG_SETS: SetConfig[] = [
  {
    id: 'intl:30th',
    print: 'intl',
    kind: 'main',
    series: SERIES.megaEvolution,
    code: '30C',
    languages: ['de', 'en'],
    source: MEGA('30th Celebration'),
    expectedCards: 161,
    printedTotal: 128,
    section: mainAndSecret(128),
    variants: 'single',
    extras: [
      {
        source: MEGA('Mega Evolution Energy'),
        localIds: ['009', '010', '011', '012', '013', '014', '015', '016'],
        section: 'energy',
        idPrefix: 'intl:mee',
      },
    ],
    coverCard: '150', // Pikachu-ex, Special Illustration Rare
    cardmarket: { expansion: 6601 },
    // Also finds "ME: 30th Celebration Classic Collection".
    tcgplayer: { category: 3, groupNames: ['ME: 30th Celebration'] },
  },
  {
    id: 'intl:30th-c',
    print: 'intl',
    kind: 'subset',
    parentSetId: 'intl:30th',
    series: SERIES.megaEvolution,
    code: '30C',
    languages: ['de', 'en'],
    source: MEGA('30th Classic Collection'),
    expectedCards: 30,
    section: () => 'subset',
    forceRarity: 'classic-collection',
    variants: 'single',
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
    source: M('M6a'),
    expectedCards: 176,
    printedTotal: 103,
    section: (localId) => {
      const n = numeric(localId);
      if (n === null) return ['R', 'G', 'B'].includes(localId) ? 'secret' : 'energy';
      if (n <= 103) return 'main';
      return n >= 136 && n <= 165 ? 'subset' : 'secret';
    },
    variants: 'single',
    counterpartSets: ['intl:30th', 'intl:30th-c'],
    traditionalChinese: 'M6a',
    // 6628 is MF, the premium deck set's own expansion (its cards stay out of the v1 catalog).
    // The international print keeps these 30 reprints in a subset of its own (intl:30th-c).
    sectionNames: { subset: { de: 'Klassische Sammlung', en: 'Classic Collection' } },
    coverCard: '127', // ピカチュウex SAR, the same artwork as intl:30th:150
    cardmarket: { expansion: 6602, simplifiedChineseExpansion: 6603, sealedExpansions: [6628] },
    // MF: the premium deck set (asia:m6a-premium-deck-set).
    tcgplayer: { category: 85, groupNames: ['M6a:', 'MF:'] },
    rarityMarks: 'special',
  },

  // Mega Evolution series, international print (DE/EN), in release order.
  international('intl:me01', 'Mega Evolution', {
    code: 'MEG',
    expectedCards: 188,
    printedTotal: 132,
    extras: [MEE_BASIC],
    coverCard: '178', // Mega Gardevoir ex, Special Illustration Rare
    cardmarket: 6209,
    cardmarketOther: [6290], // deck exclusives
    tcgplayer: 24380,
  }),
  international('intl:me02', 'Phantasmal Flames', {
    code: 'PFL',
    expectedCards: 130,
    printedTotal: 94,
    coverCard: '125', // Mega Charizard X ex, Special Illustration Rare
    cardmarket: 6299,
    cardmarketOther: [6300], // deck exclusives
    tcgplayer: 24448,
  }),
  international('intl:me02.5', 'Ascended Heroes', {
    code: 'ASC',
    expectedCards: 295,
    printedTotal: 217,
    coverCard: '276', // Pikachu ex, Special Illustration Rare
    cardmarket: 6395,
    cardmarketOther: [6455], // pattern reverse holos
    tcgplayer: 24541,
  }),
  international('intl:me03', 'Perfect Order', {
    code: 'POR',
    expectedCards: 124,
    printedTotal: 88,
    coverCard: '120', // Mega Zygarde ex, Special Illustration Rare
    cardmarket: 6443,
    cardmarketOther: [6516], // deck exclusives
    tcgplayer: 24587,
  }),
  international('intl:me04', 'Chaos Rising', {
    code: 'CRI',
    expectedCards: 122,
    printedTotal: 86,
    coverCard: '116', // Mega Greninja ex, Special Illustration Rare
    cardmarket: 6517,
    cardmarketOther: [6518], // deck exclusives
    tcgplayer: 24655,
  }),
  international('intl:me05', 'Pitch Black', {
    code: 'PBL',
    expectedCards: 120,
    printedTotal: 84,
    coverCard: '116', // Mega Darkrai ex, Special Illustration Rare
    cardmarket: 6569,
    cardmarketOther: [6640], // deck exclusives
    tcgplayer: 24688,
  }),
  {
    ...international('intl:mep', 'MEP Black Star Promos', {
      code: 'MEP',
      expectedCards: 90,
      coverCard: '001',
      cardmarket: 6232,
    }),
    name: { de: 'Mega-Entwicklung Promos', en: 'MEP Black Star Promos' },
    tcgplayer: { category: 3, groupNames: ['ME: Mega Evolution Promo'] },
  },

  // The same series in Japan; each international set is built from one or two of these.
  japanese('M1L', {
    name: { ja: 'メガブレイブ', de: 'Mega Brave', en: 'Mega Brave' },
    expectedCards: 92,
    printedTotal: 63,
    counterpartSets: ['intl:me01'],
    rarityMarks: 'all',
    coverCard: '088', // メガルカリオex SAR
    cardmarket: { expansion: 6189 },
    tcgplayer: 'M1L:',
  }),
  japanese('M1S', {
    name: { ja: 'メガシンフォニア', de: 'Mega Symphonia', en: 'Mega Symphonia' },
    expectedCards: 92,
    printedTotal: 63,
    counterpartSets: ['intl:me01'],
    // TCGdex calls M1S's SR cards "Secret Rare" (M1L: "Ultra Rare"); both print SR.
    rarities: { 'Secret Rare': 'ultra-rare' },
    rarityMarks: 'all',
    coverCard: '087', // メガサーナイトex SAR
    cardmarket: { expansion: 6190 },
    tcgplayer: 'M1S:',
  }),
  japanese('M2', {
    name: { ja: 'インフェルノX', de: 'Inferno X', en: 'Inferno X' },
    expectedCards: 116,
    printedTotal: 80,
    counterpartSets: ['intl:me02'],
    rarityMarks: 'all',
    coverCard: '110', // メガリザードンXex SAR
    cardmarket: { expansion: 6291 },
    tcgplayer: 'M2:',
  }),
  japanese('M2a', {
    name: { ja: 'MEGAドリームex', de: 'MEGA Dream ex', en: 'MEGA Dream ex' },
    expectedCards: 250,
    printedTotal: 193,
    counterpartSets: ['intl:me02.5'],
    rarityMarks: 'all',
    coverCard: '234', // ピカチュウex SAR
    cardmarket: { expansion: 6380, otherExpansions: [6409] }, // 6409: the reverse holos
    tcgplayer: 'M2a:',
  }),
  japanese('M3', {
    name: { ja: 'ムニキスゼロ', de: 'Nihil Zero', en: 'Nihil Zero' },
    expectedCards: 117,
    printedTotal: 80,
    counterpartSets: ['intl:me03'],
    rarityMarks: 'all',
    coverCard: '113', // メガジガルデex SAR
    cardmarket: { expansion: 6427 },
    tcgplayer: 'M3:',
  }),
  japanese('M4', {
    name: { ja: 'ニンジャスピナー', de: 'Ninja Spinner', en: 'Ninja Spinner' },
    expectedCards: 120,
    printedTotal: 83,
    counterpartSets: ['intl:me04'],
    rarityMarks: 'all',
    coverCard: '114', // メガゲッコウガex SAR
    cardmarket: { expansion: 6494 },
    tcgplayer: 'M4:',
  }),
  japanese('M5', {
    name: { ja: 'アビスアイ', de: 'Abyss Eye', en: 'Abyss Eye' },
    expectedCards: 118,
    printedTotal: 81,
    counterpartSets: ['intl:me05'],
    rarityMarks: 'all',
    coverCard: '114', // メガダークライex SAR
    cardmarket: { expansion: 6556 },
    tcgplayer: 'M5:',
  }),
  japanese('M-P', {
    name: { ja: 'メガ プロモカード', de: 'MEGA-Promokarten', en: 'MEGA Promo Cards' },
    expectedCards: 132,
    counterpartSets: ['intl:mep'],
    mirrored: false,
    coverCard: '002', // ラプラスex
    cardmarket: { expansion: 6230 },
    tcgplayer: 'M-P ',
  }),
];

/**
 * International series whose cards lend Asian cards their German and English names (and
 * pictures) when the artwork matches but the card isn't in the catalog: Japanese sets reprint
 * Scarlet & Violet cards the Mega Evolution sets don't carry (build.ts, ADR-051).
 */
export const NAME_DONORS: SourceSet[] = [
  { pool: 'data', serie: 'Scarlet & Violet', set: '*' },
  { pool: 'data', serie: 'Mega Evolution', set: '*' },
];

/** Japanese rarity marks per rarity id (DATA_SOURCES.md §2); unlisted rarities print no mark. */
export const JAPANESE_RARITY_MARKS: Partial<Record<RarityId, string>> = {
  common: 'C',
  uncommon: 'U',
  rare: 'R',
  'double-rare': 'RR',
  'illustration-rare': 'AR',
  'ultra-rare': 'SR',
  'special-illustration-rare': 'SAR',
  'mega-hyper-rare': 'MUR',
  'hyper-rare': 'UR',
  'futuristic-rare': 'FUR',
};
/** M6a prints only these (DATA_SOURCES.md §2). */
export const SPECIAL_RARITY_MARKS: readonly RarityId[] = [
  'double-rare',
  'illustration-rare',
  'special-illustration-rare',
  'futuristic-rare',
];

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
