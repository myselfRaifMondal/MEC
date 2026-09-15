/**
 * Data access layer. Events and chapters are bundled (small JSON); boundary
 * GeoJSON is fetched lazily per chapter and cached.
 */
import eventsJson from './events.json';
import type { BoundaryCollection, BoundaryFeature, Chapter, TimelineEvent, WorldCollection } from './types';
import { chapters, chapterForTime, isoToTime, DAY_MS } from '../state/store';

export { chapters };

/** Every event in the dataset, including unverified ones. */
export const allEvents: TimelineEvent[] = (eventsJson as TimelineEvent[])
  .slice()
  .sort((a, b) => a.date.localeCompare(b.date));

/** Events shown in the default view: verified only. */
export const events: TimelineEvent[] = allEvents.filter((e) => e.verified);

const eventsById = new Map<string, TimelineEvent>(allEvents.map((e) => [e.id, e]));

export function eventById(id: string): TimelineEvent | undefined {
  return eventsById.get(id);
}

export function eventsForChapter(chapterId: string): TimelineEvent[] {
  return events.filter((e) => e.era === chapterId);
}

/** Verified events in the chapter containing `time` whose date is <= time. */
export function eventsVisibleAt(time: number): TimelineEvent[] {
  const chapter = chapterForTime(time);
  const cutoff = time + DAY_MS - 1;
  return events.filter((e) => e.era === chapter.id && isoToTime(e.date) <= cutoff);
}

export function chapterForEvent(e: TimelineEvent): Chapter | undefined {
  return chapters.find((c) => c.id === e.era);
}

/* ------------------------- boundaries ------------------------- */

// Vite resolves each GeoJSON file to a hashed static asset URL; the module
// is only fetched when the chapter is first shown (lazy per era).
const boundaryUrlLoaders = import.meta.glob<string>('./boundaries/*.geojson', {
  query: '?url',
  import: 'default',
});

const boundaryCache = new Map<string, Promise<BoundaryCollection>>();

function urlLoaderFor(basename: string): (() => Promise<string>) | undefined {
  return boundaryUrlLoaders[`./boundaries/${basename}.geojson`];
}

/** Load the boundary FeatureCollection for a chapter id (basename of the geojson file). */
export function loadBoundaries(chapterId: string): Promise<BoundaryCollection> {
  const cached = boundaryCache.get(chapterId);
  if (cached) return cached;
  const loader = urlLoaderFor(chapterId);
  const promise: Promise<BoundaryCollection> = loader
    ? loader()
        .then((url) => fetch(url))
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to load boundaries for ${chapterId}: ${r.status}`);
          return r.json() as Promise<BoundaryCollection>;
        })
    : Promise.resolve({ type: 'FeatureCollection', features: [] });
  boundaryCache.set(chapterId, promise);
  return promise;
}

let worldPromise: Promise<WorldCollection> | null = null;

/** Load the base world outline layer (Natural Earth 110m), once. */
export function loadWorld(): Promise<WorldCollection> {
  if (worldPromise) return worldPromise;
  const loader = urlLoaderFor('world-110m');
  worldPromise = loader
    ? loader()
        .then((url) => fetch(url))
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to load world outlines: ${r.status}`);
          return r.json() as Promise<WorldCollection>;
        })
    : Promise.resolve({ type: 'FeatureCollection', features: [] });
  return worldPromise;
}

/** Features whose [validFrom, validTo] contains the given time. */
export function featuresActiveAt(collection: BoundaryCollection, time: number): BoundaryFeature[] {
  return collection.features.filter(
    (f) => isoToTime(f.properties.validFrom) <= time && time <= isoToTime(f.properties.validTo) + DAY_MS - 1,
  );
}
