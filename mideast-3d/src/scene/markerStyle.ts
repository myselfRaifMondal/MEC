/**
 * Shared sizing / colour constants for the 3D event markers.
 *
 * Kept separate from EventMarkers.tsx so other scene or UI code (legends,
 * tests) can reuse the same numbers without importing the r3f component.
 * All distances are in scene units (globe radius = 1).
 */
import { CATEGORY_COLORS, type EventCategory, type Significance } from '../data/types';
import { DAY_MS } from '../state/store';

/** Marker centre sits just above the globe surface (radius 1). */
export const MARKER_ALTITUDE = 1.006;
/** Highlight rings float slightly higher so they never z-fight with boundary layers. */
export const RING_ALTITUDE = 1.009;

/** Body radius for significance 1 ... 5 (linear interpolation in between). */
export const MARKER_MIN_RADIUS = 0.006;
export const MARKER_MAX_RADIUS = 0.016;

/**
 * Markers at an identical (lat, lng) are spread on a small hexagonal ring so
 * every one of them stays clickable. This is the ring step for the smallest
 * markers; it grows with the body radius of the co-located group.
 */
export const OVERLAP_RING_STEP = 0.004;

/** Events dated within this window before the current time get a pulsing ring. */
export const RECENT_WINDOW_DAYS = 120;
export const RECENT_WINDOW_MS = RECENT_WINDOW_DAYS * DAY_MS;

/** Body scale multipliers for the selected / hovered marker. */
export const SELECTED_BODY_SCALE = 1.3;
export const HOVERED_BODY_SCALE = 1.15;

/** Ring geometry scale relative to the body radius. */
export const RECENT_RING_SCALE = 1.9;
export const RECENT_RING_PULSE = 0.55;
export const SELECTED_RING_SCALE = 2.3;
export const SELECTED_RING_PULSE = 0.3;

export const RECENT_RING_OPACITY = 0.42;
export const SELECTED_RING_OPACITY = 0.9;

/**
 * Invisible hit spheres are sized in screen pixels (converted to scene units
 * from the camera distance each frame) with this floor in scene units.
 */
export const HIT_MIN_RADIUS = 0.012;
export const HIT_RADIUS_PX_FINE = 12;
/** ~44px touch target on coarse pointers. */
export const HIT_RADIUS_PX_COARSE = 22;

/** Fallback colour for an unknown category (should not happen with validated data). */
export const MARKER_FALLBACK_COLOR = '#e5e7eb';

/** Body radius in scene units for a significance value (clamped to 1..5). */
export function markerRadius(significance: Significance | number): number {
  const s = Math.min(5, Math.max(1, Math.round(Number.isFinite(significance) ? significance : 3)));
  return MARKER_MIN_RADIUS + ((s - 1) / 4) * (MARKER_MAX_RADIUS - MARKER_MIN_RADIUS);
}

/** Hex colour for an event category. */
export function markerColor(category: EventCategory | string): string {
  const colours: Record<string, string | undefined> = CATEGORY_COLORS;
  return colours[category] ?? MARKER_FALLBACK_COLOR;
}
