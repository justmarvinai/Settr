import { firstRelease, type CatalogSetSummary } from '@/domain/catalog';
import { m } from '@/i18n';
import { formatDate } from '@/i18n/format';

const today = () => new Date().toISOString().slice(0, 10);

/** `Erschienen am 16.09.2026` or, for announced products, `Erscheint am 02.10.2026`. */
export function releaseText(date: string): string {
  return date <= today()
    ? m.catalog_released({ date: formatDate(date) })
    : m.catalog_releases({ date: formatDate(date) });
}

/** One date when all languages share it, else the earliest (the list shows per-language dates). */
export function setReleaseText(set: Pick<CatalogSetSummary, 'releaseDates'>): string {
  const date = firstRelease(set);
  return date ? releaseText(date) : '';
}
