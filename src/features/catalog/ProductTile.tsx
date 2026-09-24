import { Link } from '@tanstack/react-router';
import { ProductImage } from '@/components/domain/ProductImage';
import { pickText, type CatalogProduct } from '@/domain/catalog';
import type { CardLanguage } from '@/domain/catalog-types';
import { languageCode, productTypeLabel } from '@/i18n';

/** Grid tile of a sealed product (CAT-05): picture or type icon, name, type and languages. */
export function ProductTile({ product, lang }: { product: CatalogProduct; lang?: CardLanguage }) {
  const imageLang = lang ?? product.languages[0] ?? 'de';
  const image = product.images?.[imageLang] ?? Object.values(product.images ?? {})[0];
  return (
    <Link
      to="/catalog/sealed/$productId"
      params={{ productId: product.id }}
      search={lang ? { lang } : {}}
      data-roving
      className="group flex h-full flex-col gap-2.5 rounded-card outline-offset-4"
    >
      <ProductImage
        image={image}
        type={product.type}
        size="small"
        alt=""
        className="transition-transform duration-(--dur-fast) group-hover:-translate-y-0.5"
      />
      <div className="flex min-w-0 flex-col gap-1 px-0.5">
        <span className="type-label text-ink-muted">{productTypeLabel(product.type)}</span>
        <span className="type-ui line-clamp-2 text-[14px] text-ink">{pickText(product.name)}</span>
        <span className="font-mono text-[12px] leading-4 text-ink-muted">
          {product.languages.map(languageCode).join(' · ')}
        </span>
      </div>
    </Link>
  );
}
