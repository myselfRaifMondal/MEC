/**
 * Detail view for one event: category badge, title, date and place, summary,
 * attributed casualty figures shown side by side, party perspectives and
 * the cited sources.
 */
import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { CATEGORY_COLORS, CATEGORY_LABELS, EVENT_CATEGORIES, type EventCategory, type TimelineEvent } from '../data/types';
import { chapterForEvent } from '../data/loader';
import { actions, formatDate } from '../state/store';
import { chapterEvents, openEvent } from './ChapterPanel';
import { SignificanceDots } from './Legend';

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]';
const H3 = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]';
const NOTE = 'mt-1 text-[12px] leading-snug text-[var(--color-muted)]';
const CELL = 'py-1.5 pr-3 align-top last:pr-0';
const NAV_BTN =
  `flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-md px-2 py-1.5 text-left transition-colors ` +
  `hover:bg-white/5 ${FOCUS}`;

/** Category badge: tinted border and background derived from the category colour (6-digit hex + alpha). */
const BADGE_STYLE: Record<EventCategory, CSSProperties> = Object.fromEntries(
  EVENT_CATEGORIES.map((c) => [
    c,
    { color: CATEGORY_COLORS[c], borderColor: `${CATEGORY_COLORS[c]}66`, backgroundColor: `${CATEGORY_COLORS[c]}1f` },
  ]),
) as Record<EventCategory, CSSProperties>;

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="11"
      height="11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-1 inline-block align-[-1px] opacity-70"
    >
      <path d="M6.5 3.5h-3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" />
      <path d="M9.5 2.5h4v4M13.5 2.5 7.5 8.5" />
    </svg>
  );
}

export interface DetailPanelProps {
  event: TimelineEvent;
}

