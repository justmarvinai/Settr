import { describe, expect, it } from 'vitest';
import type { CatalogCard } from '../../src/domain/catalog';
import type { BuiltCard, BuiltSet } from './build';
import {
  applyCardmarket,
  carryOverCardmarket,
  type CardmarketIndex,
  type CardmarketProduct,
} from './cardmarket';
import type { SetConfig } from './config';
import { matchCounterparts } from './crossprint';
import { fileNameFor, stableJson } from './emit';
import {
  deriveFromSpecies,
  germanFromEnglish,
  parseJapaneseName,
  simplify,
  type SpeciesNames,
} from './names';
import { finishesByNumber, finishesOf, numberKey, ruleFinishes, type Finish } from './finishes';
import { answers } from './images';
import type { PreviousCatalog } from './previous';
import type { RawSet } from './tcgdex';
import { deriveVariant, isPlainVariant } from './variants';

const species = new Map<number, SpeciesNames>([
  [
    25,
    {
      ja: 'ピカチュウ',
      'ja-kana': 'ピカチュウ',
      de: 'Pikachu',
      en: 'Pikachu',
      'zh-Hant': '皮卡丘',
      'zh-Hans': '皮卡丘',
    },
  ],
  [
    103,
    {
      ja: 'ナッシー',
      'ja-kana': 'ナッシー',
      de: 'Kokowei',
      en: 'Exeggutor',
      'zh-Hant': '椰蛋樹',
      'zh-Hans': '椰蛋树',
    },
  ],
  [
    658,
    {
      ja: 'ゲッコウガ',
      'ja-kana': 'ゲッコウガ',
      de: 'Quajutsu',
      en: 'Greninja',
      'zh-Hant': '甲賀忍蛙',
      'zh-Hans': '甲贺忍蛙',
    },
  ],
  [
    6,
    {
      ja: 'リザードン',
      'ja-kana': 'リザードン',
      de: 'Glurak',
      en: 'Charizard',
      'zh-Hant': '噴火龍',
      'zh-Hans': '喷火龙',
    },
  ],
  [
    154,
    {
      ja: 'メガニウム',
      'ja-kana': 'メガニウム',
      de: 'Meganie',
      en: 'Meganium',
      'zh-Hant': '大竺葵',
      'zh-Hans': '大竺葵',
    },
  ],
  [
    248,
    {
      ja: 'バンギラス',
      'ja-kana': 'バンギラス',
      de: 'Despotar',
      en: 'Tyranitar',
      'zh-Hant': '班基拉斯',
      'zh-Hans': '班基拉斯',
    },
  ],
  [194, { de: 'Felino', en: 'Wooper' }],
  [849, { de: 'Riffex', en: 'Toxtricity' }],
]);

