/**
 * Base map: every country outline from the Natural Earth 110m world file,
 * merged into ONE line-segment geometry and drawn once as thin grey-blue
 * lines slightly above the globe surface. Loaded once, never re-built.
 */
import { useEffect, useState } from 'react';
import type { BufferGeometry } from 'three';
import { loadWorld } from '../data/loader';
import { mergedLineGeometry } from './geojson';

export const WORLD_OUTLINE_RADIUS = 1.002;
export const WORLD_OUTLINE_COLOR = '#94a3b8';
export const WORLD_OUTLINE_OPACITY = 0.35;

export interface WorldOutlinesProps {
  /** Sphere radius the outlines are drawn on (globe radius = 1). */
  radius?: number;
  color?: string;
  opacity?: number;
}

export default function WorldOutlines({
  radius = WORLD_OUTLINE_RADIUS,
  color = WORLD_OUTLINE_COLOR,
  opacity = WORLD_OUTLINE_OPACITY,
}: WorldOutlinesProps) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);

  useEffect(() => {
    let cancelled = false;
    let built: BufferGeometry | null = null;
    loadWorld()
      .then((world) => {
        if (cancelled) return;
        built = mergedLineGeometry(world.features, radius);
        setGeometry(built);
      })
      .catch((err: unknown) => {
        // The outline layer is decorative: keep rendering the globe without it.
        console.warn('[WorldOutlines] failed to load world outlines', err);
      });
    return () => {
      cancelled = true;
      built?.dispose();
    };
  }, [radius]);

  if (!geometry) return null;

  return (
    <lineSegments name="world-outlines" geometry={geometry} renderOrder={1} frustumCulled={false}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </lineSegments>
  );
}
