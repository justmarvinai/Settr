import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from '@phosphor-icons/react';
import { cn } from '@/components/ui/cn';
import type { Money } from '@/domain/money';
import { formatDelta, formatPercent } from '@/i18n/format';

/**
 * Gain or loss with sign, arrow and color, never color alone (DESIGN_SYSTEM.md §8, QUALITY.md §5):
 * `↗ +12,30 € (+14,6 %)`. The percentage reads "—" when there is no cost basis (DATA_MODEL.md §6.4).
 */
export function PLDelta({
  delta,
  ratio,
  showRatio = true,
  className,
}: {
  delta: Money;
  ratio?: number | undefined;
  showRatio?: boolean;
  className?: string;
}) {
  const sign = Math.sign(delta.minor);
  const Arrow = sign > 0 ? ArrowUpRightIcon : sign < 0 ? ArrowDownRightIcon : ArrowRightIcon;
  return (
    <span
      className={cn(
        'money inline-flex items-center gap-1 font-bold whitespace-nowrap tabular-nums',
        sign > 0 ? 'text-gain' : sign < 0 ? 'text-loss' : 'text-ink-muted',
        className,
      )}
    >
      <Arrow size={14} weight="bold" aria-hidden className="shrink-0" />
      {formatDelta(delta)}
      {showRatio ? <span className="font-semibold">({formatPercent(ratio)})</span> : null}
    </span>
  );
}
