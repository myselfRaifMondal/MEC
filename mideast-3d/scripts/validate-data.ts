/**
 * Schema validation for src/data/events.json, src/data/chapters.json and
 * src/data/boundaries/*.geojson.
 *
 *   npm run validate            # schema checks
 *   npm run validate -- --links # additionally HEAD/GET every source URL
 *
 * Exits non-zero on any error. Warnings are informational.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_DIR = resolve(ROOT, 'src', 'data');
const BOUNDARY_DIR = resolve(DATA_DIR, 'boundaries');

/** Sources for events after this date must have been accessed on DATA_ACCESSED_DATE. */
const RECENT_CUTOFF = '2026-06-01';
const DATA_ACCESSED_DATE = '2026-09-14';
const SCOPE_START = '1917-11-02';
const SCOPE_END = '2026-09-09';

const EVENT_CATEGORIES = ['war', 'treaty', 'attack', 'ceasefire', 'displacement', 'political'];
const ZONE_STYLES = [
  'ottoman', 'british-mandate', 'french-mandate', 'partition-jewish-state', 'partition-arab-state',
  'partition-jerusalem', 'israel', 'jordan-administered', 'egypt-administered', 'israeli-occupied',
  'israeli-annexed', 'pa-administered', 'hamas-administered', 'idf-control-zone', 'un-buffer', 'other-state',
];
const LINE_STYLES = ['international', 'mandate', 'partition-proposal', 'armistice', 'ceasefire', 'occupation', 'barrier', 'buffer'];

const MIN_EVENTS = 150;
const MIN_SOURCES = 2;
const SUMMARY_WORDS: [number, number] = [80, 150];
const OVERVIEW_WORDS: [number, number] = [150, 250];
const CHAPTER_COUNT: [number, number] = [10, 14];

const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string): void => { errors.push(m); };
const warn = (m: string): void => { warnings.push(m); };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/* ------------------------------ chapters ------------------------------ */

interface ChapterLite { id: string; start: string; end: string }
const chapters: ChapterLite[] = [];

function validateChapters(): void {
  const raw = readJson(resolve(DATA_DIR, 'chapters.json'));
  if (!Array.isArray(raw)) return err('chapters.json must be an array');
  if (raw.length < CHAPTER_COUNT[0] || raw.length > CHAPTER_COUNT[1]) {
    err(`chapters.json has ${raw.length} chapters; expected ${CHAPTER_COUNT[0]}-${CHAPTER_COUNT[1]}`);
  }
  const ids = new Set<string>();
  let prevEnd: string | null = null;
  raw.forEach((c, i) => {
    const where = `chapters[${i}]`;
    if (!isRecord(c)) return err(`${where} is not an object`);
    const id = c.id;
    if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) return err(`${where}.id must be a kebab-case string`);
    if (ids.has(id)) err(`${where}.id "${id}" duplicated`);
    ids.add(id);
    if (typeof c.title !== 'string' || !c.title.trim()) err(`${id}: title missing`);
    if (!isIsoDate(c.start)) err(`${id}: start must be ISO date`);
    if (!isIsoDate(c.end)) err(`${id}: end must be ISO date`);
    if (isIsoDate(c.start) && isIsoDate(c.end)) {
      if (c.start > c.end) err(`${id}: start > end`);
      if (prevEnd && c.start <= prevEnd) err(`${id}: chapters must be chronological and non-overlapping (start ${c.start} <= previous end ${prevEnd})`);
      if (i === 0 && c.start !== SCOPE_START) err(`${id}: first chapter must start at ${SCOPE_START}`);
      if (i === raw.length - 1 && c.end !== SCOPE_END) err(`${id}: last chapter must end at ${SCOPE_END}`);
      prevEnd = c.end;
      chapters.push({ id, start: c.start, end: c.end });
    }
    if (typeof c.overview !== 'string') err(`${id}: overview missing`);
    else {
      const w = wordCount(c.overview);
      if (w < OVERVIEW_WORDS[0] || w > OVERVIEW_WORDS[1]) err(`${id}: overview is ${w} words; expected ${OVERVIEW_WORDS[0]}-${OVERVIEW_WORDS[1]}`);
      if (/PLACEHOLDER/i.test(c.overview)) err(`${id}: overview still contains PLACEHOLDER`);
    }
    const cam = c.camera;
    if (!isRecord(cam) || typeof cam.lat !== 'number' || typeof cam.lng !== 'number' || typeof cam.distance !== 'number') {
      err(`${id}: camera must be {lat, lng, distance}`);
    } else if (cam.distance < 1.05 || cam.distance > 6) warn(`${id}: camera.distance ${cam.distance} is unusual (expected ~1.3-4)`);
    if (!existsSync(resolve(BOUNDARY_DIR, `${id}.geojson`))) err(`${id}: missing boundaries file src/data/boundaries/${id}.geojson`);
  });
}

