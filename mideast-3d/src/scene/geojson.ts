/**
 * Pure helpers that turn GeoJSON geometry (the minimal subset typed in
 * src/data/types.ts) into three.js BufferGeometry lying on the globe.
 *
 * - Lines are emitted as *non-indexed* line segments (two vertices per
 *   segment) so that `LineSegments.computeLineDistances()` works and dashed
 *   materials can be used without further processing.
 * - Long segments are subdivided in lng/lat space so that lines hug the
 *   sphere instead of cutting through it. Interpolating in lng/lat (rather
 *   than along a great circle) is deliberate: cartographic boundaries drawn
 *   along parallels/meridians must stay on them.
 * - Fills are triangulated in lng/lat space with THREE.ShapeUtils
 *   (earcut, with holes) and then projected onto the sphere. Large triangles
 *   are subdivided so that their chords do not sink below the globe surface.
 *
 * No feature in the dataset crosses the antimeridian, so no wrapping logic.
 */
import { BufferAttribute, BufferGeometry, ShapeUtils, Vector2, Vector3 } from 'three';
import type {
  BoundaryGeometry,
  LineStyle,
  MultiPolygonGeometry,
  PolygonGeometry,
  Position,
  ZoneStyle,
} from '../data/types';
import { LINE_COLORS, ZONE_COLORS } from '../data/types';
import { GLOBE_RADIUS, latLngToVector3 } from './geo';

/** Any object carrying a GeoJSON geometry (BoundaryFeature, WorldFeature, ...). */
export interface GeometryCarrier<G extends BoundaryGeometry = BoundaryGeometry> {
  geometry: G;
}

/** Segments longer than this (in degrees, lng/lat space) are subdivided. */
export const DEFAULT_MAX_SEGMENT_DEG = 0.5;
/** Fill triangles whose longest edge exceeds this (degrees) are split. */
export const DEFAULT_MAX_TRIANGLE_EDGE_DEG = 1.5;

const _v = new Vector3();

/* ------------------------------------------------------------------ */
/* Lines                                                               */
/* ------------------------------------------------------------------ */

