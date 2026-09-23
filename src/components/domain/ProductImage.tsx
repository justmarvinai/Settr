import {
  BookOpenIcon,
  CardsIcon,
  CoinIcon,
  CubeIcon,
  CylinderIcon,
  ImageIcon,
  PackageIcon,
  StackIcon,
  StickerIcon,
  type Icon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { imageCrossOrigin, imageSrc, type ImageSize } from '@/catalog';
import { cn } from '@/components/ui/cn';
import type { CatalogImage } from '@/domain/catalog';

const TYPE_ICONS: Record<string, Icon> = {
  'booster-pack': CardsIcon,
  'sleeved-booster': CardsIcon,
  'card-set': CardsIcon,
  tin: CylinderIcon,
  'mini-tin': CylinderIcon,
  deck: StackIcon,
  'coin-set': CoinIcon,
  'figure-collection': CubeIcon,
  'binder-collection': BookOpenIcon,
  'poster-collection': ImageIcon,
  'sticker-collection': StickerIcon,
};

/**
 * Product picture on a square stage (CAT-05). Without a picture (DE/TC/SC packaging has no free
 * source) the placeholder shows the product type's icon (UX_SPEC.md §4.5).
 */
export function ProductImage({
  image,
  type,
  size,
  alt,
  eager = false,
  className,
}: {
  image: CatalogImage | undefined;
  type: string;
  size: ImageSize;
  alt: string;
  eager?: boolean;
  className?: string;
}) {
  const src = image ? imageSrc(image, size) : undefined;
  const [loaded, setLoaded] = useState<string>();
  const [failed, setFailed] = useState<string>();
  const showImage = src !== undefined && failed !== src;
  const TypeIcon = TYPE_ICONS[type] ?? PackageIcon;
  return (
    <div
      className={cn(
        'relative aspect-square w-full overflow-hidden rounded-card bg-surface-2 shadow-[inset_0_0_0_1px_var(--border)]',
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          crossOrigin={imageCrossOrigin(src)}
          onLoad={() => setLoaded(src)}
          onError={() => setFailed(src)}
          className={cn(
            'absolute inset-0 size-full object-contain p-[6%] transition-opacity duration-(--dur-base)',
            loaded === src ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : (
        <div
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
          className="absolute inset-0 flex items-center justify-center text-ink-subtle"
        >
          <TypeIcon size="34%" weight="duotone" aria-hidden />
        </div>
      )}
    </div>
  );
}