/* ------------------------------- events ------------------------------- */

interface SourceLite { url: string; eventId: string }
const allSources: SourceLite[] = [];
const stats = { events: 0, verified: 0, unverified: [] as string[], recent: 0, byEra: {} as Record<string, number>, byCategory: {} as Record<string, number>, sources: 0, withCasualties: 0 };

function validateSource(s: unknown, where: string): { url: string; accessedDate: string; publisher: string } | null {
  if (!isRecord(s)) { err(`${where}: source is not an object`); return null; }
  const { title, url, publisher, accessedDate } = s;
  let ok = true;
  if (typeof title !== 'string' || !title.trim()) { err(`${where}: source.title missing`); ok = false; }
  if (typeof url !== 'string' || !/^https?:\/\/\S+$/.test(url)) { err(`${where}: source.url must be an absolute http(s) URL`); ok = false; }
  if (typeof publisher !== 'string' || !publisher.trim()) { err(`${where}: source.publisher missing`); ok = false; }
  if (!isIsoDate(accessedDate)) { err(`${where}: source.accessedDate must be ISO date`); ok = false; }
  if (typeof url === 'string' && /wikipedia\.org/i.test(url)) warn(`${where}: Wikipedia is cited (${url}); prefer primary/secondary sources`);
  return ok ? { url: url as string, accessedDate: accessedDate as string, publisher: publisher as string } : null;
}

