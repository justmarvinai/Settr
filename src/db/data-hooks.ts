import { useLiveQuery } from 'dexie-react-hooks';
import type { BackupCounts } from '@/domain/backup';
import { db } from './instance';
import { listSnapshots, snapshotDb, type SnapshotInfo } from './snapshots';

/** Records per user table on this device (Einstellungen › Daten); undefined while loading. */
export function useUserCounts(): BackupCounts | undefined {
  return useLiveQuery(async () => {
    const [holdings, prices, wishlist, tags, locations, customItems, media, tombstones] =
      await Promise.all([
        db.holdings.count(),
        db.prices.count(),
        db.wishlist.count(),
        db.tags.count(),
        db.locations.count(),
        db.customItems.count(),
        db.media.count(),
        db.tombstones.count(),
      ]);
    return { holdings, prices, wishlist, tags, locations, customItems, media, tombstones };
  }, []);
}

/** The safety snapshots, newest first; undefined while loading. */
export function useSnapshots(): SnapshotInfo[] | undefined {
  return useLiveQuery(() => listSnapshots(snapshotDb), []);
}
