import {
  CardsThreeIcon,
  ChartLineUpIcon,
  HouseIcon,
  SquaresFourIcon,
  TagIcon,
  type Icon,
} from '@phosphor-icons/react';
import { m } from '@/i18n';

export interface NavItem {
  to: '/' | '/collection' | '/catalog' | '/prices' | '/portfolio';
  label: () => string;
  icon: Icon;
  exact?: boolean;
}

/** Main navigation (Q2.2). Wunschliste appears once I-06 ships. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: m.nav_overview, icon: HouseIcon, exact: true },
  { to: '/collection', label: m.nav_collection, icon: CardsThreeIcon },
  { to: '/catalog', label: m.nav_catalog, icon: SquaresFourIcon },
  { to: '/prices', label: m.nav_prices, icon: TagIcon },
  { to: '/portfolio', label: m.nav_portfolio, icon: ChartLineUpIcon },
];

/** Phone tab bar: Übersicht · Sammlung · (＋) · Katalog · Preise (UX_SPEC.md §3.3). */
export const TAB_ITEMS: readonly NavItem[] = NAV_ITEMS.filter((i) => i.to !== '/portfolio');
