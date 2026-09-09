"""
handmade.py - hand-digitised geometries as plain Python lists of [lng, lat].

This module is pure data (no imports) so that common.py can import it.  Every
geometry here is APPROXIMATE: it was drawn from the published maps / textual
descriptions named next to it, at a level of detail suited to a globe view
(roughly 0.5-1 km).  Builders that use these must set approximate=True and
carry a note + source on the resulting feature.  Where a hand polyline is only
used to CUT a Natural Earth polygon (Suez Canal, Litani, security-zone edge),
the resulting zone still has exact Natural Earth coast and border edges.

Naming: *_LINE / *_EDGE are polylines, *_POLY are closed rings (first point is
repeated automatically by common.polygon).  Coordinates are [lng, lat].
"""

# ---------------------------------------------------------------------------
# Suez Canal (Port Said - Ismailia - Suez), extended into the Mediterranean and
# the Gulf of Suez so that shapely.ops.split cuts Egypt cleanly into Sinai and
# the mainland.  Waypoints: Port Said 32.31E/31.26N, Ismailia 32.28E/30.59N,
# Suez 32.56E/29.97N (task specification; canal alignment approximate).
SUEZ_CANAL = [
    [32.20, 31.60], [32.31, 31.26], [32.30, 30.90], [32.28, 30.59],
    [32.33, 30.30], [32.56, 29.97], [32.60, 29.70],
]

# ---------------------------------------------------------------------------
# Lower course of the Litani river, west to east, from its mouth north of Tyre
# (Qasmiyeh) to the bend below Beaufort castle, then north along the river and
# east to the Lebanon-Syria border on the Hermon slopes.  "South of this line"
# intersected with Lebanon approximates the UNIFIL area of operations under
# UNSC 1701 ("between the Blue Line and the Litani River") and the area of
# Israeli ground operations in the 2006 war.  Drawn from general reference
# maps of south Lebanon (UN cartographic section map of UNIFIL deployment).
LITANI_LINE = [
    [35.20, 33.34], [35.26, 33.34], [35.33, 33.35], [35.40, 33.36],
    [35.48, 33.37], [35.54, 33.35], [35.57, 33.40], [35.60, 33.44],
    [35.66, 33.45], [35.75, 33.43], [35.85, 33.41], [35.98, 33.40],
]

# ---------------------------------------------------------------------------
# Northern edge of the Israeli "security zone" in south Lebanon (1985-2000),
# west to east from the coast near al-Bayyada (south of Tyre) past Beit Yahoun,
# the Saluki valley, Beaufort castle/Arnoun, Marjayoun, Kawkaba and Hasbaya to
# the Hermon slopes.  Bint Jbeil, Marjayoun, Khiam, Kfar Shouba and Shebaa lie
# inside; Tyre, Qana, Tibnin and Nabatieh lie outside.  The SLA-held Jezzine
# salient further north is NOT included.  Drawn from descriptions and maps of
# the zone (UN Secretary-General reports on UNIFIL 1985-2000; general reference
# maps of the "security belt").
SECURITY_ZONE_NORTH_EDGE = [
    [35.12, 33.18], [35.22, 33.17], [35.30, 33.17], [35.37, 33.18],
    [35.42, 33.20], [35.45, 33.24], [35.48, 33.30], [35.50, 33.35],
    [35.55, 33.38], [35.60, 33.42], [35.65, 33.45], [35.72, 33.45],
    [35.80, 33.42], [35.98, 33.40],
]

# ---------------------------------------------------------------------------
# Gush Katif settlement bloc, south-western Gaza Strip: the coastal strip
# between the Egyptian border (Rafiah Yam) and the area just south of Deir
# al-Balah (Katif / Netzer Hazani), bounded inland by Khan Yunis (Neve Dekalim)
# and Morag.  Israel retained it (with military installation areas) under the
# 1994 Gaza-Jericho Agreement until the 2005 disengagement.  Kfar Darom,
# Netzarim and the northern settlements are not drawn.  Drawn from the
# Gaza-Jericho Agreement Map 1 and disengagement-era reference maps.
GUSH_KATIF_POLY = [
    [34.205, 31.312], [34.225, 31.300], [34.250, 31.305], [34.275, 31.300],
    [34.290, 31.315], [34.283, 31.335], [34.290, 31.360], [34.305, 31.380],
    [34.320, 31.395], [34.318, 31.415], [34.300, 31.420], [34.281, 31.377],
    [34.240, 31.345],
]

# ---------------------------------------------------------------------------
# Jericho area transferred to the Palestinian Authority in May 1994 under the
# Gaza-Jericho Agreement (about 60 km2 around the town; the agreed shape was
# irregular).  Approximate hexagon centred on Jericho (35.44E, 31.86N).
JERICHO_1994_POLY = [
    [35.415, 31.835], [35.485, 31.825], [35.500, 31.860], [35.485, 31.900],
    [35.440, 31.910], [35.410, 31.880],
]

