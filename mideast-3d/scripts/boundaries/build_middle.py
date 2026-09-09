"""
build_middle.py - boundary layers for chapters 6-9 (1987-12-09 .. 2023-10-06):

    first-intifada-oslo             1987-12-09 .. 1993-09-12
    oslo-process                    1993-09-13 .. 2000-09-27
    second-intifada-disengagement   2000-09-28 .. 2007-06-30
    gaza-wars                       2007-07-01 .. 2023-10-06

One feature list covers the whole era with full validity ranges; each chapter
file receives every feature whose validity overlaps the chapter (features that
span several chapters are duplicated into each file, validity dates may extend
beyond the chapter).  Continuing features from earlier eras (Israel, East
Jerusalem, Golan, UNDOF, the borders, the neighbours) are rebuilt here so the
files are self-contained.

Geometry sources: Natural Earth 1:10m (see common.py) for states, the West
Bank, Gaza, the Golan, East Jerusalem and the UNDOF zone; lines derived from
polygon adjacency (common.shared_line); hand-digitised approximations from
handmade.py for the south-Lebanon zones, Gush Katif, Jericho, Area A cities,
Hebron H1 and the West Bank barrier.
"""
from __future__ import annotations

import common as C
import handmade as H

CHAPTERS = (
    'first-intifada-oslo',
    'oslo-process',
    'second-intifada-disengagement',
    'gaza-wars',
)

END = C.OPEN_END
NE10 = C.NE_SOURCE_10M
NED = C.NE_SOURCE_DISPUTED
DERIVED = 'derived from Natural Earth 1:10m polygon adjacency (public domain)'

# Key dates (ISO).  These are the dates the layers switch on/off.
SIX_DAY_WAR_END = '1967-06-10'        # end of the June 1967 war
EJ_ANNEXED = '1967-06-28'             # Israeli law and administration extended to East Jerusalem
UNDOF_START = '1974-05-31'            # Israel-Syria disengagement agreement; UNSC 350
GOLAN_LAW = '1981-12-14'              # Golan Heights Law
SINAI_RETURNED = '1982-04-25'         # Israeli withdrawal from Sinai completed
SECURITY_ZONE_START = '1985-06-10'    # IDF pull-back to the south-Lebanon "security zone" completed
GAZA_JERICHO = '1994-05-18'           # PA assumes control in Gaza (Jericho: 13 May 1994)
ISR_JOR_TREATY = '1994-10-26'         # Israel-Jordan peace treaty
OSLO_II = '1995-09-28'                # Interim Agreement signed (Area A/B/C)
HEBRON = '1997-01-17'                 # Hebron Protocol: IDF redeployment from H1
LEBANON_WITHDRAWAL = '2000-05-24'     # last IDF units leave south Lebanon
AFTER_LEBANON_WITHDRAWAL = '2000-05-25'
BLUE_LINE = '2000-06-07'              # UN Secretary-General identifies the line of withdrawal
BARRIER_START = '2002-06-16'          # construction of the West Bank barrier begins
DISENGAGEMENT = '2005-09-12'          # last IDF soldiers leave the Gaza Strip
LEBANON_WAR_START = '2006-07-12'
UNSC_1701 = '2006-08-11'
LEBANON_WAR_WITHDRAWAL = '2006-10-01' # IDF withdrawal from south Lebanon completed
HAMAS_TAKEOVER = '2007-06-14'         # Hamas takes control of the Gaza Strip
CH9_START = '2007-07-01'
CH9_END = '2023-10-06'


def day_before(iso: str) -> str:
    from datetime import date, timedelta
    y, m, d = (int(x) for x in iso.split('-'))
    return (date(y, m, d) - timedelta(days=1)).isoformat()


