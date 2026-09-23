import { ArrowLeftIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { cardmarketSearchUrl, productCardmarketUrl, useManifest, useSealed } from '@/catalog';
import { ProductImage } from '@/components/domain/ProductImage';
import { buttonVariants } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useSettings } from '@/db';
import { pickText } from '@/domain/catalog';
import type { CardLanguage } from '@/domain/catalog-types';
import {
  exclusiveLabel,
  languageCode,
  languageLabel,
  m,
  printLabel,
  productTypeLabel,
} from '@/i18n';
import { formatDate, formatMoney } from '@/i18n/format';
import { cardmarketFilters } from './cardmarket';
import { pickLanguage } from './language';
import { ProductTile } from './ProductTile';

const route = /* @__PURE__ */ getRouteApi('/catalog/sealed/$productId');

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="type-label text-ink-subtle">{label}</dt>
      <dd className="type-ui m-0 text-ink">{children}</dd>
    </div>
  );
}

/**
 * Sealed product detail (CAT-05, UX_SPEC.md §4.5): picture or type placeholder, contents, release
 * dates and MSRP per language, the Cardmarket link and the other designs of the same line.
 */
export function ProductPage() {
  const { productId } = route.useParams();
  const search = route.useSearch();
  const navigate = useNavigate();
  const { products, byId } = useSealed();
  const manifest = useManifest();
  const settings = useSettings();
  const product = byId.get(productId);
  if (!product) return null; // the loader answers 404 first

  const lang = pickLanguage(search.lang, product.languages, settings);
  const image = product.images?.[lang] ?? Object.values(product.images ?? {})[0];
  const name = pickText(product.name);
  const cardmarketHref =
    productCardmarketUrl(product, cardmarketFilters(settings, lang)) ??
    cardmarketSearchUrl(product.name.en ?? name);
  const family = product.family
    ? products.filter((p) => p.family === product.family && p.id !== product.id)
    : [];
  const sets = product.setIds
    .map((id) => manifest.sets.find((s) => s.id === id))
    .filter((s) => s !== undefined);
  const { contents } = product;
  const releases = Object.entries(product.releaseDates ?? {});
  const msrp = Object.entries(product.msrp ?? {});
  const otherNames = [...new Set(Object.values(product.name))].filter((n) => n !== name);
  const imageNote =
    image && image.lang !== lang
      ? m.catalog_product_image_language({ language: languageLabel(image.lang) })
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/catalog/sealed"
        search={{ lang: search.lang }}
        className="inline-flex w-fit items-center gap-1.5 type-small text-ink-muted hover:text-ink"
      >
        <ArrowLeftIcon size={16} weight="bold" aria-hidden />
        {m.catalog_back_to_sealed()}
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start xl:gap-10">
        <div className="flex flex-col gap-2">
          <ProductImage image={image} type={product.type} size="large" alt={name} eager />
          {imageNote ? (
            <p className="type-small m-0 text-center text-ink-muted">{imageNote}</p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <header className="flex flex-col gap-2">
            <span className="type-label text-ink-muted uppercase">
              {[printLabel(product.print), productTypeLabel(product.type)].join(' · ')}
            </span>
            <h2 className="type-display-m m-0 break-words">{name}</h2>
            {otherNames.length ? (
              <p className="type-body m-0 flex flex-wrap gap-x-3 text-ink-muted">
                {otherNames.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </p>
            ) : null}
            {product.exclusive ? (
              <span className="w-fit rounded-pill bg-accent-soft px-3 py-1 type-label text-accent-text">
                {exclusiveLabel(product.exclusive)}
              </span>
            ) : null}
          </header>

          {product.languages.length > 1 ? (
            <SegmentedControl<CardLanguage>
              label={m.catalog_language_label()}
              value={lang}
              onValueChange={(next) =>
                void navigate({
                  to: '/catalog/sealed/$productId',
                  params: { productId },
                  search: { lang: next },
                  replace: true,
                })
              }
              options={product.languages.map((l) => ({ value: l, label: languageCode(l) }))}
            />
          ) : null}

          <Panel className="flex flex-col gap-3 p-5">
            <h3 className="type-h3 m-0">{m.catalog_cardmarket_title()}</h3>
            <p className="type-small m-0 text-ink-muted">
              {product.refs?.cardmarket
                ? m.catalog_cardmarket_filters_sealed({ language: languageLabel(lang) })
                : m.catalog_cardmarket_search_hint()}
            </p>
            <a
              href={cardmarketHref}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline', className: 'w-fit' })}
            >
              {product.refs?.cardmarket
                ? m.catalog_cardmarket_open()
                : m.catalog_cardmarket_search()}
              <ArrowSquareOutIcon size={18} aria-hidden />
              <span className="sr-only">{m.catalog_opens_new_tab()}</span>
            </a>
          </Panel>

          <Panel className="p-5">
            <dl className="m-0 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-6 gap-y-4">
              <Fact label={m.catalog_fact_product_type()}>{productTypeLabel(product.type)}</Fact>
              {contents?.packs ? (
                <Fact label={m.catalog_fact_packs()}>
                  {contents.cardsPerPack
                    ? m.catalog_packs_with_cards({
                        packs: contents.packs,
                        cards: contents.cardsPerPack,
                      })
                    : m.catalog_packs({ packs: contents.packs })}
                </Fact>
              ) : contents?.cardsPerPack ? (
                <Fact label={m.catalog_fact_cards_per_pack()}>{contents.cardsPerPack}</Fact>
              ) : null}
              {contents?.promos?.length ? (
                <Fact label={m.catalog_fact_promos()}>{contents.promos.join(', ')}</Fact>
              ) : null}
              {releases.length ? (
                <Fact label={m.catalog_fact_release()}>
                  {releases
                    .map(([l, date]) => `${languageCode(l)} ${formatDate(date)}`)
                    .join(' · ')}
                </Fact>
              ) : null}
              {msrp.length ? (
                <Fact label={m.catalog_fact_msrp()}>
                  <span className="money">
                    {msrp
                      .map(([l, price]) => `${languageCode(l)} ${formatMoney(price)}`)
                      .join(' · ')}
                  </span>
                </Fact>
              ) : null}
              <Fact label={m.catalog_fact_languages()}>
                {product.languages.map(languageCode).join(' · ')}
              </Fact>
              {sets.length ? (
                <Fact label={m.catalog_fact_set()}>
                  {sets.map((set) => (
                    <Link
                      key={set.id}
                      to="/catalog/sets/$setId"
                      params={{ setId: set.id }}
                      className="mr-2 text-accent-text underline-offset-4 hover:underline"
                    >
                      {pickText(set.name)}
                    </Link>
                  ))}
                </Fact>
              ) : null}
            </dl>
            {contents?.description ? (
              <p className="type-body m-0 mt-4 text-ink-muted">{pickText(contents.description)}</p>
            ) : null}
          </Panel>

          {family.length ? (
            <section aria-labelledby="product-family" className="flex flex-col gap-3">
              <h3 id="product-family" className="type-h3 m-0">
                {m.catalog_product_family()}
              </h3>
              <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4 p-0">
                {family.map((p) => (
                  <li key={p.id}>
                    <ProductTile product={p} lang={search.lang} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="type-small m-0 text-ink-muted">{m.catalog_product_collection_soon()}</p>
        </div>
      </div>
    </div>
  );
}