describe('Japanese card names', () => {
  it('splits region, species and suffix', () => {
    expect(parseJapaneseName('アローラ ナッシー')).toMatchObject({
      base: 'ナッシー',
      region: { de: 'Alola-' },
    });
    expect(parseJapaneseName('ピカチュウex')).toMatchObject({
      base: 'ピカチュウ',
      suffix: { en: ' ex' },
    });
    expect(parseJapaneseName('ゲッコウガBREAK')).toMatchObject({
      base: 'ゲッコウガ',
      suffix: { de: ' TURBO' },
    });
  });

  it('derives names only for plain species names', () => {
    expect(deriveFromSpecies('ピカチュウex', [25], species)).toEqual({
      de: 'Pikachu-ex',
      en: 'Pikachu ex',
      'zh-tw': '皮卡丘ex',
    });
    expect(deriveFromSpecies('アローラ ナッシー', [103], species)).toEqual({
      de: 'Alola-Kokowei',
      en: 'Alolan Exeggutor',
      'zh-tw': '阿羅拉 椰蛋樹',
    });
    expect(deriveFromSpecies('ゲッコウガBREAK', [658], species)?.de).toBe('Quajutsu TURBO');
    // "Dark Tyranitar" isn't species + suffix: it must come from a counterpart or curation.
    expect(deriveFromSpecies('わるいバンギラス', [248], species)).toBeNull();
    expect(deriveFromSpecies('ピカチュウ&ゼクロムGX', [25, 644], species)).toBeNull();
  });

  it('derives Mega Evolution names, with X and Y forms, without mistaking メガニウム', () => {
    expect(deriveFromSpecies('メガリザードンXex', [6], species)).toEqual({
      de: 'Mega-Glurak X-ex',
      en: 'Mega Charizard X ex',
      'zh-tw': '超級噴火龍Xex',
    });
    expect(deriveFromSpecies('メガニウム', [154], species)?.en).toBe('Meganium');
    expect(deriveFromSpecies('メガメガニウムex', [154], species)?.de).toBe('Mega-Meganie-ex');
  });

  it('derives German names of international promos TCGdex has none for', () => {
    expect(germanFromEnglish('Paldean Wooper', [194], species)).toBe('Paldea-Felino');
    expect(germanFromEnglish('Toxtricity ex', [849], species)).toBe('Riffex-ex');
    expect(germanFromEnglish('Pikachu', [25], species)).toBe('Pikachu');
    // Anything but [region] + species + [suffix] needs a curated name.
    expect(germanFromEnglish('Pikachu with Grey Felt Hat', [25], species)).toBeNull();
    expect(germanFromEnglish('Special Delivery Charizard', [6], species)).toBeNull();
  });

  it('converts Traditional to Simplified Chinese', () => {
    expect(simplify('超夢ex')).toBe('超梦ex');
    expect(simplify('阿羅拉 椰蛋樹')).toBe('阿罗拉 椰蛋树');
  });
});

const card = (id: string, extra: Partial<CatalogCard>): CatalogCard => ({
  id,
  setId: id.split(':').slice(0, 2).join(':'),
  localId: id.split(':').at(-1) ?? '',
  printedNumber: '',
  section: 'main',
  sort: 1,
  name: { en: id },
  category: 'pokemon',
  variants: [{ id: 'std' }],
  languages: ['en'],
  images: {},
  ...extra,
});

describe('cross-print matching', () => {
  it('pairs same artwork, splits ties in number order and respects curation', () => {
    const intl = [
      card('intl:30th:001', { dexIds: [102], illustrator: 'Nelnal', sort: 1 }),
      card('intl:30th-c:019', {
        dexIds: [491, 488],
        illustrator: 'Shinji Higuchi + Noriko Takaya 樋口 真嗣',
        section: 'subset',
        sort: 16,
      }),
      card('intl:30th-c:020', {
        dexIds: [491, 488],
        illustrator: 'Shinji Higuchi',
        section: 'subset',
        sort: 17,
      }),
      card('intl:30th:128', { category: 'trainer', illustrator: 'Yuka Morii', sort: 128 }),
    ];
    const asia = [
      card('asia:M6a:001', { dexIds: [102], illustrator: 'Nelnal', sort: 1 }),
      card('asia:M6a:152', {
        dexIds: [491, 488],
        illustrator: 'Shinji Higuchi + Noriko Takaya',
        section: 'subset',
        sort: 152,
      }),
      card('asia:M6a:151', {
        dexIds: [491, 488],
        illustrator: 'Shinji Higuchi + Noriko Takaya',
        section: 'subset',
        sort: 151,
      }),
      card('asia:M6a:101', { category: 'trainer', illustrator: 'Yuka Morii', sort: 101 }),
    ];
    const pairs = matchCounterparts(asia, intl, new Map([['asia:M6a:101', 'intl:30th:128']]));
    expect(Object.fromEntries(pairs)).toEqual({
      'asia:M6a:001': 'intl:30th:001',
      'asia:M6a:151': 'intl:30th-c:019',
      'asia:M6a:152': 'intl:30th-c:020',
      'asia:M6a:101': 'intl:30th:128',
    });
  });
});

const trainer = (id: string, extra: Partial<CatalogCard>) =>
  card(id, { category: 'trainer', trainerType: 'supporter', ...extra });

