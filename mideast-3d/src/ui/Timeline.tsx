/**
 * Timeline scrubber (bottom bar).
 *
 * - Play/pause + speed + current date + active chapter title.
 * - A range slider on a *warped* scale: each chapter occupies a share of the
 *   track proportional to sqrt(chapter length in days), so the recent, short
 *   chapters stay usable on a 109-year scope. `timeToPosition` and
 *   `positionToTime` convert between UTC ms and slider units [0, SLIDER_MAX].
 * - A strip of chapter marker buttons above the slider and year labels below.
 * - The playback clock (requestAnimationFrame -> actions.tick) lives here.
 *
 * Everything is derived from the store; there is no local copy of `time`.
 */
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';
import { events } from '../data/loader';
import type { Chapter } from '../data/types';
import {
  DAY_MS,
  SCOPE_END_TIME,
  SCOPE_START_TIME,
  SPEED_OPTIONS,
  actions,
  chapters,
  clampTime,
  formatDate,
  getState,
  isoToTime,
  useAppState,
} from '../state/store';

/* ------------------------------------------------------------------ */
/* Warped scale                                                        */
/* ------------------------------------------------------------------ */

/** Slider units. The range input runs from 0 to SLIDER_MAX. */
export const SLIDER_MAX = 10_000;

interface Segment {
  /** Start / end of the segment in UTC ms. */
  t0: number;
  t1: number;
  /** Start / end of the segment in slider units. */
  p0: number;
  p1: number;
}

/**
 * Piecewise-linear segments computed once from chapters.json. Breakpoints are
 * the scope ends plus every chapter start and (exclusive) chapter end, so gaps
 * between chapters become their own segments and the mapping never depends on
 * chapters being contiguous.
 */
function buildSegments(): Segment[] {
  const cuts = new Set<number>([SCOPE_START_TIME, SCOPE_END_TIME]);
  for (const c of chapters) {
    cuts.add(clampTime(isoToTime(c.start)));
    cuts.add(clampTime(isoToTime(c.end) + DAY_MS));
  }
  const bps = [...cuts].sort((a, b) => a - b);

  const weights: number[] = [];
  let total = 0;
  for (let i = 0; i + 1 < bps.length; i++) {
    const w = Math.sqrt(((bps[i + 1] ?? 0) - (bps[i] ?? 0)) / DAY_MS);
    weights.push(w);
    total += w;
  }

  const segments: Segment[] = [];
  if (total > 0) {
    let p = 0;
    for (let i = 0; i < weights.length; i++) {
      const t0 = bps[i] ?? SCOPE_START_TIME;
      const t1 = bps[i + 1] ?? SCOPE_END_TIME;
      const p1 = i === weights.length - 1 ? SLIDER_MAX : p + ((weights[i] ?? 0) / total) * SLIDER_MAX;
      segments.push({ t0, t1, p0: p, p1 });
      p = p1;
    }
  }
  if (segments.length === 0) {
    segments.push({ t0: SCOPE_START_TIME, t1: SCOPE_END_TIME, p0: 0, p1: SLIDER_MAX });
  }
  return segments;
}

const SEGMENTS: Segment[] = buildSegments();

/** UTC ms -> slider units [0, SLIDER_MAX] on the warped scale. */
export function timeToPosition(time: number): number {
  const t = clampTime(time);
  for (const s of SEGMENTS) {
    if (t <= s.t1) {
      const span = s.t1 - s.t0;
      return span > 0 ? s.p0 + ((t - s.t0) / span) * (s.p1 - s.p0) : s.p0;
    }
  }
  return SLIDER_MAX;
}

/** Slider units [0, SLIDER_MAX] -> UTC ms on the warped scale. */
export function positionToTime(position: number): number {
  const p = Math.min(SLIDER_MAX, Math.max(0, position));
  for (const s of SEGMENTS) {
    if (p <= s.p1) {
      const span = s.p1 - s.p0;
      return clampTime(span > 0 ? s.t0 + ((p - s.p0) / span) * (s.t1 - s.t0) : s.t0);
    }
  }
  return SCOPE_END_TIME;
}

