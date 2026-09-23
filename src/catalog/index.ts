/** Catalog access for the UI: loading, picture URLs and Cardmarket links (ARCHITECTURE.md §4.1). */
export { CatalogLoadError, type LoadedSealed, type LoadedSet } from './api';
export {
  cardmarketFilters,
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
export {
  cardsSearchSchema,
  cardSearchSchema,
  productSearchSchema,
  sealedSearchSchema,
  SET_SORTS,
  setSearchSchema,
  setsSearchSchema,
  type CardsSearch,
  type SealedSearch,
  type SetSearch,
  type SetSort,
} from './search-params';