describe('cross-print matching of trainers', () => {
  it('pairs a unique trainer per tier and leaves several Items by one artist for curation', () => {
    const intl = [
      trainer('intl:me01:120', { illustrator: 'Hideki Ishikawa', sort: 120 }),
      trainer('intl:me01:170', { illustrator: 'Hideki Ishikawa', sort: 170, section: 'secret' }),
      trainer('intl:me01:116', { trainerType: 'item', illustrator: 'Toyste Beach', sort: 116 }),
      trainer('intl:me01:124', { trainerType: 'item', illustrator: 'Toyste Beach', sort: 124 }),
    ];
    const asia = [
      trainer('asia:M1L:061', { illustrator: 'Hideki Ishikawa', sort: 61 }),
      trainer('asia:M1L:085', { illustrator: 'Hideki Ishikawa', sort: 85, section: 'secret' }),
      trainer('asia:M1L:058', { trainerType: 'item', illustrator: 'Toyste Beach', sort: 58 }),
      trainer('asia:M1L:059', { trainerType: 'item', illustrator: 'Toyste Beach', sort: 59 }),
    ];
    expect(Object.fromEntries(matchCounterparts(asia, intl, new Map()))).toEqual({
      'asia:M1L:061': 'intl:me01:120',
      'asia:M1L:085': 'intl:me01:170',
    });
  });
});

const deck = (raw: Parameters<typeof deriveVariant>[0]) =>
  deriveVariant(raw, 'test', { deckPrint: true });

const promo = (raw: Parameters<typeof deriveVariant>[0]) =>
  deriveVariant(raw, 'test', { promoHolo: true });

const variant = (raw: Parameters<typeof deriveVariant>[0]) => {
  const { id, kind, label } = deriveVariant(raw, 'test');
  return { id, kind, de: label.de };
};

