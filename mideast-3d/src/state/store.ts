/**
 * Minimal external store for app state (no third-party state library).
 * Components subscribe with `useAppState(selector)`.
 */
import { useSyncExternalStore } from 'react';
import chaptersJson from '../data/chapters.json';
import type { Chapter } from '../data/types';
import { SCOPE_END, SCOPE_START } from '../data/types';

export const chapters: Chapter[] = chaptersJson as Chapter[];

export const DAY_MS = 86_400_000;

/** Parse an ISO date (YYYY-MM-DD) to a UTC timestamp in ms. */
export function isoToTime(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Format a UTC timestamp as YYYY-MM-DD. */
export function timeToIso(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** Human-readable date, e.g. "2 November 1917". */
export function formatDate(isoOrTime: string | number): string {
  const t = typeof isoOrTime === 'number' ? isoOrTime : isoToTime(isoOrTime);
  return new Date(t).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const SCOPE_START_TIME = isoToTime(SCOPE_START);
export const SCOPE_END_TIME = isoToTime(SCOPE_END);

export function clampTime(t: number): number {
  return Math.min(SCOPE_END_TIME, Math.max(SCOPE_START_TIME, t));
}

/** Chapter whose [start, end] range contains the timestamp (falls back to nearest). */
export function chapterForTime(time: number): Chapter {
  const first = chapters[0];
  if (!first) throw new Error('chapters.json is empty');
  for (const c of chapters) {
    if (time >= isoToTime(c.start) && time <= isoToTime(c.end) + DAY_MS - 1) return c;
  }
  return time < isoToTime(first.start) ? first : (chapters[chapters.length - 1] ?? first);
}

export function chapterById(id: string): Chapter | undefined {
  return chapters.find((c) => c.id === id);
}

/** Playback speeds in simulated days per real-time second. */
export const SPEED_OPTIONS: { label: string; daysPerSecond: number }[] = [
  { label: '1 week / s', daysPerSecond: 7 },
  { label: '1 month / s', daysPerSecond: 30 },
  { label: '4 months / s', daysPerSecond: 120 },
  { label: '1 year / s', daysPerSecond: 365 },
];

export interface BoundaryStatus {
  chapterId: string;
  featureCount: number;
  /** Number of features currently visible after validFrom/validTo filtering. */
  visibleCount: number;
  /** Distinct `style` values of the visible features (used by the smoke test and legend). */
  visibleStyles?: string[];
}

export interface AppState {
  /** Current timeline position as a UTC timestamp (ms). */
  time: number;
  playing: boolean;
  /** Simulated days advanced per real-time second while playing. */
  speed: number;
  selectedEventId: string | null;
  hoveredEventId: string | null;
  /** Chapter containing `time`. Derived; kept in state so subscribers re-render only on change. */
  activeChapterId: string;
  /** Set by the boundary layer after it loads/filters a chapter's GeoJSON. Used by tests. */
  boundaryStatus: BoundaryStatus | null;
  /** Whether the side panel / bottom sheet is expanded (mobile) or open (desktop). */
  panelOpen: boolean;
}

const initialChapter = chapterForTime(SCOPE_START_TIME);

let state: AppState = {
  time: SCOPE_START_TIME,
  playing: false,
  speed: 30,
  selectedEventId: null,
  hoveredEventId: null,
  activeChapterId: initialChapter.id,
  boundaryStatus: null,
  // Start collapsed on narrow (phone) viewports so the globe is visible first.
  panelOpen: typeof window === 'undefined' || window.innerWidth >= 768,
};

const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function setState(patch: Partial<AppState>): void {
  const next = { ...state, ...patch };
  if (next.time !== state.time) {
    next.activeChapterId = chapterForTime(next.time).id;
  }
  state = next;
  emit();
}

export function getState(): AppState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook: subscribe to a slice of state. Selector must return a stable primitive/reference. */
export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

/* ---------------------------- actions ---------------------------- */

export const actions = {
  setTime(time: number): void {
    setState({ time: clampTime(time) });
  },
  setDate(iso: string): void {
    setState({ time: clampTime(isoToTime(iso)) });
  },
  play(): void {
    // Restart from the beginning if we are at the very end.
    const time = state.time >= SCOPE_END_TIME ? SCOPE_START_TIME : state.time;
    setState({ playing: true, time });
  },
  pause(): void {
    setState({ playing: false });
  },
  togglePlay(): void {
    if (state.playing) actions.pause();
    else actions.play();
  },
  setSpeed(daysPerSecond: number): void {
    setState({ speed: daysPerSecond });
  },
  /** Advance the clock while playing. Called once per animation frame with elapsed seconds. */
  tick(dtSeconds: number): void {
    if (!state.playing) return;
    const next = state.time + dtSeconds * state.speed * DAY_MS;
    if (next >= SCOPE_END_TIME) {
      setState({ time: SCOPE_END_TIME, playing: false });
    } else {
      setState({ time: next });
    }
  },
  selectEvent(id: string | null): void {
    setState({ selectedEventId: id, panelOpen: id ? true : state.panelOpen });
  },
  hoverEvent(id: string | null): void {
    if (state.hoveredEventId !== id) setState({ hoveredEventId: id });
  },
  /** Jump the timeline to the start of a chapter and clear the selection. */
  jumpToChapter(id: string): void {
    const c = chapterById(id);
    if (!c) return;
    setState({ time: isoToTime(c.start), selectedEventId: null, playing: false });
  },
  setBoundaryStatus(status: BoundaryStatus | null): void {
    setState({ boundaryStatus: status });
  },
  setPanelOpen(open: boolean): void {
    setState({ panelOpen: open });
  },
};

/* --------------------- test / debugging hook --------------------- */

declare global {
  interface Window {
    __mideast?: {
      setDate: (iso: string) => void;
      selectEvent: (id: string | null) => void;
      getState: () => AppState;
    };
  }
}

if (typeof window !== 'undefined') {
  window.__mideast = {
    setDate: actions.setDate,
    selectEvent: actions.selectEvent,
    getState,
  };
}
