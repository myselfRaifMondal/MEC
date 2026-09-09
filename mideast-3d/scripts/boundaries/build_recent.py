"""
build_recent.py - boundary layers for chapters 10-12 (2023-10-07 .. 2026-09-09):

    october-7-gaza-war      2023-10-07 .. 2024-08-31
    regional-escalation     2024-09-01 .. 2025-06-30
    ceasefire-and-after     2025-07-01 .. 2026-09-09

The steady-state layer (Israel, the occupied West Bank with the Area A / Hebron
H1 / Jericho enclaves, annexed East Jerusalem and Golan, the barrier, the Blue
Line, the borders and the neighbouring states) is taken from
build_middle.features() so the eras stay consistent; this module then

  * ends the UNDOF area of separation on 2024-12-07 (Israeli forces entered it
    on 8 Dec 2024) and replaces it with an Israeli-controlled zone,
  * time-slices the Gaza "Hamas-administered" zone (contested during the war,
    then only west of the Yellow Line from 10 Oct 2025),
  * time-slices the Jenin and Tulkarm Area A features so that the January 2025
    "Iron Wall" camp operations and the resulting displacement are noted,
  * adds the post-October-2023 'idf-control-zone' features for Gaza, south
    Lebanon and southern Syria, and the Yellow Line as a 'ceasefire' line.

Every post-2023 zone is hand-digitised (handmade.py) and clipped with shapely to
the Natural Earth polygon of the territory it lies in (Gaza, Lebanon, Syria);
the perimeter buffer and the Philadelphi corridor are buffers of boundary lines
derived from Natural Earth polygon adjacency.  See the SOURCES section below for
what each shape was reconstructed from.

SOURCES / VERIFICATION NOTE (2026-09-09).  Live web access (WebSearch budget and
the egress proxy) was unavailable while this module was written, so shapes and
dates rest on (a) the research workflow's chapter overviews and their sources in
src/data/research/chapters-sources.json, which were compiled on 2026-09-09, and
(b) reporting known to the author up to early 2026 (IDF statements as carried by
Times of Israel / Reuters / Al Jazeera / BBC, UN OCHA situation updates, UNDOF and
UNIFIL statements, ISW / Critical Threats control-of-terrain maps).  Features
whose 2026 state could not be confirmed carry "unverified" in their note.
"""
from __future__ import annotations

import copy

from shapely.geometry import Point

import build_middle as M
import common as C
import handmade as H

CHAPTERS = (
    'october-7-gaza-war',
    'regional-escalation',
    'ceasefire-and-after',
)

END = C.OPEN_END
NE10 = C.NE_SOURCE_10M
NED = C.NE_SOURCE_DISPUTED
day_before = M.day_before

# ------------------------------------------------------------------ key dates
OCT7 = '2023-10-07'
GROUND_INVASION = '2023-10-27'        # IDF ground operation begins in northern Gaza
NETZARIM_START = '2023-11-05'         # IDF announces Gaza City encircled, strip cut in two
BUFFER_START = '2023-12-01'           # ~1 km perimeter buffer zone reported from Dec 2023
KHAN_YOUNIS_START = '2023-12-04'      # 98th Division enters Khan Younis
NORTH_OP_END = '2024-01-15'           # IDF ends intensive phase in northern Gaza
KHAN_YOUNIS_END = '2024-04-07'        # 98th Division withdrawn from Khan Younis
RAFAH_START = '2024-05-07'            # IDF seizes the Rafah crossing
PHILADELPHI = '2024-05-29'            # IDF announces operational control of the Philadelphi corridor
LEBANON_GROUND = '2024-10-01'         # Israeli ground operation in south Lebanon begins
LEBANON_CEASEFIRE = '2024-11-27'      # Israel-Lebanon ceasefire in force
SYRIA_ENTRY = '2024-12-08'            # IDF enters the UNDOF area of separation and Mount Hermon
GAZA_CEASEFIRE_1 = '2025-01-19'       # first phase of the January 2025 ceasefire
IRON_WALL = '2025-01-21'              # IDF operation in Jenin camp begins (Tulkarm from 27 Jan)
NETZARIM_END = '2025-02-09'           # IDF withdraws from the Netzarim corridor
LEBANON_FIVE_POINTS = '2025-02-18'    # extended withdrawal deadline; five hilltops retained
RESUMPTION = '2025-03-18'             # Israel resumes the Gaza campaign
MORAG = '2025-04-02'                  # Morag corridor announced
GAZA_CITY_OFFENSIVE = '2025-09-16'    # ground push into Gaza City
GAZA_CEASEFIRE_2 = '2025-10-10'       # ceasefire under the 20-point plan; Yellow Line
LEBANON_2026 = '2026-03-02'           # Hezbollah enters the 2026 Iran war; Israeli ground operations follow
LEBANON_CEASEFIRE_2026 = '2026-04-08' # Pakistan-mediated ceasefire (per research overview)