function validateEvents(): void {
  const raw = readJson(resolve(DATA_DIR, 'events.json'));
  if (!Array.isArray(raw)) return err('events.json must be an array');
  const ids = new Set<string>();
  const chapterIds = new Set(chapters.map((c) => c.id));
  raw.forEach((e, i) => {
    const where = isRecord(e) && typeof e.id === 'string' ? e.id : `events[${i}]`;
    if (!isRecord(e)) return err(`${where}: not an object`);
    stats.events++;
    if (typeof e.id !== 'string' || !/^[a-z0-9-]+$/.test(e.id)) err(`${where}: id must be kebab-case`);
    else if (ids.has(e.id)) err(`${where}: duplicate id`);
    else ids.add(e.id);

    if (!isIsoDate(e.date)) err(`${where}: date must be ISO date`);
    else if (e.date < SCOPE_START || e.date > SCOPE_END) err(`${where}: date ${e.date} outside scope ${SCOPE_START}..${SCOPE_END}`);
    if (e.endDate !== undefined) {
      if (!isIsoDate(e.endDate)) err(`${where}: endDate must be ISO date`);
      else if (isIsoDate(e.date) && e.endDate < e.date) err(`${where}: endDate before date`);
      else if (e.endDate > SCOPE_END) err(`${where}: endDate ${e.endDate} after scope end`);
    }
    if (typeof e.lat !== 'number' || e.lat < -90 || e.lat > 90) err(`${where}: lat invalid`);
    if (typeof e.lng !== 'number' || e.lng < -180 || e.lng > 180) err(`${where}: lng invalid`);
    if (typeof e.location !== 'string' || !e.location.trim()) err(`${where}: location missing`);
    if (typeof e.title !== 'string' || !e.title.trim()) err(`${where}: title missing`);
    else if (e.title.length > 90) warn(`${where}: title is long (${e.title.length} chars)`);
    if (typeof e.category !== 'string' || !EVENT_CATEGORIES.includes(e.category)) err(`${where}: category must be one of ${EVENT_CATEGORIES.join(', ')}`);
    else stats.byCategory[e.category] = (stats.byCategory[e.category] ?? 0) + 1;
    if (typeof e.significance !== 'number' || !Number.isInteger(e.significance) || e.significance < 1 || e.significance > 5) err(`${where}: significance must be an integer 1-5`);
    if (typeof e.summary !== 'string') err(`${where}: summary missing`);
    else {
      const w = wordCount(e.summary);
      if (w < SUMMARY_WORDS[0] || w > SUMMARY_WORDS[1]) err(`${where}: summary is ${w} words; expected ${SUMMARY_WORDS[0]}-${SUMMARY_WORDS[1]}`);
      if (/PLACEHOLDER/i.test(e.summary)) err(`${where}: summary contains PLACEHOLDER`);
    }
    if (!Array.isArray(e.perspectives) || e.perspectives.length < 2) err(`${where}: perspectives must list >= 2 parties`);
    else {
      const parties = new Set<string>();
      e.perspectives.forEach((p, j) => {
        if (!isRecord(p) || typeof p.party !== 'string' || !p.party.trim() || typeof p.framing !== 'string' || !p.framing.trim()) err(`${where}: perspectives[${j}] must be {party, framing}`);
        else parties.add(p.party.trim().toLowerCase());
      });
      if (parties.size < 2) err(`${where}: perspectives must come from >= 2 distinct parties`);
    }
    if (!Array.isArray(e.sources) || e.sources.length < MIN_SOURCES) err(`${where}: needs >= ${MIN_SOURCES} sources`);
    else {
      const publishers = new Set<string>();
      const urls = new Set<string>();
      e.sources.forEach((s, j) => {
        const v = validateSource(s, `${where}.sources[${j}]`);
        if (!v) return;
        stats.sources++;
        publishers.add(v.publisher.trim().toLowerCase());
        if (urls.has(v.url)) err(`${where}: duplicate source url ${v.url}`);
        urls.add(v.url);
        allSources.push({ url: v.url, eventId: where });
        if (isIsoDate(e.date) && e.date > RECENT_CUTOFF && v.accessedDate !== DATA_ACCESSED_DATE) {
          err(`${where}: event after ${RECENT_CUTOFF} must have sources accessed on ${DATA_ACCESSED_DATE} (got ${v.accessedDate})`);
        }
      });
      if (publishers.size < 2) err(`${where}: sources must come from >= 2 distinct publishers`);
    }
    if (typeof e.era !== 'string' || !chapterIds.has(e.era)) err(`${where}: era "${String(e.era)}" does not match a chapter id`);
    else {
      stats.byEra[e.era] = (stats.byEra[e.era] ?? 0) + 1;
      const ch = chapters.find((c) => c.id === e.era);
      if (ch && isIsoDate(e.date) && (e.date < ch.start || e.date > ch.end)) err(`${where}: date ${e.date} outside its chapter "${e.era}" (${ch.start}..${ch.end})`);
    }
    if (typeof e.verified !== 'boolean') err(`${where}: verified must be boolean`);
    else if (e.verified) stats.verified++;
    else stats.unverified.push(where);
    if (isIsoDate(e.date) && e.date > RECENT_CUTOFF) {
      stats.recent++;
      if (e.verified !== true) err(`${where}: events after ${RECENT_CUTOFF} must be verified: true (or removed)`);
    }
    if (e.casualties !== undefined) {
      if (!Array.isArray(e.casualties) || e.casualties.length === 0) err(`${where}: casualties must be a non-empty array when present`);
      else {
        stats.withCasualties++;
        e.casualties.forEach((c, j) => {
          if (!isRecord(c) || typeof c.label !== 'string' || typeof c.value !== 'string' || typeof c.attribution !== 'string' || !c.attribution.trim()) {
            err(`${where}: casualties[${j}] must be {label, value, attribution}`);
          }
        });
      }
    }
    if (e.image !== undefined) {
      if (!isRecord(e.image) || typeof e.image.url !== 'string' || typeof e.image.attribution !== 'string' || typeof e.image.license !== 'string') err(`${where}: image must be {url, attribution, license}`);
      else if (!/CC|Creative Commons|Public Domain/i.test(e.image.license)) err(`${where}: image.license must be a Creative Commons or public-domain licence`);
    }
    const allowed = new Set(['id', 'date', 'endDate', 'lat', 'lng', 'location', 'title', 'category', 'significance', 'summary', 'perspectives', 'sources', 'era', 'verified', 'casualties', 'image']);
    for (const k of Object.keys(e)) if (!allowed.has(k)) err(`${where}: unexpected field "${k}"`);
  });
  if (stats.events < MIN_EVENTS) err(`events.json has ${stats.events} events; minimum is ${MIN_EVENTS}`);
  for (const c of chapters) if (!stats.byEra[c.id]) err(`chapter "${c.id}" has no events`);
}

