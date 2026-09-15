#!/usr/bin/env python3
"""
Build every boundary GeoJSON under src/data/boundaries/.

    python3 scripts/build-boundaries.py            # run every scripts/boundaries/build_*.py
    python3 scripts/build-boundaries.py build_middle build_world   # only these builders

Each builder module exposes build() -> list of (path, feature_count, bytes).  The
Natural Earth inputs are downloaded on demand by scripts/boundaries/common.py (see
its docstring; NE_DIR overrides the cache directory).  Requires Python 3.11+ and
shapely 2 (pip install shapely).
"""
from __future__ import annotations

import importlib
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BUILDERS_DIR = HERE / 'boundaries'
sys.path.insert(0, str(BUILDERS_DIR))

import common  # noqa: E402


def main(argv: list[str]) -> int:
    names = argv or sorted(p.stem for p in BUILDERS_DIR.glob('build_*.py'))
    if not names:
        print('no scripts/boundaries/build_*.py builders found', file=sys.stderr)
        return 1
    common.ensure_ne()
    total_files = total_bytes = 0
    for name in names:
        mod = importlib.import_module(name)
        print(f'== {name}')
        results = mod.build()
        common.report(results)
        total_files += len(results)
        total_bytes += sum(size for _, _, size in results)
    print(f'== {total_files} file(s), {total_bytes:,} bytes total, in {common.OUT_DIR.relative_to(common.ROOT)}/')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