/** Angular size (degrees) of a segment, roughly compensating for meridian convergence. */
function segmentDegrees(lng0: number, lat0: number, lng1: number, lat1: number): number {
  const dLat = lat1 - lat0;
  const dLng = (lng1 - lng0) * Math.cos(((lat0 + lat1) * 0.5 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Append the vertices of one polyline (as line-segment pairs) to `out`,
 * subdividing segments longer than `maxSegmentDeg`.
 */
function appendPolyline(points: readonly Position[], radius: number, out: number[], maxSegmentDeg: number): void {
  const n = points.length;
  if (n < 2) return;
  for (let i = 0; i < n - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    const lng0 = a[0];
    const lat0 = a[1];
    const lng1 = b[0];
    const lat1 = b[1];
    if (lng0 === lng1 && lat0 === lat1) continue; // zero-length segment
    const deg = segmentDegrees(lng0, lat0, lng1, lat1);
    const steps = Math.max(1, Math.ceil(deg / maxSegmentDeg));
    let px = 0;
    let py = 0;
    let pz = 0;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      latLngToVector3(lat0 + (lat1 - lat0) * t, lng0 + (lng1 - lng0) * t, radius, _v);
      if (s > 0) {
        out.push(px, py, pz, _v.x, _v.y, _v.z);
      }
      px = _v.x;
      py = _v.y;
      pz = _v.z;
    }
  }
}

/**
 * Push densified line-segment vertices (x, y, z per vertex, two vertices per
 * segment) for every ring / line of `geometry` into `out`.
 */
export function appendLineSegments(
  geometry: BoundaryGeometry,
  radius: number,
  out: number[],
  maxSegmentDeg: number = DEFAULT_MAX_SEGMENT_DEG,
): void {
  switch (geometry.type) {
    case 'LineString':
      appendPolyline(geometry.coordinates, radius, out, maxSegmentDeg);
      break;
    case 'MultiLineString':
    case 'Polygon':
      for (const line of geometry.coordinates) appendPolyline(line, radius, out, maxSegmentDeg);
      break;
    case 'MultiPolygon':
      for (const polygon of geometry.coordinates) {
        for (const ring of polygon) appendPolyline(ring, radius, out, maxSegmentDeg);
      }
      break;
  }
}

function geometryFromPositions(positions: number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Non-indexed line-segment geometry for every ring / line of a feature, on a
 * sphere of the given radius. Suitable for <lineSegments> with either
 * LineBasicMaterial or LineDashedMaterial (call computeLineDistances for the latter).
 */
export function lineGeometry(
  feature: GeometryCarrier,
  radius: number = GLOBE_RADIUS,
  maxSegmentDeg: number = DEFAULT_MAX_SEGMENT_DEG,
): BufferGeometry {
  const positions: number[] = [];
  appendLineSegments(feature.geometry, radius, positions, maxSegmentDeg);
  return geometryFromPositions(positions);
}

/** One merged line-segment geometry for many features (e.g. all world outlines). */
export function mergedLineGeometry(
  features: readonly GeometryCarrier[],
  radius: number = GLOBE_RADIUS,
  maxSegmentDeg: number = DEFAULT_MAX_SEGMENT_DEG,
): BufferGeometry {
  const positions: number[] = [];
  for (const f of features) appendLineSegments(f.geometry, radius, positions, maxSegmentDeg);
  return geometryFromPositions(positions);
}

/**
 * Mirror of LineSegments.computeLineDistances() for a non-indexed geometry,
 * so a geometry can be prepared for LineDashedMaterial without an Object3D.
 */
export function computeLineDistances(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position');
  if (!position || geometry.index !== null) return geometry;
  const count = position.count;
  const distances = new Float32Array(count);
  let acc = 0;
  for (let i = 0; i + 1 < count; i += 2) {
    const dx = position.getX(i + 1) - position.getX(i);
    const dy = position.getY(i + 1) - position.getY(i);
    const dz = position.getZ(i + 1) - position.getZ(i);
    distances[i] = acc;
    acc += Math.sqrt(dx * dx + dy * dy + dz * dz);
    distances[i + 1] = acc;
  }
  geometry.setAttribute('lineDistance', new BufferAttribute(distances, 1));
  return geometry;
}

/* ------------------------------------------------------------------ */
/* Fills                                                               */
/* ------------------------------------------------------------------ */

/** Vertices as flat [lng, lat, ...] plus triangle indices; lives in degree space until projection. */
interface FlatMesh {
  coords: number[];
  tris: number[];
}

function ringToVector2s(ring: readonly Position[]): Vector2[] {
  const pts: Vector2[] = [];
  for (const p of ring) {
    const last = pts[pts.length - 1];
    // Skip consecutive duplicates; earcut copes but they waste vertices.
    if (last && last.x === p[0] && last.y === p[1]) continue;
    pts.push(new Vector2(p[0], p[1]));
  }
  return pts;
}

/** Triangulate one polygon (outer ring + holes) in lng/lat space and append to `mesh`. */
function triangulatePolygon(rings: readonly Position[][], mesh: FlatMesh): void {
  const outerRing = rings[0];
  if (!outerRing || outerRing.length < 3) return;
  const contour = ringToVector2s(outerRing);
  if (contour.length < 3) return;
  const holes: Vector2[][] = [];
  for (let i = 1; i < rings.length; i++) {
    const ring = rings[i];
    if (!ring || ring.length < 3) continue;
    const h = ringToVector2s(ring);
    if (h.length >= 3) holes.push(h);
  }
  // triangulateShape mutates the arrays (drops a duplicated closing point), so
  // the arrays are read back *after* the call to keep indices consistent.
  const faces = ShapeUtils.triangulateShape(contour, holes);
  const base = mesh.coords.length / 2;
  for (const p of contour) mesh.coords.push(p.x, p.y);
  for (const h of holes) for (const p of h) mesh.coords.push(p.x, p.y);
  for (const face of faces) {
    const a = face[0];
    const b = face[1];
    const c = face[2];
    if (a === undefined || b === undefined || c === undefined) continue;
    mesh.tris.push(base + a, base + b, base + c);
  }
}

function edgeDeg(mesh: FlatMesh, i: number, j: number): number {
  const c = mesh.coords;
  return segmentDegrees(c[2 * i] ?? 0, c[2 * i + 1] ?? 0, c[2 * j] ?? 0, c[2 * j + 1] ?? 0);
}

/**
 * Recursively split triangles whose longest edge exceeds `maxEdgeDeg` into
 * four (edge midpoints). Midpoints are shared between the triangles produced
 * from the same parent; across parents a tiny T-junction may remain, which is
 * far below a pixel for the thresholds used here.
 */
function densify(mesh: FlatMesh, maxEdgeDeg: number): void {
  const midpoints = new Map<number, number>();
  const midpoint = (i: number, j: number): number => {
    const key = i < j ? i * 1_048_576 + j : j * 1_048_576 + i;
    const cached = midpoints.get(key);
    if (cached !== undefined) return cached;
    const c = mesh.coords;
    const idx = c.length / 2;
    c.push(((c[2 * i] ?? 0) + (c[2 * j] ?? 0)) * 0.5, ((c[2 * i + 1] ?? 0) + (c[2 * j + 1] ?? 0)) * 0.5);
    midpoints.set(key, idx);
    return idx;
  };

  const out: number[] = [];
  const stack: number[] = mesh.tris.slice();
  let guard = 0;
  while (stack.length >= 3 && guard++ < 200_000) {
    const c = stack.pop() as number;
    const b = stack.pop() as number;
    const a = stack.pop() as number;
    const longest = Math.max(edgeDeg(mesh, a, b), edgeDeg(mesh, b, c), edgeDeg(mesh, c, a));
    if (longest <= maxEdgeDeg) {
      out.push(a, b, c);
      continue;
    }
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const ca = midpoint(c, a);
    stack.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  // If the guard tripped, keep whatever is left un-split rather than dropping it.
  for (let i = 0; i + 2 < stack.length; i += 3) out.push(stack[i] as number, stack[i + 1] as number, stack[i + 2] as number);
  mesh.tris = out;
}

/**
 * Triangulated, sphere-projected fill for a Polygon or MultiPolygon feature.
 * Returns an indexed BufferGeometry with `position` and `normal` attributes.
 * Render it with `side: DoubleSide` (ring orientation is not normalised).
 */
export function fillGeometry(
  feature: GeometryCarrier<PolygonGeometry | MultiPolygonGeometry>,
  radius: number = GLOBE_RADIUS,
  maxTriangleEdgeDeg: number = DEFAULT_MAX_TRIANGLE_EDGE_DEG,
): BufferGeometry {
  const mesh: FlatMesh = { coords: [], tris: [] };
  const g = feature.geometry;
  if (g.type === 'Polygon') {
    triangulatePolygon(g.coordinates, mesh);
  } else {
    for (const polygon of g.coordinates) triangulatePolygon(polygon, mesh);
  }
  if (maxTriangleEdgeDeg > 0) densify(mesh, maxTriangleEdgeDeg);

  const vertexCount = mesh.coords.length / 2;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    latLngToVector3(mesh.coords[2 * i + 1] ?? 0, mesh.coords[2 * i] ?? 0, radius, _v);
    positions[3 * i] = _v.x;
    positions[3 * i + 1] = _v.y;
    positions[3 * i + 2] = _v.z;
    _v.normalize();
    normals[3 * i] = _v.x;
    normals[3 * i + 1] = _v.y;
    normals[3 * i + 2] = _v.z;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setIndex(mesh.tris);
  geometry.computeBoundingSphere();
  return geometry;
}

/** True for geometries that can be filled. */
export function isPolygonal(geometry: BoundaryGeometry): geometry is PolygonGeometry | MultiPolygonGeometry {
  return geometry.type === 'Polygon' || geometry.type === 'MultiPolygon';
}

/* ------------------------------------------------------------------ */
/* Colours                                                             */
/* ------------------------------------------------------------------ */

const FALLBACK_ZONE_COLOR = '#64748b';
const FALLBACK_LINE_COLOR = '#cbd5e1';

/** Fill colour for a zone style; unknown styles fall back to a neutral slate. */
export function zoneColor(style: string): string {
  return ZONE_COLORS[style as ZoneStyle] ?? FALLBACK_ZONE_COLOR;
}

/** Stroke colour for a line style; unknown styles fall back to a light grey. */
export function lineColor(style: string): string {
  return LINE_COLORS[style as LineStyle] ?? FALLBACK_LINE_COLOR;
}
