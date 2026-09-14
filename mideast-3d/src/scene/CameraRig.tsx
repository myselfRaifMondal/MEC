/**
 * Camera control and animation.
 *
 * - Owns the drei <OrbitControls> (damped, no pan, distance-clamped) and
 *   scales the rotate speed with zoom so close-ups stay controllable.
 * - Flies the camera (ease-in-out, slerp on direction + lerp on distance,
 *   zero per-frame allocations) to the chapter pose when the active chapter
 *   changes, and to the selected event when one is selected.
 * - Any user interaction (drag, wheel, pinch) cancels a flight in progress.
 */
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef, type ComponentRef } from 'react';
import { Quaternion, Vector3 } from 'three';
import { eventById } from '../data/loader';
import type { CameraPose } from '../data/types';
import { chapterById, chapters, useAppState } from '../state/store';
import { latLngToVector3 } from './geo';

type Controls = ComponentRef<typeof OrbitControls>;

export const CAMERA_MIN_DISTANCE = 1.15;
export const CAMERA_MAX_DISTANCE = 4;
/** Closest the camera comes when focusing an event (globe radii). */
export const EVENT_FOCUS_DISTANCE = 1.3;
export const CHAPTER_FLIGHT_SECONDS = 1.6;
export const EVENT_FLIGHT_SECONDS = 1.2;
const BASE_ROTATE_SPEED = 0.5;
const ZOOM_SPEED = 0.6;

export interface CameraRigProps {
  chapterFlightSeconds?: number;
  eventFlightSeconds?: number;
}

interface Flight {
  active: boolean;
  elapsed: number;
  duration: number;
  fromDir: Vector3;
  /** Rotation taking fromDir to the destination direction. */
  rotation: Quaternion;
  fromDistance: number;
  toDistance: number;
}

function createFlight(): Flight {
  return {
    active: false,
    elapsed: 0,
    duration: 1,
    fromDir: new Vector3(0, 0, 1),
    rotation: new Quaternion(),
    fromDistance: 2,
    toDistance: 2,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Per-frame scratch objects (module-level, never re-allocated).
const _q = new Quaternion();
const _dir = new Vector3();

export default function CameraRig({
  chapterFlightSeconds = CHAPTER_FLIGHT_SECONDS,
  eventFlightSeconds = EVENT_FLIGHT_SECONDS,
}: CameraRigProps) {
  const camera = useThree((s) => s.camera);
  const controlsRef = useRef<Controls | null>(null);
  const flightRef = useRef<Flight | null>(null);
  if (flightRef.current === null) flightRef.current = createFlight();
  const flight = flightRef.current;

  const activeChapterId = useAppState((s) => s.activeChapterId);
  const selectedEventId = useAppState((s) => s.selectedEventId);

  const setDamping = useCallback(
    (enabled: boolean) => {
      const controls = controlsRef.current;
      if (controls) controls.enableDamping = enabled;
    },
    [],
  );

  const startFlight = useCallback(
    (lat: number, lng: number, distance: number, duration: number) => {
      const pos = camera.position;
      const fromDistance = Math.max(pos.length(), 1e-6);
      flight.fromDir.copy(pos).divideScalar(fromDistance);
      latLngToVector3(lat, lng, 1, _dir);
      flight.rotation.setFromUnitVectors(flight.fromDir, _dir);
      flight.fromDistance = clamp(fromDistance, CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE);
      flight.toDistance = clamp(distance, CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE);
      flight.duration = Math.max(0.05, duration);
      flight.elapsed = 0;
      flight.active = true;
      // Residual drag inertia would fight the flight; damping is restored when it ends.
      setDamping(false);
    },
    [camera, flight, setDamping],
  );

  const endFlight = useCallback(() => {
    if (!flight.active) return;
    flight.active = false;
    setDamping(true);
  }, [flight, setDamping]);

  const snapTo = useCallback(
    (pose: CameraPose) => {
      latLngToVector3(pose.lat, pose.lng, clamp(pose.distance, CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE), camera.position);
      camera.lookAt(0, 0, 0);
      controlsRef.current?.update();
    },
    [camera],
  );

  // Chapter changes -> fly to the chapter's pose.
  const prevChapterRef = useRef<string | null>(null);
  useEffect(() => {
    const chapter = chapterById(activeChapterId);
    if (!chapter) return;
    if (prevChapterRef.current === null) {
      // First mount: Globe positions the camera at the first chapter's pose.
      // If the app starts elsewhere (or the camera is missing), snap instantly.
      prevChapterRef.current = activeChapterId;
      if (activeChapterId !== chapters[0]?.id) snapTo(chapter.camera);
      return;
    }
    if (prevChapterRef.current === activeChapterId) return;
    prevChapterRef.current = activeChapterId;
    startFlight(chapter.camera.lat, chapter.camera.lng, chapter.camera.distance, chapterFlightSeconds);
  }, [activeChapterId, chapterFlightSeconds, snapTo, startFlight]);

  // Event selection -> fly to the event, no further than EVENT_FOCUS_DISTANCE.
  // Declared after the chapter effect so that, when both change in one
  // update, the more specific event flight wins.
  useEffect(() => {
    if (!selectedEventId) return;
    const event = eventById(selectedEventId);
    if (!event) return;
    const distance = Math.min(camera.position.length(), EVENT_FOCUS_DISTANCE);
    startFlight(event.lat, event.lng, distance, eventFlightSeconds);
  }, [selectedEventId, eventFlightSeconds, camera, startFlight]);

  // User interaction cancels any flight ("start" fires on drag, wheel and touch).
  const handleStart = useCallback(() => {
    endFlight();
  }, [endFlight]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (controls) {
      // Slow rotation down as the camera approaches the surface.
      const d = camera.position.length();
      controls.rotateSpeed = BASE_ROTATE_SPEED * clamp((d - 1) / 1.2, 0.2, 1);
    }
    if (!flight.active) return;
    flight.elapsed += Math.min(delta, 0.1);
    const t = Math.min(1, flight.elapsed / flight.duration);
    const s = easeInOutCubic(t);
    _q.identity().slerp(flight.rotation, s);
    _dir.copy(flight.fromDir).applyQuaternion(_q);
    const distance = flight.fromDistance + (flight.toDistance - flight.fromDistance) * s;
    camera.position.copy(_dir).multiplyScalar(distance);
    if (controls) controls.update();
    else camera.lookAt(0, 0, 0);
    if (t >= 1) endFlight();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      enableZoom
      zoomToCursor={false}
      minDistance={CAMERA_MIN_DISTANCE}
      maxDistance={CAMERA_MAX_DISTANCE}
      rotateSpeed={BASE_ROTATE_SPEED}
      zoomSpeed={ZOOM_SPEED}
      onStart={handleStart}
    />
  );
}
