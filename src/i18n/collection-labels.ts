/**
 * German labels for the collection's vocabularies (DATA_MODEL.md §5.2). Apart from labels.ts, which
 * the app shell loads at startup, so they ship with the collection pages.
 */
import type { Condition } from '@/domain/catalog-types';
import { lookup } from './labels';
import { m } from './paraglide/messages.js';

/** Cardmarket's condition scale (Q5.2): `Near Mint`, `Poor (beschädigt)` … */
export const conditionLabel = /* @__PURE__ */ lookup<Condition>({
  MT: m.condition_mt,
  NM: m.condition_nm,
  EX: m.condition_ex,
  GD: m.condition_gd,
  LP: m.condition_lp,
  PL: m.condition_pl,
  PO: m.condition_po,
});

export const acquisitionLabel = /* @__PURE__ */ lookup<
  'purchase' | 'pull' | 'trade' | 'gift' | 'other'
>({
  purchase: m.acquisition_purchase,
  pull: m.acquisition_pull,
  trade: m.acquisition_trade,
  gift: m.acquisition_gift,
  other: m.acquisition_other,
});

export const sealedStateLabel = /* @__PURE__ */ lookup<'sealed' | 'damaged' | 'opened'>({
  sealed: m.sealed_state_sealed,
  damaged: m.sealed_state_damaged,
  opened: m.sealed_state_opened,
});

/** Grading companies are brand names; only "other" is translated. */
export const gradingCompanyLabel = (company: string): string =>
  company === 'other' ? m.grading_other() : company;
