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

# ===========================================================================
# Post-October-2023 control zones (build_recent.py).  All APPROXIMATE, drawn
# from published maps and descriptions at globe-view precision (0.5-1 km).
# Web access was unavailable when these were digitised (2026-09-09); the
# sources named are the reporting the shapes were reconstructed from.
# ===========================================================================

# Southern edge of the northern-Gaza ground-operations area (27 Oct 2023 -
# 15 Jan 2024): everything north of the Netzarim corridor / Wadi Gaza.  Used
# with common.clip_side(gaza, ..., 'north').
NORTH_GAZA_OP_EDGE = [[34.30, 31.470], [34.60, 31.470]]

# Netzarim corridor: the IDF-held east-west strip south of Gaza City, from
# the perimeter fence near Nahal Oz / Kibbutz Be'eri west along the line of
# the former Netzarim settlement to the coast, north of Wadi Gaza and the
# Nuseirat camp.  About 6-7 km wide by mid-2024 (~30 km2).  Established when
# the IDF announced the encirclement of Gaza City and the splitting of the
# strip (5 Nov 2023); evacuated 9 Feb 2025 under the January 2025 ceasefire;
# re-occupied after 18 March 2025.  Drawn from UN OCHA and press maps of the
# corridor (Times of Israel, Reuters, ISW/Critical Threats control maps).
NETZARIM_CORRIDOR_POLY = [
    [34.470, 31.492], [34.470, 31.455], [34.440, 31.448], [34.410, 31.443],
    [34.385, 31.447], [34.383, 31.462], [34.395, 31.478], [34.420, 31.488],
    [34.450, 31.494],
]

# Khan Younis operational area (IDF 98th Division, 4 Dec 2023 - 7 Apr 2024):
# Khan Younis city and its eastern hinterland (Bani Suheila, Abasan, Khuza'a)
# to the fence; al-Mawasi on the coast excluded.  Drawn from ISW/Critical
# Threats and UN OCHA maps of the Khan Younis operation.
KHAN_YOUNIS_2024_POLY = [
    [34.265, 31.395], [34.300, 31.405], [34.340, 31.405], [34.380, 31.400],
    [34.400, 31.360], [34.370, 31.300], [34.330, 31.300], [34.290, 31.315],
    [34.262, 31.345],
]

# Rafah operational zone (from 7 May 2024, when the IDF seized the Rafah
# crossing; extended over the whole Rafah governorate by August 2024): the
# governorate south of a line from the coast north of Tal al-Sultan to the
# fence near Sufa.  Drawn from IDF evacuation-order maps and UN OCHA Rafah
# maps (May-Aug 2024).
RAFAH_2024_POLY = [
    [34.190, 31.318], [34.245, 31.314], [34.285, 31.303], [34.320, 31.291],
    [34.345, 31.279], [34.360, 31.262], [34.300, 31.200], [34.180, 31.290],
]

# Morag corridor (announced 2 Apr 2025): east-west strip between Rafah and
# Khan Younis along the line of the former Morag settlement, from the fence
# near Sufa to the coast at al-Mawasi south of Khan Younis; ~2-3 km wide.
# Drawn from IDF/press maps (Times of Israel, Al Jazeera, ISW), April 2025.
MORAG_CORRIDOR_POLY = [
    [34.355, 31.297], [34.350, 31.285], [34.300, 31.303], [34.262, 31.318],
    [34.228, 31.330], [34.216, 31.340], [34.235, 31.347], [34.270, 31.336],
    [34.310, 31.320], [34.335, 31.312],
]

# Area NOT under Israeli operational control in mid-2025 (after the 18 March
# 2025 resumption and Operation Gideon's Chariots): the Gaza City core, the
# coastal strip through Nuseirat / Zawaida / Deir al-Balah, and al-Mawasi
# with western Khan Younis.  The Israeli zone is the Gaza Strip minus this
# pocket (~70-75%, matching IDF statements of ~75% in July 2025).  Drawn from
# ISW/Critical Threats control-of-terrain maps and UN OCHA evacuation-order
# maps, June-Sept 2025.
GAZA_2025_POCKET_POLY = [
    [34.395, 31.556], [34.430, 31.556], [34.470, 31.548], [34.480, 31.530],
    [34.478, 31.505], [34.468, 31.485], [34.440, 31.470], [34.410, 31.462],
    [34.395, 31.455], [34.380, 31.445], [34.365, 31.425], [34.350, 31.410],
    [34.330, 31.400], [34.320, 31.385], [34.310, 31.370], [34.300, 31.360],
    [34.285, 31.352], [34.270, 31.345], [34.240, 31.340], [34.215, 31.335],
    [34.190, 31.345], [34.300, 31.500],
]

