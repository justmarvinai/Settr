import { z } from '@/lib/zod';
import type { HoldingPatch, NewHolding } from '@/db';
import { pocketsPerPage } from '@/domain/collection';
import {
  CARD_LANGUAGES,
  CONDITIONS,
  GRADING_COMPANIES,
  type CardLanguage,
  type Condition,
  type GradingCompany,
} from '@/domain/catalog-types';
import { money, type Money } from '@/domain/money';
import type { Holding, Location, Settings } from '@/domain/schemas';
import { m } from '@/i18n';
import { formatCount } from '@/i18n/format';
import { formatAmountInput, parseMoneyInput } from '@/i18n/money-input';
import { snapshotOf, type ItemInfo } from '@/features/collection';

/**
 * The add/edit sheet's form (COL-01, COL-02, UX_SPEC.md §4.7): values as typed, validation with
 * German messages, and the conversion to a lot. Money stays text until it's parsed into cents.
 */

export const ACQUISITION_TYPES = ['purchase', 'pull', 'trade', 'gift', 'other'] as const;
export type AcquisitionType = (typeof ACQUISITION_TYPES)[number];
export const SEALED_STATES = ['sealed', 'damaged'] as const;
export type SealedState = (typeof SEALED_STATES)[number];
export const PRICE_MODES = ['unit', 'total'] as const;
export type PriceMode = (typeof PRICE_MODES)[number];

export const MAX_QUANTITY = 9999;

export interface HoldingFormValues {
  language: CardLanguage;
  variant: string;
  condition: Condition;
  sealedState: SealedState;
  quantity: number;
  price: string;
  priceMode: PriceMode;
  date: string;
  source: string;
  acquisitionType: AcquisitionType;
  fees: string;
  locationId: string;
  page: string;
  slot: string;
  graded: boolean;
  gradingCompany: GradingCompany;
  gradingName: string;
  grade: string;
  qualifier: string;
  cert: string;
  tags: string[];
  note: string;
}

/** Last-used values kept per device (kv `ui:add`), so the next lot starts where the last ended. */
export const addPrefsSchema = z
  .object({
    language: z.enum(CARD_LANGUAGES).optional(),
    source: z.string().max(80).optional(),
    locationId: z.string().optional(),
  })
  .catch({});
export type AddPrefs = z.infer<typeof addPrefsSchema>;

function moneyIssue(text: string): string | undefined {
  if (!text.trim()) return undefined;
  const parsed = parseMoneyInput(text);
  if (parsed.ok) return undefined;
  return parsed.error === 'too-many-decimals' ? m.error_price_decimals() : m.error_price_invalid();
}

const wholeNumber = (text: string) => /^\d+$/.test(text.trim()) && Number(text) >= 1;

/** Validation for the sheet; `locations` bound the page and slot of a binder. */
export function holdingFormSchema(today: string, locations: readonly Location[]) {
  return z
    .object({
      language: z.enum(CARD_LANGUAGES),
      variant: z.string(),
      condition: z.enum(CONDITIONS),
      sealedState: z.enum(SEALED_STATES),
      quantity: z
        .number()
        .int({ message: m.error_quantity() })
        .min(1, { message: m.error_quantity() })
        .max(MAX_QUANTITY, { message: m.error_quantity() }),
      price: z.string(),
      priceMode: z.enum(PRICE_MODES),
      date: z.string(),
      source: z.string().max(80),
      acquisitionType: z.enum(ACQUISITION_TYPES),
      fees: z.string(),
      locationId: z.string(),
      page: z.string(),
      slot: z.string(),
      graded: z.boolean(),
      gradingCompany: z.enum(GRADING_COMPANIES),
      gradingName: z.string().max(40),
      grade: z.string().max(20),
      qualifier: z.string().max(40),
      cert: z.string().max(40),
      tags: z.array(z.string()),
      note: z.string().max(2000),
    })
    .superRefine((v, ctx) => {
      const issue = (path: keyof HoldingFormValues, message: string) =>
        ctx.addIssue({ code: 'custom', path: [path], message });
      const price = moneyIssue(v.price);
      if (price) issue('price', price);
      const fees = moneyIssue(v.fees);
      if (fees) issue('fees', fees);
      if (v.date && v.date > today) issue('date', m.error_date_future());
      if (v.page.trim() && !wholeNumber(v.page)) issue('page', m.error_whole_number());
      if (v.slot.trim() && !wholeNumber(v.slot)) issue('slot', m.error_whole_number());
      const binder = locations.find((l) => l.id === v.locationId);
      if (binder?.layout && wholeNumber(v.slot)) {
        const pockets = pocketsPerPage(binder.layout);
        if (Number(v.slot) > pockets) {
          issue('slot', m.error_slot_range({ n: pockets, count: formatCount(pockets) }));
        }
      }
      if (binder?.pages && wholeNumber(v.page) && Number(v.page) > binder.pages) {
        issue('page', m.error_page_range({ n: binder.pages, count: formatCount(binder.pages) }));
      }
      if (v.graded && !v.grade.trim()) issue('grade', m.error_grade_required());
    });
}

const parseAmount = (text: string): number | undefined => {
  const parsed = parseMoneyInput(text);
  return parsed.ok ? parsed.minor : undefined;
};

/** The lot's total price in cents: per-unit prices are multiplied by the quantity. */
export function priceTotalOf(
  v: Pick<HoldingFormValues, 'price' | 'priceMode' | 'quantity'>,
): Money | undefined {
  if (!v.price.trim()) return undefined;
  const minor = parseAmount(v.price);
  if (minor === undefined) return undefined;
  return money(v.priceMode === 'unit' ? minor * v.quantity : minor);
}