/* ----------------------------- boundaries ----------------------------- */

function checkPositions(coords: unknown, where: string, depth: number): number {
  if (!Array.isArray(coords)) { err(`${where}: coordinates malformed`); return 0; }
  if (depth === 0) {
    const [lng, lat] = coords as unknown[];
    if (typeof lng !== 'number' || typeof lat !== 'number' || lng < -180 || lng > 180 || lat < -90 || lat > 90) err(`${where}: position out of range ${JSON.stringify(coords)}`);
    return 1;
  }
  let n = 0;
  for (const c of coords) n += checkPositions(c, where, depth - 1);
  return n;
}

const boundaryStats: Record<string, { features: number; zones: number; lines: number; approximate: number; vertices: number }> = {};

function validateBoundaries(): void {
  if (!existsSync(BOUNDARY_DIR)) return err('src/data/boundaries directory missing');
  const files = readdirSync(BOUNDARY_DIR).filter((f) => f.endsWith('.geojson'));
  if (!files.some((f) => f === 'world-110m.geojson')) err('boundaries/world-110m.geojson missing');
  for (const file of files) {
    const path = resolve(BOUNDARY_DIR, file);
    const name = basename(file, '.geojson');
    let raw: unknown;
    try { raw = readJson(path); } catch (e) { err(`${file}: invalid JSON (${(e as Error).message})`); continue; }
    if (!isRecord(raw) || raw.type !== 'FeatureCollection' || !Array.isArray(raw.features)) { err(`${file}: must be a FeatureCollection`); continue; }
    const s = { features: 0, zones: 0, lines: 0, approximate: 0, vertices: 0 };
    boundaryStats[name] = s;
    const isWorld = name === 'world-110m';
    raw.features.forEach((f, i) => {
      const where = `${file}[${i}]`;
      if (!isRecord(f) || f.type !== 'Feature' || !isRecord(f.geometry) || !isRecord(f.properties)) return err(`${where}: malformed feature`);
      s.features++;
      const g = f.geometry;
      const depth = g.type === 'Polygon' ? 2 : g.type === 'MultiPolygon' ? 3 : g.type === 'LineString' ? 1 : g.type === 'MultiLineString' ? 2 : -1;
      if (depth < 0) return err(`${where}: unsupported geometry type ${String(g.type)}`);
      s.vertices += checkPositions(g.coordinates, where, depth);
      const p = f.properties;
      if (isWorld) {
        if (typeof p.name !== 'string' || typeof p.iso_a3 !== 'string') err(`${where}: world features need {name, iso_a3}`);
        return;
      }
      if (typeof p.name !== 'string' || !p.name.trim()) err(`${where}: name missing`);
      if (p.kind !== 'zone' && p.kind !== 'line') err(`${where}: kind must be "zone" or "line"`);
      if (p.kind === 'zone') {
        s.zones++;
        if (!ZONE_STYLES.includes(String(p.style))) err(`${where}: zone style "${String(p.style)}" unknown`);
        if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') err(`${where}: zones must be polygons`);
      }
      if (p.kind === 'line') {
        s.lines++;
        if (!LINE_STYLES.includes(String(p.style))) err(`${where}: line style "${String(p.style)}" unknown`);
        if (g.type !== 'LineString' && g.type !== 'MultiLineString') err(`${where}: lines must be linestrings`);
      }
      if (!isIsoDate(p.validFrom)) err(`${where}: validFrom must be ISO date`);
      if (!isIsoDate(p.validTo)) err(`${where}: validTo must be ISO date`);
      if (isIsoDate(p.validFrom) && isIsoDate(p.validTo) && p.validFrom > p.validTo) err(`${where}: validFrom > validTo`);
      if (p.approximate === true) s.approximate++;
      const ch = chapters.find((c) => c.id === name);
      if (ch && isIsoDate(p.validFrom) && isIsoDate(p.validTo) && (p.validTo < ch.start || p.validFrom > ch.end)) {
        warn(`${where}: validity ${p.validFrom}..${p.validTo} never overlaps chapter ${name} (${ch.start}..${ch.end})`);
      }
    });
    if (!isWorld && s.features === 0) err(`${file}: no features`);
  }
}

