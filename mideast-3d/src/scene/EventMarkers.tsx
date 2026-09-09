/**
 * EventMarkers - 3D markers for timeline events on the globe.
 *
 * Rendered INSIDE the r3f <Canvas>. Reads the app store (time, chapter,
 * selection, hover) and draws one instanced sphere per visible event,
 * coloured by category and sized by significance. Interaction goes back to the
 * store through `actions.selectEvent` / `actions.hoverEvent`.
 *
 * Draw calls: 1 (bodies) + 1 (recent-event pulse rings) + 1 (selected ring)
 * plus one invisible instanced mesh used only for raycasting. No React state
 * changes per frame; per-frame work is limited to writing a handful of
 * instance matrices with pre-allocated temporaries.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
  type Camera,
  type Object3D,
  type PerspectiveCamera,
} from 'three';
import { allEvents, eventById, eventsVisibleAt } from '../data/loader';
import type { TimelineEvent } from '../data/types';
import { DAY_MS, actions, formatDate, getState, isoToTime, timeToIso, useAppState } from '../state/store';
import { latLngToVector3 } from './geo';
import {
  HIT_MIN_RADIUS,
  HIT_RADIUS_PX_COARSE,
  HIT_RADIUS_PX_FINE,
  HOVERED_BODY_SCALE,
  MARKER_ALTITUDE,
  OVERLAP_RING_STEP,
  RECENT_RING_OPACITY,
  RECENT_RING_PULSE,
  RECENT_RING_SCALE,
  RECENT_WINDOW_MS,
  RING_ALTITUDE,
  SELECTED_BODY_SCALE,
  SELECTED_RING_OPACITY,
  SELECTED_RING_PULSE,
  SELECTED_RING_SCALE,
  markerColor,
  markerRadius,
} from './markerStyle';

/* ------------------------------------------------------------------ */
/* Module-level, allocated once                                        */
/* ------------------------------------------------------------------ */

/** Low-poly unit sphere; scaled per instance to the marker radius. */
const SPHERE_GEOMETRY = new SphereGeometry(1, 12, 8);
/** Thin annulus in the XY plane (+Z normal); oriented along the surface normal per instance. */
const RING_GEOMETRY = new RingGeometry(0.72, 1, 40);

/** Instance capacity: every event could in theory be visible at once (plus the selected one). */
const CAPACITY = Math.max(8, allEvents.length + 1);
const BODY_ARGS: [SphereGeometry, undefined, number] = [SPHERE_GEOMETRY, undefined, CAPACITY];
const RING_ARGS: [RingGeometry, undefined, number] = [RING_GEOMETRY, undefined, CAPACITY];

const UP = new Vector3(0, 1, 0);
const X_AXIS = new Vector3(1, 0, 0);
const Z_AXIS = new Vector3(0, 0, 1);
const IDENTITY_QUATERNION = new Quaternion();
const WHITE = new Color('#ffffff');

// Scratch objects reused by effects, handlers and the frame loop.
const tmpMatrix = new Matrix4();
const tmpScale = new Vector3();
const tmpColor = new Color();
const tmpA = new Vector3();
const tmpB = new Vector3();
const tmpC = new Vector3();

/** Tooltip z-index range: above the canvas, below any z-10+ UI overlay. */
const TOOLTIP_Z_RANGE = [9, 1];

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

interface MarkerRecord {
  event: TimelineEvent;
  /** UTC ms of event.date. */
  time: number;
  /** Body radius in scene units. */
  radius: number;
  /** Hex colour from the category. */
  color: string;
  /** Body centre (after overlap offset), at MARKER_ALTITUDE. */
  position: Vector3;
  /** Same direction, at RING_ALTITUDE. */
  ringPosition: Vector3;
  /** Rotates +Z onto the surface normal (for the rings). */
  quaternion: Quaternion;
}

/**
 * Position of the k-th marker of a co-located group on concentric hexagonal
 * rings (6, 12, 18 ... slots). k = 0 stays at the centre.
 */