# Research-workflow sources (src/data/research/chapters-sources.json, accessed 2026-09-09)
SRC_2803 = ('UN meeting coverage, Security Council resolution 2803 (17 Nov 2025), '
            'https://www.un.org/unispal/document/security-council-meeting-coverage-17nov25/')
SRC_NPR_2026 = ('NPR, 31 July 2026, Trump announces deal for Hamas to disarm; Israel refuses '
                'withdrawal until Hamas disarms, https://www.npr.org/2026/07/31/g-s1-136500/trump-hamas-gaza')
SRC_CFR_LBN = ('CFR Global Conflict Tracker, Conflict with Hezbollah in Lebanon, '
               'https://www.cfr.org/global-conflict-tracker/conflict/political-instability-lebanon')
SRC_BRIT_2026 = 'Encyclopaedia Britannica, 2026 Iran war, https://www.britannica.com/event/2026-Iran-war'
SRC_CNN_LBN = ('CNN, 27 Nov 2024, Israel-Hezbollah ceasefire takes effect, '
               'https://www.cnn.com/world/live-news/israel-hezbollah-ceasefire-deal-gaza-war-11-27-24-intl-hnk')
SRC_BRIT_CEASEFIRE = ('Encyclopaedia Britannica, Israel-Hamas War: ceasefire and hostage exchange '
                      '(Jan-Mar 2025), https://www.britannica.com/event/Israel-Hamas-War/'
                      'Ceasefire-and-hostage-exchange-January-March-2025')
SRC_OHCHR_2024 = ('OHCHR, 15 Aug 2024, Gaza death toll passes 40,000, https://www.ohchr.org/en/'
                  'statements-and-speeches/2024/08/gaza-turk-pleads-end-fighting-death-toll-passes-40000')
GAZA_MAPS = ('hand-digitised from IDF evacuation/deployment maps as carried by Times of Israel, '
             'Reuters and Al Jazeera, UN OCHA Gaza situation updates and ISW/Critical Threats '
             'control-of-terrain maps')


def _hilltop(centre):
    return Point(centre).buffer(H.LEBANON_HILLTOP_RADIUS, resolution=4)


