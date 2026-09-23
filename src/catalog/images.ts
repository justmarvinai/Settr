import type { CatalogImage } from '@/domain/catalog';

/**
 * The one place that turns catalog picture references into URLs (ARCHITECTURE.md §8.3).
 * TCGdex sends CORS headers, so its pictures load directly (Q8.4); TCGplayer doesn't, so its
 * sealed pictures go through the same-origin proxy /img/tcgp (vercel.json).
 */
export type ImageSize = 'small' | 'large';

const TCGPLAYER = 'https://tcgplayer-cdn.tcgplayer.com/product/';

/** Card pictures: 245×337 (small) or 600×825 (large) WebP; products: 400 px or 1000 px JPEG. */
export function imageSrc(image: CatalogImage, size: ImageSize): string {
  if (image.url.startsWith(TCGPLAYER)) {
    const id = image.url.slice(TCGPLAYER.length);
    return `/img/tcgp/product/${id}${size === 'small' ? '_400w.jpg' : '_in_1000x1000.jpg'}`;
  }
  return `${image.url}/${size === 'small' ? 'low' : 'high'}.webp`;
}

/** Cross-origin pictures load in CORS mode, so the service worker can cache them (§8.1). */
export function imageCrossOrigin(src: string): 'anonymous' | undefined {
  return src.startsWith('https://') ? 'anonymous' : undefined;
}

/** Set logo (per language) and symbol from TCGdex: base URL + extension. */
export function setArtSrc(url: string): string {
  return `${url}.webp`;
}