/** Percent of track width for a slider position. */
function toPercent(position: number): number {
  return (position / SLIDER_MAX) * 100;
}

/** Nearest UTC midnight (relative to the scope start, which is a UTC midnight). */
function snapToDay(time: number): number {
  return clampTime(SCOPE_START_TIME + Math.round((time - SCOPE_START_TIME) / DAY_MS) * DAY_MS);
}

/** UTC midnight at or before `time`. */
function dayFloor(time: number): number {
  return SCOPE_START_TIME + Math.floor((clampTime(time) - SCOPE_START_TIME) / DAY_MS) * DAY_MS;
}

/* ------------------------------------------------------------------ */
/* Static geometry (computed once)                                     */
/* ------------------------------------------------------------------ */

interface MarkerGeometry {
  chapter: Chapter;
  /** Left edge / width of the chapter segment in percent of the track. */
  startPct: number;
  widthPct: number;
  year: number;
}

const MARKERS: MarkerGeometry[] = chapters.map((chapter) => {
  const start = clampTime(isoToTime(chapter.start));
  const end = clampTime(isoToTime(chapter.end) + DAY_MS);
  const p0 = timeToPosition(start);
  const p1 = timeToPosition(end);
  return {
    chapter,
    startPct: toPercent(p0),
    widthPct: toPercent(Math.max(0, p1 - p0)),
    year: new Date(start).getUTCFullYear(),
  };
});

const SCOPE_END_YEAR = new Date(SCOPE_END_TIME).getUTCFullYear();

/** Verified, high-significance events shown as tiny ticks on the track. */
const EVENT_TICKS: { id: string; pct: number }[] = events
  .filter((e) => e.significance >= 4)
  .map((e) => ({ id: e.id, pct: toPercent(timeToPosition(isoToTime(e.date))) }));

interface YearLabel {
  key: string;
  pct: number;
  year: number;
  align: 'start' | 'center' | 'end';
}

/** Greedy selection of year labels that do not collide at the given track width. */
function pickYearLabels(trackWidth: number): YearLabel[] {
  const MIN_GAP_PX = 36;
  const out: YearLabel[] = [];
  let lastPx = Number.NEGATIVE_INFINITY;
  let lastYear = Number.NaN;
  for (const m of MARKERS) {
    const px = (m.startPct / 100) * trackWidth;
    if (m.year === lastYear) continue;
    if (px - lastPx < MIN_GAP_PX) continue;
    // Keep clear of the always-visible end label.
    if (m.year === SCOPE_END_YEAR || trackWidth - px < MIN_GAP_PX) continue;
    out.push({ key: m.chapter.id, pct: m.startPct, year: m.year, align: m.startPct <= 0.01 ? 'start' : 'center' });
    lastPx = px;
    lastYear = m.year;
  }
  out.push({ key: 'scope-end', pct: 100, year: SCOPE_END_YEAR, align: 'end' });
  return out;
}

/* ------------------------------------------------------------------ */
/* Range input styling (thumb / track need vendor pseudo-elements)     */
/* ------------------------------------------------------------------ */

const RANGE_CSS = `
.tl-root{--thumb:16px;--tl-h:28px}
@media (pointer:coarse){.tl-root{--thumb:28px;--tl-h:30px}}
.tl-range{-webkit-appearance:none;appearance:none;background:transparent;margin:0;padding:0;height:var(--tl-h);cursor:pointer;outline:none;touch-action:pan-y}
.tl-range::-webkit-slider-runnable-track{height:var(--tl-h);background:transparent;border:0}
.tl-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:var(--thumb);height:var(--thumb);margin-top:calc((var(--tl-h) - var(--thumb)) / 2);border-radius:9999px;background:var(--color-accent);border:2px solid var(--color-bg);box-shadow:0 0 0 1px rgba(245,158,11,.55),0 1px 4px rgba(0,0,0,.6);transition:transform .12s ease,box-shadow .12s ease}
.tl-range::-moz-range-track{height:var(--tl-h);background:transparent;border:0}
.tl-range::-moz-range-thumb{width:var(--thumb);height:var(--thumb);border-radius:9999px;background:var(--color-accent);border:2px solid var(--color-bg);box-shadow:0 0 0 1px rgba(245,158,11,.55),0 1px 4px rgba(0,0,0,.6);transition:transform .12s ease,box-shadow .12s ease}
.tl-range:hover::-webkit-slider-thumb,.tl-range:active::-webkit-slider-thumb{transform:scale(1.1)}
.tl-range:hover::-moz-range-thumb,.tl-range:active::-moz-range-thumb{transform:scale(1.1)}
.tl-range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 4px rgba(245,158,11,.45),0 1px 4px rgba(0,0,0,.6)}
.tl-range:focus-visible::-moz-range-thumb{box-shadow:0 0 0 4px rgba(245,158,11,.45),0 1px 4px rgba(0,0,0,.6)}
`;

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