# ---------------------------------------------------------------------------
# Oslo II (28 Sept 1995) "Area A": full Palestinian civil and security control
# in the main West Bank cities.  The real Area A is a patchwork of many small
# enclaves; only the principal urban blobs are drawn here, without Area B.
# Hebron H1 (about 80% of the city, its western and northern parts) was
# transferred under the Hebron Protocol on 17 Jan 1997; H2 (the old city and
# the area towards Kiryat Arba) stayed under Israeli control.  Drawn from the
# Oslo II Map 1 / UN OCHA West Bank access maps.
AREA_A_POLYS = {
    'Jenin': [
        [35.265, 32.435], [35.325, 32.430], [35.340, 32.465], [35.315, 32.495],
        [35.270, 32.490], [35.250, 32.462],
    ],
    'Tulkarm': [
        [35.010, 32.285], [35.060, 32.280], [35.075, 32.310], [35.055, 32.340],
        [35.015, 32.335], [35.000, 32.310],
    ],
    'Qalqilya': [
        [34.960, 32.170], [35.000, 32.170], [35.005, 32.200], [34.985, 32.215],
        [34.960, 32.205],
    ],
    'Nablus': [
        [35.200, 32.195], [35.290, 32.185], [35.330, 32.215], [35.305, 32.255],
        [35.230, 32.260], [35.190, 32.235],
    ],
    'Ramallah and al-Bireh': [
        [35.160, 31.875], [35.240, 31.870], [35.265, 31.905], [35.235, 31.940],
        [35.170, 31.940], [35.145, 31.905],
    ],
    'Bethlehem': [
        [35.170, 31.685], [35.235, 31.680], [35.250, 31.710], [35.225, 31.735],
        [35.180, 31.730], [35.160, 31.708],
    ],
}
HEBRON_H1_POLY = [
    [35.060, 31.505], [35.100, 31.495], [35.115, 31.515], [35.105, 31.545],
    [35.110, 31.565], [35.085, 31.575], [35.060, 31.560], [35.050, 31.530],
]

# ---------------------------------------------------------------------------
# West Bank barrier, approximate route (built and planned sections), from the
# Salem area north-east of Jenin, west along the northern Green Line, around
# the Barta'a/Reihan salient, south past Tulkarm and Qalqilya, the Alfei
# Menashe salient, the Ariel "finger", Beit Aryeh and Modi'in Illit, around
# Latrun and the Jerusalem envelope (Givat Ze'ev, Qalandia, Hizma, the Ma'ale
# Adumim bulge, Abu Dis, Har Homa, Rachel's Tomb, Beit Jala/Battir), the Gush
# Etzion bulge, then along the southern Green Line to the Meitar area.  UN OCHA
# puts about 85% of the route inside the West Bank.  Drawn from UN OCHA "West
# Bank Barrier" route maps (approximate; parts of the Ma'ale Adumim and Gush
# Etzion loops were planned rather than built).
BARRIER_LINE = [
    [35.380, 32.505], [35.340, 32.525], [35.270, 32.525], [35.215, 32.530],
    [35.170, 32.515], [35.145, 32.505], [35.150, 32.480], [35.130, 32.455],
    [35.100, 32.440], [35.075, 32.445], [35.055, 32.430], [35.040, 32.400],
    [35.015, 32.360], [35.008, 32.330], [35.008, 32.300], [35.045, 32.275],
    [35.030, 32.250], [34.995, 32.215], [34.965, 32.200], [34.965, 32.180],
    [34.975, 32.165], [35.005, 32.175], [35.040, 32.165], [35.035, 32.140],
    [35.005, 32.125], [34.985, 32.115], [35.020, 32.105], [35.070, 32.100],
    [35.120, 32.105], [35.170, 32.115], [35.215, 32.105], [35.200, 32.080],
    [35.140, 32.070], [35.090, 32.055], [35.060, 32.035], [35.030, 32.010],
    [35.020, 31.985], [35.030, 31.960], [35.070, 31.945], [35.075, 31.915],
    [35.045, 31.895], [35.045, 31.880], [35.050, 31.860], [35.080, 31.850],
    [35.120, 31.860], [35.150, 31.880], [35.180, 31.885], [35.205, 31.872],
    [35.222, 31.870], [35.245, 31.860], [35.260, 31.845], [35.275, 31.830],
    [35.300, 31.815], [35.340, 31.800], [35.365, 31.780], [35.345, 31.755],
    [35.305, 31.750], [35.280, 31.760], [35.265, 31.745], [35.245, 31.730],
    [35.225, 31.720], [35.210, 31.715], [35.195, 31.722], [35.175, 31.730],
    [35.150, 31.735], [35.130, 31.715], [35.120, 31.690], [35.140, 31.665],
    [35.175, 31.650], [35.180, 31.620], [35.150, 31.600], [35.100, 31.605],
    [35.060, 31.615], [35.020, 31.605], [34.985, 31.590], [34.965, 31.545],
    [34.935, 31.480], [34.905, 31.430], [34.900, 31.385], [34.940, 31.365],
    [35.000, 31.360], [35.060, 31.362], [35.120, 31.365], [35.180, 31.375],
    [35.230, 31.380],
]
