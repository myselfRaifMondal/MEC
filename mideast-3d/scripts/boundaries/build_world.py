"""
build_world.py - world base layer src/data/boundaries/world-110m.geojson.

Natural Earth 1:110m admin-0 countries with properties reduced to {name, iso_a3}
(WorldFeature in src/data/types.ts).  Coordinates are rounded to 3 decimals; the
110m data is only ~1 km accurate anyway.
"""
from __future__ import annotations

import common as C


def build():
    fc = C.load_ne('ne_110m_admin_0_countries.geojson')
    feats = []
    for f in fc['features']:
        p = f['properties']
        iso = p.get('ISO_A3') or ''
        if iso in ('', '-99'):
            iso = p.get('ADM0_A3') or ''
        geom = C.clean(C.shape(f['geometry']))
        feats.append({
            'type': 'Feature',
            'geometry': C.round_geometry(geom, 3),
            'properties': {'name': p.get('NAME') or p.get('ADMIN') or iso, 'iso_a3': iso},
        })
    path = C.OUT_DIR / 'world-110m.geojson'
    n, size = C.write_collection(path, feats)
    return [(path, n, size)]


if __name__ == '__main__':
    C.report(build())
