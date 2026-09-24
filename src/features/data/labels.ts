import {
  RECORD_TABLES,
  type BackupCounts,
  type RecordIssue,
  type RecordTable,
} from '@/domain/backup';
import { m } from '@/i18n';
import { formatCount } from '@/i18n/format';

export const counted = (n: number) => ({ n, count: formatCount(n) });

type CountLabel = (inputs: { n: number; count: string }) => string;

const COUNT_LABELS: Record<RecordTable, CountLabel> = {
  holdings: m.count_holdings,
  prices: m.count_prices,
  wishlist: m.count_wishlist,
  tags: m.count_tags,
  locations: m.count_locations,
  customItems: m.count_custom,
  media: m.count_media,
  tombstones: m.count_tombstones,
};

const TABLE_LABELS: Record<RecordIssue['table'], () => string> = {
  holdings: m.table_holdings,
  prices: m.table_prices,
  wishlist: m.table_wishlist,
  tags: m.table_tags,
  locations: m.table_locations,
  customItems: m.table_custom,
  media: m.table_media,
  tombstones: m.table_tombstones,
  overrides: m.table_overrides,
};

/** "312 Positionen · 1.840 Preise · 5 Tags": tables with records; deletions are bookkeeping. */
export function countsSummary(counts: BackupCounts): string {
  return RECORD_TABLES.filter((t) => t !== 'tombstones' && counts[t] > 0)
    .map((t) => COUNT_LABELS[t](counted(counts[t])))
    .join(' · ');
}

/** Records in all tables but the deletions. */
export function liveRecords(counts: BackupCounts): number {
  return RECORD_TABLES.filter((t) => t !== 'tombstones').reduce((n, t) => n + counts[t], 0);
}

/** Where a skipped record sits and what's wrong with it, for the import preview. */
export function issueText(issue: RecordIssue): { where: string; what: string } {
  const where = m.import_issue_where({
    table: TABLE_LABELS[issue.table](),
    index: formatCount(issue.index + 1),
  });
  const reason =
    issue.code === 'duplicate-id'
      ? m.import_issue_duplicate_id()
      : issue.code === 'duplicate-name'
        ? m.import_issue_duplicate_name()
        : (issue.message ?? m.import_issue_invalid());
  return { where, what: issue.field ? `${issue.field}: ${reason}` : reason };
}