function slotOffset(k: number, step: number): [number, number] {
  if (k <= 0) return [0, 0];
  let ring = 1;
  let first = 1;
  while (k >= first + 6 * ring) {
    first += 6 * ring;
    ring += 1;
  }
  const slots = 6 * ring;
  const angle = ((k - first) / slots) * Math.PI * 2 + (ring % 2 === 0 ? Math.PI / slots : 0);
  const r = step * ring;
  return [Math.cos(angle) * r, Math.sin(angle) * r];
}

function buildMarkers(list: TimelineEvent[]): MarkerRecord[] {
  // Group indices by (rounded) coordinates so identical places get offsets.
  const groups = new Map<string, number[]>();
  list.forEach((e, i) => {
    if (!Number.isFinite(e.lat) || !Number.isFinite(e.lng)) return;
    const key = `${e.lat.toFixed(3)},${e.lng.toFixed(3)}`;
    const g = groups.get(key);
    if (g) g.push(i);
    else groups.set(key, [i]);
  });

  const records: (MarkerRecord | undefined)[] = new Array<MarkerRecord | undefined>(list.length);
  const east = new Vector3();
  const north = new Vector3();

  for (const indices of groups.values()) {
    let maxRadius = 0;
    for (const i of indices) {
      const e = list[i];
      if (e) maxRadius = Math.max(maxRadius, markerRadius(e.significance));
    }
    const step = Math.max(OVERLAP_RING_STEP, 0.75 * maxRadius);

    indices.forEach((idx, k) => {
      const e = list[idx];
      if (!e) return;
      const normal = latLngToVector3(e.lat, e.lng, 1);
      if (k > 0) {
        // Tangent frame at the point; nudge along it and re-project onto the sphere.
        east.crossVectors(UP, normal);
        if (east.lengthSq() < 1e-8) east.copy(X_AXIS);
        east.normalize();
        north.crossVectors(normal, east);
        const [dx, dy] = slotOffset(k, step);
        normal.addScaledVector(east, dx).addScaledVector(north, dy).normalize();
      }
      records[idx] = {
        event: e,
        time: isoToTime(e.date),
        radius: markerRadius(e.significance),
        color: markerColor(e.category),
        position: normal.clone().multiplyScalar(MARKER_ALTITUDE),
        ringPosition: normal.clone().multiplyScalar(RING_ALTITUDE),
        quaternion: new Quaternion().setFromUnitVectors(Z_AXIS, normal),
      };
    });
  }
  return records.filter((r): r is MarkerRecord => r !== undefined);
}

/**
 * True when the marker is on the hemisphere facing the camera (i.e. not hidden
 * behind the globe). Approximates the horizon test n . c > 1 for a unit globe,
 * with a small tolerance. Allocation-free.
 */
function isFacingCamera(m: MarkerRecord, group: Object3D | null, camera: Camera): boolean {
  const centre = group ? group.getWorldPosition(tmpB) : tmpB.set(0, 0, 0);
  const p = tmpA.copy(m.position);
  if (group) p.applyMatrix4(group.matrixWorld);
  const cam = camera.getWorldPosition(tmpC).sub(centre);
  const cLen = cam.length();
  if (cLen < 1e-6) return true;
  const n = p.sub(centre).normalize();
  return n.dot(cam) > 1 - 0.01 * cLen;
}

function writeHitMatrices(hits: InstancedMesh, markers: MarkerRecord[], hitRadius: number): void {
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    if (!m) continue;
    tmpScale.setScalar(Math.max(hitRadius, m.radius * 1.4));
    tmpMatrix.compose(m.position, IDENTITY_QUATERNION, tmpScale);
    hits.setMatrixAt(i, tmpMatrix);
  }
  hits.count = markers.length;
  hits.instanceMatrix.needsUpdate = true;
  hits.computeBoundingSphere();
}

