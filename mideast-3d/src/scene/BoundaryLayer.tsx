/**
 * Era boundaries: zones (translucent fills + faint outline) and boundary
 * lines (solid or dashed) for the active chapter, filtered by the timeline.
 *
 * - GeoJSON is fetched lazily per chapter through loadBoundaries(); the
 *   fetch never blocks rendering. While a chapter loads, the previously
 *   built layer stays on screen (still time-filtered) to avoid flicker.
 * - Geometry is built once per chapter and cached for the component's
 *   lifetime (12 chapters x a few dozen small features is cheap).
 * - Visibility is re-evaluated only when the UTC day changes, not per frame,
 *   and reported to the store via actions.setBoundaryStatus().
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { DoubleSide, type BufferGeometry } from 'three';
import { featuresActiveAt, loadBoundaries } from '../data/loader';
import type { BoundaryCollection, BoundaryFeature } from '../data/types';
import { DAY_MS, actions, useAppState } from '../state/store';
import {
  computeLineDistances,
  fillGeometry,
  isPolygonal,
  lineColor,
  lineGeometry,
  zoneColor,
} from './geojson';

export const ZONE_FILL_RADIUS = 1.003;
export const BOUNDARY_LINE_RADIUS = 1.004;
export const ZONE_FILL_OPACITY = 0.28;
export const PARTITION_FILL_OPACITY = 0.35;
export const ZONE_OUTLINE_OPACITY = 0.5;
export const BOUNDARY_LINE_OPACITY = 0.9;
/** Line styles rendered with a dash pattern; all others are solid. */
export const DASHED_LINE_STYLES: ReadonlySet<string> = new Set(['armistice', 'occupation', 'partition-proposal', 'buffer']);

const DASH_SIZE = 0.014;
const GAP_SIZE = 0.009;

interface ZoneEntry {
  kind: 'zone';
  key: string;
  feature: BoundaryFeature;
  fill: BufferGeometry;
  outline: BufferGeometry;
  color: string;
  opacity: number;
}

interface LineEntry {
  kind: 'line';
  key: string;
  feature: BoundaryFeature;
  line: BufferGeometry;
  color: string;
  dashed: boolean;
}

type Entry = ZoneEntry | LineEntry;

interface ChapterLayer {
  chapterId: string;
  collection: BoundaryCollection;
  entries: Entry[];
}

const EMPTY_COLLECTION: BoundaryCollection = { type: 'FeatureCollection', features: [] };
const EMPTY_SET: ReadonlySet<BoundaryFeature> = new Set();

function fillOpacityFor(style: string): number {
  return style.startsWith('partition-') ? PARTITION_FILL_OPACITY : ZONE_FILL_OPACITY;
}

function buildEntries(collection: BoundaryCollection): Entry[] {
  const entries: Entry[] = [];
  collection.features.forEach((feature, index) => {
    const { kind, style, name } = feature.properties;
    const key = `${index}:${name}`;
    try {
      if (kind === 'zone' && isPolygonal(feature.geometry)) {
        entries.push({
          kind: 'zone',
          key,
          feature,
          fill: fillGeometry({ geometry: feature.geometry }, ZONE_FILL_RADIUS),
          outline: lineGeometry(feature, ZONE_FILL_RADIUS),
          color: zoneColor(style),
          opacity: fillOpacityFor(style),
        });
      } else {
        // Lines, and zones whose geometry is not fillable (degrade to an outline).
        const line = lineGeometry(feature, BOUNDARY_LINE_RADIUS);
        const dashed = kind === 'line' && DASHED_LINE_STYLES.has(style);
        if (dashed) computeLineDistances(line);
        entries.push({
          kind: 'line',
          key,
          feature,
          line,
          color: kind === 'line' ? lineColor(style) : zoneColor(style),
          dashed,
        });
      }
    } catch (err) {
      console.warn(`[BoundaryLayer] skipping feature "${name}"`, err);
    }
  });
  return entries;
}