/* ------------------------------- links -------------------------------- */

async function checkLinks(): Promise<void> {
  const unique = [...new Map(allSources.map((s) => [s.url, s])).values()];
  console.log(`Checking ${unique.length} unique source URLs...`);
  const dead: string[] = [];
  const blocked: string[] = [];
  const unreachable: string[] = [];
  let i = 0;
  const worker = async () => {
    while (i < unique.length) {
      const s = unique[i++]!;
      const status = await fetchStatus(s.url);
      if (status === 404 || status === 410) dead.push(`${s.eventId}: ${s.url} (${status})`);
      else if (status === 0) unreachable.push(`${s.eventId}: ${s.url}`);
      else if (status === 401 || status === 403 || status === 429) blocked.push(`${s.eventId}: ${s.url} (${status})`);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  for (const d of dead) err(`dead link - ${d}`);
  for (const b of blocked) warn(`bot-blocked (could not verify) - ${b}`);
  // A network error (DNS failure, refused/blocked connection, timeout) says nothing
  // about the page itself, e.g. when run behind an egress-restricted proxy.
  for (const u of unreachable) warn(`unreachable from this network (could not verify) - ${u}`);
  const ok = unique.length - dead.length - blocked.length - unreachable.length;
  console.log(`Links: ${ok} ok, ${blocked.length} bot-blocked, ${unreachable.length} unreachable from this network, ${dead.length} dead`);
  if (unreachable.length > unique.length / 2) {
    console.log('Most URLs were unreachable: this network appears to block outbound access; re-run the link check from an unrestricted machine.');
  }
}

async function fetchStatus(url: string): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    let r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; mideast-3d-linkcheck)' } });
    if (r.status === 405 || r.status === 403 || r.status === 400) {
      r = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; mideast-3d-linkcheck)' } });
    }
    return r.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

/* -------------------------------- main -------------------------------- */

async function main(): Promise<void> {
  validateChapters();
  validateEvents();
  validateBoundaries();
  if (process.argv.includes('--links')) await checkLinks();

  console.log('\n=== Data summary ===');
  console.log(`Chapters: ${chapters.length}`);
  console.log(`Events: ${stats.events} (verified ${stats.verified}, unverified ${stats.unverified.length}, dated after ${RECENT_CUTOFF}: ${stats.recent})`);
  console.log(`Sources: ${stats.sources} (${(stats.sources / Math.max(1, stats.events)).toFixed(2)} per event); events with structured casualty figures: ${stats.withCasualties}`);
  console.log('By era:', stats.byEra);
  console.log('By category:', stats.byCategory);
  console.log('Boundaries:', boundaryStats);
  if (stats.unverified.length) console.log('Unverified (excluded from default view):', stats.unverified.join(', '));

  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log('  - ' + w);
  }
  if (errors.length) {
    console.error(`\n${errors.length} error(s):`);
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }
  console.log('\nValidation passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