# Gaza City offensive (16 Sept - 9 Oct 2025): the parts of Gaza City the IDF
# pushed into from the north (Sheikh Radwan), east (Tuffah, Shuja'iyya) and
# south (Zeitoun, Sabra, Tel al-Hawa) before the 10 Oct 2025 ceasefire.
# Drawn from IDF evacuation maps and ISW/press reporting, Sept-Oct 2025.
GAZA_CITY_2025_POLY = [
    [34.440, 31.548], [34.472, 31.548], [34.482, 31.532], [34.480, 31.505],
    [34.470, 31.485], [34.445, 31.478], [34.425, 31.484], [34.432, 31.505],
    [34.442, 31.525],
]

# The "Yellow Line" of the 10 Oct 2025 ceasefire (first-phase Israeli
# withdrawal line of the 20-point plan), north to south then west to the
# coast.  Israeli forces hold everything EAST/SOUTH of it (~53% of the strip
# per IDF/press maps): Beit Hanoun, eastern Beit Lahia and Jabalia, the
# eastern fringe of Gaza City (Shuja'iyya, Tuffah), eastern Bureij/Maghazi,
# eastern Khan Younis (Bani Suheila, Abasan, Khuza'a) and the whole of Rafah
# south of the Morag corridor.  Drawn from the IDF deployment map published
# with the ceasefire and UN OCHA / ISW renderings of it (Oct 2025).
YELLOW_LINE = [
    [34.460, 31.556], [34.485, 31.548], [34.498, 31.536], [34.500, 31.518],
    [34.482, 31.500], [34.462, 31.485], [34.441, 31.470], [34.420, 31.455],
    [34.405, 31.443], [34.388, 31.430], [34.369, 31.410], [34.350, 31.393],
    [34.338, 31.376], [34.325, 31.362], [34.318, 31.348], [34.312, 31.325],
    [34.295, 31.320], [34.270, 31.323], [34.248, 31.328], [34.228, 31.332],
    [34.205, 31.337],
]

# Northern edge of the area of Israeli ground operations in south Lebanon
# from 1 Oct 2024 (Operation Northern Arrows) to the 18 Feb 2025 withdrawal:
# a strip roughly 5-8 km deep from Naqoura past Bint Jbeil, Maroun al-Ras,
# Aitaroun, Kfar Kila, Khiam and Deir Mimas (near the Litani bend) to the
# Hermon foothills.  Reused for the March 2026 ground operations (extent
# unverified).  Drawn from IDF statements and ISW/Critical Threats maps of
# the ground incursions (Oct 2024 - Feb 2025).
LEBANON_2024_OP_EDGE = [
    [35.110, 33.120], [35.180, 33.130], [35.250, 33.140], [35.330, 33.150],
    [35.400, 33.165], [35.460, 33.190], [35.505, 33.230], [35.535, 33.290],
    [35.555, 33.335], [35.600, 33.360], [35.660, 33.355], [35.740, 33.330],
    [35.800, 33.300], [35.900, 33.300],
]

# The five hilltop positions retained by the IDF inside Lebanon after the
# 18 Feb 2025 withdrawal (centre point [lng, lat]; drawn as ~1 km circles):
# Labbouneh (opposite Shlomi, east of Naqoura), Jabal Blat (between Ramyeh
# and Marwahin, opposite Shtula), Jal al-Deir (between Aitaroun and Maroun
# al-Ras, opposite Avivim), Tallet al-Aziziyeh (near Hula / Markaba, opposite
# Margaliot) and Tallet al-Hamames (south of Khiam, opposite Metula).  Names
# and locations from Lebanese and Israeli reporting of the five points
# (Feb 2025); positions approximate to ~1 km.
LEBANON_HILLTOPS = {
    'Labbouneh': [35.150, 33.098],
    'Jabal Blat': [35.288, 33.107],
    'Jal al-Deir': [35.440, 33.100],
    'Tallet al-Aziziyeh (Hula / Markaba)': [35.510, 33.205],
    'Tallet al-Hamames (Khiam)': [35.605, 33.290],
}
LEBANON_HILLTOP_RADIUS = 0.0055  # degrees (~0.5 km)

# Israeli-controlled zone in southern Syria after 8 Dec 2024: the UNDOF area
# of separation (Natural Earth polygon, added by the builder) plus adjacent
# Syrian territory - the Syrian summit of Mount Hermon (Jabal al-Shaykh) and
# its eastern slopes, and a strip about 3 km east of the area
# of separation past Hader, Jubata al-Khashab, Tal al-Ahmar (Quneitra) and
# Kudna to the Yarmouk.  Clipped to Syria by the builder.  Drawn from UN
# (UNDOF) statements and ISW/press maps of IDF positions, Dec 2024 - 2025.
SYRIA_2024_ZONE_POLY = [
    [35.740, 32.740], [35.770, 32.720], [35.810, 32.750], [35.880, 32.830],
    [35.920, 32.900], [35.950, 32.960], [35.930, 33.020], [35.905, 33.090],
    [35.940, 33.150], [35.925, 33.200], [35.895, 33.260], [35.875, 33.320],
    [35.880, 33.380], [35.910, 33.420], [35.930, 33.460], [35.860, 33.470],
    [35.820, 33.440], [35.800, 33.380], [35.780, 33.300], [35.750, 33.200],
    [35.740, 33.000],
]
