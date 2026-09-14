/**
 * Shared data contract for the Middle East Crisis 3D timeline.
 *
 * Every file under src/data/ and every component under src/scene and src/ui
 * codes against these types. Keep changes here backwards-compatible with the
 * JSON in src/data/events.json, src/data/chapters.json and
 * src/data/boundaries/*.geojson, and re-run `npm run validate` after edits.
 */

export const EVENT_CATEGORIES = [
  'war',
  'treaty',
  'attack',
  'ceasefire',
  'displacement',
  'political',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/** 1 = minor/local, 5 = era-defining. Drives marker size. */
export type Significance = 1 | 2 | 3 | 4 | 5;

export interface Source {
  /** Title of the page/document as published. */
  title: string;
  /** Absolute https URL. */
  url: string;
  /** Publisher or institution, e.g. "United Nations", "Reuters", "BBC News". */
  publisher: string;
  /** ISO date (YYYY-MM-DD) the source was accessed. */
  accessedDate: string;
}

/** How one party frames the event. Descriptive, not evaluative. */
export interface Perspective {
  /** e.g. "Israeli government", "Palestinian Authority", "Hamas", "United Nations", "Arab League", "United States" */
  party: string;
  /** 1-3 sentences describing how this party characterises the event, including the terminology it uses. */
  framing: string;
}

/**
 * One attributed figure. When sources disagree, include one entry per source
 * so the UI can show them side by side.
 */
export interface CasualtyFigure {
  /** What is being counted, e.g. "Palestinians killed in Gaza", "Israelis killed", "Displaced". */
  label: string;
  /** The figure as reported, including qualifiers, e.g. "≈1,200", "more than 64,000", "379-459". */
  value: string;
  /** Who reports it, e.g. "Gaza Health Ministry", "IDF", "UN OCHA", "Israeli government". */
  attribution: string;
  /** Optional: date of the count or note about methodology. */
  note?: string;
}

export interface TimelineEvent {
  /** Stable slug, e.g. "1917-balfour-declaration". Unique across all eras. */
  id: string;
  /** ISO date YYYY-MM-DD. For multi-day events, the start date. */
  date: string;
  /** ISO date YYYY-MM-DD; only for events with a meaningful duration. */
  endDate?: string;
  lat: number;
  lng: number;
  /** Short human-readable place name, e.g. "Jerusalem", "Rafah, Gaza Strip". */
  location: string;
  title: string;
  category: EventCategory;
  significance: Significance;
  /** 80-150 words, neutral, descriptive. Casualty figures must be attributed inline. */
  summary: string;
  /** At least two parties. */
  perspectives: Perspective[];
  /** At least two independent sources. */
  sources: Source[];
  /** Chapter id this event belongs to; must match an id in chapters.json. */
  era: string;
  /**
   * true when the event and its key facts were confirmed against >= 2 independent
   * sources. Unverified events are excluded from the default view.
   */
  verified: boolean;
  /** Structured, attributed figures for side-by-side display. */
  casualties?: CasualtyFigure[];
  /** Optional Creative Commons image. */
  image?: {
    url: string;
    /** Attribution text shown in the panel, e.g. "Photo: Name, CC BY-SA 4.0, via Wikimedia Commons". */
    attribution: string;
    license: string;
  };
}

export interface CameraPose {
  /** Point on the globe the camera looks at. */
  lat: number;
  lng: number;
  /** Camera distance from the globe centre, in globe radii (globe radius = 1). ~1.6 close, ~3 wide. */
  distance: number;
}

export interface Chapter {
  /** Stable slug, e.g. "mandate". Also the basename of src/data/boundaries/<id>.geojson. */
  id: string;
  /** Short display title. */
  title: string;
  /** ISO date YYYY-MM-DD, inclusive. */
  start: string;
  /** ISO date YYYY-MM-DD, inclusive. */
  end: string;
  /** 150-250 word neutral overview. */
  overview: string;
  camera: CameraPose;
}

/* ------------------------------------------------------------------ */
/* Boundaries                                                          */
/* ------------------------------------------------------------------ */

/** Minimal GeoJSON typing (subset) so we do not depend on @types/geojson. */
export type Position = [number, number] | [number, number, number];

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}
export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}
export interface LineStringGeometry {
  type: 'LineString';
  coordinates: Position[];
}
export interface MultiLineStringGeometry {
  type: 'MultiLineString';
  coordinates: Position[][];
}

export type BoundaryGeometry =
  | PolygonGeometry
  | MultiPolygonGeometry
  | LineStringGeometry
  | MultiLineStringGeometry;

/** Fill style for zone features. Maps to a colour in the boundary layer. */
export const ZONE_STYLES = [
  'ottoman',
  'british-mandate',
  'french-mandate',
  'partition-jewish-state',
  'partition-arab-state',
  'partition-jerusalem',
  'israel',
  'jordan-administered',
  'egypt-administered',
  'israeli-occupied',
  'israeli-annexed',
  'pa-administered',
  'hamas-administered',
  'idf-control-zone',
  'un-buffer',
  'other-state',
] as const;
export type ZoneStyle = (typeof ZONE_STYLES)[number];