export default function DetailPanel({ event }: DetailPanelProps) {
  const titleId = useId();
  const casualtiesId = useId();
  const perspectivesId = useId();
  const sourcesId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move keyboard focus to the new heading whenever a different event opens.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [event.id]);

  const chapter = chapterForEvent(event);
  const siblings = chapterEvents(event.era).events;
  const index = siblings.findIndex((e) => e.id === event.id);
  const prev = index > 0 ? siblings[index - 1] : undefined;
  const next = index >= 0 ? siblings[index + 1] : undefined;
  const casualties = event.casualties ?? [];

  return (
    <article data-testid="detail-panel" aria-labelledby={titleId} className="flex flex-col gap-5">
      <div className="-mx-2">
        <button
          type="button"
          data-testid="detail-back"
          aria-label="Back to chapter"
          onClick={() => actions.selectEvent(null)}
          className={`inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-[13px] text-[var(--color-muted)] hover:text-[var(--color-text)] md:min-h-8 ${FOCUS}`}
        >
          <span aria-hidden="true">&larr;</span> Back to chapter
        </button>
      </div>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={BADGE_STYLE[event.category]}
          >
            {CATEGORY_LABELS[event.category]}
          </span>
          {!event.verified && (
            <span
              role="status"
              title="Not confirmed against two independent sources"
              className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-300"
            >
              <span aria-hidden="true">!</span> Unverified
            </span>
          )}
        </div>
        <h2
          id={titleId}
          ref={headingRef}
          tabIndex={-1}
          data-testid="detail-title"
          className={`mt-2 text-[21px] font-semibold leading-snug tracking-tight md:text-[23px] ${FOCUS} rounded`}
        >
          {event.title}
        </h2>
        <p className="mt-1.5 text-[13px] text-[var(--color-muted)]">
          <time dateTime={event.date}>{formatDate(event.date)}</time>
          {event.endDate && (
            <>
              {' – '}
              <time dateTime={event.endDate}>{formatDate(event.endDate)}</time>
            </>
          )}
          <span aria-hidden="true"> &middot; </span>
          <span>{event.location}</span>
        </p>
        <p className="mt-1 flex items-center gap-2 text-[12px] text-[var(--color-muted)]">
          <span>Significance</span>
          <span aria-hidden="true">
            <SignificanceDots value={event.significance} />
          </span>
          <span>{event.significance} of 5</span>
          {chapter && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span className="truncate">{chapter.title}</span>
            </>
          )}
        </p>
      </header>

      {event.image && (
        <figure className="overflow-hidden rounded-md border border-[var(--color-border)]">
          <img
            src={event.image.url}
            alt={event.title}
            loading="lazy"
            decoding="async"
            className="max-h-[200px] w-full object-cover"
          />
          <figcaption className="px-3 py-2 text-[12px] leading-snug text-[var(--color-muted)]">
            {event.image.attribution} &middot; {event.image.license}
          </figcaption>
        </figure>
      )}

      <p className="text-[15px] leading-relaxed">{event.summary}</p>

      {casualties.length > 0 && (
        <section data-testid="casualties" aria-labelledby={casualtiesId}>
          <h3 id={casualtiesId} className={H3}>
            Reported figures
          </h3>
          <div className="mt-1 overflow-x-auto">
            <table className="w-full border-collapse text-[13px] leading-snug">
              <caption className="caption-top pb-2 text-left text-[12px] text-[var(--color-muted)]">
                Figures differ by source; each is shown with its attribution.
              </caption>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
                  <th scope="col" className={`${CELL} font-medium`}>What</th>
                  <th scope="col" className={`${CELL} font-medium`}>Figure</th>
                  <th scope="col" className={`${CELL} font-medium`}>Reported by</th>
                  <th scope="col" className={`${CELL} font-medium`}>Note</th>
                </tr>
              </thead>
              <tbody>
                {casualties.map((c, i) => (
                  <tr key={i} className="border-t border-[var(--color-border)]">
                    <th scope="row" className={`${CELL} text-left font-normal`}>{c.label}</th>
                    <td className={`${CELL} font-semibold tabular-nums`}>{c.value}</td>
                    <td className={CELL}>{c.attribution}</td>
                    <td className={`${CELL} text-[var(--color-muted)]`}>{c.note ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section data-testid="perspectives" aria-labelledby={perspectivesId}>
        <h3 id={perspectivesId} className={H3}>
          Perspectives
        </h3>
        <p className={NOTE}>How the main parties describe this event; listed without endorsement.</p>
        <ul className="mt-3 space-y-3">
          {event.perspectives.map((p, i) => (
            <li key={i} className="border-l-2 border-[var(--color-border)] pl-3 text-[14px] leading-relaxed">
              <strong className="block font-semibold">{p.party}</strong>
              <span>{p.framing}</span>
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="sources" aria-labelledby={sourcesId}>
        <h3 id={sourcesId} className={H3}>
          Sources
        </h3>
        <ol className="mt-2 list-decimal space-y-2.5 pl-5 marker:text-[var(--color-muted)]">
          {event.sources.map((s, i) => (
            <li key={i} className="text-[13px] leading-snug">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded underline decoration-[var(--color-border)] underline-offset-2 hover:decoration-current ${FOCUS}`}
              >
                {s.title}
                <ExternalLinkIcon />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <span className="block text-[12px] text-[var(--color-muted)]">
                {s.publisher} &middot; accessed {formatDate(s.accessedDate)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {(prev || next) && (
        <nav
          aria-label="Neighbouring events in this chapter"
          className="-mx-2 flex items-stretch justify-between gap-2 border-t border-[var(--color-border)] pt-3"
        >
          {prev ? (
            <button
              type="button"
              className={NAV_BTN}
              aria-label={`Previous event: ${prev.title}`}
              onClick={() => openEvent(prev)}
            >
              <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
                <span aria-hidden="true">&larr;</span> Previous
              </span>
              <span className="line-clamp-2 text-[13px] leading-snug">{prev.title}</span>
            </button>
          ) : (
            <span className="flex-1" aria-hidden="true" />
          )}
          {next ? (
            <button
              type="button"
              className={`${NAV_BTN} text-right items-end`}
              aria-label={`Next event: ${next.title}`}
              onClick={() => openEvent(next)}
            >
              <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
                Next <span aria-hidden="true">&rarr;</span>
              </span>
              <span className="line-clamp-2 text-[13px] leading-snug">{next.title}</span>
            </button>
          ) : (
            <span className="flex-1" aria-hidden="true" />
          )}
        </nav>
      )}
    </article>
  );
}