function acquisitionOf(v: HoldingFormValues, fromHoldingId?: string): Holding['acquisition'] {
  const acquisition: Holding['acquisition'] = { type: v.acquisitionType };
  if (v.date) acquisition.date = v.date;
  const price = priceTotalOf(v);
  if (price) acquisition.priceTotal = price;
  const fees = v.fees.trim() ? parseAmount(v.fees) : undefined;
  if (fees) acquisition.feesTotal = money(fees);
  if (v.source.trim()) acquisition.source = v.source.trim();
  if (fromHoldingId) acquisition.fromHoldingId = fromHoldingId;
  return acquisition;
}

function locationOf(v: HoldingFormValues): Holding['location'] {
  if (!v.locationId) return undefined;
  const location: NonNullable<Holding['location']> = { id: v.locationId };
  if (wholeNumber(v.page)) location.page = Number(v.page);
  if (wholeNumber(v.slot)) location.slot = Number(v.slot);
  return location;
}

function gradingOf(v: HoldingFormValues): Holding['grading'] {
  if (!v.graded || !v.grade.trim()) return undefined;
  const grading: NonNullable<Holding['grading']> = {
    company: v.gradingCompany,
    grade: v.grade.trim(),
  };
  if (v.gradingCompany === 'other' && v.gradingName.trim())
    grading.companyName = v.gradingName.trim();
  if (v.qualifier.trim()) grading.qualifier = v.qualifier.trim();
  if (v.cert.trim()) grading.cert = v.cert.trim();
  return grading;
}

/** The fields the sheet owns, as a lot patch (unset fields become undefined, i.e. removed). */
export function toPatch(v: HoldingFormValues, info: ItemInfo, current?: Holding): HoldingPatch {
  const card = info.ref.kind === 'card';
  return {
    language: v.language,
    variant: card ? v.variant || undefined : undefined,
    condition: card ? v.condition : undefined,
    grading: card ? gradingOf(v) : undefined,
    sealedState: card ? undefined : v.sealedState,
    quantity: v.quantity,
    acquisition: acquisitionOf(v, current?.acquisition.fromHoldingId),
    location: locationOf(v),
    tags: v.tags,
    note: v.note.trim() || undefined,
    snapshot: snapshotOf(info, v.language),
  };
}

export function toNewHolding(v: HoldingFormValues, info: ItemInfo): NewHolding {
  const patch = toPatch(v, info);
  const holding: NewHolding = {
    item: info.ref,
    snapshot: patch.snapshot ?? snapshotOf(info, v.language),
    language: v.language,
    quantity: v.quantity,
    acquisition: patch.acquisition ?? { type: v.acquisitionType },
    tags: v.tags,
  };
  if (info.setId) holding.setId = info.setId;
  if (info.print) holding.print = info.print;
  if (patch.variant) holding.variant = patch.variant;
  if (patch.condition) holding.condition = patch.condition;
  if (patch.grading) holding.grading = patch.grading;
  if (patch.sealedState) holding.sealedState = patch.sealedState;
  if (patch.location) holding.location = patch.location;
  if (patch.note) holding.note = patch.note;
  return holding;
}

export function defaultValues(
  info: ItemInfo,
  options: {
    language: CardLanguage;
    settings: Pick<Settings, 'defaultCondition'>;
    today: string;
    prefs: AddPrefs;
    locations: readonly Location[];
  },
): HoldingFormValues {
  const location = options.locations.find((l) => l.id === options.prefs.locationId);
  return {
    language: options.language,
    variant: info.variants[0]?.id ?? '',
    condition: options.settings.defaultCondition,
    sealedState: 'sealed',
    quantity: 1,
    price: '',
    priceMode: 'unit',
    date: options.today,
    source: options.prefs.source ?? '',
    acquisitionType: 'purchase',
    fees: '',
    locationId: location?.id ?? '',
    page: '',
    slot: '',
    graded: false,
    gradingCompany: 'PSA',
    gradingName: '',
    grade: '',
    qualifier: '',
    cert: '',
    tags: [],
    note: '',
  };
}

/** The sheet's values for an existing lot (edit). A lot of several shows its total price. */
export function valuesFromHolding(
  h: Holding,
  info: ItemInfo,
  settings: Pick<Settings, 'defaultCondition'>,
): HoldingFormValues {
  const price = h.acquisition.priceTotal;
  const fees = h.acquisition.feesTotal;
  return {
    language: h.language,
    variant: h.variant ?? info.variants[0]?.id ?? '',
    condition: h.condition ?? settings.defaultCondition,
    sealedState: h.sealedState ?? 'sealed',
    quantity: h.quantity,
    price: price ? formatAmountInput(price) : '',
    priceMode: h.quantity > 1 ? 'total' : 'unit',
    date: h.acquisition.date ?? '',
    source: h.acquisition.source ?? '',
    acquisitionType: h.acquisition.type,
    fees: fees ? formatAmountInput(fees) : '',
    locationId: h.location?.id ?? '',
    page: h.location?.page ? String(h.location.page) : '',
    slot: h.location?.slot ? String(h.location.slot) : '',
    graded: Boolean(h.grading),
    gradingCompany: h.grading?.company ?? 'PSA',
    gradingName: h.grading?.companyName ?? '',
    grade: h.grading?.grade ?? '',
    qualifier: h.grading?.qualifier ?? '',
    cert: h.grading?.cert ?? '',
    tags: h.tags,
    note: h.note ?? '',
  };
}

/** First message of a TanStack Form error list (Standard Schema issues or strings). */
export function errorText(errors: readonly unknown[]): string | undefined {
  for (const error of errors) {
    if (typeof error === 'string' && error) return error;
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }
  }
  return undefined;
}
