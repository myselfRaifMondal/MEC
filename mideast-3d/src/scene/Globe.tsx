/**
 * The 3D globe scene. Renders a full-size R3F <Canvas> with the globe
 * sphere, a subtle atmosphere rim, an optional faint graticule, the world
 * outlines, the era boundary layer, the camera rig, and whatever the
 * integrator passes as children (event markers).
 */
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { AdditiveBlending, BackSide, Color, DirectionalLight, type BufferGeometry } from 'three';
import type { MultiLineStringGeometry, Position } from '../data/types';
import { chapters } from '../state/store';
import BoundaryLayer from './BoundaryLayer';
import CameraRig from './CameraRig';
import { latLngToVector3 } from './geo';
import { lineGeometry } from './geojson';
import WorldOutlines from './WorldOutlines';

export const CLEAR_COLOR = '#070b14';
export const GLOBE_COLOR = '#0c1730';
export const GLOBE_SEGMENTS = 64;
const GRATICULE_RADIUS = 1.001;
const GRATICULE_STEP_DEG = 15;
const ATMOSPHERE_SCALE = 1.08;

export interface GlobeProps {
  /** Scene content rendered inside the Canvas (e.g. <EventMarkers/>). */
  children?: ReactNode;
  /** Draw a faint 15-degree graticule. Default true. */
  graticule?: boolean;
  /**
   * Called when the user clicks the globe surface or empty space (not a
   * marker) without dragging. Useful for clearing the selection.
   */
  onBackgroundClick?: () => void;
}

const DEFAULT_POSE = { lat: 31.5, lng: 35, distance: 2.2 };

function initialCameraPosition(): [number, number, number] {
  const pose = chapters[0]?.camera ?? DEFAULT_POSE;
  const v = latLngToVector3(pose.lat, pose.lng, pose.distance);
  return [v.x, v.y, v.z];
}

const INITIAL_CAMERA_POSITION = initialCameraPosition();

/* ------------------------------------------------------------------ */
/* Lights: ambient base + a key light that follows the camera so the    */
/* visible hemisphere is always softly lit from above.                  */
/* ------------------------------------------------------------------ */

function SceneLights() {
  const lightRef = useRef<DirectionalLight>(null);
  useFrame(({ camera }) => {
    const light = lightRef.current;
    if (!light) return;
    light.position.copy(camera.position);
    light.position.y += 1.5;
  });
  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight ref={lightRef} position={[2, 3, 2]} intensity={0.8} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Globe sphere                                                        */
/* ------------------------------------------------------------------ */

function GlobeSphere({ onBackgroundClick }: { onBackgroundClick?: (() => void) | undefined }) {
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!onBackgroundClick) return;
      if (e.delta > 4) return; // a drag, not a click
      // Only count as background if nothing closer (a marker) was hit.
      const nearest = e.intersections[0];
      if (nearest && nearest.object !== e.object) return;
      onBackgroundClick();
    },
    [onBackgroundClick],
  );
  return (
    <mesh name="globe" onClick={onBackgroundClick ? handleClick : undefined}>
      <sphereGeometry args={[1, GLOBE_SEGMENTS, GLOBE_SEGMENTS]} />
      <meshStandardMaterial color={GLOBE_COLOR} roughness={1} metalness={0} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Atmosphere: a back-facing shell whose brightness rises from zero at   */
/* its own silhouette to a soft maximum at the globe's limb.            */
/* ------------------------------------------------------------------ */

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uInner;
  uniform float uStrength;
  varying vec3 vNormal;
  void main() {
    // Back faces point away from the camera: -z grows from the outer rim
    // (0) to the globe's silhouette (uInner).
    float t = clamp(-vNormal.z / uInner, 0.0, 1.0);
    float a = t * t * uStrength;
    gl_FragColor = vec4(uColor, a);
  }
`;

function Atmosphere() {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color('#3b6fb5') },
      uInner: { value: Math.sqrt(1 - 1 / (ATMOSPHERE_SCALE * ATMOSPHERE_SCALE)) },
      uStrength: { value: 0.8 },
    }),
    [],
  );
  return (
    <mesh name="atmosphere" scale={ATMOSPHERE_SCALE} renderOrder={-1}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        vertexShader={ATMOSPHERE_VERTEX}
        fragmentShader={ATMOSPHERE_FRAGMENT}
        uniforms={uniforms}
        side={BackSide}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Graticule                                                           */
/* ------------------------------------------------------------------ */

function buildGraticule(stepDeg: number): BufferGeometry {
  const lines: Position[][] = [];
  for (let lat = -90 + stepDeg; lat < 90; lat += stepDeg) {
    const line: Position[] = [];
    for (let lng = -180; lng <= 180; lng += 5) line.push([lng, lat]);
    lines.push(line);
  }
  for (let lng = -180; lng < 180; lng += stepDeg) {
    const line: Position[] = [];
    for (let lat = -90; lat <= 90; lat += 5) line.push([lng, lat]);
    lines.push(line);
  }
  const geometry: MultiLineStringGeometry = { type: 'MultiLineString', coordinates: lines };
  return lineGeometry({ geometry }, GRATICULE_RADIUS, 2.5);
}

function Graticule() {
  const geometry = useMemo(() => buildGraticule(GRATICULE_STEP_DEG), []);
  return (
    <lineSegments name="graticule" geometry={geometry} renderOrder={0} frustumCulled={false}>
      <lineBasicMaterial color="#94a3b8" transparent opacity={0.07} depthWrite={false} />
    </lineSegments>
  );
}

/* ------------------------------------------------------------------ */
/* Globe                                                               */
/* ------------------------------------------------------------------ */

export default function Globe({ children, graticule = true, onBackgroundClick }: GlobeProps) {
  return (
    <div data-testid="globe-canvas" className="absolute inset-0">
      <p className="sr-only">Interactive globe. Drag to rotate, scroll or pinch to zoom.</p>
      <Canvas
        dpr={[1, 1.75]}
        flat
        camera={{ fov: 45, near: 0.05, far: 100, position: INITIAL_CAMERA_POSITION }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(CLEAR_COLOR, 1);
        }}
        onPointerMissed={onBackgroundClick ? () => onBackgroundClick() : undefined}
      >
        <SceneLights />
        <GlobeSphere onBackgroundClick={onBackgroundClick} />
        <Atmosphere />
        {graticule ? <Graticule /> : null}
        <Suspense fallback={null}>
          <WorldOutlines />
          <BoundaryLayer />
          {children}
        </Suspense>
        <CameraRig />
      </Canvas>
    </div>
  );
}
