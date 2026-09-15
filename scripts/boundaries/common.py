"""
common.py - loaders and helpers shared by every boundary builder.

Run through  python3 scripts/build-boundaries.py  (which puts this directory on
sys.path and imports build_*.py modules), or run one builder directly, e.g.
python3 scripts/boundaries/build_middle.py.

DATA SOURCE (public domain): Natural Earth, https://www.naturalearthdata.com/
The build needs four GeoJSON files, looked for in the directory given by the
NE_DIR environment variable (default: the session scratchpad below).  Missing
files are downloaded with urllib from the Natural Earth vector mirror
    https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/
so the build is reproducible on a clean machine:
    ne_110m_admin_0_countries.geojson        - world base layer (world-110m.geojson)
    ne_10m_admin_0_countries.geojson         - Israel (ADM0_A3 ISR, drawn *including*
                                               the Golan Heights, East Jerusalem and the
                                               Shebaa Farms), Palestine (ADM0_A3 PSX:
                                               one MultiPolygon = West Bank + Gaza Strip),
                                               Lebanon, Syria, Jordan, Egypt ...
    ne_10m_admin_0_boundary_lines_land.geojson - not used for derivation (lines are
                                               derived from polygon adjacency, see
                                               shared_line) but downloaded for reference
    ne_10m_admin_0_disputed_areas.geojson    - 'Golan Heights', 'UNDOF Zone' (the UN area
                                               of separation, coded to Syria), 'East
                                               Jerusalem', 'Shebaa Farms', "No Man's Land
                                               (Fort Latrun)", "No Man's Land (Jerusalem)",
                                               'Mount Scopus', 'Israel' (= ISR minus all of
                                               the above), 'West Bank', 'Gaza'

How Natural Earth is turned into the historical layers
  * israel_proper()   = NE disputed 'Israel' polygon + Latrun no-man's land, i.e. Israel
                        within the 1949 armistice lines as held since 1967 (no Golan, no
                        East Jerusalem).
  * west_bank(), gaza() come from the PSX MultiPolygon split by longitude.
  * east_jerusalem()  = NE 'East Jerusalem' + the Jerusalem no-man's land + Mount Scopus
                        (~70 km2 annexed municipal area).
  * golan()           = NE 'Golan Heights' (+ Shebaa Farms when asked).
  * undof_zone()      = NE 'UNDOF Zone' polygon east of the 1974 line.
  * split_sinai()     cuts Egypt along the Suez Canal (hand polyline in handmade.py).
  * shared_line(a, b) derives a boundary LINE from polygon adjacency (never by hand
                        where both polygons come from Natural Earth).

Output contract: see src/data/types.ts (BoundaryFeature).  feature() builds one
feature dict with coordinates rounded to 4 decimals; write_chapter() writes
src/data/boundaries/<chapterId>.geojson with every feature whose validity
overlaps the chapter's date range.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Sequence

import shapely
from shapely.geometry import (
    GeometryCollection,
    LineString,
    MultiLineString,
    MultiPolygon,
    Polygon,
    mapping,
    shape,
)
from shapely.ops import linemerge, split, unary_union

sys.path.insert(0, str(Path(__file__).resolve().parent))
import handmade  # noqa: E402  (pure data module, no imports from common)

# --------------------------------------------------------------------------- paths
ROOT = Path(__file__).resolve().parents[2]  # .../mideast-3d
DATA_DIR = ROOT / 'src' / 'data'
OUT_DIR = DATA_DIR / 'boundaries'
DEFAULT_NE_DIR = Path('/tmp/claude-0/-home-user-MEC/05609891-73e5-5bd8-a101-6260882861e0/scratchpad/ne')
NE_BASE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
NE_FILES = (
    'ne_110m_admin_0_countries.geojson',
    'ne_10m_admin_0_countries.geojson',
    'ne_10m_admin_0_boundary_lines_land.geojson',
    'ne_10m_admin_0_disputed_areas.geojson',
)

# Sentinel end date for features that are still in force at the end of the app's scope.
OPEN_END = '2026-12-31'

# Simplification tolerances (degrees).  Israel/Palestine/Lebanon keep more detail than
# the large neighbours, whose outlines are only context.
TOL_FINE = 0.004
TOL_COARSE = 0.01

ZONE_STYLES = (
    'ottoman', 'british-mandate', 'french-mandate', 'partition-jewish-state',
    'partition-arab-state', 'partition-jerusalem', 'israel', 'jordan-administered',
    'egypt-administered', 'israeli-occupied', 'israeli-annexed', 'pa-administered',
    'hamas-administered', 'idf-control-zone', 'un-buffer', 'other-state',
)
LINE_STYLES = (
    'international', 'mandate', 'partition-proposal', 'armistice', 'ceasefire',
    'occupation', 'barrier', 'buffer',
)

NE_SOURCE_10M = 'Natural Earth 1:10m admin-0 (public domain)'
NE_SOURCE_DISPUTED = 'Natural Earth 1:10m admin-0 disputed areas (public domain)'


def ne_dir() -> Path:
    return Path(os.environ.get('NE_DIR') or DEFAULT_NE_DIR)


def ensure_ne() -> Path:
    """Download any missing Natural Earth file into ne_dir(); return the directory."""
    d = ne_dir()
    d.mkdir(parents=True, exist_ok=True)
    for name in NE_FILES:
        target = d / name
        if target.exists() and target.stat().st_size > 0:
            continue
        url = NE_BASE_URL + name
        print(f'[common] downloading {url}', file=sys.stderr)
        tmp = target.with_suffix('.part')
        with urllib.request.urlopen(url, timeout=120) as resp, open(tmp, 'wb') as fh:
            while True:
                chunk = resp.read(1 << 20)
                if not chunk:
                    break
                fh.write(chunk)
        tmp.replace(target)
    return d


@lru_cache(maxsize=None)
def load_ne(name: str) -> dict:
    """Parsed GeoJSON of one Natural Earth file (downloaded if missing)."""
    path = ensure_ne() / name
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


@lru_cache(maxsize=None)
def ne_countries(res: str = '10m') -> dict:
    """ADM0_A3 -> shapely geometry for the admin-0 countries dataset ('10m' or '110m')."""
    fc = load_ne(f'ne_{res}_admin_0_countries.geojson')
    out = {}
    for f in fc['features']:
        a3 = f['properties'].get('ADM0_A3')
        if a3:
            out[a3] = clean(shape(f['geometry']))
    return out


def country(a3: str, res: str = '10m'):
    """Country polygon by ADM0_A3 code (e.g. 'LBN', 'SYR', 'JOR', 'EGY', 'ISR', 'PSX')."""
    try:
        return ne_countries(res)[a3]
    except KeyError as exc:
        raise KeyError(f'{a3} not in ne_{res}_admin_0_countries') from exc


@lru_cache(maxsize=None)
def disputed_areas() -> dict:
    """NAME -> geometry for ne_10m_admin_0_disputed_areas."""
    fc = load_ne('ne_10m_admin_0_disputed_areas.geojson')
    return {f['properties']['NAME']: clean(shape(f['geometry'])) for f in fc['features']}


def disputed(name: str):
    try:
        return disputed_areas()[name]
    except KeyError as exc:
        raise KeyError(f'{name!r} not in disputed areas; have {sorted(disputed_areas())}') from exc


# ---------------------------------------------------------------- Levant building blocks
def palestine_parts():
    """(west_bank, gaza) polygons from the NE 'Palestine' (ADM0_A3 PSX) MultiPolygon.

    Gaza is the small coastal polygon around 34.3E / 31.4N; everything east of 34.7E is
    the West Bank."""
    psx = country('PSX')
    parts = list(getattr(psx, 'geoms', [psx]))
    gaza = unary_union([p for p in parts if p.centroid.x < 34.7])
    west_bank = unary_union([p for p in parts if p.centroid.x >= 34.7])
    return clean(west_bank), clean(gaza)


def west_bank():
    return palestine_parts()[0]


def gaza():
    return palestine_parts()[1]


def golan(include_shebaa: bool = True):
    """Golan Heights held by Israel since 1967 (NE disputed polygon; its eastern edge is the
    1974 disengagement 'Alpha' line).  Shebaa Farms are drawn as a separate NE polygon
    and are merged in by default."""
    g = disputed('Golan Heights')
    if include_shebaa:
        g = unary_union([g, disputed('Shebaa Farms')])
    return clean(g)


def shebaa_farms():
    return disputed('Shebaa Farms')


def undof_zone():
    """UN Disengagement Observer Force area of separation (1974), east of the Golan."""
    return disputed('UNDOF Zone')


def east_jerusalem():
    """East Jerusalem as annexed in June 1967 (~70 km2): the NE 'East Jerusalem' polygon
    plus the Jerusalem no-man's land and the Mount Scopus enclave."""
    return clean(unary_union([
        disputed('East Jerusalem'),
        disputed("No Man's Land (Jerusalem)"),
        disputed('Mount Scopus'),
    ]))