/** Single requestAnimationFrame loop that advances the store clock while playing. */
function usePlaybackClock(playing: boolean): void {
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number): void => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      actions.tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
}

/** Measured width of the track (px), updated on resize. */
function useTrackWidth(ref: RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = (): void => {
      const w = Math.round(el.getBoundingClientRect().width);
      setWidth((prev) => (prev === w ? prev : w));
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/* ------------------------------------------------------------------ */
/* Sub-components (memoised so per-frame ticks only re-render the date) */
/* ------------------------------------------------------------------ */

const MIN_LABEL_PX = 56;
/** Rough advance width of one uppercase 10px tracking-wide character. */
const LABEL_CHAR_PX = 6.6;
const ACTIVE_BG = 'color-mix(in srgb, var(--color-accent) 14%, transparent)';

const ChapterMarkers = memo(function ChapterMarkers({
  activeChapterId,
  trackWidth,
}: {
  activeChapterId: string;
  trackWidth: number;
}) {
  // The active label may overflow its segment; anchor it to whichever side has
  // room and hide inactive labels it would cover.
  const activeMarker = MARKERS.find((m) => m.chapter.id === activeChapterId);
  let anchorRight = false;
  let activeLabelStart = 0;
  let activeLabelEnd = 0;
  if (activeMarker) {
    const estLabelPx = activeMarker.chapter.title.length * LABEL_CHAR_PX + 8;
    const segStart = (activeMarker.startPct / 100) * trackWidth;
    const segEnd = ((activeMarker.startPct + activeMarker.widthPct) / 100) * trackWidth;
    anchorRight = estLabelPx > trackWidth - segStart && segEnd > trackWidth - segStart;
    activeLabelStart = anchorRight ? segEnd - estLabelPx : segStart;
    activeLabelEnd = anchorRight ? segEnd : segStart + estLabelPx;
  }

  return (
    <div className="relative h-[22px] md:h-7" role="group" aria-label="Chapters">
      {MARKERS.map((m) => {
        const { id, title } = m.chapter;
        const active = id === activeChapterId;
        const segStart = (m.startPct / 100) * trackWidth;
        const segEnd = ((m.startPct + m.widthPct) / 100) * trackWidth;
        const covered = activeMarker !== undefined && segStart < activeLabelEnd && segEnd > activeLabelStart;
        const fits = segEnd - segStart >= MIN_LABEL_PX && !covered;
        const labelClass = active
          ? `pointer-events-none absolute top-1/2 z-10 block -translate-y-1/2 whitespace-nowrap rounded px-1 text-[10px] font-medium uppercase leading-4 tracking-wide text-amber-300 ${
              anchorRight ? 'right-0' : 'left-1'
            }`
          : `pointer-events-none absolute left-1.5 right-0.5 top-1/2 -translate-y-1/2 truncate text-[10px] uppercase leading-4 tracking-wide ${
              fits ? 'hidden md:block' : 'hidden'
            }`;
        return (
          <button
            key={id}
            type="button"
            data-testid={`chapter-marker-${id}`}
            aria-label={title}
            aria-current={active ? 'true' : undefined}
            title={title}
            onClick={() => actions.jumpToChapter(id)}
            className={`absolute inset-y-0 rounded-sm text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-500 ${
              active ? '' : 'hover:bg-white/5'
            }`}
            style={{
              left: `${m.startPct.toFixed(3)}%`,
              width: `${m.widthPct.toFixed(3)}%`,
              background: active ? ACTIVE_BG : undefined,
            }}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute bottom-0 left-0 w-px ${active ? 'h-full bg-amber-500' : 'h-2.5 bg-slate-400/60'}`}
            />
            <span
              aria-hidden="true"
              className={labelClass}
              style={active ? { background: 'var(--color-panel)' } : { color: 'var(--color-muted)' }}
            >
              {title}
            </span>
          </button>
        );
      })}
    </div>
  );
});

const YearLabels = memo(function YearLabels({ trackWidth }: { trackWidth: number }) {
  const labels = useMemo(() => pickYearLabels(trackWidth), [trackWidth]);
  return (
    <div aria-hidden="true" className="pointer-events-none relative h-3 md:h-4">
      {labels.map((l) => (
        <span
          key={l.key}
          className={`absolute top-0 font-mono text-[10px] leading-3 tabular-nums md:leading-4 ${
            l.align === 'start' ? '' : l.align === 'end' ? '-translate-x-full' : '-translate-x-1/2'
          }`}
          style={{ left: `${l.pct.toFixed(3)}%`, color: 'var(--color-muted)' }}
        >
          {l.year}
        </span>
      ))}
    </div>
  );
});

const EventTicks = memo(function EventTicks() {
  if (EVENT_TICKS.length === 0) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {EVENT_TICKS.map((t) => (
        <span
          key={t.id}
          className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-slate-200/40"
          style={{ left: `${t.pct.toFixed(3)}%` }}
        />
      ))}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
      <path d="M6 4.5v11l9-5.5-9-5.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
      <rect x="5" y="4.5" width="3.5" height="11" rx="0.5" />
      <rect x="11.5" y="4.5" width="3.5" height="11" rx="0.5" />
    </svg>
  );
}

function PrevIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
      <rect x="4" y="5" width="2" height="10" rx="0.5" />
      <path d="M15 5v10l-8-5 8-5z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
      <path d="M5 5v10l8-5-8-5z" />
      <rect x="14" y="5" width="2" height="10" rx="0.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

const ICON_BUTTON =
  'shrink-0 items-center justify-center rounded-md border transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent';

export default function Timeline() {
  const time = useAppState((s) => s.time);
  const playing = useAppState((s) => s.playing);
  const speed = useAppState((s) => s.speed);
  const activeChapterId = useAppState((s) => s.activeChapterId);

  usePlaybackClock(playing);

  const trackRef = useRef<HTMLDivElement>(null);
  const trackWidth = useTrackWidth(trackRef);

  const value = Math.round(timeToPosition(time));
  const progressPct = toPercent(value);

  // Format once per day rather than once per frame during playback.
  const dayIndex = Math.floor((time - SCOPE_START_TIME) / DAY_MS);
  const dateLabel = useMemo(() => formatDate(SCOPE_START_TIME + dayIndex * DAY_MS), [dayIndex]);

  const activeIndex = chapters.findIndex((c) => c.id === activeChapterId);
  const activeChapter = chapters[activeIndex];
  const prevChapter = activeIndex > 0 ? chapters[activeIndex - 1] : undefined;
  const nextChapter = activeIndex >= 0 ? chapters[activeIndex + 1] : undefined;

  const onSliderChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    actions.setTime(snapToDay(positionToTime(Number(e.currentTarget.value))));
  }, []);

  const onSliderPointerDown = useCallback(() => {
    if (getState().playing) actions.pause();
  }, []);

  const onSliderKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    const stepDays = (days: number): void => {
      actions.setTime(dayFloor(getState().time) + days * DAY_MS);
    };
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        stepDays(e.shiftKey ? 30 : 1);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        stepDays(e.shiftKey ? -30 : -1);
        break;
      case 'PageUp':
        stepDays(365);
        break;
      case 'PageDown':
        stepDays(-365);
        break;
      case 'Home':
        actions.setTime(SCOPE_START_TIME);
        break;
      case 'End':
        actions.setTime(SCOPE_END_TIME);
        break;
      default:
        return;
    }
    e.preventDefault();
  }, []);

  const onSpeedChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    actions.setSpeed(Number(e.currentTarget.value));
  }, []);

  return (
    <div
      data-testid="timeline"
      className="tl-root w-full select-none border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
    >
      <style href="mideast-timeline-range" precedence="default">
        {RANGE_CSS}
      </style>

      <div className="box-border flex h-[120px] flex-col gap-1 px-3 py-1 md:h-24 md:flex-row md:items-stretch md:gap-5 md:px-4 md:py-2">
        {/* Controls: one row on mobile, a two-line cluster on desktop. */}
        <div className="flex shrink-0 items-center gap-2 md:w-60 md:flex-col md:items-stretch md:justify-center md:gap-1.5 lg:w-64">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="play-toggle"
              aria-label={playing ? 'Pause timeline' : 'Play timeline'}
              aria-pressed={playing}
              onClick={actions.togglePlay}
              className={`${ICON_BUTTON} inline-flex h-11 w-11 md:h-9 md:w-9`}
              style={{
                borderColor: 'var(--color-border)',
                background: playing ? 'color-mix(in srgb, var(--color-accent) 18%, transparent)' : undefined,
                color: playing ? 'var(--color-accent)' : 'var(--color-text)',
              }}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>

            <button
              type="button"
              data-testid="chapter-prev"
              aria-label="Previous chapter"
              title={prevChapter ? prevChapter.title : 'First chapter'}
              disabled={!prevChapter}
              onClick={() => prevChapter && actions.jumpToChapter(prevChapter.id)}
              className={`${ICON_BUTTON} hidden h-9 w-8 md:inline-flex`}
              style={{ borderColor: 'var(--color-border)' }}
            >
              <PrevIcon />
            </button>
            <button
              type="button"
              data-testid="chapter-next"
              aria-label="Next chapter"
              title={nextChapter ? nextChapter.title : 'Last chapter'}
              disabled={!nextChapter}
              onClick={() => nextChapter && actions.jumpToChapter(nextChapter.id)}
              className={`${ICON_BUTTON} hidden h-9 w-8 md:inline-flex`}
              style={{ borderColor: 'var(--color-border)' }}
            >
              <NextIcon />
            </button>

            <select
              data-testid="speed-select"
              aria-label="Playback speed"
              value={speed}
              onChange={onSpeedChange}
              className="h-11 min-w-0 rounded-md border bg-white/5 px-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500 md:h-9 md:flex-1"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              {SPEED_OPTIONS.map((o) => (
                <option key={o.daysPerSecond} value={o.daysPerSecond}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 flex-1 text-right md:flex-none md:text-left">
            <div
              data-testid="current-date"
              className="truncate font-mono text-[13px] font-medium leading-tight tabular-nums md:text-sm"
            >
              {dateLabel}
            </div>
            <div
              data-testid="active-chapter"
              className="truncate text-[11px] leading-tight"
              style={{ color: 'var(--color-muted)' }}
              title={activeChapter?.title}
            >
              {activeChapter?.title ?? ''}
            </div>
          </div>
        </div>

        {/* Track: chapter markers, slider with progress fill and event ticks, year labels. */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div ref={trackRef} className="relative" style={{ marginLeft: 'calc(var(--thumb) / 2)', marginRight: 'calc(var(--thumb) / 2)' }}>
            <ChapterMarkers activeChapterId={activeChapterId} trackWidth={trackWidth} />

            <div className="relative" style={{ height: 'var(--tl-h)' }}>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/10"
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progressPct.toFixed(2)}%`, background: 'var(--color-accent)', opacity: 0.8 }}
                />
              </div>
              <EventTicks />
              <input
                type="range"
                data-testid="timeline-slider"
                aria-label="Timeline date"
                aria-valuetext={dateLabel}
                min={0}
                max={SLIDER_MAX}
                step={1}
                value={value}
                onChange={onSliderChange}
                onPointerDown={onSliderPointerDown}
                onKeyDown={onSliderKeyDown}
                className="tl-range absolute top-0 z-10"
                style={{ left: 'calc(var(--thumb) / -2)', width: 'calc(100% + var(--thumb))' }}
              />
            </div>

            <YearLabels trackWidth={trackWidth} />
          </div>
        </div>
      </div>
    </div>
  );
}
