/**
 * Legend for the globe: event categories (colour), marker size (significance),
 * boundary zones (fills) and boundary lines (strokes).
 *
 * Also exports <SignificanceDots/>, the 1-5 indicator shared by the chapter
 * list and the detail panel, so that encoding is defined in one place.
 */
import { useMemo, type CSSProperties } from 'react';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  EVENT_CATEGORIES,
  LINE_COLORS,
  LINE_LABELS,
  LINE_STYLES,
  ZONE_COLORS,
  ZONE_LABELS,
  ZONE_STYLES,
  type LineStyle,
} from '../data/types';
import { useAppState } from '../state/store';

/** Line styles drawn dashed on the globe: proposals, armistice, occupation and buffer lines. */
const DASHED_LINES: ReadonlySet<LineStyle> = new Set<LineStyle>([
  'armistice',
  'occupation',
  'partition-proposal',
  'buffer',
]);

/** Dot diameters (px) for significance 1..5, echoing the marker radius scale on the globe. */
const SIGNIFICANCE_PX = [6, 8, 10, 12, 14] as const;

const DOT_ON: CSSProperties = { backgroundColor: 'var(--color-text)' };
const DOT_OFF: CSSProperties = { backgroundColor: 'var(--color-muted)', opacity: 0.35 };
const DIMMED: CSSProperties = { opacity: 0.4 };

const H3 = 'mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]';

/** Five small dots, `value` of them filled. Announced as "Significance n of 5". */
export function SignificanceDots({ value, className = '' }: { value: number; className?: string }) {
  const n = Math.min(5, Math.max(1, Math.round(Number.isFinite(value) ? value : 3)));
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-[3px] ${className}`}
      role="img"
      aria-label={`Significance ${n} of 5`}
    >
      {SIGNIFICANCE_PX.map((_, i) => (
        <span key={i} className="size-1.5 rounded-full" style={i < n ? DOT_ON : DOT_OFF} />
      ))}
    </span>
  );
}

export default function Legend() {
  // Styles currently drawn by the boundary layer (if it reported them for this chapter).
  const visibleStyles = useAppState((s) =>
    s.boundaryStatus && s.boundaryStatus.chapterId === s.activeChapterId
      ? s.boundaryStatus.visibleStyles
      : undefined,
  );
  const visibleSet = useMemo(() => (visibleStyles ? new Set(visibleStyles) : null), [visibleStyles]);
  const rowStyle = (style: string): CSSProperties | undefined =>
    visibleSet && !visibleSet.has(style) ? DIMMED : undefined;

  return (
    <div className="flex flex-col gap-5 text-[13px] leading-normal text-[var(--color-text)]">
      <section aria-label="Event categories">
        <h3 className={H3}>Event categories</h3>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {EVENT_CATEGORIES.map((c) => (
            <li key={c} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[c] }}
              />
              <span>{CATEGORY_LABELS[c]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-3 text-[12px] text-[var(--color-muted)]">
          <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-1">
            {SIGNIFICANCE_PX.map((px) => (
              <span
                key={px}
                className="rounded-full bg-[var(--color-muted)]"
                style={{ width: px, height: px }}
              />
            ))}
          </span>
          <span>Marker size shows significance, from local (1) to era-defining (5).</span>
        </p>
      </section>

      <section aria-label="Boundaries">
        <h3 className={H3}>Boundaries</h3>
        <ul className="space-y-1.5">
          {ZONE_STYLES.map((z) => (
            <li key={z} className="flex items-center gap-2" style={rowStyle(z)}>
              <span
                aria-hidden="true"
                className="h-3 w-4 shrink-0 rounded-[3px] border"
                style={{ backgroundColor: `${ZONE_COLORS[z]}8c`, borderColor: ZONE_COLORS[z] }}
              />
              <span>{ZONE_LABELS[z]}</span>
            </li>
          ))}
        </ul>
        <ul className="mt-3 space-y-1.5">
          {LINE_STYLES.map((l) => (
            <li key={l} className="flex items-center gap-2" style={rowStyle(l)}>
              <span
                aria-hidden="true"
                className="inline-block w-4 shrink-0 border-t-2"
                style={{
                  borderTopColor: LINE_COLORS[l],
                  borderTopStyle: DASHED_LINES.has(l) ? 'dashed' : 'solid',
                }}
              />
              <span>{LINE_LABELS[l]}</span>
            </li>
          ))}
        </ul>
        {visibleSet && (
          <p className="mt-3 text-[12px] text-[var(--color-muted)]">
            Dimmed entries are not on the globe at the current date.
          </p>
        )}
        <p className="mt-2 text-[12px] text-[var(--color-muted)]">
          Boundaries marked approximate are simplified renderings; see README for sources.
        </p>
      </section>
    </div>
  );
}
