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
  scarletViolet: {
    id: 'scarlet-violet',
    name: { de: 'Karmesin & Purpur', en: 'Scarlet & Violet' },
  },
  swordShield: { id: 'sword-shield', name: { de: 'Schwert & Schild', en: 'Sword & Shield' } },
  sunMoon: { id: 'sun-moon', name: { de: 'Sonne & Mond', en: 'Sun & Moon' } },
  base: { id: 'base', name: { de: 'Grundset-Serie', en: 'Base' } },
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
  /**
   * The printed number when it isn't `localId/printedTotal`: Vivid Voltage prints `001/185` where
   * TCGdex's id is `1`, a Trainer Gallery `TG05/TG30`.
   */
  printedNumber?: (localId: string) => string;
  /**
   * The print run the set holds when TCGdex lists several as variant subtypes: the Base Set's
   * Unlimited print (`unlimited`); 1st Edition and Shadowless stay out (R10.4).
   */
  printRun?: string;
  /**
   * Whether booster packs carry Rares as holos (since Scarlet & Violet; the default). Decides which
   * of a card's plain holo and non-holo prints is the promotional one (build.ts).
   */
  rareIsHolo?: boolean;
  /** Rarity for every card of the set (TCGdex leaves the Classic Collection at "None"). */
  forceRarity?: RarityId;
  /**
   * Rarities by card number where TCGdex's are wrong: M6 lists every secret card as Mega Hyper
   * Rare; the layout every M set shares tells AR, SR, SAR and MUR apart (ADR-058).
   */
  rarityRanges?: { from: number; to: number; rarity: RarityId }[];
  /**
   * TCGplayer group of the set's cards: TCGCSV's printings per card stand in for the variants
   * TCGdex lacks (most Sun & Moon sets, finishes.ts, ADR-057).
   */
  tcgplayerGroup?: number;
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
   * Another TCGdex set folder of the same series to look for pictures in when the set's own has
   * none: a gallery's main set (Trainer Gallery cards may be filed there).
   */
  picturesIn?: string;
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
const SV = (set: string): SourceSet => ({ pool: 'data', serie: 'Scarlet & Violet', set });
const SWSH = (set: string): SourceSet => ({ pool: 'data', serie: 'Sword & Shield', set });
const SM = (set: string): SourceSet => ({ pool: 'data', serie: 'Sun & Moon', set });
const BASE = (set: string): SourceSet => ({ pool: 'data', serie: 'Base', set });
const M = (set: string): SourceSet => ({ pool: 'data-asia', serie: 'M', set });

/**
 * An international expansion (DE/EN share one card list, DATA_MODEL.md §2). The Cardmarket
 * expansion defaults to TCGdex's for the set (cardmarket.ts).
 */
function international(
  id: string,
  source: SourceSet,
  options: Pick<
    SetConfig,
    | 'name'
    | 'code'
    | 'expectedCards'
    | 'printedTotal'
    | 'printedNumber'
    | 'printRun'
    | 'rareIsHolo'
    | 'forceRarity'
    | 'tcgplayerGroup'
    | 'coverCard'
    | 'extras'
    | 'picturesIn'
  > & {
    series?: SetConfig['series'];
    /** A subset of this main set (a Trainer Gallery): one section of the parent's chunk. */
    parentSetId?: string;
    cardmarket?: number;
    /** Expansions Cardmarket files some of the set's prints under (SetConfig.cardmarket). */
    cardmarketOther?: number[];
    tcgplayer?: number;
  },
): SetConfig {
  const {
    series = SERIES.megaEvolution,
    parentSetId,
    cardmarket,
    cardmarketOther,
    tcgplayer,
    printedTotal,
    ...rest
  } = options;
  return {
    id,
    print: 'intl',
    kind: parentSetId ? 'subset' : 'main',
    ...(parentSetId ? { parentSetId } : {}),
    series,
    languages: ['de', 'en'],
    source,
    section: parentSetId
      ? () => 'subset'
      : printedTotal
        ? mainAndSecret(printedTotal)
        : () => 'main',
    ...(printedTotal ? { printedTotal } : {}),
    ...rest,
    ...(cardmarket
      ? {
          cardmarket: {
            expansion: cardmarket,
            ...(cardmarketOther ? { otherExpansions: cardmarketOther } : {}),
          },
        }
      : {}),
    ...(tcgplayer ? { tcgplayer: { category: 3, groupId: tcgplayer } } : {}),
  };
}

