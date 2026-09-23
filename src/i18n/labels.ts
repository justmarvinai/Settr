/**
 * German labels for the catalog vocabularies (DATA_MODEL.md §4.1). Unknown ids (a newer catalog in
 * an older app) are shown as they are instead of failing.
 */
import type { ActiveCardLanguage, Print } from '@/domain/catalog-types';
import type {
  CardCategory,
  CardSection,
  EnergyKind,
  EnergyType,
  ProductExclusive,
  ProductType,
  RarityId,
  StageId,
  TrainerType,
} from '@/domain/catalog';
import { m } from './paraglide/messages.js';

type Labels<K extends string> = Record<K, () => string>;

const lookup = <K extends string>(labels: Labels<K>) => {
  const byId = new Map<string, () => string>(Object.entries<() => string>(labels));
  return (id: string): string => byId.get(id)?.() ?? id;
};

const LANGUAGES: Labels<ActiveCardLanguage> = {
  de: m.language_de,
  en: m.language_en,
  ja: m.language_ja,
  'zh-cn': m.language_zh_cn,
  'zh-tw': m.language_zh_tw,
};
/** `Deutsch`, `Chinesisch (traditionell)` … */
export const languageLabel = /* @__PURE__ */ lookup(LANGUAGES);
/** `DE`, `ZH-TW`: compact language chips. */
export const languageCode = (lang: string): string => lang.toUpperCase();

/**
 * The HTML lang tag for text in a card language: Chinese by script (zh-Hant / zh-Hans), so the right
 * glyph forms and fonts apply (DESIGN_SYSTEM.md §4).
 */
export const htmlLang = (lang: string): string =>
  lang === 'zh-tw' ? 'zh-Hant' : lang === 'zh-cn' ? 'zh-Hans' : lang;

export const printLabel = /* @__PURE__ */ lookup<Print>({ intl: m.print_intl, asia: m.print_asia });

export const rarityLabel = /* @__PURE__ */ lookup<RarityId>({
  common: m.rarity_common,
  uncommon: m.rarity_uncommon,
  rare: m.rarity_rare,
  'double-rare': m.rarity_double_rare,
  'ultra-rare': m.rarity_ultra_rare,
  'illustration-rare': m.rarity_illustration_rare,
  'special-illustration-rare': m.rarity_special_illustration_rare,
  'hyper-rare': m.rarity_hyper_rare,
  'pikachu-rare': m.rarity_pikachu_rare,
  'futuristic-rare': m.rarity_futuristic_rare,
  'rgb-rare': m.rarity_rgb_rare,
  'classic-collection': m.rarity_classic_collection,
  'ace-spec-rare': m.rarity_ace_spec_rare,
  'shiny-rare': m.rarity_shiny_rare,
  promo: m.rarity_promo,
});

export const typeLabel = /* @__PURE__ */ lookup<EnergyType>({
  grass: m.type_grass,
  fire: m.type_fire,
  water: m.type_water,
  lightning: m.type_lightning,
  psychic: m.type_psychic,
  fighting: m.type_fighting,
  darkness: m.type_darkness,
  metal: m.type_metal,
  dragon: m.type_dragon,
  fairy: m.type_fairy,
  colorless: m.type_colorless,
});

export const categoryLabel = /* @__PURE__ */ lookup<CardCategory>({
  pokemon: m.category_pokemon,
  trainer: m.category_trainer,
  energy: m.category_energy,
});

export const stageLabel = /* @__PURE__ */ lookup<StageId>({
  basic: m.stage_basic,
  stage1: m.stage_stage1,
  stage2: m.stage_stage2,
  mega: m.stage_mega,
  break: m.stage_break,
  vmax: m.stage_vmax,
  vstar: m.stage_vstar,
  legend: m.stage_legend,
  'level-up': m.stage_level_up,
  restored: m.stage_restored,
  baby: m.stage_baby,
  'v-union': m.stage_v_union,
});

export const trainerTypeLabel = /* @__PURE__ */ lookup<TrainerType>({
  item: m.trainer_item,
  supporter: m.trainer_supporter,
  stadium: m.trainer_stadium,
  tool: m.trainer_tool,
  'ace-spec': m.trainer_ace_spec,
  'technical-machine': m.trainer_technical_machine,
});

export const energyKindLabel = /* @__PURE__ */ lookup<EnergyKind>({
  basic: m.energy_basic,
  special: m.energy_special,
});

export const sectionLabel = /* @__PURE__ */ lookup<CardSection>({
  main: m.section_main,
  secret: m.section_secret,
  subset: m.section_subset,
  energy: m.section_energy,
  promo: m.section_promo,
});

export const productTypeLabel = /* @__PURE__ */ lookup<ProductType>({
  'booster-pack': m.product_booster_pack,
  'sleeved-booster': m.product_sleeved_booster,
  'booster-display': m.product_booster_display,
  'half-display': m.product_half_display,
  etb: m.product_etb,
  'pc-etb': m.product_pc_etb,
  'booster-bundle': m.product_booster_bundle,
  'blister-1': m.product_blister_1,
  'blister-2': m.product_blister_2,
  'blister-3': m.product_blister_3,
  'checklane-blister': m.product_checklane_blister,
  collection: m.product_collection,
  'premium-collection': m.product_premium_collection,
  'ultra-premium-collection': m.product_ultra_premium_collection,
  'special-collection': m.product_special_collection,
  'figure-collection': m.product_figure_collection,
  tin: m.product_tin,
  'mini-tin': m.product_mini_tin,
  'build-and-battle': m.product_build_and_battle,
  deck: m.product_deck,
  'binder-collection': m.product_binder_collection,
  'poster-collection': m.product_poster_collection,
  'sticker-collection': m.product_sticker_collection,
  'ex-box': m.product_ex_box,
  'jp-box': m.product_jp_box,
  'jp-special-set': m.product_jp_special_set,
  'card-set': m.product_card_set,
  'coin-set': m.product_coin_set,
  other: m.product_other,
});

export const exclusiveLabel = /* @__PURE__ */ lookup<ProductExclusive>({
  'pokemon-center': m.exclusive_pokemon_center,
  retailer: m.exclusive_retailer,
  event: m.exclusive_event,
  lottery: m.exclusive_lottery,
});