def features() -> list[dict]:
    # ------------------------------------------------------------ source polygons
    israel = C.israel_proper()
    west_bank, gaza = C.palestine_parts()
    lebanon = C.country('LBN')
    syria = C.country('SYR')
    egypt = C.country('EGY')
    undof = C.undof_zone()
    gaza_fence = C.shared_line(gaza, israel)
    gaza_egypt = C.shared_line(gaza, egypt)

    # ------------------------------------------------------------ Gaza zones
    buffer_zone = C.clean(gaza_fence.buffer(0.0095).intersection(gaza))          # ~1 km
    philadelphi = C.clean(gaza_egypt.buffer(0.008).intersection(gaza))           # drawn ~0.8 km wide
    north_op = C.clip_side(gaza, H.NORTH_GAZA_OP_EDGE, 'north')
    netzarim = C.clean(C.polygon(H.NETZARIM_CORRIDOR_POLY).intersection(gaza))
    khan_younis = C.clean(C.polygon(H.KHAN_YOUNIS_2024_POLY).intersection(gaza))
    rafah = C.clean(C.polygon(H.RAFAH_2024_POLY).intersection(gaza))
    morag = C.clean(C.polygon(H.MORAG_CORRIDOR_POLY).intersection(gaza))
    pocket_2025 = C.clean(C.polygon(H.GAZA_2025_POCKET_POLY).intersection(gaza))
    expanded_2025 = C.difference(gaza, pocket_2025)
    gaza_city = C.clean(C.polygon(H.GAZA_CITY_2025_POLY).intersection(pocket_2025))
    # The line runs north -> south then west to the coast; close it around the south-east
    # of the strip (Egypt border corner, then far east and north) to get the Israeli side.
    yellow_east = C.clean(C.polygon(
        H.YELLOW_LINE + [[34.15, 31.347], [34.15, 31.15], [34.65, 31.15], [34.65, 31.65], [34.40, 31.65]]
    ).intersection(gaza))
    yellow_west = C.difference(gaza, yellow_east)
    yellow_line = C.shared_line(yellow_east, yellow_west)
    share = lambda g: round(100 * g.area / gaza.area)  # noqa: E731

    # ------------------------------------------------------------ Lebanon zones
    lebanon_ops = C.clip_side(lebanon, H.LEBANON_2024_OP_EDGE, 'south')
    hilltops = {name: C.clean(_hilltop(c).intersection(lebanon)) for name, c in H.LEBANON_HILLTOPS.items()}

    # ------------------------------------------------------------ Syria zone
    syria_zone = C.clean(C.union(undof, C.polygon(H.SYRIA_2024_ZONE_POLY)).intersection(syria))

    # ------------------------------------------------------------ steady-state layer
    base = M.features()
    replaced = {
        'Gaza Strip (Hamas-administered)',
        'UNDOF area of separation',
        'Jenin (Area A, PA-administered)',
        'Tulkarm (Area A, PA-administered)',
    }
    F: list[dict] = []
    for f in base:
        p = f['properties']
        if p['name'] in replaced:
            g = copy.deepcopy(f)
            q = g['properties']
            if q['name'] == 'UNDOF area of separation':
                q['validTo'] = day_before(SYRIA_ENTRY)
                q['note'] += (' Israeli forces entered the area of separation on 8 Dec 2024 after the '
                              'fall of the Assad government; UNDOF remains deployed but the area is '
                              'shown as Israeli-controlled from that date.')
                F.append(g)
            elif q['name'] == 'Gaza Strip (Hamas-administered)':
                q['validTo'] = day_before(GAZA_CEASEFIRE_2)
                q['note'] = ('Gaza Strip governed by Hamas since 14 June 2007. From 27 Oct 2023 de facto '
                             'control was contested: Israeli ground forces operated across most of the '
                             'strip (overlaid Israeli-controlled zones) while Hamas retained civil '
                             'administration and armed presence in areas the IDF had left. The zone '
                             'ends with the 10 Oct 2025 ceasefire, after which only the area west of '
                             'the Yellow Line is shown.')
                F.append(g)
            elif q['name'] in ('Jenin (Area A, PA-administered)', 'Tulkarm (Area A, PA-administered)'):
                city = q['name'].split(' (')[0]
                g['properties']['validTo'] = day_before(IRON_WALL)
                F.append(g)
                h = copy.deepcopy(f)
                h['properties']['validFrom'] = IRON_WALL
                h['properties']['note'] = (
                    f'Oslo II Area A around {city} (simplified urban block). From 21 Jan 2025 (Jenin) and '
                    f'27 Jan 2025 (Tulkarm and Nur Shams) the IDF operation "Iron Wall" emptied the '
                    f'refugee camps: UN OCHA reported about 40,000 residents displaced from the three '
                    f'camps by March 2025, with Israeli forces remaining inside them and demolishing '
                    f'homes; the camps stayed depopulated into 2026. The PA retains the city; camp '
                    f'control is de facto Israeli. Area B not drawn.')
                h['properties']['source'] = (
                    'hand-digitised from Oslo II Map 1 (1995) and UN OCHA West Bank access maps; '
                    '2025 camp displacement per UN OCHA West Bank humanitarian updates (Jan-Mar 2025)')
                F.append(h)
            continue
        F.append(f)

    Z, L = C.zone, C.line
    fine = C.TOL_FINE

    # ------------------------------------------------------------ Gaza, Oct 2023 - Mar 2025
    F.append(Z(north_op, 'Northern Gaza ground-operations area', 'idf-control-zone',
               GROUND_INVASION, NORTH_OP_END, approximate=True, tol=0.002,
               note='Area of the IDF ground offensive in the northern Gaza Strip (Beit Hanoun, Beit '
                    'Lahia, Jabalia, Gaza City) from the 27 Oct 2023 invasion until the IDF ended the '
                    'intensive phase in the north on 15 Jan 2024. Everything north of the Netzarim '
                    'corridor / Wadi Gaza; hand-digitised, simplified, control within it was contested.',
               source=GAZA_MAPS))
    F.append(Z(netzarim, 'Netzarim corridor', 'idf-control-zone', NETZARIM_START, NETZARIM_END,
               approximate=True,
               note='East-west strip south of Gaza City held by the IDF from the perimeter fence to the '
                    'coast, cutting the strip in two; established when the IDF announced the '
                    'encirclement of Gaza City on 5 Nov 2023, widened to ~6-7 km during 2024, and '
                    'evacuated on 9 Feb 2025 under the January 2025 ceasefire (re-occupied after '
                    '18 March 2025, see the expanded zone). Hand-digitised, simplified.',
               source=GAZA_MAPS + '; withdrawal date per ' + SRC_BRIT_CEASEFIRE))
    F.append(Z(khan_younis, 'Khan Younis operational area', 'idf-control-zone',
               KHAN_YOUNIS_START, KHAN_YOUNIS_END, approximate=True,
               note='Approximate area of the IDF 98th Division operation in Khan Younis and its eastern '
                    'hinterland from 4 Dec 2023 until the division withdrew on 7 April 2024; al-Mawasi '
                    'on the coast excluded. Hand-digitised, simplified.',
               source=GAZA_MAPS))
    F.append(Z(buffer_zone, 'Gaza perimeter buffer zone (~1 km)', 'idf-control-zone',
               BUFFER_START, day_before(RESUMPTION), approximate=True, tol=0.0005,
               note='Strip about 1 km wide inside the Gaza perimeter fence cleared and held by the IDF '
                    'from December 2023 (demolition of buildings reported from Dec 2023 - Jan 2024); '
                    'roughly 16% of the strip. Retained during the January-March 2025 ceasefire. Drawn '
                    'as a uniform 1 km buffer of the fence line; approximate. Superseded by the wider '
                    'zones from 18 March 2025.',
               source='derived buffer of the Natural Earth Israel-Gaza boundary; width per UN OCHA '
                      'and press reporting (Reuters/Haaretz, Dec 2023 - Feb 2024) of the buffer zone'))
    F.append(Z(rafah, 'Rafah operational zone', 'idf-control-zone', RAFAH_START,
               day_before(GAZA_CEASEFIRE_1), approximate=True,
               note='Rafah governorate, entered by the IDF on 7 May 2024 when it seized the Rafah '
                    'crossing and extended over the whole governorate by August 2024. Israeli forces '
                    'pulled back to the perimeter and the Philadelphi corridor under the 19 Jan 2025 '
                    'ceasefire (residents returned) and re-took Rafah after 18 March 2025 (see the '
                    'expanded zone). Hand-digitised, simplified.',
               source=GAZA_MAPS + '; ceasefire pull-back per ' + SRC_BRIT_CEASEFIRE))
    F.append(Z(philadelphi, 'Philadelphi corridor', 'idf-control-zone', PHILADELPHI, END,
               approximate=True, tol=0.0005,
               note='Strip along the Gaza-Egypt border (the ~14 km "Philadelphi" or Salah al-Din '
                    'corridor) over which the IDF announced operational control on 29 May 2024 and '
                    'which Israel kept through the 2025 ceasefires. The corridor proper is ~100 m '
                    'wide; drawn ~0.8 km wide for visibility. Overlaps the Rafah and Yellow-Line zones.',
               source='derived buffer of the Natural Earth Gaza-Egypt boundary; control date per IDF '
                      'statement of 29 May 2024 as carried by Times of Israel / Reuters'))

    # ------------------------------------------------------------ Gaza, Mar - Oct 2025
    F.append(Z(expanded_2025, 'Israeli-controlled zone in Gaza (March-October 2025)', 'idf-control-zone',
               RESUMPTION, day_before(GAZA_CEASEFIRE_2), approximate=True, tol=0.001,
               note=f'Approximate extent of Israeli operational control after the resumption of the '
                    f'campaign on 18 March 2025: the re-taken Netzarim corridor, the whole of Rafah and '
                    f'the Morag corridor (from 2 April 2025), the eastern half of the strip and, from '
                    f'May 2025 ("Gideon\'s Chariots"), Beit Hanoun, Beit Lahia and Jabalia. About '
                    f'{share(expanded_2025)}% of the strip as drawn; the IDF put its control at ~40% '
                    f'in April, ~50% in May and ~75% by July 2025. Drawn at the mid-2025 extent, so it '
                    f'overstates the area held in March-April. Hand-digitised, simplified.',
               source=GAZA_MAPS + '; percentages per IDF statements April-July 2025'))
    F.append(Z(morag, 'Morag corridor', 'idf-control-zone', MORAG, day_before(GAZA_CEASEFIRE_2),
               approximate=True,
               note='East-west corridor between Rafah and Khan Younis along the line of the former '
                    'Morag settlement, announced by Israel on 2 April 2025 to isolate Rafah; its '
                    'northern edge became the southern section of the Yellow Line in October 2025. '
                    'Shown inside the wider zone. Hand-digitised, simplified.',
               source=GAZA_MAPS))
    F.append(Z(gaza_city, 'Gaza City offensive area', 'idf-control-zone', GAZA_CITY_OFFENSIVE,
               day_before(GAZA_CEASEFIRE_2), approximate=True,
               note='Parts of Gaza City entered by the IDF ground offensive that began on 16 Sept 2025 '
                    '(Sheikh Radwan, Tuffah, Shuja\'iyya, Zeitoun, Sabra, Tel al-Hawa) before the '
                    '10 Oct 2025 ceasefire; the IDF said it held roughly half of the city by early '
                    'October. Hand-digitised, simplified.',
               source=GAZA_MAPS))

    # ------------------------------------------------------------ Gaza, ceasefire from 10 Oct 2025
    F.append(Z(yellow_east, 'Israeli-controlled zone east of the Yellow Line', 'idf-control-zone',
               GAZA_CEASEFIRE_2, END, approximate=True, tol=0.001,
               note=f'Area of the Gaza Strip retained by Israeli forces under the 10 Oct 2025 ceasefire '
                    f'(first-phase withdrawal line of the 20-point plan, endorsed by UNSC resolution '
                    f'2803): about {share(yellow_east)}% of the strip as drawn (reported ~53%), '
                    f'including Beit Hanoun, eastern Beit Lahia/Jabalia, the eastern fringe of Gaza '
                    f'City, eastern Deir al-Balah and Khan Younis governorates, and all of Rafah. '
                    f'Reporting through 31 July 2026 records no further Israeli withdrawal (Israel '
                    f'conditions it on Hamas disarmament) and no hand-over to the International '
                    f'Stabilization Force; the line has also been reported as shifting locally when '
                    f'the IDF marked it with blocks. Extent after early 2026 unverified. '
                    f'Hand-digitised, simplified.',
               source=GAZA_MAPS + ' (IDF deployment map of 10 Oct 2025); ' + SRC_2803 + '; ' + SRC_NPR_2026))
    F.append(L(yellow_line, 'Yellow Line', 'ceasefire', GAZA_CEASEFIRE_2, END, approximate=True,
               note='Western edge of the Israeli-held zone under the 10 Oct 2025 Gaza ceasefire, as '
                    'marked on the IDF deployment map ("yellow line"); Israeli forces fire on people '
                    'approaching it. Hand-digitised, simplified; local shifts after October 2025 not '
                    'mapped.',
               source=GAZA_MAPS + '; ' + SRC_2803))
    F.append(Z(yellow_west, 'Gaza Strip west of the Yellow Line (Hamas de facto)', 'hamas-administered',
               GAZA_CEASEFIRE_2, END, tol=0.001, approximate=True,
               note='Part of the Gaza Strip west of the Yellow Line after the 10 Oct 2025 ceasefire. '
                    'Governance is contested: Hamas re-deployed police and administration on the '
                    'ground, while the 20-point plan and UNSC resolution 2803 (17 Nov 2025) provide '
                    'for a Board of Peace and a Palestinian technocratic committee, with an '
                    'International Stabilization Force; as of 31 July 2026 Hamas had agreed in '
                    'principle to disarm but demanded Israeli withdrawal first. Edge follows the '
                    'hand-digitised Yellow Line; coast and Egypt border from Natural Earth.',
               source=NE10 + '; governance per ' + SRC_2803 + ' and ' + SRC_NPR_2026))

    # ------------------------------------------------------------ Lebanon
    F.append(Z(lebanon_ops, 'Southern Lebanon: Israeli ground operations (2024-25)', 'idf-control-zone',
               LEBANON_GROUND, day_before(LEBANON_FIVE_POINTS), approximate=True, tol=0.002,
               note='Approximate area of Israeli ground operations in south Lebanon from the 1 Oct 2024 '
                    'incursion ("Northern Arrows") through the 27 Nov 2024 ceasefire, whose 60-day '
                    'withdrawal period was extended to 18 Feb 2025: a strip roughly 5-8 km deep from '
                    'Naqoura past Bint Jbeil, Aitaroun, Kfar Kila and Khiam towards the Litani bend at '
                    'Deir Mimas. Hand-digitised, simplified; operations were raids and demolitions '
                    'rather than continuous control.',
               source='hand-digitised from IDF statements and ISW/Critical Threats maps of the '
                      'incursions (Oct 2024 - Feb 2025); ceasefire per ' + SRC_CNN_LBN))
    for name, geom in hilltops.items():
        F.append(Z(geom, f'IDF position: {name}', 'idf-control-zone', LEBANON_FIVE_POINTS, END,
                   approximate=True,
                   note=f'One of the five hilltop positions inside Lebanon that the IDF kept after '
                        f'withdrawing from south Lebanese towns on 18 Feb 2025 ({name}). Drawn as a '
                        f'~1 km circle at an approximate location; the actual post is a few hundred '
                        f'metres across. Still held in 2026 and enclosed by the March 2026 '
                        f'operations zone; 2026 status otherwise unverified.',
                   source='hand-placed from Lebanese and Israeli reporting of the "five points" '
                          '(Feb 2025; Times of Israel, Al Jazeera, L\'Orient Today); ' + SRC_CFR_LBN))
    F.append(Z(lebanon_ops, 'Southern Lebanon: Israeli ground operations (2026)', 'idf-control-zone',
               LEBANON_2026, END, approximate=True, tol=0.002,
               note='Israeli ground operations in south Lebanon after Hezbollah entered the 2026 Iran '
                    'war on 2 March 2026 (the Lebanese Health Ministry counted more than 2,000 killed '
                    'by mid-April; a Pakistan-mediated ceasefire began on 8 April 2026, a June '
                    'memorandum collapsed into renewed strikes in July). Start date approximate and '
                    'extent unverified: the 2024-25 operations strip is reused as a placeholder, and '
                    'whether Israeli forces withdrew after the April ceasefire could not be confirmed.',
               source='placeholder geometry (2024-25 strip); events per the research overview citing '
                      + SRC_BRIT_2026 + ' and ' + SRC_CFR_LBN))

    # ------------------------------------------------------------ Syria
    F.append(Z(syria_zone, 'Southern Syria: Israeli-controlled zone (area of separation and Hermon)',
               'idf-control-zone', SYRIA_ENTRY, END, approximate=True, tol=0.002,
               note='The UNDOF area of separation plus adjacent Syrian territory occupied by Israeli '
                    'forces from 8 Dec 2024, after the fall of the Assad government: the Syrian summit '
                    'of Mount Hermon and its eastern slopes, and positions 3-6 km east of the 1974 '
                    'lines around Hader, Jubata al-Khashab, Quneitra (Tal al-Ahmar) and Kudna. The UN '
                    'said the deployment violates the 1974 disengagement agreement; Israel described '
                    'it as temporary but said it would stay indefinitely. Talks on an Israel-Syria '
                    'security arrangement continued through 2025-26; 2026 status unverified. Area of '
                    'separation from Natural Earth, remainder hand-digitised and simplified.',
               source=NED + ' (UNDOF zone); hand-digitised from UNDOF/UN statements and ISW/press maps '
                      'of IDF positions in southern Syria (Dec 2024 - 2025)'))
    return F


def build():
    feats = features()
    return [C.write_chapter(ch, feats) for ch in CHAPTERS]


if __name__ == '__main__':
    C.report(build())
