import type { ComponentType } from 'react';
import {
  CardsThreeGlyph,
  ChartLineUpGlyph,
  HouseGlyph,
  SquaresFourGlyph,
  TagGlyph,
  type GlyphProps,
} from '@/components/ui/glyphs';
import { m } from '@/i18n';

export interface NavItem {
  to: '/' | '/collection' | '/catalog' | '/prices' | '/portfolio';
  label: () => string;
  icon: ComponentType<GlyphProps>;
  exact?: boolean;
}

/** Main navigation (Q2.2). Wunschliste appears once I-06 ships. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: m.nav_overview, icon: HouseGlyph, exact: true },
  { to: '/collection', label: m.nav_collection, icon: CardsThreeGlyph },
  { to: '/catalog', label: m.nav_catalog, icon: SquaresFourGlyph },
  { to: '/prices', label: m.nav_prices, icon: TagGlyph },
  { to: '/portfolio', label: m.nav_portfolio, icon: ChartLineUpGlyph },
];

/** Phone tab bar: Übersicht · Sammlung · (＋) · Katalog · Preise (UX_SPEC.md §3.3). */
export const TAB_ITEMS: readonly NavItem[] = NAV_ITEMS.filter((i) => i.to !== '/portfolio');

/** A link in the floating sidebar: a full row on desktop, an icon on the tablet rail. */
export const SIDE_ITEM_CLASS =
  'flex h-11 items-center gap-3 rounded-[14px] px-3 type-ui text-ink-muted transition-colors duration-(--dur-fast) hover:bg-hover hover:text-ink data-[status=active]:bg-accent-soft data-[status=active]:font-extrabold data-[status=active]:text-accent-text max-lg:justify-center max-lg:px-0';
