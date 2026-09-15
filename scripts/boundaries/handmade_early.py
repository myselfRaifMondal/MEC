"""
handmade_early.py - hand-digitised geometries for chapters 1-5 (1917-1987), as
plain Python lists of [lng, lat].  Pure data, same conventions as handmade.py:
every shape here is APPROXIMATE (globe-view precision, roughly 1-2 km), drawn
from the published maps / descriptions named next to it without live web
access (2026-09-14).  Builders that use these must set approximate=True and
carry a note + source on the resulting feature.  Polygons are drawn generously
beyond the coast / Mandate boundary where they abut it and are CLIPPED by the
builder to the Natural Earth polygon of Mandatory Palestine, so the outer
edges of the resulting zones are exact; only the internal partition lines are
hand-drawn.

Naming: *_LINE are polylines, *_POLY are closed rings (first point repeated
automatically by common.polygon).  Coordinates are [lng, lat].
"""

# ===========================================================================
# UN General Assembly resolution 181 (II), 29 Nov 1947 - Plan of Partition
# with Economic Union, as shown on UN map no. 103 (Nov 1947), i.e. the plan
# AFTER the Ad Hoc Committee changes to the UNSCOP majority proposal (Jaffa
# made an Arab enclave; Beersheba and a tract of the Negev along the Egyptian
# frontier given to the Arab state; the Jewish state given part of the Dead
# Sea shore and a strip near the Lebanese border).  The two states each had
# three sections meeting at two "kissing points": K1 at the south-eastern end
# of Mount Carmel (Jewish coastal plain / Jewish Galilee-Jezreel / Arab
# western Galilee / Arab Samaria) and K2 between Rehovot and Isdud (Jewish
# coastal plain / Jewish Negev / Arab Judea / Arab Gaza-Beersheba section).
# ===========================================================================

PARTITION_K1 = [35.10, 32.63]   # south-east end of Mount Carmel, near Yokneam/Megiddo
PARTITION_K2 = [34.76, 31.83]   # between Rehovot (Jewish) and Isdud (Arab)

# Jewish state, eastern section: eastern Galilee (Safed, Tiberias, the Hula
# valley, both shores of the Sea of Galilee), the Beisan valley and the
# Jezreel valley (Afula) - Nazareth, Shefa-Amr, Sakhnin and Jenin lie outside.
# Runs from K1 north along the Lower Galilee hills west of Tiberias and Safed
# to the Lebanese border, then (outside the Mandate boundary, clipped) round
# the Hula and the Jordan to the Beisan valley, and west along the northern
# edge of the Samarian hills back to K1.
PARTITION_JEWISH_GALILEE_POLY = [
    [35.10, 32.63], [35.15, 32.67], [35.22, 32.69], [35.29, 32.66],
    [35.36, 32.66], [35.42, 32.70], [35.44, 32.78], [35.40, 32.85],
    [35.41, 32.92], [35.43, 32.98], [35.30, 33.05], [35.30, 33.15],
    [35.60, 33.40], [35.80, 33.40], [35.80, 32.30], [35.55, 32.35],
    [35.45, 32.41], [35.38, 32.49], [35.30, 32.53], [35.22, 32.56],
    [35.15, 32.59],
]

# Jewish state, coastal section: from Haifa bay just south of Acre (Haifa,
# Mount Carmel, Zikhron Ya'akov, Hadera, Netanya, Tel Aviv, Petah Tikva,
# Rehovot) to K2 just north of Isdud; Jaffa is cut out as an Arab enclave
# (PARTITION_JAFFA_POLY).  The eastern edge follows the foot of the Samarian
# and Judean hills: Umm al-Fahm, Baqa al-Gharbiya, Tulkarm, Qalqilya, Lod and
# Ramla lie in the Arab state.  Seaward edge drawn offshore and clipped.
PARTITION_JEWISH_COAST_POLY = [
    [35.10, 32.63], [35.10, 32.72], [35.12, 32.80], [35.12, 32.88],
    [35.06, 32.91], [34.90, 32.91], [34.60, 32.50], [34.40, 32.00],
    [34.50, 31.85], [34.62, 31.85], [34.70, 31.85], [34.76, 31.83],
    [34.82, 31.89], [34.84, 31.93], [34.86, 31.98], [34.92, 32.00],
    [34.95, 32.06], [34.94, 32.12], [34.94, 32.19], [34.99, 32.26],
    [35.00, 32.33], [35.01, 32.40], [35.02, 32.48], [35.05, 32.55],
]

