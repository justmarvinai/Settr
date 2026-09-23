import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { m } from '@/i18n';
import { CHART_RANGES, type ChartRange } from './scale';

const RANGE_LABELS: Record<ChartRange, () => string> = {
  '1m': m.chart_range_1m,
  '3m': m.chart_range_3m,
  '6m': m.chart_range_6m,
  '1y': m.chart_range_1y,
  max: m.chart_range_max,
};

/** Range chips `1M · 3M · 6M · 1J · Max` above a chart (DESIGN_SYSTEM.md §9). */
export function RangeChips({
  value,
  onChange,
}: {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
}) {
  return (
    <SegmentedControl<ChartRange>
      label={m.chart_range()}
      value={value}
      onValueChange={onChange}
      options={CHART_RANGES.map((r) => ({ value: r, label: RANGE_LABELS[r]() }))}
      className="[&>*]:h-8 [&>*]:min-w-10 [&>*]:px-3"
    />
  );
}
