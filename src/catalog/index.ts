/** Catalog access for the UI: loading, picture URLs and Cardmarket links (ARCHITECTURE.md §4.1). */
export { CatalogLoadError, type LoadedSealed, type LoadedSet } from './api';
export {
  cardmarketProductId,
  cardmarketSearchUrl,
  cardmarketUrl,
  productCardmarketUrl,
  type CardmarketFilters,
} from './cardmarket';
export { imageCrossOrigin, imageSrc, setArtSrc, type ImageSize } from './images';
export {
  manifestQuery,
  sealedQuery,
  searchDocsQuery,
  setQuery,
  useCatalogSet,
  useManifest,
  useSealed,
} from './queries';