function pulseScale(base: number, amplitude: number, radius: number, t: number, phase: number): number {
  return radius * (base + amplitude * Math.sin(t + phase));
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function EventMarkers() {
  // Subscribe to the ISO day rather than the raw timestamp so playback does
  // not re-render this component every frame.
  const isoDay = useAppState((s) => timeToIso(s.time));
  const activeChapterId = useAppState((s) => s.activeChapterId);
  const selectedEventId = useAppState((s) => s.selectedEventId);
  const hoveredEventId = useAppState((s) => s.hoveredEventId);
  const camera = useThree((s) => s.camera);

  const dayTime = isoToTime(isoDay);

  /* ------------------------------ data ------------------------------ */

  const visible = useMemo(() => {
    const list = eventsVisibleAt(dayTime); // fresh array (filter) - safe to extend
    if (selectedEventId && !list.some((e) => e.id === selectedEventId)) {
      const sel = eventById(selectedEventId);
      if (sel) list.push(sel);
    }
    return list;
    // activeChapterId is implied by the day but listed so a chapter jump always recomputes.
  }, [dayTime, activeChapterId, selectedEventId]);

  // Stable identity while the set of visible ids is unchanged (positions do not
  // depend on time), so instance matrices are only rewritten when needed.
  const visibleKey = visible.map((e) => e.id).join('|');
  const markers = useMemo(() => buildMarkers(visible), [visibleKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Indices (into markers) of events dated within RECENT_WINDOW before now. */
  const recent = useMemo(() => {
    const from = dayTime - RECENT_WINDOW_MS;
    const to = dayTime + DAY_MS - 1;
    const out: number[] = [];
    markers.forEach((m, i) => {
      if (m.time >= from && m.time <= to) out.push(i);
    });
    return out;
  }, [markers, dayTime]);

  const selectedIndex = selectedEventId ? markers.findIndex((m) => m.event.id === selectedEventId) : -1;
  const hoveredIndex = hoveredEventId ? markers.findIndex((m) => m.event.id === hoveredEventId) : -1;

  /* ------------------------------ refs ------------------------------ */

  const groupRef = useRef<Group>(null);
  const bodiesRef = useRef<InstancedMesh>(null);
  const hitsRef = useRef<InstancedMesh>(null);
  const ringsRef = useRef<InstancedMesh>(null);
  const selectedRingRef = useRef<Mesh>(null);
  const selectedRingMatRef = useRef<MeshBasicMaterial>(null);

  const markersRef = useRef<MarkerRecord[]>(markers);
  const recentRef = useRef<number[]>(recent);
  const selectedRadiusRef = useRef(0);
  const hitRadiusRef = useRef(HIT_MIN_RADIUS);
  const hitPxRef = useRef(HIT_RADIUS_PX_FINE);

  useLayoutEffect(() => {
    markersRef.current = markers;
    recentRef.current = recent;
  }, [markers, recent]);

  // Larger hit targets on touch devices; restore the cursor on unmount.
  useEffect(() => {
    try {
      if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) {
        hitPxRef.current = HIT_RADIUS_PX_COARSE;
      }
    } catch {
      /* matchMedia unavailable - keep the fine-pointer default */
    }
    const rings = ringsRef.current;
    if (rings) rings.instanceMatrix.setUsage(DynamicDrawUsage);
    return () => {
      document.body.style.cursor = '';
    };
  }, []);

  /* --------------------------- instances ---------------------------- */

  // Bodies (visible) + hit spheres (invisible): rewritten when the visible set,
  // the selection or the hover changes - never per frame.
  useLayoutEffect(() => {
    const bodies = bodiesRef.current;
    const hits = hitsRef.current;
    if (!bodies || !hits) return;
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i];
      if (!m) continue;
      const scale = i === selectedIndex ? SELECTED_BODY_SCALE : i === hoveredIndex ? HOVERED_BODY_SCALE : 1;
      tmpScale.setScalar(m.radius * scale);
      tmpMatrix.compose(m.position, IDENTITY_QUATERNION, tmpScale);
      bodies.setMatrixAt(i, tmpMatrix);
      tmpColor.set(m.color);
      if (i === selectedIndex) tmpColor.lerp(WHITE, 0.3);
      else if (i === hoveredIndex) tmpColor.lerp(WHITE, 0.18);
      bodies.setColorAt(i, tmpColor);
    }
    bodies.count = markers.length;
    bodies.instanceMatrix.needsUpdate = true;
    if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
    bodies.computeBoundingSphere();
    writeHitMatrices(hits, markers, hitRadiusRef.current);
  }, [markers, selectedIndex, hoveredIndex]);

  // Pulse rings for recent events: colour + initial pose here, scale animated per frame.
  useLayoutEffect(() => {
    const rings = ringsRef.current;
    if (!rings) return;
    for (let i = 0; i < recent.length; i++) {
      const m = markers[recent[i] ?? -1];
      if (!m) continue;
      tmpScale.set(m.radius * RECENT_RING_SCALE, m.radius * RECENT_RING_SCALE, 1);
      tmpMatrix.compose(m.ringPosition, m.quaternion, tmpScale);
      rings.setMatrixAt(i, tmpMatrix);
      rings.setColorAt(i, tmpColor.set(m.color));
    }
    rings.count = recent.length;
    rings.instanceMatrix.needsUpdate = true;
    if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
  }, [markers, recent]);

  // Selected ring: brighter, larger, placed on the selected marker.
  useLayoutEffect(() => {
    const ring = selectedRingRef.current;
    const mat = selectedRingMatRef.current;
    if (!ring || !mat) return;
    const m = selectedIndex >= 0 ? markers[selectedIndex] : undefined;
    if (!m) {
      ring.visible = false;
      selectedRadiusRef.current = 0;
      return;
    }
    ring.visible = true;
    ring.position.copy(m.ringPosition);
    ring.quaternion.copy(m.quaternion);
    ring.scale.set(m.radius * SELECTED_RING_SCALE, m.radius * SELECTED_RING_SCALE, 1);
    mat.color.set(m.color).lerp(WHITE, 0.45);
    selectedRadiusRef.current = m.radius;
  }, [markers, selectedIndex]);

  /* --------------------------- frame loop --------------------------- */

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const list = markersRef.current;
    const recentIdx = recentRef.current;

    const rings = ringsRef.current;
    if (rings && recentIdx.length > 0) {
      for (let i = 0; i < recentIdx.length; i++) {
        const m = list[recentIdx[i] ?? -1];
        if (!m) continue;
        const s = pulseScale(RECENT_RING_SCALE, RECENT_RING_PULSE, m.radius, t * 2.6, i * 0.9);
        tmpScale.set(s, s, 1);
        tmpMatrix.compose(m.ringPosition, m.quaternion, tmpScale);
        rings.setMatrixAt(i, tmpMatrix);
      }
      rings.instanceMatrix.needsUpdate = true;
    }

    const sel = selectedRingRef.current;
    if (sel && sel.visible && selectedRadiusRef.current > 0) {
      const s = pulseScale(SELECTED_RING_SCALE, SELECTED_RING_PULSE, selectedRadiusRef.current, t * 3.2, 0);
      sel.scale.set(s, s, 1);
    }

    // Keep hit spheres roughly constant in screen pixels: recompute only when
    // the camera distance changed enough to matter (allocation-free check).
    const cam = state.camera as PerspectiveCamera;
    if (cam.isPerspectiveCamera) {
      const group = groupRef.current;
      const centre = group ? group.getWorldPosition(tmpA) : tmpA.set(0, 0, 0);
      const dist = Math.max(0.05, cam.getWorldPosition(tmpB).distanceTo(centre) - 1);
      const worldPerPx = (2 * Math.tan((cam.fov * Math.PI) / 360) * dist) / Math.max(1, state.size.height);
      const r = Math.max(HIT_MIN_RADIUS, hitPxRef.current * worldPerPx);
      const prev = hitRadiusRef.current;
      if (Math.abs(r - prev) > prev * 0.12) {
        hitRadiusRef.current = r;
        const hits = hitsRef.current;
        if (hits) writeHitMatrices(hits, list, r);
      }
    }
  });

  /* --------------------------- interaction -------------------------- */

  const markerAt = useCallback((instanceId: number | undefined): MarkerRecord | undefined => {
    if (instanceId === undefined) return undefined;
    return markersRef.current[instanceId];
  }, []);

  const onPointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const m = markerAt(e.instanceId);
      if (!m || !isFacingCamera(m, groupRef.current, camera)) return;
      e.stopPropagation();
      actions.hoverEvent(m.event.id);
      document.body.style.cursor = 'pointer';
    },
    [camera, markerAt],
  );

  const onPointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const m = markerAt(e.instanceId);
      // Only clear when we are still the hovered event (another marker may
      // already have taken over, or the panel may own the hover).
      if (m && getState().hoveredEventId === m.event.id) {
        actions.hoverEvent(null);
        document.body.style.cursor = '';
      } else if (!m) {
        document.body.style.cursor = '';
      }
    },
    [markerAt],
  );

  const onClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (e.delta > 6) return; // a drag (orbit), not a click
      const m = markerAt(e.instanceId);
      if (!m || !isFacingCamera(m, groupRef.current, camera)) return;
      e.stopPropagation();
      actions.selectEvent(m.event.id);
    },
    [camera, markerAt],
  );

  /* ----------------------------- tooltip ---------------------------- */

  const hovered = hoveredIndex >= 0 ? markers[hoveredIndex] : undefined;
  const showTooltip = hovered !== undefined && isFacingCamera(hovered, groupRef.current, camera);

  return (
    <group ref={groupRef} name="event-markers">
      {/* Visible bodies: flat (unlit) colour so they read against the dark globe. */}
      <instancedMesh ref={bodiesRef} args={BODY_ARGS} frustumCulled={false} name="event-marker-bodies">
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>

      {/* Invisible, generously sized hit spheres (raycast only). */}
      <instancedMesh
        ref={hitsRef}
        args={BODY_ARGS}
        visible={false}
        frustumCulled={false}
        name="event-marker-hits"
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <meshBasicMaterial />
      </instancedMesh>

      {/* Pulsing translucent rings for events within the recent window. */}
      <instancedMesh ref={ringsRef} args={RING_ARGS} frustumCulled={false} renderOrder={10} name="event-marker-pulses">
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={RECENT_RING_OPACITY}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Brighter ring on the selected event. */}
      <mesh ref={selectedRingRef} geometry={RING_GEOMETRY} visible={false} renderOrder={11} name="event-marker-selected">
        <meshBasicMaterial
          ref={selectedRingMatRef}
          transparent
          opacity={SELECTED_RING_OPACITY}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {showTooltip && hovered && (
        <Html position={hovered.position} zIndexRange={TOOLTIP_Z_RANGE} style={{ pointerEvents: 'none' }}>
          <div
            data-testid="event-tooltip"
            data-event-id={hovered.event.id}
            className="pointer-events-none select-none rounded-md border px-2.5 py-1.5 text-xs shadow-lg"
            style={{
              transform: 'translate(-50%, calc(-100% - 14px))',
              background: 'var(--color-panel)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
              minWidth: '8rem',
              maxWidth: '16rem',
            }}
          >
            <div className="flex items-center gap-1.5 whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: hovered.color }} />
              <span className="tabular-nums">{formatDate(hovered.event.date)}</span>
            </div>
            <div className="mt-0.5 font-medium leading-snug">{hovered.event.title}</div>
          </div>
        </Html>
      )}
    </group>
  );
}
