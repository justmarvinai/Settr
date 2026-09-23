import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { cn } from '@/components/ui/cn';
import {
  closePath,
  linearScale,
  linePath,
  nearestIndex,
  niceTicks,
  stepPath,
  type XY,
} from './scale';

/**
 * A calm SVG time chart (DESIGN_SYSTEM.md §9), hand-written instead of a chart library (ADR-038):
 * hairline gridlines with the y labels on the right, the accent line with an area fill (or a
 * gain/loss tint against a dashed baseline), markers on every observation, thinner comparison
 * lines told apart by dash pattern, and a scrubbing crosshair for pointer, touch and keyboard (a
 * native range input, so screen readers announce each point). The owner shows the readout and
 * offers the same data as a table.
 */

export type MarkerShape = 'circle' | 'square' | 'diamond' | 'triangle' | 'ring';

export interface ChartPoint {
  /** Day number (days since 1970-01-01, UTC). */
  day: number;
  /** The plotted value, e.g. money in minor units. */
  value: number;
  /** Observations are marked (item charts); grid points (portfolio charts) are not. */
  marker?: MarkerShape | undefined;
  /** Stable key, so a point that was just saved can drop in. */
  id?: string | undefined;
}

/** Data-viz palette slots (tokens `--viz-1` … `--viz-8`). */
export type VizColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'neutral';

export interface OtherSeries {
  id: string;
  points: readonly ChartPoint[];
  color: VizColor;
  /** SVG dash pattern, so lines differ without color. */
  dash: string;
}

const STROKE: Record<VizColor, string> = {
  1: 'stroke-viz-1',
  2: 'stroke-viz-2',
  3: 'stroke-viz-3',
  4: 'stroke-viz-4',
  5: 'stroke-viz-5',
  6: 'stroke-viz-6',
  7: 'stroke-viz-7',
  8: 'stroke-viz-8',
  neutral: 'stroke-ink-subtle',
};
const FILL: Record<VizColor, string> = {
  1: 'fill-viz-1',
  2: 'fill-viz-2',
  3: 'fill-viz-3',
  4: 'fill-viz-4',
  5: 'fill-viz-5',
  6: 'fill-viz-6',
  7: 'fill-viz-7',
  8: 'fill-viz-8',
  neutral: 'fill-ink-subtle',
};

export interface TimeChartProps {
  /** First and last visible day (day numbers, inclusive). */
  from: number;
  to: number;
  /**
   * The main series, ascending by day: accent line, area or tint, scrubbed. It may start with one
   * point before `from`, so the line enters from the left edge instead of starting mid-air.
   */
  points: readonly ChartPoint[];
  /** `line` = straight segments between observations; `step` = the value holds until it changes. */
  shape: 'line' | 'step';
  /** Thinner lines on the same axes (other languages, invested capital). */
  others?: readonly OtherSeries[] | undefined;
  /**
   * A dashed reference, e.g. the purchase price; the area above is tinted gain, below loss. The
   * owner names it in its legend.
   */
  baseline?: number | undefined;
  height?: number;
  /** Gridline labels, e.g. `30 €`. */
  formatTick: (value: number) => string;
  /** Start and end labels under the chart. */
  formatDay: (day: number) => string;
  /** The slider's name and what it announces for a point. */
  label: string;
  valueText: (point: ChartPoint) => string;
  /** The scrubbed point (index into `points`), controlled by the owner's readout. */
  active: number | undefined;
  onActiveChange: (index: number | undefined) => void;
  /** Id of a point that was just saved: it drops in (DESIGN_SYSTEM.md §7, moment 5). */
  freshId?: string | undefined;
  className?: string;
}

const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const PAD_LEFT = 6;
/** Room for the y labels on the right: 12 px Geist Mono is about 7.3 px per character. */
const CHAR_WIDTH = 7.3;