def latrun_no_mans_land():
    return disputed("No Man's Land (Fort Latrun)")


def israel_proper(include_latrun: bool = True):
    """Israel within the 1949 armistice lines: NE ISR minus Golan, Shebaa Farms, East
    Jerusalem, the Jerusalem no-man's land and Mount Scopus (this is exactly the NE
    disputed 'Israel' polygon).  The Latrun no-man's land, held by Israel since 1967,
    is included unless include_latrun=False (pre-1967 maps)."""
    g = disputed('Israel')
    if include_latrun:
        g = unary_union([g, latrun_no_mans_land()])
    return clean(g)


def israel_full():
    """Everything Natural Earth draws as Israel (incl. Golan, Shebaa, East Jerusalem)."""
    return country('ISR')


def split_sinai(egypt=None):
    """Cut Egypt along the Suez Canal.  Returns (sinai, egypt_west_of_canal).

    The canal is the hand polyline handmade.SUEZ_CANAL (Port Said - Ismailia - Suez,
    extended into the sea at both ends).  Egypt's islands are assigned by longitude."""
    egypt = egypt if egypt is not None else country('EGY')
    canal = LineString(handmade.SUEZ_CANAL)
    east, west = [], []
    for part in getattr(egypt, 'geoms', [egypt]):
        if not part.intersects(canal):
            (east if part.centroid.x > 32.6 else west).append(part)
            continue
        for piece in split(part, canal).geoms:
            if piece.area < 1e-5:
                continue
            (east if piece.centroid.x > canal.interpolate(0.5, normalized=True).x else west).append(piece)
    return clean(unary_union(east)), clean(unary_union(west))