/** Line style for boundary-line features. */
export const LINE_STYLES = [
  'international',
  'mandate',
  'partition-proposal',
  'armistice',
  'ceasefire',
  'occupation',
  'barrier',
  'buffer',
] as const;
export type LineStyle = (typeof LINE_STYLES)[number];

export interface BoundaryFeatureProperties {
  /** Display name, e.g. "Mandatory Palestine", "1949 Armistice Line (Green Line)". */
  name: string;
  kind: 'zone' | 'line';
  /** A ZoneStyle when kind === 'zone', a LineStyle when kind === 'line'. */
  style: ZoneStyle | LineStyle;
  /** ISO date; feature is shown when validFrom <= currentDate <= validTo. */
  validFrom: string;
  validTo: string;
  /** Short neutral note on what the feature represents and its source. */
  note?: string;
  /** true when the geometry is a simplified/approximate rendering rather than a surveyed line. */
  approximate?: boolean;
  /** Where the geometry came from, e.g. "Natural Earth 10m" or "hand-digitised from UN map 1947". */
  source?: string;
}

export interface BoundaryFeature {
  type: 'Feature';
  geometry: BoundaryGeometry;
  properties: BoundaryFeatureProperties;
}

export interface BoundaryCollection {
  type: 'FeatureCollection';
  features: BoundaryFeature[];
}

/** Base world outline features (Natural Earth 110m). */
export interface WorldFeatureProperties {
  name: string;
  iso_a3: string;
}
export interface WorldFeature {
  type: 'Feature';
  geometry: PolygonGeometry | MultiPolygonGeometry;
  properties: WorldFeatureProperties;
}
export interface WorldCollection {
  type: 'FeatureCollection';
  features: WorldFeature[];
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const SCOPE_START = '1917-11-02';
export const SCOPE_END = '2026-09-09';

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  war: 'War / military operation',
  treaty: 'Treaty / agreement',
  attack: 'Attack',
  ceasefire: 'Ceasefire / truce',
  displacement: 'Displacement',
  political: 'Political / diplomatic',
};

/** Hex colours per category. Keep in sync with CSS variables in index.css. */
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  war: '#ef4444',
  treaty: '#22c55e',
  attack: '#f97316',
  ceasefire: '#38bdf8',
  displacement: '#a78bfa',
  political: '#facc15',
};

/** Fill colours for boundary zones (used by the globe layer and the legend). */
export const ZONE_COLORS: Record<ZoneStyle, string> = {
  'ottoman': '#8b5e3c',
  'british-mandate': '#c2410c',
  'french-mandate': '#1d4ed8',
  'partition-jewish-state': '#2563eb',
  'partition-arab-state': '#16a34a',
  'partition-jerusalem': '#e5e7eb',
  'israel': '#3b82f6',
  'jordan-administered': '#15803d',
  'egypt-administered': '#a16207',
  'israeli-occupied': '#60a5fa',
  'israeli-annexed': '#1e40af',
  'pa-administered': '#22c55e',
  'hamas-administered': '#166534',
  'idf-control-zone': '#fb923c',
  'un-buffer': '#67e8f9',
  'other-state': '#334155',
};

export const ZONE_LABELS: Record<ZoneStyle, string> = {
  'ottoman': 'Ottoman territory / Allied occupation',
  'british-mandate': 'British Mandate',
  'french-mandate': 'French Mandate',
  'partition-jewish-state': '1947 plan: proposed Jewish state',
  'partition-arab-state': '1947 plan: proposed Arab state',
  'partition-jerusalem': '1947 plan: Jerusalem (international)',
  'israel': 'Israel (within 1949 lines)',
  'jordan-administered': 'Jordanian administration',
  'egypt-administered': 'Egyptian administration',
  'israeli-occupied': 'Israeli military control / occupation',
  'israeli-annexed': 'Annexed by Israel (not recognised internationally)',
  'pa-administered': 'Palestinian Authority administration',
  'hamas-administered': 'Hamas administration',
  'idf-control-zone': 'Israeli-controlled zone (post-2023)',
  'un-buffer': 'UN buffer / separation zone',
  'other-state': 'Neighbouring state',
};

/** Stroke colours for boundary lines. */
export const LINE_COLORS: Record<LineStyle, string> = {
  'international': '#e5e7eb',
  'mandate': '#fdba74',
  'partition-proposal': '#facc15',
  'armistice': '#4ade80',
  'ceasefire': '#38bdf8',
  'occupation': '#93c5fd',
  'barrier': '#f87171',
  'buffer': '#67e8f9',
};

export const LINE_LABELS: Record<LineStyle, string> = {
  'international': 'International border',
  'mandate': 'Mandate boundary',
  'partition-proposal': '1947 partition plan line',
  'armistice': '1949 armistice line (Green Line)',
  'ceasefire': 'Ceasefire line',
  'occupation': 'Green Line (post-1967, Israeli-occupied beyond)',
  'barrier': 'West Bank barrier (route)',
  'buffer': 'Buffer / withdrawal line',
};