# Jewish state, southern section: a corridor from K2 south-east between the
# Arab Gaza-Beersheba section (west; Faluja and Beersheba are Arab) and the
# Arab Hebron hills (east; Beit Jibrin and Dhahiriya are Arab), reaching the
# Dead Sea shore south of Ein Gedi, then the whole Negev and the Arabah down
# to the Gulf of Aqaba (Umm Rashrash / Eilat).  The Arab wedge along the
# Egyptian frontier is excluded by the western edge, which meets the frontier
# near Auja al-Hafir / Nitzana (position uncertain: drawn at about 30.8N,
# chosen so that the Jewish state comes to ~55-56% of Palestine).  Southern
# and eastern edges drawn outside the Mandate boundary and clipped.
PARTITION_JEWISH_NEGEV_POLY = [
    [34.76, 31.83], [34.86, 31.74], [34.94, 31.62], [35.00, 31.50],
    [35.08, 31.44], [35.18, 31.40], [35.30, 31.40], [35.40, 31.42],
    [35.70, 31.42], [35.70, 29.30], [34.60, 29.30], [34.20, 30.60],
    [34.42, 30.82], [34.50, 30.86], [34.62, 30.95], [34.76, 31.10],
    [34.84, 31.28], [34.84, 31.42], [34.82, 31.52], [34.80, 31.63],
    [34.77, 31.73],
]

# Jaffa, Arab enclave inside the Jewish coastal section (the town and its
# orange groves, roughly 3 x 5 km; the plan's enclave excluded Tel Aviv).
PARTITION_JAFFA_POLY = [
    [34.70, 32.03], [34.73, 32.08], [34.77, 32.075], [34.78, 32.05],
    [34.77, 32.02], [34.73, 32.015],
]

# Jerusalem corpus separatum (international city under UN Trusteeship Council
# administration): "the present municipality of Jerusalem plus the surrounding
# villages and towns, the most eastern of which shall be Abu Dis; the most
# southern, Bethlehem; the most western, Ein Karim (including also the built-up
# area of Motsa); and the most northern Shu'fat" (GA 181, Part III B).
PARTITION_JERUSALEM_POLY = [
    [35.13, 31.75], [35.14, 31.80], [35.18, 31.825], [35.24, 31.825],
    [35.29, 31.79], [35.30, 31.73], [35.26, 31.685], [35.20, 31.68],
    [35.15, 31.70],
]

# ===========================================================================
# UNEF I (Nov 1956 - May 1967).  After the Israeli withdrawal (completed
# 8 March 1957) the force was deployed on the Egyptian side only: along the
# Gaza Strip armistice demarcation line, along the international frontier
# in Sinai from Rafah to the Gulf of Aqaba, and at Sharm el-Sheikh (Ras Nasrani)
# covering the Straits of Tiran.  The builder draws a strip of UNEF_STRIP_DEG
# along the two lines (buffer of the Natural Earth boundary lines) and a
# circle of UNEF_SHARM_RADIUS_DEG around UNEF_SHARM_CENTER.  Deployment per
# UN (UNEF I background / cartographic) descriptions; widths are nominal.
UNEF_STRIP_DEG = 0.045          # ~5 km
UNEF_SHARM_CENTER = [34.30, 27.90]
UNEF_SHARM_RADIUS_DEG = 0.12    # ~12 km

# ===========================================================================
# 1982 Lebanon war.  Northern edge of the area held by the IDF after the
# June 1982 invasion, once the siege of Beirut ended (Aug-Sept 1982): the
# Awali river line from the coast north of Sidon (near Damour/Awali mouth)
# east past Jezzine to the southern Bekaa at Lake Qaraoun, then east to the
# Syrian border below Mount Hermon.  Israeli forces also held positions
# around Beirut and in the Shouf until the pull-back to the Awali (3-4 Sept
# 1983), then withdrew to the Litani/Nabatieh (Feb 1984) and to the
# "security zone" (June 1985); those phases are noted, not drawn.  Drawn from
# general reference maps of the 1982-85 occupation (UN Secretary-General
# reports on UNIFIL 1982-85; Israeli and Lebanese press maps).
LEBANON_1982_AWALI_LINE = [
    [35.20, 33.62], [35.36, 33.62], [35.45, 33.61], [35.55, 33.59],
    [35.63, 33.58], [35.70, 33.58], [35.78, 33.55], [35.86, 33.50],
    [35.95, 33.45], [36.05, 33.40],
]