# ------------------------------------------------------------------ geometry helpers
def clean(geom):
    """Make a polygonal geometry valid (buffer(0)) and drop non-polygon pieces."""
    if geom is None or geom.is_empty:
        return geom
    if geom.geom_type in ('Polygon', 'MultiPolygon', 'GeometryCollection'):
        if not geom.is_valid:
            geom = geom.buffer(0)
        if geom.geom_type == 'GeometryCollection':
            polys = [g for g in geom.geoms if g.geom_type in ('Polygon', 'MultiPolygon')]
            geom = unary_union(polys) if polys else Polygon()
    return geom


def drop_slivers(geom, min_area: float = 2e-5):
    """Remove polygon parts smaller than min_area square degrees (~0.2 km2)."""
    parts = [p for p in getattr(geom, 'geoms', [geom]) if p.geom_type == 'Polygon' and p.area >= min_area]
    if not parts:
        return Polygon()
    return parts[0] if len(parts) == 1 else MultiPolygon(parts)


def simplify(geom, tol: float | None):
    """Topology-preserving simplification followed by clean-up."""
    if tol is None or tol <= 0:
        return geom
    out = geom.simplify(tol, preserve_topology=True)
    if out.geom_type in ('Polygon', 'MultiPolygon', 'GeometryCollection'):
        out = clean(out)
    return out


def lines_only(geom):
    """Keep only the LineString parts of a geometry, merged where possible."""
    if geom.is_empty:
        return LineString()
    parts = []
    for g in getattr(geom, 'geoms', [geom]):
        if g.geom_type == 'LineString' and g.length > 0:
            parts.append(g)
        elif g.geom_type == 'MultiLineString':
            parts.extend(p for p in g.geoms if p.length > 0)
    if not parts:
        return LineString()
    merged = linemerge(parts)
    return merged


def shared_line(a, b, tol: float | None = None, snap: float = 1e-6):
    """Boundary line shared by polygons a and b, derived from adjacency.

    b's boundary is buffered by `snap` (~10 cm) so tiny vertex mismatches still count as
    shared; the pieces of a's boundary inside that ribbon are merged and simplified."""
    ribbon = b.boundary.buffer(snap)
    line = lines_only(a.boundary.intersection(ribbon))
    if tol:
        line = line.simplify(tol, preserve_topology=True)
    return line