describe('variants', () => {
  it('reads finishes, patterns and promotional prints', () => {
    expect(variant({ type: 'normal' })).toEqual({ id: 'normal', kind: 'finish', de: 'Normal' });
    expect(variant({ type: 'reverse' })).toEqual({
      id: 'reverse',
      kind: 'finish',
      de: 'Reverse-Holo',
    });
    expect(variant({ type: 'reverse', foil: 'pokeball' })).toEqual({
      id: 'reverse-pokeball',
      kind: 'pattern',
      de: 'Reverse-Holo Pokéball',
    });
    expect(variant({ type: 'holo', foil: 'cosmos' })).toEqual({
      id: 'holo-cosmos',
      kind: 'stamp',
      de: 'Cosmos-Holo',
    });
    expect(variant({ type: 'holo', stamp: ['set-logo', 'staff'] })).toEqual({
      id: 'holo+set-logo+staff',
      kind: 'stamp',
      de: 'Holo · Set-Logo · Staff',
    });
    expect(variant({ type: 'reverse', foil: 'league', stamp: ['30th-pokeday'] })).toEqual({
      id: 'reverse-league+30th-pokeday',
      kind: 'stamp',
      de: 'Liga-Reverse-Holo · Pokémon Day (30 Jahre)',
    });
    expect(variant({ type: 'lenticular', size: 'jumbo' })).toMatchObject({
      id: 'lenticular+jumbo',
      kind: 'stamp',
    });
    expect(variant({ type: 'holo', foil: 'gold' })).toEqual({
      id: 'holo-gold',
      kind: 'finish',
      de: 'Gold-Holo',
    });
  });

  it('keeps the non-holo deck print of a Rare apart from the set', () => {
    expect(deck({ type: 'normal' })).toMatchObject({
      id: 'normal+deck',
      kind: 'stamp',
      label: { de: 'Nicht-Holo (Deck)' },
    });
    // Only the plain non-holo: holos, reverses and stamped prints stay what they are.
    expect(deck({ type: 'holo' }).id).toBe('holo');
    expect(deck({ type: 'reverse' }).id).toBe('reverse');
    expect(deck({ type: 'normal', stamp: ['set-logo'] }).id).toBe('normal+set-logo');
  });

  it('reads the special foils, stamps and cards of older sets', () => {
    // Rainbow Rares are the set's own; Cracked Ice holos and metal cards come in other products.
    expect(variant({ type: 'holo', foil: 'rainbow' })).toEqual({
      id: 'holo-rainbow',
      kind: 'finish',
      de: 'Rainbow-Holo',
    });
    expect(variant({ type: 'holo', foil: 'cracked-ice' })).toMatchObject({
      id: 'holo-cracked-ice',
      kind: 'stamp',
    });
    expect(variant({ type: 'metal', foil: 'gold' })).toEqual({
      id: 'metal-gold',
      kind: 'stamp',
      de: 'Gold-Metallkarte',
    });
    expect(variant({ type: 'normal', stamp: ['worlds-2023', 'top-eight'] })).toEqual({
      id: 'normal+worlds-2023+top-eight',
      kind: 'stamp',
      de: 'Normal · WM 2023 · Top 8',
    });
  });

  it('keeps the holo print of a card packs carry as a non-holo apart', () => {
    expect(promo({ type: 'holo' })).toMatchObject({
      id: 'holo+promo',
      kind: 'stamp',
      label: { de: 'Holo (Promo)' },
    });
    expect(promo({ type: 'normal' }).id).toBe('normal');
    expect(promo({ type: 'holo', foil: 'cosmos' }).id).toBe('holo-cosmos');
  });

  it('counts the pattern prints of a card from another set as promotional', () => {
    // The basic Energy of Karmesin & Purpur got Poké Ball patterns in later products.
    expect(
      deriveVariant({ type: 'reverse', foil: 'pokeball' }, 'test', { extra: true }),
    ).toMatchObject({ id: 'reverse-pokeball', kind: 'stamp' });
    expect(deriveVariant({ type: 'reverse', foil: 'pokeball' }, 'test').kind).toBe('pattern');
  });

  it('reads the subtypes, symbols and prize foils of later sets', () => {
    // Pokémon GO's reverse holos with a Ditto sticker come from its booster packs.
    expect(variant({ type: 'reverse', subtype: 'peelable-ditto' })).toEqual({
      id: 'reverse+peelable-ditto',
      kind: 'pattern',
      de: 'Reverse-Holo · Ditto-Sticker',
    });
    expect(variant({ type: 'normal', subtype: 'blue-border' })).toMatchObject({
      id: 'normal+blue-border',
      kind: 'stamp',
    });
    // My First Battle prints its deck's symbol on every card.
    expect(variant({ type: 'normal', stamp: ['bulbasaur', 'pokeball'] })).toEqual({
      id: 'normal+bulbasaur+pokeball',
      kind: 'stamp',
      de: 'Normal · Bisasam-Symbol · Pokéball-Symbol',
    });
    expect(variant({ type: 'reverse', foil: 'player-reward' })).toMatchObject({
      id: 'reverse-player-reward',
      kind: 'stamp',
    });
    // A print run is no variant of its own; a subtype is.
    expect(isPlainVariant({ type: 'normal', subtype: 'unlimited' })).toBe(true);
    expect(isPlainVariant({ type: 'reverse', subtype: 'peelable-ditto' })).toBe(false);
  });

  it('stops on values it does not know', () => {
    expect(() => deriveVariant({ type: 'holo', foil: 'moonlight' }, 'x:1')).toThrow(
      /unknown variant foil/,
    );
  });
});

