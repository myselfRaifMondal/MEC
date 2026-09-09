/**
 * Container for the information panels.
 *
 * >= 768px: a 400px right-hand column above the 96px timeline bar.
 *  < 768px: a bottom sheet above the timeline with two heights driven by
 *           store.panelOpen (collapsed peek / expanded), toggled by a handle.
 *
 * Shows <DetailPanel/> when an event is selected, otherwise <ChapterPanel/>
 * followed by a collapsible <Legend/>.
 */
import { useEffect, useId, useRef, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from 'react';
import { eventById } from '../data/loader';
import { actions, useAppState } from '../state/store';
import ChapterPanel from './ChapterPanel';
import DetailPanel from './DetailPanel';
import Legend from './Legend';

const DESKTOP_QUERY = '(min-width: 768px)';
let desktopMql: MediaQueryList | null = null;

function getDesktopMql(): MediaQueryList | null {
  if (!desktopMql && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    desktopMql = window.matchMedia(DESKTOP_QUERY);
  }
  return desktopMql;
}

function subscribeDesktop(onChange: () => void): () => void {
  const mql = getDesktopMql();
  if (!mql) return () => {};
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function isDesktopSnapshot(): boolean {
  return getDesktopMql()?.matches ?? true;
}

/** True at >= 768px (Tailwind `md`). Matches the CSS breakpoints used below. */
function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, isDesktopSnapshot, () => true);
}

/** Minimum vertical pointer travel on the handle that counts as a swipe rather than a tap. */
const SWIPE_PX = 24;

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)]';

export default function SidePanel() {
  const selectedId = useAppState((s) => s.selectedEventId);
  const panelOpen = useAppState((s) => s.panelOpen);
  const chapterId = useAppState((s) => s.activeChapterId);
  const isDesktop = useIsDesktop();
  const contentId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const swipeStartY = useRef<number | null>(null);
  const swiped = useRef(false);

  const selected = selectedId ? eventById(selectedId) : undefined;

  // Scroll back to the top when the content changes (a different event, or a
  // different chapter while no event is open); never while reading a detail.
  const scrollKey = selected ? `event:${selected.id}` : `chapter:${chapterId}`;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, [scrollKey]);

  const onHandlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    swipeStartY.current = e.clientY;
    swiped.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onHandlePointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const start = swipeStartY.current;
    swipeStartY.current = null;
    if (start === null) return;
    const dy = e.clientY - start;
    if (Math.abs(dy) >= SWIPE_PX) {
      swiped.current = true;
      actions.setPanelOpen(dy < 0);
    }
  };
  const onHandleClick = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    actions.setPanelOpen(!panelOpen);
  };

  return (
    <aside
      data-testid="side-panel"
      aria-label="Information panel"
      className={
        'absolute inset-x-0 bottom-[120px] z-10 flex flex-col rounded-t-xl border-t border-[var(--color-border)] ' +
        'bg-[var(--color-panel)] text-[15px] leading-relaxed text-[var(--color-text)] shadow-[0_-8px_32px_rgba(0,0,0,0.35)] ' +
        'max-h-[calc(100dvh_-_190px)] transition-[height] duration-300 ease-out motion-reduce:transition-none ' +
        (panelOpen ? 'h-[72dvh] ' : 'h-[30dvh] ') +
        'md:inset-x-auto md:top-0 md:right-0 md:bottom-[96px] md:h-auto md:max-h-none md:w-[400px] md:rounded-none ' +
        'md:border-t-0 md:border-l md:shadow-none md:backdrop-blur-md md:transition-none'
      }
    >
      <button
        type="button"
        data-testid="panel-toggle"
        aria-expanded={panelOpen}
        aria-controls={contentId}
        aria-label={panelOpen ? 'Collapse panel' : 'Expand panel'}
        onPointerDown={onHandlePointerDown}
        onPointerUp={onHandlePointerUp}
        onClick={onHandleClick}
        className={`flex h-11 w-full shrink-0 touch-none items-center justify-center rounded-t-xl md:hidden ${FOCUS}`}
      >
        <span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-slate-400/60" />
      </button>

      <div
        id={contentId}
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-1 md:px-5 md:pt-5"
      >
        {selected ? (
          <DetailPanel event={selected} />
        ) : (
          <>
            <ChapterPanel />
            <details
              key={isDesktop ? 'desktop' : 'mobile'}
              open={isDesktop}
              className="mt-6 border-t border-[var(--color-border)] pt-3"
            >
              <summary
                className={`-mx-2 flex min-h-11 cursor-pointer select-none list-none items-center justify-between rounded-md px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)] hover:text-[var(--color-text)] md:min-h-8 ${FOCUS} [&::-webkit-details-marker]:hidden`}
              >
                <span>Legend</span>
                <span aria-hidden="true" className="text-[13px] normal-case tracking-normal">
                  <span className="[details[open]_&]:hidden">Show</span>
                  <span className="hidden [details[open]_&]:inline">Hide</span>
                </span>
              </summary>
              <div className="mt-3">
                <Legend />
              </div>
            </details>
          </>
        )}
      </div>
    </aside>
  );
}
