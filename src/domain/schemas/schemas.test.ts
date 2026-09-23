import { describe, expect, it } from 'vitest';
import { newId, nowIso } from '../ids';
import {
  DEFAULT_SETTINGS,
  holdingSchema,
  priceEntrySchema,
  remaining,
  resolveSettings,
} from './index';

const base = () => ({ id: newId(), createdAt: nowIso(), updatedAt: nowIso() });

const holding = (overrides: Record<string, unknown> = {}) => ({
  ...base(),
  item: { kind: 'card', id: 'intl:30th:150' },
  setId: 'intl:30th',
  print: 'intl',
  snapshot: { name: 'Pikachu-ex', setName: '30 Jahre', localId: '150' },
  language: 'de',
  variant: 'std',
  condition: 'NM',
  quantity: 2,
  acquisition: {
    type: 'purchase',
    date: '2026-09-22',
    priceTotal: { minor: 17800, currency: 'EUR' },
  },
  disposals: [],
  tags: [],
  mediaIds: [],
  ...overrides,
});

describe('settings', () => {
  it('has the v1 defaults (DATA_MODEL.md §5.9)', () => {
    expect(DEFAULT_SETTINGS.cardLanguages).toEqual(['de', 'en', 'ja', 'zh-cn', 'zh-tw']);
    expect(DEFAULT_SETTINGS.price.defaultType).toBe('from');
    expect(DEFAULT_SETTINGS.price.cardmarket).toEqual({
      sellerCountry: 'DE',
      matchLanguage: true,
      minCondition: 'NM',
    });
    expect(DEFAULT_SETTINGS.display).toEqual({
      theme: 'system',
      reduceTransparency: false,
      motion: 'full',
      colorblindPL: false,
    });
    expect(DEFAULT_SETTINGS.backup.remindAfterDays).toBe(7);
  });

  it('merges partial stored settings with defaults', () => {
    const s = resolveSettings({ display: { theme: 'dark' } });
    expect(s.display.theme).toBe('dark');
    expect(s.display.motion).toBe('full');
    expect(s.price.staleAfterDays).toBe(14);
  });

  it('drops invalid parts instead of failing', () => {
    const s = resolveSettings({ display: { theme: 'neon' }, defaultCardLanguage: 'en' });
    expect(s.display.theme).toBe('system');
    expect(s.defaultCardLanguage).toBe('en');
    expect(resolveSettings('garbage')).toEqual(DEFAULT_SETTINGS);
    expect(resolveSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('holding schema', () => {
  it('accepts a valid lot', () => {
    expect(holdingSchema.safeParse(holding()).success).toBe(true);
  });

  it('rejects fractional quantities, float money and over-disposal', () => {
    expect(holdingSchema.safeParse(holding({ quantity: 1.5 })).success).toBe(false);
    expect(
      holdingSchema.safeParse(
        holding({
          acquisition: { type: 'purchase', priceTotal: { minor: 17.8, currency: 'EUR' } },
        }),
      ).success,
    ).toBe(false);
    const disposals = [{ id: newId(), type: 'sale', date: '2026-09-23', quantity: 3 }];
    expect(holdingSchema.safeParse(holding({ disposals })).success).toBe(false);
  });

  it('computes remaining units', () => {
    expect(remaining({ quantity: 3, disposals: [{ quantity: 1 }, { quantity: 1 }] as never })).toBe(
      1,
    );
  });
});

describe('price entry schema', () => {
  it('requires the language and keeps the lookup context', () => {
    const entry = {
      ...base(),
      seriesKey: 'card|intl:30th:150|de|std|raw',
      item: { kind: 'card', id: 'intl:30th:150' },
      language: 'de',
      variant: 'std',
      grade: 'raw',
      snapshot: { name: 'Pikachu-ex' },
      date: '2026-09-23',
      price: { minor: 9490, currency: 'EUR' },
      priceType: 'from',
      source: 'cardmarket',
      context: { sellerCountry: 'DE', language: 'de', minCondition: 'NM' },
      origin: 'manual',
    };
    expect(priceEntrySchema.safeParse(entry).success).toBe(true);
    expect(priceEntrySchema.safeParse({ ...entry, language: undefined }).success).toBe(false);
  });
});
