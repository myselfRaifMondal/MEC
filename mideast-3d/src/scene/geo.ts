import { Vector3 } from 'three';

/** Globe radius in scene units. All camera distances in chapters.json are multiples of this. */
export const GLOBE_RADIUS = 1;

/**
 * Convert geographic coordinates to a point on (or above) the globe.
 * Uses the standard three.js convention: +Y up, longitude 0 on +Z after rotation.
 */
export function latLngToVector3(lat: number, lng: number, radius: number = GLOBE_RADIUS, target?: Vector3): Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  const v = target ?? new Vector3();
  return v.set(x, y, z);
}

/** Inverse of latLngToVector3 for a point on the unit sphere. */
export function vector3ToLatLng(v: Vector3): { lat: number; lng: number } {
  const n = v.clone().normalize();
  const lat = 90 - Math.acos(n.y) * (180 / Math.PI);
  const theta = Math.atan2(n.z, -n.x);
  let lng = theta * (180 / Math.PI) - 180;
  if (lng < -180) lng += 360;
  if (lng > 180) lng -= 360;
  return { lat, lng };
}