def features() -> list[dict]:
    # ------------------------------------------------------------ source polygons
    israel = C.israel_proper()                 # within the 1949 lines (+ Latrun NML)
    israel_all = C.israel_full()               # incl. Golan, Shebaa, East Jerusalem
    west_bank, gaza = C.palestine_parts()
    east_jer = C.east_jerusalem()
    golan = C.golan(include_shebaa=True)
    undof = C.undof_zone()
    lebanon = C.country('LBN')
    syria = C.country('SYR')
    jordan = C.country('JOR')
    egypt = C.country('EGY')

    # ------------------------------------------------------------ hand geometries
    jericho = C.clean(C.polygon(H.JERICHO_1994_POLY).intersection(west_bank))
    area_a = {name: C.clean(C.polygon(ring).intersection(west_bank)) for name, ring in H.AREA_A_POLYS.items()}
    hebron_h1 = C.clean(C.polygon(H.HEBRON_H1_POLY).intersection(west_bank))
    gush_katif = C.clean(C.polygon(H.GUSH_KATIF_POLY).intersection(gaza))
    security_zone = C.clip_side(lebanon, H.SECURITY_ZONE_NORTH_EDGE, 'south')
    south_of_litani = C.clip_side(lebanon, H.LITANI_LINE, 'south')
    unifil_1985 = C.difference(south_of_litani, security_zone)
    # ~300 m "access restricted area" inside the Gaza perimeter fence (OCHA)
    gaza_fence = C.shared_line(gaza, israel)
    gaza_ara = C.clean(gaza_fence.buffer(0.003).intersection(gaza))

    # ------------------------------------------------------------ derived lines
    green_line = C.shared_line(israel, C.union(west_bank, east_jer))
    gaza_line = C.shared_line(israel, gaza)
    isr_egy = C.shared_line(israel, egypt)
    gaza_egy = C.shared_line(gaza, egypt)
    isr_lbn = C.shared_line(israel, lebanon)          # 1949 armistice line
    blue_line = C.shared_line(israel_all, lebanon)    # incl. the Shebaa Farms sector
    golan_line = C.shared_line(golan, syria)          # 1974 "Alpha" line
    isr_jor = C.shared_line(israel, jordan)
    wb_jor = C.shared_line(west_bank, jordan)

    F: list[dict] = []
    Z, L = C.zone, C.line
    fine, coarse = C.TOL_FINE, C.TOL_COARSE

    # ------------------------------------------------------------ Israel
    F.append(Z(israel, 'Israel', 'israel', SIX_DAY_WAR_END, END, tol=fine, source=NE10,
               note='Israel within the 1949 armistice lines (Green Line), including the Latrun '
                    'no-man\'s land held since 1967. Excludes East Jerusalem and the Golan, drawn '
                    'as separate annexed zones.'))

    # ------------------------------------------------------------ West Bank (occupied), time-sliced
    wb_note = ('West Bank under Israeli military occupation since June 1967 (East Jerusalem '
               'excluded, see annexed zone).')
    F.append(Z(west_bank, 'West Bank (Israeli-occupied)', 'israeli-occupied',
               SIX_DAY_WAR_END, day_before(GAZA_JERICHO), tol=fine, source=NE10, note=wb_note))
    F.append(Z(C.difference(west_bank, jericho), 'West Bank (Israeli-occupied)', 'israeli-occupied',
               GAZA_JERICHO, day_before(OSLO_II), tol=fine, source=NE10,
               note=wb_note + ' Jericho area transferred to the Palestinian Authority in May 1994.'))
    area_a_union = C.union(*area_a.values())
    F.append(Z(C.difference(west_bank, jericho, area_a_union), 'West Bank (Israeli-occupied; Areas B and C)',
               'israeli-occupied', OSLO_II, day_before(HEBRON), tol=fine, source=NE10,
               note='After the Interim Agreement (Oslo II, 28 Sept 1995): Areas B (joint control) '
                    'and C (Israeli control), staged redeployments through 1995-97. Area A cities '
                    'are cut out as separate PA zones; Area B is not drawn. Simplified.'))
    F.append(Z(C.difference(west_bank, jericho, area_a_union, hebron_h1),
               'West Bank (Israeli-occupied; Areas B and C)', 'israeli-occupied', HEBRON, END,
               tol=fine, source=NE10,
               note='Areas B and C of the West Bank after the Hebron Protocol (17 Jan 1997). Area A '
                    'cities and Hebron H1 are separate PA zones; Area B is not drawn. Israeli '
                    're-entries into Area A during the second intifada (2002 onward) are not '
                    'mapped. Simplified.'))

    # ------------------------------------------------------------ PA-administered enclaves
    F.append(Z(jericho, 'Jericho area (PA-administered)', 'pa-administered', GAZA_JERICHO, END,
               approximate=True,
               note='Area transferred to the Palestinian Authority under the Gaza-Jericho Agreement '
                    '(PA took over Jericho on 13 May 1994; ~60 km2). Hand-digitised, simplified; '
                    'part of Area A from Oslo II.',
               source='hand-digitised from the Gaza-Jericho Agreement Map 1 (1994) and UN OCHA maps'))
    for name, geom in area_a.items():
        F.append(Z(geom, f'{name} (Area A, PA-administered)', 'pa-administered', OSLO_II, END,
                   approximate=True,
                   note='Oslo II Area A (full Palestinian civil and security control) around '
                        f'{name}; redeployment staged late 1995-96. Areas A/B are simplified: only '
                        'the main urban block is drawn and Area B is not shown.',
                   source='hand-digitised from Oslo II Map 1 (1995) and UN OCHA West Bank access maps'))
    F.append(Z(hebron_h1, 'Hebron H1 (PA-administered)', 'pa-administered', HEBRON, END,
               approximate=True,
               note='Hebron H1 (about 80% of the city) handed to the Palestinian Authority under the '
                    'Hebron Protocol on 17 Jan 1997; H2 (old city, area towards Kiryat Arba) remained '
                    'under Israeli control. Hand-digitised, simplified; Area B not drawn.',
               source='hand-digitised from the Hebron Protocol map (1997) and UN OCHA Hebron maps'))

    # ------------------------------------------------------------ East Jerusalem and Golan
    F.append(Z(east_jer, 'East Jerusalem (annexed by Israel)', 'israeli-annexed', EJ_ANNEXED, END,
               tol=0.002, source=NED,
               note='East Jerusalem and surrounding villages (~70 km2, including the former no-man\'s '
                    'land and Mount Scopus) placed under Israeli law and administration on 28 June '
                    '1967; annexation not recognised internationally.'))
    F.append(Z(golan, 'Golan Heights (annexed by Israel)', 'israeli-annexed', GOLAN_LAW, END,
               tol=fine, source=NED,
               note='Golan Heights captured from Syria in June 1967 and placed under Israeli law by '
                    'the Golan Heights Law of 14 Dec 1981 (not recognised internationally; the UN '
                    'considers it occupied Syrian territory). Includes the Shebaa Farms, claimed by '
                    'Lebanon.'))

    # ------------------------------------------------------------ Gaza Strip, time-sliced
    F.append(Z(gaza, 'Gaza Strip (Israeli-occupied)', 'israeli-occupied', SIX_DAY_WAR_END,
               day_before(GAZA_JERICHO), tol=fine, source=NE10,
               note='Gaza Strip under Israeli military occupation from June 1967.'))
    F.append(Z(C.difference(gaza, gush_katif), 'Gaza Strip (PA-administered)', 'pa-administered',
               GAZA_JERICHO, day_before(DISENGAGEMENT), tol=fine, source=NE10,
               note='Gaza Strip under the Palestinian Authority from 18 May 1994 (Gaza-Jericho '
                    'Agreement), except the Gush Katif settlement bloc shown separately; other '
                    'settlements (Netzarim, Kfar Darom, northern bloc), military installation areas '
                    'and lateral roads retained by Israel are not drawn.'))
    F.append(Z(gush_katif, 'Gush Katif settlement bloc (Israeli-controlled)', 'israeli-occupied',
               GAZA_JERICHO, day_before(DISENGAGEMENT), approximate=True,
               note='Approximate extent of the Gush Katif settlement bloc and adjoining military '
                    'areas in the south-west of the Gaza Strip, retained under Israeli control after '
                    '1994 and evacuated in the August-September 2005 disengagement. Hand-digitised, '
                    'simplified.',
               source='hand-digitised from Gaza-Jericho Agreement Map 1 and 2005 disengagement maps'))
    F.append(Z(gaza, 'Gaza Strip (PA-administered)', 'pa-administered', DISENGAGEMENT,
               day_before(HAMAS_TAKEOVER), tol=fine, source=NE10,
               note='Whole Gaza Strip under the Palestinian Authority after Israel completed its '
                    'unilateral disengagement on 12 Sept 2005; Israel kept control of the airspace, '
                    'sea and crossings.'))
    F.append(Z(gaza, 'Gaza Strip (Hamas-administered)', 'hamas-administered', HAMAS_TAKEOVER, END,
               tol=fine, source=NE10,
               note='Gaza Strip governed by Hamas after it took control of the territory on '
                    '14 June 2007; Israel and Egypt subsequently restricted access (blockade).'))
    F.append(Z(gaza_ara, 'Gaza perimeter access-restricted area (~300 m)', 'idf-control-zone',
               CH9_START, CH9_END, approximate=True, tol=0.0005,
               note='Israeli-declared "access restricted area" inside the Gaza perimeter fence: '
                    'officially 300 m, in practice enforced up to 1-1.5 km for farmers according to '
                    'UN OCHA ("Between the Fence and a Hard Place", Aug 2010). Drawn as a uniform '
                    '300 m strip derived from the fence line; approximate.',
               source='derived buffer of the Natural Earth Israel-Gaza boundary; extent per UN OCHA 2010'))

    # ------------------------------------------------------------ Lebanon zones
    F.append(Z(security_zone, 'South Lebanon "security zone" (Israeli-occupied)', 'israeli-occupied',
               SECURITY_ZONE_START, LEBANON_WITHDRAWAL, approximate=True, tol=0.002,
               note='Strip of south Lebanon (~850-1,100 km2) held by Israel and the South Lebanon '
                    'Army from the completion of the 1985 withdrawal (10 June 1985) until the Israeli '
                    'withdrawal of 24 May 2000. Northern edge hand-digitised (Beit Yahoun - Beaufort '
                    '- Marjayoun - Hasbaya); the SLA-held Jezzine salient is not drawn. Simplified.',
               source='hand-digitised from UN Secretary-General reports on UNIFIL and reference maps '
                      'of the security belt; Lebanese border edges from Natural Earth'))
    F.append(Z(south_of_litani, 'Area of IDF ground operations, 2006 Lebanon war', 'israeli-occupied',
               LEBANON_WAR_START, LEBANON_WAR_WITHDRAWAL, approximate=True, tol=0.002,
               note='Approximate area of Israeli ground operations south of the Litani river during '
                    'the 12 July - 14 Aug 2006 war; ground forces reached the Litani only in the final '
                    'days and most fighting was within a few km of the Blue Line. IDF withdrawal to '
                    'UNIFIL/Lebanese army was completed on 1 Oct 2006. Hand-digitised, simplified.',
               source='hand-digitised from UN and press maps of the 2006 war; Litani course approximate'))
    F.append(Z(unifil_1985, 'UNIFIL area of operations', 'un-buffer', SECURITY_ZONE_START,
               LEBANON_WITHDRAWAL, approximate=True, tol=0.002,
               note='UN Interim Force in Lebanon (est. UNSC 425/426, March 1978) area of operations '
                    'between the Israeli "security zone" and the Litani, 1985-2000; simplified (the '
                    'actual area was a patchwork and excluded the Tyre pocket).',
               source='hand-digitised from UN cartographic UNIFIL deployment maps; Litani and '
                      'security-zone edges approximate'))
    F.append(Z(south_of_litani, 'UNIFIL area of operations', 'un-buffer', AFTER_LEBANON_WITHDRAWAL,
               day_before(UNSC_1701), approximate=True, tol=0.002,
               note='After the Israeli withdrawal of May 2000 UNIFIL redeployed along the Blue Line '
                    'at reduced strength; nominal area of operations between the Blue Line and the '
                    'Litani shown. Simplified.',
               source='hand-digitised from UN cartographic UNIFIL deployment maps'))
    F.append(Z(south_of_litani, 'UNIFIL area of operations (UNSC 1701)', 'un-buffer', UNSC_1701, END,
               approximate=True, tol=0.002,
               note='UNIFIL area of operations between the Blue Line and the Litani river, expanded '
                    'under UNSC resolution 1701 (11 Aug 2006) to up to 15,000 troops. Simplified.',
               source='hand-digitised from UN cartographic UNIFIL deployment maps'))

    # ------------------------------------------------------------ Golan UNDOF
    F.append(Z(undof, 'UNDOF area of separation', 'un-buffer', UNDOF_START, END, tol=0.002,
               source=NED,
               note='UN Disengagement Observer Force area of separation between the Israeli-held '
                    'Golan and Syria under the 31 May 1974 disengagement agreement (Alpha and Bravo '
                    'lines).'))

    # ------------------------------------------------------------ neighbouring states
    F.append(Z(lebanon, 'Lebanon', 'other-state', SIX_DAY_WAR_END, END, tol=fine, source=NE10))
    F.append(Z(syria, 'Syria', 'other-state', SIX_DAY_WAR_END, END, tol=coarse, source=NE10,
               note='Syria excluding the Israeli-held Golan Heights.'))
    F.append(Z(jordan, 'Jordan', 'other-state', SIX_DAY_WAR_END, END, tol=coarse, source=NE10))
    F.append(Z(egypt, 'Egypt', 'other-state', SINAI_RETURNED, END, tol=coarse, source=NE10,
               note='Egypt including Sinai, returned by Israel by 25 April 1982 (Taba in 1989).'))

    # ------------------------------------------------------------ lines
    F.append(L(green_line, '1949 armistice line (Green Line, Israel-West Bank)', 'occupation',
               SIX_DAY_WAR_END, END, tol=0.002, source=DERIVED,
               note='The 1949 Israel-Jordan armistice line around the West Bank, crossed by Israel in '
                    'June 1967; runs west of annexed East Jerusalem.'))
    F.append(L(gaza_line, '1949 armistice line (Israel-Gaza Strip)', 'occupation', SIX_DAY_WAR_END,
               END, tol=0.002, source=DERIVED,
               note='The 1949 Israel-Egypt armistice line around the Gaza Strip, now the fenced '
                    'perimeter.'))
    F.append(L(isr_egy, 'Israel-Egypt border', 'international', SINAI_RETURNED, END, tol=coarse,
               source=DERIVED,
               note='International boundary (1906 line) restored by the 1979 peace treaty when Israel '
                    'completed its withdrawal from Sinai on 25 April 1982.'))
    F.append(L(gaza_egy, 'Gaza Strip-Egypt border', 'international', SINAI_RETURNED, END, tol=0.002,
               source=DERIVED,
               note='Boundary between the Gaza Strip and Egypt (Rafah / "Philadelphi" corridor).'))
    F.append(L(isr_lbn, 'Israel-Lebanon armistice line (1949)', 'armistice', '1949-03-23',
               day_before(BLUE_LINE), tol=0.002, source=DERIVED,
               note='1949 Israel-Lebanon armistice line, following the 1923 Mandate boundary; '
                    'superseded for UN purposes by the Blue Line in June 2000.'))
    F.append(L(blue_line, 'Blue Line (UN line of withdrawal, 2000)', 'buffer', BLUE_LINE, END,
               tol=0.002, source=DERIVED,
               note='Line identified by the UN on 7 June 2000 to confirm the Israeli withdrawal from '
                    'Lebanon; approximately the 1949 armistice line, extended along the Shebaa Farms '
                    'sector. Not an international border.'))
    F.append(L(golan_line, 'Golan ceasefire line (1974 Alpha line)', 'ceasefire', UNDOF_START, END,
               tol=0.002, source=DERIVED,
               note='Israeli forward line under the 1974 Israel-Syria disengagement agreement; the '
                    'UNDOF area of separation lies east of it.'))
    F.append(L(isr_jor, 'Israel-Jordan armistice line (1949)', 'armistice', '1949-04-03',
               day_before(ISR_JOR_TREATY), tol=coarse, source=DERIVED,
               note='1949 armistice line between Israel and Jordan outside the West Bank (Yarmouk, '
                    'Dead Sea, Arava), following the Mandate-era boundary.'))
    F.append(L(isr_jor, 'Israel-Jordan border (1994 treaty)', 'international', ISR_JOR_TREATY, END,
               tol=coarse, source=DERIVED,
               note='International boundary fixed by the 26 Oct 1994 peace treaty, replacing the '
                    'armistice line; the West Bank-Jordan line was left to a final-status settlement.'))
    F.append(L(wb_jor, 'Jordan River line (West Bank-Jordan)', 'ceasefire', SIX_DAY_WAR_END, END,
               tol=coarse, source=DERIVED,
               note='1967 ceasefire line along the Jordan river and the Dead Sea between the '
                    'Israeli-occupied West Bank and Jordan; Jordan relinquished its claim to the '
                    'West Bank in 1988.'))
    F.append(L(C.polyline(H.BARRIER_LINE), 'West Bank barrier (approximate route)', 'barrier',
               BARRIER_START, END, approximate=True,
               note='Approximate route of the Israeli West Bank barrier (fence/wall), begun 16 June '
                    '2002; about 85% of the route runs inside the West Bank according to UN OCHA. '
                    'Built and planned sections (Ariel finger, Ma\'ale Adumim, Gush Etzion) are '
                    'shown together; hand-digitised, simplified.',
               source='hand-digitised from UN OCHA West Bank barrier route maps'))
    return F


def build():
    feats = features()
    return [C.write_chapter(ch, feats) for ch in CHAPTERS]


if __name__ == '__main__':
    C.report(build())