function disposeLayer(layer: ChapterLayer): void {
  for (const e of layer.entries) {
    if (e.kind === 'zone') {
      e.fill.dispose();
      e.outline.dispose();
    } else {
      e.line.dispose();
    }
  }
}

export default function BoundaryLayer() {
  const chapterId = useAppState((s) => s.activeChapterId);
  // Start of the current UTC day: changes at most once per simulated day.
  const dayStart = useAppState((s) => Math.floor(s.time / DAY_MS) * DAY_MS);

  const cacheRef = useRef<Map<string, ChapterLayer>>(new Map());
  const [layer, setLayer] = useState<ChapterLayer | null>(null);

  // Load (or reuse) the chapter's boundaries. Never blocks rendering.
  useEffect(() => {
    let cancelled = false;
    const cached = cacheRef.current.get(chapterId);
    if (cached) {
      setLayer(cached);
      return () => {
        cancelled = true;
      };
    }
    loadBoundaries(chapterId)
      .then((collection) => {
        if (cancelled) return;
        let built = cacheRef.current.get(chapterId);
        if (!built) {
          built = { chapterId, collection, entries: buildEntries(collection) };
          cacheRef.current.set(chapterId, built);
        }
        setLayer(built);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn(`[BoundaryLayer] no boundaries for chapter "${chapterId}"`, err);
        const empty: ChapterLayer = { chapterId, collection: EMPTY_COLLECTION, entries: [] };
        cacheRef.current.set(chapterId, empty);
        setLayer(empty);
      });
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  // Free GPU resources when the layer unmounts.
  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      for (const l of cache.values()) disposeLayer(l);
      cache.clear();
    };
  }, []);

  // Which features are valid on the current day.
  const activeSet = useMemo<ReadonlySet<BoundaryFeature>>(
    () => (layer ? new Set(featuresActiveAt(layer.collection, dayStart)) : EMPTY_SET),
    [layer, dayStart],
  );

  const featureCount = layer ? layer.collection.features.length : 0;
  const visibleCount = activeSet.size;
  const loadedChapterId = layer?.chapterId ?? null;

  useEffect(() => {
    if (loadedChapterId === null) return;
    actions.setBoundaryStatus({ chapterId: loadedChapterId, featureCount, visibleCount });
  }, [loadedChapterId, featureCount, visibleCount]);

  if (!layer) return null;

  return (
    <group name="boundary-layer">
      {layer.entries.map((e) => {
        const visible = activeSet.has(e.feature);
        if (e.kind === 'zone') {
          return (
            <group key={e.key} name={e.feature.properties.name} visible={visible}>
              <mesh geometry={e.fill} renderOrder={2} frustumCulled={false}>
                <meshBasicMaterial
                  color={e.color}
                  transparent
                  opacity={e.opacity}
                  depthWrite={false}
                  side={DoubleSide}
                />
              </mesh>
              <lineSegments geometry={e.outline} renderOrder={3} frustumCulled={false}>
                <lineBasicMaterial color={e.color} transparent opacity={ZONE_OUTLINE_OPACITY} depthWrite={false} />
              </lineSegments>
            </group>
          );
        }
        return (
          <lineSegments
            key={e.key}
            name={e.feature.properties.name}
            geometry={e.line}
            visible={visible}
            renderOrder={4}
            frustumCulled={false}
          >
            {e.dashed ? (
              <lineDashedMaterial
                color={e.color}
                transparent
                opacity={BOUNDARY_LINE_OPACITY}
                dashSize={DASH_SIZE}
                gapSize={GAP_SIZE}
                depthWrite={false}
              />
            ) : (
              <lineBasicMaterial color={e.color} transparent opacity={BOUNDARY_LINE_OPACITY} depthWrite={false} />
            )}
          </lineSegments>
        );
      })}
    </group>
  );
}