def polygon(coords: Sequence[Sequence[float]]) -> Polygon:
    """Polygon from a hand-digitised [[lng, lat], ...] ring (closed automatically)."""
    ring = [tuple(c) for c in coords]
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    return clean(Polygon(ring))


def polyline(coords: Sequence[Sequence[float]]) -> LineString:
    return LineString([tuple(c) for c in coords])


def side_polygon(coords: Sequence[Sequence[float]], side: str, pad: float = 3.0) -> Polygon:
    """Large polygon on one side ('south'|'north'|'east'|'west') of a hand polyline.

    The polyline is extended horizontally (for south/north) or vertically (for
    east/west) far beyond its ends, so intersecting the result with a region polygon
    yields "the part of the region south of this line" etc."""
    pts = [tuple(c) for c in coords]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0, y0 = pts[0]
    xn, yn = pts[-1]
    lo_x, hi_x = min(xs) - pad, max(xs) + pad
    lo_y, hi_y = min(ys) - pad, max(ys) + pad
    if side in ('south', 'north'):
        far_y = lo_y if side == 'south' else hi_y
        ring = [(lo_x, y0)] + pts + [(hi_x, yn), (hi_x, far_y), (lo_x, far_y)]
    elif side in ('east', 'west'):
        far_x = hi_x if side == 'east' else lo_x
        ring = [(x0, lo_y)] + pts + [(xn, hi_y), (far_x, hi_y), (far_x, lo_y)]
    else:
        raise ValueError(side)
    return clean(Polygon(ring))


def clip_side(region, coords: Sequence[Sequence[float]], side: str):
    """Part of `region` lying on `side` of the hand polyline `coords`."""
    return clean(region.intersection(side_polygon(coords, side)))


def difference(a, *others):
    """a minus the union of the others, cleaned and without slivers."""
    out = a
    for o in others:
        if o is not None and not o.is_empty:
            out = out.difference(o)
    return drop_slivers(clean(out))


def union(*geoms):
    return clean(unary_union([g for g in geoms if g is not None and not g.is_empty]))


# ---------------------------------------------------------------- feature building
def _round_coords(obj, precision: int):
    if isinstance(obj, (list, tuple)):
        if obj and isinstance(obj[0], (int, float)):
            return [round(float(obj[0]), precision), round(float(obj[1]), precision)]
        return [_round_coords(o, precision) for o in obj]
    return obj


def _dedupe_ring(ring: list) -> list:
    out = [ring[0]]
    for p in ring[1:]:
        if p != out[-1]:
            out.append(p)
    return out


def round_geometry(geom, precision: int = 4) -> dict:
    """GeoJSON geometry dict with rounded coordinates, consecutive duplicates removed and
    degenerate rings/lines dropped."""
    m = mapping(geom)
    t = m['type']
    coords = _round_coords(m['coordinates'], precision)
    if t == 'Polygon':
        rings = [r for r in (_dedupe_ring(r) for r in coords) if len(r) >= 4]
        return {'type': t, 'coordinates': rings}
    if t == 'MultiPolygon':
        polys = []
        for poly in coords:
            rings = [r for r in (_dedupe_ring(r) for r in poly) if len(r) >= 4]
            if rings:
                polys.append(rings)
        if len(polys) == 1:
            return {'type': 'Polygon', 'coordinates': polys[0]}
        return {'type': t, 'coordinates': polys}
    if t == 'LineString':
        return {'type': t, 'coordinates': _dedupe_ring(coords)}
    if t == 'MultiLineString':
        lines = [l for l in (_dedupe_ring(l) for l in coords) if len(l) >= 2]
        if len(lines) == 1:
            return {'type': 'LineString', 'coordinates': lines[0]}
        return {'type': t, 'coordinates': lines}
    raise ValueError(f'unsupported geometry type {t}')