/** Three-digit printed numbers from TCGdex's unpadded ids (`1` → `001/185`, `1` → `001/073`). */
const padded = (total: number) => (localId: string) =>
  `${localId.padStart(3, '0')}/${String(total).padStart(3, '0')}`;
/** Trainer Gallery and Galarian Gallery numbers (`TG05/TG30`, `GG05/GG70`). */
const gallery = (last: string) => (localId: string) => `${localId}/${last}`;

/** Earlier series, international only and cards only (R10.1–R10.3): Scarlet & Violet … Base. */
const SCARLET_VIOLET = { series: SERIES.scarletViolet } as const;
/** Before Scarlet & Violet, packs carry Rares as non-holos (`SetConfig.rareIsHolo`). */
const SWORD_SHIELD = { series: SERIES.swordShield, rareIsHolo: false } as const;
const SUN_MOON = { series: SERIES.sunMoon, rareIsHolo: false } as const;
/** Sets that only came out in English (no German print, so no German name is due). */
const englishOnly = (config: SetConfig): SetConfig => ({ ...config, languages: ['en'] });

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
    | 'rarityRanges'
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
    // Basic Energy without numbers (MC, MF: `GRA`, `FIR` …) is the set's energy section.
    section: (localId) =>
      JAPANESE_ENERGY_CODES[localId]
        ? 'energy'
        : printedTotal
          ? mainAndSecret(printedTotal)(localId)
          : 'main',
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
  international('intl:me01', MEGA('Mega Evolution'), {
    code: 'MEG',
    expectedCards: 188,
    printedTotal: 132,
    extras: [MEE_BASIC],
    coverCard: '178', // Mega Gardevoir ex, Special Illustration Rare
    cardmarket: 6209,
    cardmarketOther: [6290], // deck exclusives
    tcgplayer: 24380,
  }),
  international('intl:me02', MEGA('Phantasmal Flames'), {
    code: 'PFL',
    expectedCards: 130,
    printedTotal: 94,
    coverCard: '125', // Mega Charizard X ex, Special Illustration Rare
    cardmarket: 6299,
    cardmarketOther: [6300], // deck exclusives
    tcgplayer: 24448,
  }),
  international('intl:me02.5', MEGA('Ascended Heroes'), {
    code: 'ASC',
    expectedCards: 295,
    printedTotal: 217,
    coverCard: '276', // Pikachu ex, Special Illustration Rare
    cardmarket: 6395,
    cardmarketOther: [6455], // pattern reverse holos
    tcgplayer: 24541,
  }),
  international('intl:me03', MEGA('Perfect Order'), {
    code: 'POR',
    expectedCards: 124,
    printedTotal: 88,
    coverCard: '120', // Mega Zygarde ex, Special Illustration Rare
    cardmarket: 6443,
    cardmarketOther: [6516], // deck exclusives
    tcgplayer: 24587,
  }),
  international('intl:me04', MEGA('Chaos Rising'), {
    code: 'CRI',
    expectedCards: 122,
    printedTotal: 86,
    coverCard: '116', // Mega Greninja ex, Special Illustration Rare
    cardmarket: 6517,
    cardmarketOther: [6518], // deck exclusives
    tcgplayer: 24655,
  }),
  international('intl:me05', MEGA('Pitch Black'), {
    code: 'PBL',
    expectedCards: 120,
    printedTotal: 84,
    coverCard: '116', // Mega Darkrai ex, Special Illustration Rare
    cardmarket: 6569,
    cardmarketOther: [6640], // deck exclusives
    tcgplayer: 24688,
  }),
  {
    ...international('intl:mep', MEGA('MEP Black Star Promos'), {
      code: 'MEP',
      expectedCards: 90,
      coverCard: '001',
      cardmarket: 6232,
    }),
    name: { de: 'Mega-Entwicklung Promos', en: 'MEP Black Star Promos' },
    tcgplayer: { category: 3, groupNames: ['ME: Mega Evolution Promo'] },
  },

  // Scarlet & Violet, international print (DE/EN), newest first.
  international('intl:sv10.5b', SV('Black Bolt'), {
    ...SCARLET_VIOLET,
    code: 'BLK',
    expectedCards: 172,
    printedTotal: 86,
    coverCard: '172', // Zekrom ex, Black White Rare
    cardmarket: 6134,
    cardmarketOther: [6197], // pattern reverses
  }),
  international('intl:sv10.5w', SV('White Flare'), {
    ...SCARLET_VIOLET,
    code: 'WHT',
    expectedCards: 173,
    printedTotal: 86,
    coverCard: '173', // Reshiram ex, Black White Rare
    cardmarket: 6135,
    cardmarketOther: [6198], // pattern reverses
  }),
  international('intl:sv10', SV('Destined Rivals'), {
    ...SCARLET_VIOLET,
    code: 'DRI',
    expectedCards: 244,
    printedTotal: 182,
    coverCard: '231', // Team Rocket's Mewtwo ex, Special Illustration Rare
    // TCGdex's set has no expansion; its cards' ids point here.
    cardmarket: 6096,
    cardmarketOther: [6140], // deck exclusives
  }),
  international('intl:sv09', SV('Journey Together'), {
    ...SCARLET_VIOLET,
    code: 'JTG',
    expectedCards: 190,
    printedTotal: 159,
    coverCard: '185', // N's Zoroark ex, Special Illustration Rare
  }),
  international('intl:sv08.5', SV('Prismatic Evolutions'), {
    ...SCARLET_VIOLET,
    code: 'PRE',
    expectedCards: 180,
    printedTotal: 131,
    coverCard: '161', // Umbreon ex, Special Illustration Rare
    cardmarket: 5944,
    cardmarketOther: [6009], // pattern reverses
  }),
  international('intl:sv08', SV('Surging Sparks'), {
    ...SCARLET_VIOLET,
    code: 'SSP',
    expectedCards: 252,
    printedTotal: 191,
    coverCard: '238', // Pikachu ex, Special Illustration Rare
  }),
  international('intl:sv07', SV('Stellar Crown'), {
    ...SCARLET_VIOLET,
    code: 'SCR',
    expectedCards: 175,
    printedTotal: 142,
    coverCard: '170', // Terapagos ex, Special Illustration Rare
  }),
  international('intl:sv06.5', SV('Shrouded Fable'), {
    ...SCARLET_VIOLET,
    code: 'SFA',
    expectedCards: 99,
    printedTotal: 64,
    coverCard: '093', // Pecharunt ex, Special Illustration Rare
  }),
  international('intl:sv06', SV('Twilight Masquerade'), {
    ...SCARLET_VIOLET,
    code: 'TWM',
    expectedCards: 226,
    printedTotal: 167,
    coverCard: '211', // Teal Mask Ogerpon ex, Special Illustration Rare
  }),
  international('intl:sv05', SV('Temporal Forces'), {
    ...SCARLET_VIOLET,
    code: 'TEF',
    expectedCards: 218,
    printedTotal: 162,
    coverCard: '205', // Walking Wake ex, Special Illustration Rare
  }),
  international('intl:sv04.5', SV('Paldean Fates'), {
    ...SCARLET_VIOLET,
    code: 'PAF',
    expectedCards: 245,
    printedTotal: 91,
    coverCard: '234', // Charizard ex, Special Illustration Rare
  }),
  international('intl:sv04', SV('Paradox Rift'), {
    ...SCARLET_VIOLET,
    code: 'PAR',
    expectedCards: 266,
    printedTotal: 182,
    coverCard: '251', // Roaring Moon ex, Special Illustration Rare
  }),
  international('intl:sv03.5', SV('151'), {
    ...SCARLET_VIOLET,
    code: 'MEW',
    expectedCards: 207,
    printedTotal: 165,
    coverCard: '199', // Charizard ex, Special Illustration Rare
  }),
  englishOnly(
    international('intl:mfb', SV('My First Battle'), {
      ...SCARLET_VIOLET,
      name: { de: 'My First Battle', en: 'My First Battle' },
      code: 'MFB',
      expectedCards: 34,
      coverCard: '17', // Pikachu
    }),
  ),
  international('intl:sv03', SV('Obsidian Flames'), {
    ...SCARLET_VIOLET,
    name: { de: 'Obsidianflammen' }, // TCGdex: "Obsidian Flammen"
    code: 'OBF',
    expectedCards: 230,
    printedTotal: 197,
    coverCard: '223', // Charizard ex, Special Illustration Rare
  }),
  international('intl:sv02', SV('Paldea Evolved'), {
    ...SCARLET_VIOLET,
    code: 'PAL',
    expectedCards: 279,
    printedTotal: 193,
    coverCard: '256', // Meowscarada ex, Special Illustration Rare
  }),
  international('intl:sv01', SV('Scarlet & Violet'), {
    ...SCARLET_VIOLET,
    code: 'SVI',
    expectedCards: 258,
    printedTotal: 198,
    coverCard: '244', // Miraidon ex, Special Illustration Rare
  }),
  international('intl:svp', SV('SVP Black Star Promos'), {
    ...SCARLET_VIOLET,
    name: { de: 'Karmesin & Purpur Promos', en: 'SVP Black Star Promos' },
    code: 'SVP',
    expectedCards: 226,
    coverCard: '001',
  }),
  // The basic Energy of the series: 001–008 came with the first expansion (its extras until
  // 2026-09-24; the ids stayed), the others with later products.
  international('intl:sve', SV('Scarlet & Violet Energy'), {
    ...SCARLET_VIOLET,
    name: { de: 'Karmesin & Purpur Energie', en: 'Scarlet & Violet Energy' },
    code: 'SVE',
    expectedCards: 24,
    coverCard: '001',
  }),

  // Sword & Shield, international print (DE/EN), newest first; galleries and vaults are subsets.
  international('intl:swsh12.5', SWSH('Crown Zenith'), {
    ...SWORD_SHIELD,
    code: 'CRZ',
    expectedCards: 160,
    printedTotal: 159,
    coverCard: '160', // Pikachu, Secret Rare
  }),
  international('intl:swsh12.5gg', SWSH('Crown Zenith Galarian Gallery'), {
    ...SWORD_SHIELD,
    parentSetId: 'intl:swsh12.5',
    code: 'CRZ',
    expectedCards: 70,
    printedNumber: gallery('GG70'),
    picturesIn: 'swsh12.5',
  }),
  international('intl:swsh12', SWSH('Silver Tempest'), {
    ...SWORD_SHIELD,
    code: 'SIT',
    expectedCards: 215,
    printedTotal: 195,
    coverCard: '186', // Lugia V, alternate art
  }),
  international('intl:swsh12tg', SWSH('Silver Tempest Trainer Gallery'), {
    ...SWORD_SHIELD,
    parentSetId: 'intl:swsh12',
    code: 'SIT',
    expectedCards: 30,
    printedNumber: gallery('TG30'),
    picturesIn: 'swsh12',
  }),
  international('intl:swsh11', SWSH('Lost Origin'), {
    ...SWORD_SHIELD,
    code: 'LOR',
    expectedCards: 217,
    printedTotal: 196,
    coverCard: '186', // Giratina V, alternate art
  }),
  international('intl:swsh11tg', SWSH('Lost Origin Trainer Gallery'), {
    ...SWORD_SHIELD,
    parentSetId: 'intl:swsh11',
    code: 'LOR',
    expectedCards: 30,
    printedNumber: gallery('TG30'),
    picturesIn: 'swsh11',
  }),
  international('intl:swsh10.5', SWSH('Pokémon GO'), {
    ...SWORD_SHIELD,
    code: 'PGO',
    expectedCards: 88,
    printedTotal: 78,
    coverCard: '011', // Radiant Charizard
    cardmarket: 5051, // TCGdex's set says 4786; its cards' ids point here
  }),
  international('intl:swsh10', SWSH('Astral Radiance'), {
    ...SWORD_SHIELD,
    code: 'ASR',
    expectedCards: 216,
    printedTotal: 189,
    coverCard: '192', // Origin Forme Palkia VSTAR, Secret Rare
  }),
  // A main set of its own until 2026-09-24 (R10.5), now the subset of Astral Radiance; ids stayed.
  international('intl:swsh10tg', SWSH('Astral Radiance Trainer Gallery'), {
    ...SWORD_SHIELD,
    parentSetId: 'intl:swsh10',
    code: 'ASR',
    expectedCards: 30,
    printedNumber: gallery('TG30'),
    picturesIn: 'swsh10',
  }),
  international('intl:swsh9', SWSH('Brilliant Stars'), {
    ...SWORD_SHIELD,
    code: 'BRS',
    expectedCards: 186,
    printedTotal: 172,
    coverCard: '154', // Charizard V, alternate art
  }),
  international('intl:swsh9tg', SWSH('Brilliant Stars Trainer Gallery'), {
    ...SWORD_SHIELD,
    parentSetId: 'intl:swsh9',
    code: 'BRS',
    expectedCards: 30,
    printedNumber: gallery('TG30'),
    picturesIn: 'swsh9',
  }),
  international('intl:swsh8', SWSH('Fusion Strike'), {
    ...SWORD_SHIELD,
    code: 'FST',
    expectedCards: 284,
    printedTotal: 264,
    printedNumber: padded(264),
    coverCard: '269', // Mew VMAX, alternate art
  }),
  international('intl:cel25', SWSH('Celebrations'), {
    ...SWORD_SHIELD,
    code: 'CEL',
    expectedCards: 25,
    printedTotal: 25,
    printedNumber: padded(25),
    coverCard: '25', // Mew, gold
  }),
  // Reprints that keep their original numbers (data/curated/cards/intl-cel25cc.yaml).
  international('intl:cel25cc', SWSH('Celebrations Classic Collection'), {
    ...SWORD_SHIELD,
    parentSetId: 'intl:cel25',
    code: 'CEL',
    expectedCards: 25,
    forceRarity: 'classic-collection',
    picturesIn: 'cel25',
  }),
  international('intl:swsh7', SWSH('Evolving Skies'), {
    ...SWORD_SHIELD,
    code: 'EVS',
    expectedCards: 237,
    printedTotal: 203,
    printedNumber: padded(203),
    coverCard: '215', // Umbreon VMAX, alternate art
  }),
  international('intl:swsh6', SWSH('Chilling Reign'), {
    ...SWORD_SHIELD,
    code: 'CRE',
    expectedCards: 233,
    printedTotal: 198,
    printedNumber: padded(198),
    coverCard: '205', // Shadow Rider Calyrex VMAX, alternate art
  }),
  international('intl:swsh5', SWSH('Battle Styles'), {
    ...SWORD_SHIELD,
    code: 'BST',
    expectedCards: 183,
    printedTotal: 163,
    printedNumber: padded(163),
    coverCard: '170', // Rapid Strike Urshifu VMAX, alternate art
  }),
  international('intl:swsh4.5', SWSH('Shining Fates'), {
    ...SWORD_SHIELD,
    code: 'SHF',
    expectedCards: 73,
    printedTotal: 72,
    printedNumber: padded(72),
    coverCard: '45', // Crobat VMAX
  }),
  international('intl:swsh4.5sv', SWSH('Shining Fates Shiny Vault'), {
    ...SWORD_SHIELD,
    parentSetId: 'intl:swsh4.5',
    code: 'SHF',
    expectedCards: 122,
    printedNumber: gallery('SV122'),
    picturesIn: 'swsh4.5',
  }),
  international('intl:swsh4', SWSH('Vivid Voltage'), {
    ...SWORD_SHIELD,
    code: 'VIV',
    expectedCards: 203,
    printedTotal: 185,
    printedNumber: padded(185),
    coverCard: '188', // Pikachu VMAX, Secret Rare
  }),
  international('intl:swsh3.5', SWSH("Champion's Path"), {
    ...SWORD_SHIELD,
    code: 'CPA',
    expectedCards: 80,
    printedTotal: 73,
    printedNumber: padded(73),
    coverCard: '74', // Charizard VMAX, Secret Rare
  }),
  englishOnly(
    international('intl:fut2020', SWSH('Pokémon Futsal 2020'), {
      ...SWORD_SHIELD,
      name: { de: 'Pokémon Futsal 2020', en: 'Pokémon Futsal 2020' },
      code: 'FUT20',
      expectedCards: 5,
      coverCard: '1', // Pikachu on the Ball
    }),
  ),
  international('intl:swsh3', SWSH('Darkness Ablaze'), {
    ...SWORD_SHIELD,
    code: 'DAA',
    expectedCards: 201,
    printedTotal: 189,
    printedNumber: padded(189),
    coverCard: '20', // Charizard VMAX
  }),
  international('intl:swsh2', SWSH('Rebel Clash'), {
    ...SWORD_SHIELD,
    code: 'RCL',
    expectedCards: 209,
    printedTotal: 192,
    printedNumber: padded(192),
    coverCard: '197', // Dragapult VMAX, Secret Rare
  }),
  international('intl:swsh1', SWSH('Sword & Shield'), {
    ...SWORD_SHIELD,
    code: 'SSH',
    expectedCards: 216,
    printedTotal: 202,
    printedNumber: padded(202),
    coverCard: '211', // Zacian V, Secret Rare
  }),
  international('intl:swshp', SWSH('SWSH Black Star Promos'), {
    ...SWORD_SHIELD,
    name: { de: 'Schwert & Schild Promos', en: 'SWSH Black Star Promos' },
    code: 'SWSH',
    expectedCards: 307,
    coverCard: 'SWSH001',
  }),

  // Sun & Moon, international print (DE/EN), newest first. TCGdex has no variants for most of
  // these sets: TCGplayer's printings stand in (tcgplayerGroup, finishes.ts, ADR-057).
  international('intl:sm12', SM('Cosmic Eclipse'), {
    ...SUN_MOON,
    code: 'CEC',
    expectedCards: 271,
    printedTotal: 236,
    tcgplayerGroup: 2534,
    coverCard: '258', // Arceus & Dialga & Palkia GX, Secret Rare
  }),
  international('intl:sm115', SM('Hidden Fates'), {
    ...SUN_MOON,
    code: 'HIF',
    expectedCards: 69,
    printedTotal: 68,
    tcgplayerGroup: 2480,
    coverCard: '9', // Charizard GX
  }),
  international('intl:sma', SM('Hidden Fates Shiny Vault'), {
    ...SUN_MOON,
    parentSetId: 'intl:sm115',
    code: 'HIF',
    expectedCards: 94,
    printedNumber: gallery('SV94'),
    picturesIn: 'sm115',
  }),
  international('intl:sm11', SM('Unified Minds'), {
    ...SUN_MOON,
    code: 'UNM',
    expectedCards: 258,
    printedTotal: 236,
    tcgplayerGroup: 2464,
    coverCard: '242', // Mewtwo & Mew GX, Secret Rare
  }),
  international('intl:sm10', SM('Unbroken Bonds'), {
    ...SUN_MOON,
    code: 'UNB',
    expectedCards: 234,
    printedTotal: 214,
    tcgplayerGroup: 2420,
    coverCard: '217', // Reshiram & Charizard GX, Secret Rare
  }),
  international('intl:det1', SM('Detective Pikachu'), {
    ...SUN_MOON,
    code: 'DET',
    expectedCards: 18,
    printedTotal: 18,
    tcgplayerGroup: 2409,
    coverCard: '10', // Detective Pikachu
  }),
  international('intl:sm9', SM('Team Up'), {
    ...SUN_MOON,
    name: { de: 'Teams sind Trumpf' }, // TCGdex capitalizes every word
    code: 'TEU',
    expectedCards: 196,
    printedTotal: 181,
    tcgplayerGroup: 2377,
    coverCard: '184', // Pikachu & Zekrom GX, Secret Rare
  }),
  international('intl:sm8', SM('Lost Thunder'), {
    ...SUN_MOON,
    code: 'LOT',
    expectedCards: 236,
    printedTotal: 214,
    tcgplayerGroup: 2328,
    coverCard: '227', // Lugia GX, Secret Rare
  }),
  international('intl:sm7.5', SM('Dragon Majesty'), {
    ...SUN_MOON,
    name: { de: 'Majestät der Drachen' },
    code: 'DRM',
    expectedCards: 78,
    printedTotal: 70,
    tcgplayerGroup: 2295,
    coverCard: '71', // Reshiram GX, Secret Rare
  }),
  international('intl:sm7', SM('Celestial Storm'), {
    ...SUN_MOON,
    name: { de: 'Sturm am Firmament' },
    code: 'CES',
    expectedCards: 183,
    printedTotal: 168,
    tcgplayerGroup: 2278,
    coverCard: '177', // Rayquaza GX, Secret Rare
  }),
  international('intl:sm6', SM('Forbidden Light'), {
    ...SUN_MOON,
    name: { de: 'Grauen der Lichtfinsternis' },
    code: 'FLI',
    expectedCards: 146,
    printedTotal: 131,
    tcgplayerGroup: 2209,
    coverCard: '140', // Ultra Necrozma GX, Secret Rare
  }),
  international('intl:sm5', SM('Ultra Prism'), {
    ...SUN_MOON,
    code: 'UPR',
    expectedCards: 173,
    printedTotal: 156,
    tcgplayerGroup: 2178,
    coverCard: '163', // Dusk Mane Necrozma GX, Secret Rare
  }),
  international('intl:sm4', SM('Crimson Invasion'), {
    ...SUN_MOON,
    code: 'CIN',
    expectedCards: 125,
    printedTotal: 111,
    tcgplayerGroup: 2071,
    coverCard: '112', // Gyarados GX, Secret Rare
  }),
  international('intl:sm3.5', SM('Shining Legends'), {
    ...SUN_MOON,
    code: 'SLG',
    expectedCards: 78,
    printedTotal: 73,
    tcgplayerGroup: 2054,
    coverCard: '40', // Shining Mew
  }),
  international('intl:sm3', SM('Burning Shadows'), {
    ...SUN_MOON,
    code: 'BUS',
    expectedCards: 169,
    printedTotal: 147,
    coverCard: '150', // Charizard-GX, Secret Rare
  }),
  international('intl:sm2', SM('Guardians Rising'), {
    ...SUN_MOON,
    code: 'GRI',
    expectedCards: 169,
    printedTotal: 145,
    tcgplayerGroup: 1919,
    coverCard: '155', // Tapu Lele GX, Secret Rare
  }),
  {
    ...international('intl:sm1', SM('Sun & Moon'), {
      ...SUN_MOON,
      code: 'SUM',
      expectedCards: 172,
      printedTotal: 149,
      tcgplayerGroup: 1863,
      coverCard: '154', // Umbreon GX, Secret Rare
      cardmarket: 1745,
      cardmarketOther: [6697], // the basic Energy 164–172
    }),
    // The basic Energy is numbered after the Secret Rares (164–172).
    section: (localId) =>
      Number(localId) >= 164 ? 'energy' : Number(localId) > 149 ? 'secret' : 'main',
  },
  international('intl:smp', SM('SM Black Star Promos'), {
    ...SUN_MOON,
    name: { de: 'Sonne & Mond Promos', en: 'SM Black Star Promos' },
    code: 'SMP',
    expectedCards: 248,
    coverCard: 'SM60', // Charizard GX
  }),

  // The Base Set, international print (DE/EN).
  international('intl:base1', BASE('Base Set'), {
    series: SERIES.base,
    rareIsHolo: false,
    code: 'BS',
    expectedCards: 102,
    printedTotal: 102,
    printRun: 'unlimited',
    coverCard: '4', // Charizard
  }),

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
  japanese('M6', {
    name: { ja: 'ストームエメラルダ', de: 'Storm Emerald', en: 'Storm Emerald' },
    expectedCards: 113,
    printedTotal: 76,
    // No international print yet; the names come from reprints (NAME_DONORS) and PokéAPI.
    // TCGdex lists every card above 076 as Mega Hyper Rare; the layout every M set shares
    // (12 AR, 18 SR, 6 SAR, 1 MUR) tells them apart (ADR-058).
    rarityRanges: [
      { from: 77, to: 88, rarity: 'illustration-rare' },
      { from: 89, to: 106, rarity: 'ultra-rare' },
      { from: 107, to: 112, rarity: 'special-illustration-rare' },
      { from: 113, to: 113, rarity: 'mega-hyper-rare' },
    ],
    rarityMarks: 'all',
    coverCard: '110', // メガレックウザex SAR
    tcgplayer: 'M6:',
  }),
  // Reprints for the Start Deck 100 (2025) with numbers of their own; no rarities printed.
  japanese('MC', {
    name: {
      ja: 'スタートデッキ100 バトルコレクション',
      de: 'Start Deck 100 Battle Collection',
      en: 'Start Deck 100 Battle Collection',
    },
    expectedCards: 774,
    printedTotal: 742,
    coverCard: '766', // メガリザードンYex
    tcgplayer: 'MC:',
  }),
  // The premium deck set of 30th CELEBRATION (its box: asia:m6a-premium-deck-set).
  japanese('MF', {
    name: {
      ja: '30th CELEBRATION プレミアムデッキセット エーフィ・ブラッキー',
      de: 'Premium-Deckset Psiana & Nachtara',
      en: 'Premium Deck Set Espeon & Umbreon',
    },
    expectedCards: 49,
    printedTotal: 40,
    coverCard: '044', // ブラッキーex
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
