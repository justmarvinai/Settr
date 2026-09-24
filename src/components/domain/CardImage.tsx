import { useState } from 'react';
import { imageCrossOrigin, imageSrc, type ImageSize } from '@/catalog';
import { cn } from '@/components/ui/cn';
import type { CatalogImage } from '@/domain/catalog';

/**
 * A card picture at the printed 63 × 88 ratio (CAT-07). While it loads, and when there is no
 * picture (or TCGdex answers 404, which surfaces as an error because 404s carry no CORS header),
 * a quiet card-shaped placeholder keeps the grid calm. `label` names the missing picture.
 */
export function CardImage({
  image,
  size,
  alt,
  label,
  eager = false,
  className,
}: {
  image: CatalogImage | undefined;
  size: ImageSize;
  alt: string;
  /** Short text in the placeholder, e.g. the card number. */
  label?: string;
  eager?: boolean;
  className?: string;
}) {
  const src = image ? imageSrc(image, size) : undefined;
  const [loaded, setLoaded] = useState<string>();
  const [failed, setFailed] = useState<string>();
  const showImage = src !== undefined && failed !== src;
  return (
    <div
      className={cn(
        'relative aspect-[63/88] w-full overflow-hidden rounded-[4.8%/3.4%] bg-surface-2 shadow-[inset_0_0_0_1px_var(--border)]',
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          width={size === 'small' ? 245 : 600}
          height={size === 'small' ? 337 : 825}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          crossOrigin={imageCrossOrigin(src)}
          onLoad={() => setLoaded(src)}
          onError={() => setFailed(src)}
          className={cn(
            'absolute inset-0 size-full object-cover transition-opacity duration-(--dur-base)',
            loaded === src ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}
      {showImage && loaded !== src ? (
        // A few pulses while the picture loads, then still: lazy pictures far below may never
        // load, and an endless animation keeps a phone (and a CI browser) repainting.
        <div
          aria-hidden
          className="absolute inset-0 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_3] bg-hover"
        />
      ) : null}
      {showImage ? null : (
        <div
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-[8%] text-center"
        >
          <span aria-hidden className="type-label text-ink-subtle">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