describe('finishes of cards without TCGdex variants', () => {
  it("reads TCGplayer's printings per card number, the regular product before promotional ones", () => {
    const products = [
      { productId: 1, name: 'Caterpie', extendedData: [{ name: 'Number', value: '001/149' }] },
      {
        productId: 2,
        name: 'Caterpie (Prerelease)',
        extendedData: [{ name: 'Number', value: '001/149' }],
      },
      {
        productId: 3,
        name: 'Tapu Koko GX',
        extendedData: [{ name: 'Number', value: 'SV93/SV94' }],
      },
      { productId: 4, name: 'Booster Box' },
    ];
    const printings = [
      { productId: 1, subTypeName: 'Reverse Holofoil' },
      { productId: 1, subTypeName: 'Normal' },
      { productId: 2, subTypeName: 'Holofoil' },
      { productId: 3, subTypeName: 'Holofoil' },
      { productId: 4, subTypeName: 'Normal' },
    ];
    expect(finishesByNumber(products, printings)).toEqual(
      new Map([
        ['1', ['normal', 'reverse']],
        ['SV93', ['holo']],
      ]),
    );
    expect(numberKey('63a/111')).toBe('63A');
    expect(numberKey('SV001')).toBe('SV1');
  });

  it('falls back to the last build, then to the rarity rule', () => {
    const config = { id: 'intl:sm1', rareIsHolo: false } as SetConfig;
    const before = card('intl:sm1:2', { variants: [{ id: 'holo' }, { id: 'reverse' }] });
    const lookup = {
      table: new Map([['intl:sm1', new Map<string, Finish[]>([['1', ['normal', 'reverse']]])]]),
      previous: { cards: new Map([[before.id, before]]) } as PreviousCatalog,
    };
    expect(finishesOf(lookup, config, 'intl:sm1:1', '1', 'common')).toEqual({
      finishes: ['normal', 'reverse'],
      source: 'tcgplayer',
    });
    expect(finishesOf(lookup, config, 'intl:sm1:2', '2', 'rare')).toEqual({
      finishes: ['holo', 'reverse'],
      source: 'previous',
    });
    expect(finishesOf(lookup, config, 'intl:sm1:3', '3', 'rare')).toEqual({
      finishes: ['normal', 'reverse'],
      source: 'rule',
    });
    expect(ruleFinishes('ultra-rare', false)).toEqual(['holo']);
    expect(ruleFinishes('rare', true)).toEqual(['holo', 'reverse']);
  });
});

const rawSet: RawSet = {
  id: 'sv01',
  name: { en: 'Scarlet & Violet' },
  serie: { id: 'sv', name: { en: 'Scarlet & Violet' } },
  cardCount: { official: 198 },
  releaseDate: '2023-03-31',
  thirdParty: { cardmarket: 5223 },
};

/** A card of Karmesin & Purpur without Cardmarket ids, as TCGdex has them. */
function unlinked(
  localId: string,
  en: string,
  attacks: string[],
  variants = ['normal', 'reverse'],
) {
  const base = card(`intl:sv01:${localId}`, {
    sort: Number(localId),
    name: { en },
    variants: variants.map((id) => ({ id })),
  });
  const built: BuiltCard = {
    ...base,
    source: {
      set: rawSet,
      localId,
      raw: {
        name: { en },
        category: attacks.length ? 'Pokemon' : 'Trainer',
        attacks: attacks.map((a) => ({ name: { en: a } })),
        set: rawSet,
      },
      variants: [],
    },
  };
  return built;
}

const product = (idProduct: number, name: string, idExpansion = 5223): CardmarketProduct => ({
  idProduct,
  name,
  idExpansion,
});

const svSet = (cards: BuiltCard[]): BuiltSet => ({
  config: { id: 'intl:sv01', print: 'intl', languages: ['de', 'en'] } as SetConfig,
  summary: {} as BuiltSet['summary'],
  raw: rawSet,
  cards,
  legend: new Map(),
});

const productOf = (set: BuiltSet, localId: string, variantId: string) =>
  set.cards.find((c) => c.localId === localId)?.variants.find((v) => v.id === variantId)?.refs
    ?.cardmarket?.default;