function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function Marker({
  shape,
  x,
  y,
  size = 1,
  className,
}: {
  shape: MarkerShape;
  x: number;
  y: number;
  size?: number;
  className?: string;
}) {
  const s = size;
  const body =
    shape === 'square' ? (
      <rect x={-3.6 * s} y={-3.6 * s} width={7.2 * s} height={7.2 * s} rx={1} />
    ) : shape === 'diamond' ? (
      <path d={`M0 ${-5 * s}L${5 * s} 0L0 ${5 * s}L${-5 * s} 0Z`} />
    ) : shape === 'triangle' ? (
      <path d={`M0 ${-5.2 * s}L${4.8 * s} ${3.6 * s}L${-4.8 * s} ${3.6 * s}Z`} />
    ) : (
      <circle r={4.2 * s} />
    );
  return (
    <g transform={`translate(${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10})`}>
      <g className={className}>{body}</g>
    </g>
  );
}

export function TimeChart({
  from,
  to,
  points,
  shape,
  others = [],
  baseline,
  height = 220,
  formatTick,
  formatDay,
  label,
  valueText,
  active,
  onActiveChange,
  freshId,
  className,
}: TimeChartProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useWidth(boxRef);
  const uid = useId().replace(/[^\w-]/g, '');
  const dragging = useRef(false);

  // Only what's on screen sets the y range; a point before `from` is drawn but clipped.
  const inRange = (p: ChartPoint) => p.day >= from && p.day <= to;
  const visible = points.flatMap((p, index) => (inRange(p) ? [{ p, index }] : []));
  const entering = points.findLast((p) => p.day < from);
  const first = visible[0]?.p;
  // Where the line crosses the left edge: interpolated between observations, held for steps.
  const edgeValue =
    entering && first && shape === 'line'
      ? entering.value +
        ((first.value - entering.value) * (from - entering.day)) / (first.day - entering.day)
      : entering?.value;
  const values = [
    ...visible.map((v) => v.p.value),
    ...(edgeValue === undefined ? [] : [edgeValue]),
    ...others.flatMap((o) => o.points.filter(inRange).map((p) => p.value)),
    ...(baseline === undefined ? [] : [baseline]),
  ];
  const { domain, ticks } = values.length
    ? niceTicks(Math.min(...values), Math.max(...values))
    : niceTicks(0, 1000);

  const labelChars = Math.max(...ticks.map((t) => formatTick(t).length));
  const plotRight = Math.max(PAD_LEFT + 40, width - Math.ceil(labelChars * CHAR_WIDTH) - 14);
  const plotBottom = height - PAD_BOTTOM;
  const x = linearScale([from, to], [PAD_LEFT, plotRight]);
  const y = linearScale(domain, [plotBottom, PAD_TOP]);
  const toXY = (p: ChartPoint): XY => [x(p.day), y(p.value)];

  const pathOf = shape === 'step' ? stepPath : linePath;
  /** The last value still holds today: steps run on, lines get a dashed carry-forward. */
  const held = (series: readonly ChartPoint[]): XY | undefined => {
    const last = series.at(-1);
    return last && last.day < to ? [x(to), y(last.value)] : undefined;
  };
  const mainXY = points.map(toXY);
  const mainHeld = held(points);
  const mainPath = pathOf(shape === 'step' && mainHeld ? [...mainXY, mainHeld] : mainXY);
  const lastXY = mainXY.at(-1);
  const carryPath =
    shape === 'line' && mainHeld && lastXY ? linePath([lastXY, mainHeld]) : undefined;
  const fillXY = mainHeld ? [...mainXY, mainHeld] : mainXY;
  const fillPath = pathOf(fillXY);
  const baseY = baseline === undefined ? undefined : y(baseline);

  const visibleDays = visible.map((v) => x(v.p.day));
  const activeVisible = visible.findIndex((v) => v.index === active);
  const current = activeVisible >= 0 ? visible[activeVisible] : undefined;

  const pick = (clientX: number) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || !visible.length) return;
    const at = nearestIndex(visibleDays, clientX - box.left);
    const hit = visible[at];
    if (hit) onActiveChange(hit.index);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') {
      dragging.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    pick(event.clientX);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' || dragging.current) pick(event.clientX);
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.type !== 'pointerleave') return;
    dragging.current = false;
    onActiveChange(undefined);
  };
  const slidePoint = current ?? visible.at(-1);

  let tint: ReactNode = null;
  if (points.length && baseY !== undefined) {
    const area = closePath(fillPath, fillXY, baseY);
    tint = (
      <>
        <path d={area} clipPath={`url(#${uid}-above)`} className="fill-gain-soft" />
        <path d={area} clipPath={`url(#${uid}-below)`} className="fill-loss-soft" />
      </>
    );
  } else if (points.length) {
    tint = <path d={closePath(fillPath, fillXY, plotBottom)} fill={`url(#${uid}-area)`} />;
  }

  return (
    <div
      ref={boxRef}
      className={cn('chart-box relative w-full select-none', className)}
      style={{ height }}
    >
      {width > 0 ? (
        <>
          <svg
            width={width}
            height={height}
            aria-hidden
            className="absolute inset-0 overflow-visible"
          >
            <defs>
              <clipPath id={`${uid}-plot`}>
                <rect x={PAD_LEFT} y={0} width={plotRight - PAD_LEFT} height={plotBottom + 2} />
              </clipPath>
              {baseY !== undefined ? (
                <>
                  <clipPath id={`${uid}-above`}>
                    <rect x={PAD_LEFT} y={0} width={plotRight - PAD_LEFT} height={baseY} />
                  </clipPath>
                  <clipPath id={`${uid}-below`}>
                    <rect
                      x={PAD_LEFT}
                      y={baseY}
                      width={plotRight - PAD_LEFT}
                      height={Math.max(0, plotBottom - baseY)}
                    />
                  </clipPath>
                </>
              ) : (
                <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" style={{ stopColor: 'var(--accent-line)', stopOpacity: 0.2 }} />
                  <stop offset="1" style={{ stopColor: 'var(--accent-line)', stopOpacity: 0 }} />
                </linearGradient>
              )}
            </defs>

            {ticks.map((t) => (
              <line
                key={t}
                x1={PAD_LEFT}
                x2={plotRight}
                y1={y(t)}
                y2={y(t)}
                className="stroke-line"
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
            ))}

            <g clipPath={`url(#${uid}-plot)`}>
              {tint}
              {baseY !== undefined ? (
                <line
                  x1={PAD_LEFT}
                  x2={plotRight}
                  y1={baseY}
                  y2={baseY}
                  className="stroke-ink-subtle"
                  strokeWidth={1.25}
                  strokeDasharray="5 4"
                />
              ) : null}
              {others.map((o) => {
                const xy = o.points.map(toXY);
                const oHeld = shape === 'step' ? held(o.points) : undefined;
                return (
                  <path
                    key={o.id}
                    d={pathOf(oHeld ? [...xy, oHeld] : xy)}
                    fill="none"
                    className={STROKE[o.color]}
                    strokeWidth={1.75}
                    strokeDasharray={o.dash}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                );
              })}
              {carryPath ? (
                <path
                  d={carryPath}
                  fill="none"
                  className="stroke-accent-line opacity-60"
                  strokeWidth={2}
                  strokeDasharray="2 5"
                  strokeLinecap="round"
                />
              ) : null}
              <path
                d={mainPath}
                fill="none"
                className="stroke-accent-line"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
            {others.flatMap((o) =>
              o.points
                .filter(inRange)
                .map((p) =>
                  p.marker ? (
                    <Marker
                      key={`${o.id}-${p.id ?? p.day}`}
                      shape={p.marker}
                      x={x(p.day)}
                      y={y(p.value)}
                      size={0.8}
                      className={cn(
                        'stroke-surface-1 [stroke-width:1.5]',
                        p.marker === 'ring' ? `fill-surface-1 ${STROKE[o.color]}` : FILL[o.color],
                      )}
                    />
                  ) : null,
                ),
            )}
            {visible.map(({ p, index }) =>
              p.marker ? (
                <Marker
                  key={p.id ?? index}
                  shape={p.marker}
                  x={x(p.day)}
                  y={y(p.value)}
                  className={cn(
                    '[stroke-width:2]',
                    p.marker === 'ring'
                      ? 'fill-surface-1 stroke-accent-line'
                      : 'fill-accent-line stroke-surface-1',
                    p.id !== undefined && p.id === freshId && 'chart-drop',
                  )}
                />
              ) : null,
            )}

            {current ? (
              <g>
                <line
                  x1={x(current.p.day)}
                  x2={x(current.p.day)}
                  y1={PAD_TOP - 6}
                  y2={plotBottom}
                  className="stroke-ink-subtle"
                  strokeWidth={1}
                />
                <circle
                  cx={x(current.p.day)}
                  cy={y(current.p.value)}
                  r={6}
                  className="fill-accent-line stroke-surface-1 [stroke-width:2.5]"
                />
              </g>
            ) : null}
          </svg>

          {ticks.map((t) => (
            <span
              key={t}
              aria-hidden
              className="money pointer-events-none absolute right-0 -translate-y-1/2 font-mono text-[12px] leading-none text-ink-subtle tabular-nums"
              style={{ top: y(t) }}
            >
              {formatTick(t)}
            </span>
          ))}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-1 text-[12px] leading-none text-ink-subtle"
            style={{ left: PAD_LEFT }}
          >
            {formatDay(from)}
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-1 text-[12px] leading-none text-ink-subtle"
            style={{ right: width - plotRight }}
          >
            {formatDay(to)}
          </span>

          {slidePoint ? (
            <>
              <div
                aria-hidden
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onPointerLeave={onPointerEnd}
                className="absolute inset-y-0 left-0 cursor-crosshair [touch-action:pan-y]"
                style={{ width: plotRight + 6 }}
              />
              {/* Keyboard and screen readers scrub with a native slider; the box shows its focus. */}
              <input
                type="range"
                min={0}
                max={Math.max(0, visible.length - 1)}
                step={1}
                value={current ? activeVisible : visible.length - 1}
                aria-label={label}
                aria-valuetext={valueText(slidePoint.p)}
                onChange={(event) => onActiveChange(visible[Number(event.target.value)]?.index)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && current) {
                    event.stopPropagation();
                    onActiveChange(undefined);
                  }
                }}
                onBlur={() => onActiveChange(undefined)}
                className="sr-only"
              />
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Legend swatch for a marker shape (price types). */
export function MarkerSwatch({ shape }: { shape: MarkerShape }) {
  return (
    <svg width={14} height={14} viewBox="-7 -7 14 14" aria-hidden className="shrink-0">
      <Marker
        shape={shape}
        x={0}
        y={0}
        size={0.9}
        className={
          shape === 'ring'
            ? 'fill-surface-1 stroke-accent-line [stroke-width:2]'
            : 'fill-accent-line'
        }
      />
    </svg>
  );
}

/** Legend swatch for a line: the accent, a palette color or neutral, with its dash pattern. */
export function LineSwatch({ color, dash }: { color: VizColor | 'accent'; dash?: string }) {
  return (
    <svg width={24} height={10} aria-hidden className="shrink-0">
      <line
        x1={2}
        x2={22}
        y1={5}
        y2={5}
        className={color === 'accent' ? 'stroke-accent-line' : STROKE[color]}
        strokeWidth={2}
        strokeDasharray={dash}
        strokeLinecap="round"
      />
    </svg>
  );
}
