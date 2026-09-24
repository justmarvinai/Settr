import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { manifestQuery } from '@/catalog';
import { db, repairMovedCards, useStaleMovedCards } from '@/db';

/**
 * Keeps the collection's references in step with the catalog: lots of a card that moved to another
 * set follow it (ADR-061), also after an import. Loaded once the collection has lots.
 */
export default function CatalogRepairs() {
  const moved = useQuery(manifestQuery).data?.movedCards;
  const stale = useStaleMovedCards(moved);
  useEffect(() => {
    if (moved && stale) void repairMovedCards(db, moved);
  }, [moved, stale]);
  return null;
}