describe('Cardmarket products by name', () => {
  it("matches name, attacks and number order in the set's expansion, then its batch of regular prints", () => {
    const set = svSet([
      unlinked('050', 'Pikachu', ['Quick Attack', 'Thunder']),
      unlinked('063', 'Pikachu', ['Thunder Shock']),
      unlinked('166', 'Arven', []),
      unlinked('235', 'Arven', [], ['holo']),
      unlinked('081', 'Miraidon ex', ['Photon Blaster'], ['holo']),
      unlinked('244', 'Miraidon ex', ['Photon Blaster'], ['holo']),
      unlinked('070', 'Rotom', ['Junk Hunt', 'Thunder Shock']),
      unlinked('189', "Professor's Research", []),
      unlinked('190', "Professor's Research", []),
    ]);
    const products = [
      product(690_000, "Professor's Research - Professor Sada"),
      product(690_001, "Professor's Research - Professor Turo"),
      product(700_001, 'Pikachu [Thunder Shock]'),
      product(700_002, 'Pikachu [Quick Attack | Thunder]'),
      product(700_003, 'Rotom [Junk Hunt | Thunder Shock]'),
      product(700_004, "Professor's Research - Professor Sada"),
      product(700_005, "Professor's Research - Professor Turo"),
      product(700_010, 'Arven'),
      product(700_011, 'Arven'),
      product(700_020, 'Miraidon ex [Photon Blaster]'),
      product(700_030, 'Pikachu [Thunder Shock]', 9999),
      // A stamped print, added later under the same name.
      product(700_050, 'Rotom [Junk Hunt | Thunder Shock]'),
    ];
    const cm: CardmarketIndex = {
      singles: new Map(products.map((p) => [p.idProduct, p])),
      nonsingles: new Map(),
    };
    const problems = { errors: [], warnings: [] };
    const report = applyCardmarket([set], cm, [], new Map(), problems);

    expect(productOf(set, '050', 'normal')).toBe(700_002);
    expect(productOf(set, '063', 'normal')).toBe(700_001);
    // The reverse holo is sold on the card's own product.
    expect(productOf(set, '063', 'reverse')).toBe(700_001);
    expect(productOf(set, '166', 'normal')).toBe(700_010);
    expect(productOf(set, '235', 'holo')).toBe(700_011);
    // More products than cards: the batch of regular prints decides.
    expect(productOf(set, '070', 'normal')).toBe(700_003);
    expect(productOf(set, '189', 'normal')).toBe(700_004);
    expect(productOf(set, '190', 'normal')).toBe(700_005);
    // Two prints, one product: left for curation.
    expect(productOf(set, '081', 'holo')).toBeUndefined();
    const [finding] = report.international;
    expect(finding).toMatchObject({ setId: 'intl:sv01', expansion: 5223, byName: 7 });
    expect(finding?.unresolved).toHaveLength(1);
    expect(finding?.unmatched.map((p) => p.idProduct)).toEqual([
      690_000, 690_001, 700_020, 700_050,
    ]);
    expect(problems.warnings).toEqual([]);
  });

  it('keeps the products it found in offline builds', () => {
    const set = svSet([unlinked('063', 'Pikachu', ['Thunder Shock'])]);
    const before = card('intl:sv01:063', {
      variants: [
        { id: 'normal', refs: { cardmarket: { default: 700_001 } } },
        { id: 'reverse', refs: { cardmarket: { default: 700_001 } } },
      ],
    });
    carryOverCardmarket(
      [set],
      {
        manifest: null,
        cards: new Map([[before.id, before]]),
        sets: new Map(),
        products: new Map(),
      },
      new Map(),
    );
    expect(productOf(set, '063', 'reverse')).toBe(700_001);
  });
});

const reply = (status: number, headers: Record<string, string> = {}) =>
  new Response(status === 200 ? 'x' : null, { status, headers });
const noWait = () => Promise.resolve();

describe('picture checks', () => {
  it('tells missing pictures from unanswered checks', async () => {
    expect(await answers('u', () => Promise.resolve(reply(200)), noWait)).toBe('yes');
    expect(await answers('u', () => Promise.resolve(reply(404)), noWait)).toBe('no');
    let calls = 0;
    const throttled = () => Promise.resolve(reply(++calls < 3 ? 429 : 200, { 'retry-after': '2' }));
    expect(await answers('u', throttled, noWait)).toBe('yes');
    expect(calls).toBe(3);
    expect(await answers('u', () => Promise.resolve(reply(503)), noWait)).toBe('unknown');
    expect(await answers('u', () => Promise.reject(new Error('reset')), noWait)).toBe('unknown');
  });
});

describe('output files', () => {
  it('writes one array element per line', () => {
    expect(stableJson({ a: [{ id: 1 }, { id: 2 }], b: ['x', 'y'] })).toBe(
      '{\n  "a": [\n    {"id":1},\n    {"id":2}\n  ],\n  "b": ["x","y"]\n}',
    );
  });

  it('turns set ids into safe file names', () => {
    expect(fileNameFor('intl:30th')).toBe('intl_30th.json');
    expect(fileNameFor('intl:sv03.5')).toBe('intl_sv03.5.json');
  });
});
