/**
 * Chapter overview plus the list of verified events in the active chapter.
 *
 * Subscribes to `activeChapterId` and to a derived "events reached" count
 * rather than the raw timestamp, so playback (which changes `time` on every
 * frame) only re-renders this panel when an event boundary is crossed.
 */
import { useId, type CSSProperties } from 'react';
import { CATEGORY_COLORS, CATEGORY_LABELS, EVENT_CATEGORIES, type EventCategory, type TimelineEvent } from '../data/types';
import { eventsForChapter } from '../data/loader';
import {
  DAY_MS,
  actions,
  chapterById,
  chapterForTime,
  chapters,
  formatDate,
  getState,
  isoToTime,
  useAppState,
} from '../state/store';
import { SignificanceDots } from './Legend';

export interface ChapterEvents {
  /** Verified events of the chapter, ascending by date. */
  events: TimelineEvent[];
  /** UTC ms per event, same order as `events`. */
  times: number[];
  /** Pre-formatted dates, same order as `events`. */
  dateLabels: string[];
}

const chapterEventsCache = new Map<string, ChapterEvents>();

/** Date-sorted verified events for a chapter, computed once per chapter id. */
export function chapterEvents(chapterId: string): ChapterEvents {
  const cached = chapterEventsCache.get(chapterId);
  if (cached) return cached;
  const events = eventsForChapter(chapterId)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const entry: ChapterEvents = {
    events,
    times: events.map((e) => isoToTime(e.date)),
    dateLabels: events.map((e) => formatDate(e.date)),
  };
  chapterEventsCache.set(chapterId, entry);
  return entry;
}

/** An event counts as reached on the day it happens (same cutoff as eventsVisibleAt). */
function isReached(eventTime: number, time: number): boolean {
  return eventTime <= time + DAY_MS - 1;
}

/** Events in the chapter dated on or before `time`. Events are date-sorted, so this is a prefix length. */
function reachedCount(chapterId: string, time: number): number {
  const { times } = chapterEvents(chapterId);
  let n = 0;
  while (n < times.length && isReached(times[n] ?? Number.POSITIVE_INFINITY, time)) n += 1;
  return n;
}

/** Select an event; if it lies ahead of the clock, move the clock to it first so the globe catches up. */
export function openEvent(event: TimelineEvent): void {
  if (!isReached(isoToTime(event.date), getState().time)) actions.setDate(event.date);
  actions.selectEvent(event.id);
}

const DIMMED: CSSProperties = { opacity: 0.45 };
const CATEGORY_DOT: Record<EventCategory, CSSProperties> = Object.fromEntries(
  EVENT_CATEGORIES.map((c) => [c, { backgroundColor: CATEGORY_COLORS[c] }]),
) as Record<EventCategory, CSSProperties>;

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]';
const H3 = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]';
const NAV_BTN =
  `inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-[13px] text-[var(--color-muted)] ` +
  `hover:text-[var(--color-text)] disabled:cursor-default disabled:opacity-35 disabled:hover:text-[var(--color-muted)] ` +
  `md:min-h-8 ${FOCUS}`;

export default function ChapterPanel() {
  const chapterId = useAppState((s) => s.activeChapterId);
  const reached = useAppState((s) => reachedCount(s.activeChapterId, s.time));
  const hoveredId = useAppState((s) => s.hoveredEventId);
  const listHeadingId = useId();

  const chapter = chapterById(chapterId) ?? chapterForTime(getState().time);
  const index = chapters.findIndex((c) => c.id === chapter.id);
  const prev = index > 0 ? chapters[index - 1] : undefined;
  const next = index >= 0 ? chapters[index + 1] : undefined;
  const { events, dateLabels } = chapterEvents(chapter.id);
  const paragraphs = chapter.overview
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <nav
        aria-label="Chapters"
        className="-mx-2 flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-1"
      >
        <button
          type="button"
          className={NAV_BTN}
          disabled={!prev}
          aria-label={prev ? `Previous chapter: ${prev.title}` : 'No previous chapter'}
          onClick={() => {
            if (prev) actions.jumpToChapter(prev.id);
          }}
        >
          <span aria-hidden="true">&larr;</span> Previous
        </button>
        <span className={H3}>
          Chapter {index + 1} of {chapters.length}
        </span>
        <button
          type="button"
          className={NAV_BTN}
          disabled={!next}
          aria-label={next ? `Next chapter: ${next.title}` : 'No next chapter'}
          onClick={() => {
            if (next) actions.jumpToChapter(next.id);
          }}
        >
          Next <span aria-hidden="true">&rarr;</span>
        </button>
      </nav>

      <header>
        <h2
          data-testid="chapter-title"
          className="text-[20px] font-semibold leading-snug tracking-tight md:text-[22px]"
        >
          {chapter.title}
        </h2>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          <time dateTime={chapter.start}>{formatDate(chapter.start)}</time>
          {' – '}
          <time dateTime={chapter.end}>{formatDate(chapter.end)}</time>
        </p>
      </header>

      <div className="space-y-3 text-[15px] leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <section aria-labelledby={listHeadingId}>
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border)] pb-2">
          <h3 id={listHeadingId} className={H3}>
            Events in this chapter
          </h3>
          <p className="text-[12px] tabular-nums text-[var(--color-muted)]">
            {reached} of {events.length} events reached
          </p>
        </div>
        {events.length === 0 ? (
          <p className="mt-3 text-[13px] text-[var(--color-muted)]">No verified events in this chapter yet.</p>
        ) : (
          <ul className="-mx-2 mt-1">
            {events.map((e, i) => {
              const reachedNow = i < reached;
              const hasCasualties = !!e.casualties && e.casualties.length > 0;
              const dateLabel = dateLabels[i] ?? formatDate(e.date);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    data-testid="event-list-item"
                    data-event-id={e.id}
                    data-has-casualties={hasCasualties ? 'true' : 'false'}
                    data-reached={reachedNow ? 'true' : 'false'}
                    aria-label={`${e.title}, ${dateLabel}, ${CATEGORY_LABELS[e.category]}${reachedNow ? '' : ' (not yet reached)'}`}
                    className={`flex min-h-11 w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/5 ${
                      hoveredId === e.id ? 'bg-white/5' : ''
                    } ${FOCUS}`}
                    style={reachedNow ? undefined : DIMMED}
                    onClick={() => openEvent(e)}
                    onMouseEnter={() => actions.hoverEvent(e.id)}
                    onMouseLeave={() => actions.hoverEvent(null)}
                    onFocus={() => actions.hoverEvent(e.id)}
                    onBlur={() => actions.hoverEvent(null)}
                  >
                    <span aria-hidden="true" className="mt-[6px] size-2.5 shrink-0 rounded-full" style={CATEGORY_DOT[e.category]} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[12px] text-[var(--color-muted)]">{dateLabel}</span>
                        <SignificanceDots value={e.significance} />
                      </span>
                      <span className="mt-0.5 block text-[14px] leading-snug">{e.title}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