def feature(geom, name: str, kind: str, style: str, valid_from: str, valid_to: str,
            note: str | None = None, approximate: bool | None = None,
            source: str | None = None, tol: float | None = None, precision: int = 4) -> dict:
    """One BoundaryFeature dict.  `tol` simplifies the geometry first (degrees)."""
    if kind not in ('zone', 'line'):
        raise ValueError(f'{name}: kind must be zone|line')
    if kind == 'zone' and style not in ZONE_STYLES:
        raise ValueError(f'{name}: unknown zone style {style}')
    if kind == 'line' and style not in LINE_STYLES:
        raise ValueError(f'{name}: unknown line style {style}')
    if valid_from > valid_to:
        raise ValueError(f'{name}: validFrom {valid_from} > validTo {valid_to}')
    g = geom
    grid = 10.0 ** -precision
    if kind == 'zone':
        g = clean(g)
        if g.is_empty:
            raise ValueError(f'{name}: empty zone geometry')
        g = simplify(g, tol)
        # Snap to the output grid *before* serialising so that rounding cannot create
        # self-touching rings; set_precision repairs the topology while snapping.
        g = clean(shapely.set_precision(g, grid, mode='valid_output'))
        g = drop_slivers(g)
        if g.geom_type not in ('Polygon', 'MultiPolygon'):
            raise ValueError(f'{name}: zone geometry is {g.geom_type}')
        if not g.is_valid:
            raise ValueError(f'{name}: zone geometry invalid after snapping')
    else:
        g = lines_only(g) if g.geom_type not in ('LineString', 'MultiLineString') else g
        if g.is_empty:
            raise ValueError(f'{name}: empty line geometry')
        if tol:
            g = g.simplify(tol, preserve_topology=True)
        g = lines_only(shapely.set_precision(g, grid, mode='valid_output'))
    props = {'name': name, 'kind': kind, 'style': style, 'validFrom': valid_from, 'validTo': valid_to}
    if note:
        props['note'] = note
    if approximate is not None:
        props['approximate'] = bool(approximate)
    if source:
        props['source'] = source
    return {'type': 'Feature', 'geometry': round_geometry(g, precision), 'properties': props}


def zone(geom, name, style, valid_from, valid_to, **kw) -> dict:
    return feature(geom, name, 'zone', style, valid_from, valid_to, **kw)


def line(geom, name, style, valid_from, valid_to, **kw) -> dict:
    return feature(geom, name, 'line', style, valid_from, valid_to, **kw)


# ----------------------------------------------------------------------- output
@lru_cache(maxsize=None)
def chapters() -> tuple:
    with open(DATA_DIR / 'chapters.json', encoding='utf-8') as fh:
        return tuple(json.load(fh))


def chapter(chapter_id: str) -> dict:
    for c in chapters():
        if c['id'] == chapter_id:
            return c
    raise KeyError(f'unknown chapter {chapter_id!r}')


def overlaps(f: dict, start: str, end: str) -> bool:
    p = f['properties']
    return p['validFrom'] <= end and p['validTo'] >= start


def active_in_chapter(features: Iterable[dict], chapter_id: str) -> list:
    c = chapter(chapter_id)
    return [f for f in features if overlaps(f, c['start'], c['end'])]


def write_collection(path: Path, features: Sequence[dict]) -> tuple[int, int]:
    """Write a FeatureCollection (compact JSON); return (feature count, bytes)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fc = {'type': 'FeatureCollection', 'features': list(features)}
    data = json.dumps(fc, separators=(',', ':'), ensure_ascii=False)
    path.write_text(data, encoding='utf-8')
    return len(fc['features']), len(data.encode('utf-8'))


def write_chapter(chapter_id: str, features: Sequence[dict]) -> tuple[Path, int, int]:
    """Write src/data/boundaries/<chapterId>.geojson with the features whose validity
    overlaps the chapter range.  Duplicate (name, validFrom) pairs are dropped."""
    seen = set()
    out = []
    for f in active_in_chapter(features, chapter_id):
        key = (f['properties']['name'], f['properties']['validFrom'])
        if key in seen:
            continue
        seen.add(key)
        out.append(f)
    if not out:
        raise ValueError(f'{chapter_id}: no feature overlaps the chapter range')
    path = OUT_DIR / f'{chapter_id}.geojson'
    n, size = write_collection(path, out)
    return path, n, size


def report(results: Sequence[tuple[Path, int, int]]) -> None:
    for path, n, size in results:
        print(f'  {path.relative_to(ROOT)}: {n} features, {size:,} bytes')
