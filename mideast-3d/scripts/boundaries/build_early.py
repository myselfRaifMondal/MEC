"""
build_early.py - boundary layers for chapters 1-5 (1917-11-02 .. 1987-12-08):

    mandate                  1917-11-02 .. 1947-11-28
    partition-war            1947-11-29 .. 1949-07-20
    armistice-suez           1949-07-21 .. 1967-06-04
    six-day-to-yom-kippur    1967-06-05 .. 1974-05-31
    camp-david-lebanon       1974-06-01 .. 1987-12-08

The post-1967 steady state (Israel within the Green Line, the occupied West
Bank and Gaza, annexed East Jerusalem and Golan, the UNDOF zone, the Alpha
line, the 1985-2000 security zone and UNIFIL area, the neighbouring states
from 1967, the borders and armistice lines that run on) is taken from
build_middle.features() so that the eras stay consistent; this module adds
everything that is specific to 1917-1987:

  * the Ottoman / Allied-occupation zone (1917-20), the British and French
    mandates and the successor states (Jordan 1946, Lebanon 1943, Syria 1946
    with the Golan), Egypt with Sinai, the 1923 mandate boundary lines;
  * the UN partition plan zones and lines (GA 181, hand-digitised, clipped to
    Mandatory Palestine);
  * the 1948-67 layout: Israel within the armistice lines (without the Latrun
    no-man's land), the Jordanian-administered West Bank with East Jerusalem,
    the Egyptian-administered Gaza Strip, the 1949 armistice lines;
  * the Suez crisis occupation of Sinai and Gaza (1956-57) and the UNEF strip
    (1957-67);
  * the 1967-82 occupation of Sinai (Egypt drawn without Sinai), the occupied
    Golan before the 1981 Golan Heights Law, the Suez Canal and Purple Line
    ceasefire lines, the 1979 treaty border;
  * south Lebanon 1978-85: Operation Litani, UNIFIL from 1978, the 1982-85
    occupation south of the Awali line.

Geometry sources: Natural Earth 1:10m (see common.py) for states and the
Levant building blocks; lines derived from polygon adjacency
(common.shared_line); hand-digitised approximations from handmade.py and
handmade_early.py for the partition plan, the UNEF strip, the Suez Canal, the
Litani and Awali lines.
"""
from __future__ import annotations

from shapely.geometry import Point

import build_middle as M
import common as C
import handmade as H
import handmade_early as HE

CHAPTERS = (
    'mandate',
    'partition-war',
    'armistice-suez',
    'six-day-to-yom-kippur',
    'camp-david-lebanon',
)

END = C.OPEN_END
NE10 = C.NE_SOURCE_10M
NED = C.NE_SOURCE_DISPUTED
DERIVED = M.DERIVED
day_before = M.day_before

# ------------------------------------------------------------------ key dates
SCOPE_START = '1917-11-02'            # Balfour Declaration; Allied occupation of Palestine begins
SAN_REMO = '1920-04-25'               # San Remo conference allocates the mandates
TRANSJORDAN_EMIRATE = '1921-04-11'    # Abdullah's government established in Amman
MANDATE_IN_FORCE = '1923-09-29'       # Palestine and Syria/Lebanon mandates enter into force
LEBANON_INDEP = '1943-11-22'          # Lebanese independence (end of French mandate)
SYRIA_INDEP = '1946-04-17'            # last French troops leave Syria (Evacuation Day)
JORDAN_INDEP = '1946-05-25'           # Hashemite Kingdom of Transjordan independent
PARTITION_PLAN = '1947-11-29'         # UNGA resolution 181 (II)
MANDATE_END = '1948-05-14'            # British mandate terminates; Israel declared
ISRAEL_START = '1948-05-15'
ARMISTICE_EGY = '1949-02-24'
ARMISTICE_LBN = '1949-03-23'
ARMISTICE_JOR = '1949-04-03'
ARMISTICE_SYR = '1949-07-20'
SUEZ_START = '1956-10-29'             # Israeli invasion of Sinai (Operation Kadesh)
SUEZ_WITHDRAWN = '1957-03-08'         # Israeli withdrawal from Gaza and Sharm el-Sheikh completed
UNEF_END = '1967-05-19'               # UNEF withdrawn at Egypt's request
SIX_DAY_START = '1967-06-05'
SIX_DAY_END = M.SIX_DAY_WAR_END       # 1967-06-10
EJ_ANNEXED = M.EJ_ANNEXED             # 1967-06-28
SINAI_I = '1974-03-04'                # Israeli withdrawal east of the Suez Canal completed (Sinai I)
UNDOF_START = M.UNDOF_START           # 1974-05-31
LITANI_OP_START = '1978-03-14'
UNIFIL_START = '1978-03-23'           # first UNIFIL troops deploy (UNSC 425/426 of 19 March)
LITANI_OP_END = '1978-06-13'          # IDF withdrawal (hands the border strip to the Haddad militia)
EGY_ISR_TREATY = '1979-03-26'
GOLAN_LAW = M.GOLAN_LAW               # 1981-12-14
SINAI_RETURNED = M.SINAI_RETURNED     # 1982-04-25
LEBANON_INVASION = '1982-06-06'
SECURITY_ZONE_START = M.SECURITY_ZONE_START  # 1985-06-10

PARTITION_SOURCE = ('hand-digitised from UN map no. 103 (Palestine: plan of partition with '
                    'economic union, Nov 1947) and the boundary description in GA resolution 181 '
                    '(II); clipped to the Natural Earth outline of Mandatory Palestine')


def features() -> list[dict]:
    # ------------------------------------------------------------ source polygons
    israel_1949 = C.israel_proper(include_latrun=False)  # Israel within the armistice lines
    israel_1967 = C.israel_proper()                      # + Latrun no-man's land (from 1967)
    latrun = C.latrun_no_mans_land()
    west_bank, gaza = C.palestine_parts()
    east_jer = C.east_jerusalem()
    golan = C.golan(include_shebaa=True)
    lebanon = C.country('LBN')
    syria_1967 = C.country('SYR')                        # without the Golan
    syria_full = C.union(syria_1967, golan)              # with the Golan (pre-June 1967)
    jordan = C.country('JOR')
    egypt_full = C.country('EGY')
    sinai, egypt_west = C.split_sinai(egypt_full)

    mandate_pal = C.union(israel_1967, west_bank, gaza, east_jer, latrun)
    wb_ej = C.union(west_bank, east_jer)
    ottoman = C.union(mandate_pal, jordan, lebanon, syria_full)

    # ------------------------------------------------------------ partition plan (hand)
    jewish_parts = [C.polygon(r) for r in (HE.PARTITION_JEWISH_GALILEE_POLY,
                                           HE.PARTITION_JEWISH_COAST_POLY,
                                           HE.PARTITION_JEWISH_NEGEV_POLY)]
    jaffa = C.clean(C.polygon(HE.PARTITION_JAFFA_POLY).intersection(mandate_pal))
    jerusalem_cs = C.clean(C.polygon(HE.PARTITION_JERUSALEM_POLY).intersection(mandate_pal))
    jewish = C.difference(C.clean(C.union(*jewish_parts).intersection(mandate_pal)), jaffa, jerusalem_cs)
    arab = C.union(C.difference(mandate_pal, jewish, jerusalem_cs), jaffa)
    outer = mandate_pal.boundary.buffer(1e-6)
    partition_line = C.lines_only(jewish.boundary.difference(outer))
    jerusalem_line = C.lines_only(jerusalem_cs.boundary.difference(outer))

    # ------------------------------------------------------------ UNEF strip (1957-67)
    isr_egy = C.shared_line(israel_1949, egypt_full)
    gaza_line = C.shared_line(israel_1949, gaza)
    unef = C.union(
        C.clean(isr_egy.buffer(HE.UNEF_STRIP_DEG).intersection(sinai)),
        C.clean(gaza_line.buffer(HE.UNEF_STRIP_DEG).intersection(gaza)),
        C.clean(Point(HE.UNEF_SHARM_CENTER).buffer(HE.UNEF_SHARM_RADIUS_DEG).intersection(sinai)),
    )

    # ------------------------------------------------------------ Lebanon zones (hand)
    south_of_litani = C.clip_side(lebanon, H.LITANI_LINE, 'south')
    south_of_awali = C.clip_side(lebanon, HE.LEBANON_1982_AWALI_LINE, 'south')
    security_zone = C.clip_side(lebanon, H.SECURITY_ZONE_NORTH_EDGE, 'south')
    unifil_1978 = C.difference(south_of_litani, security_zone)

    # ------------------------------------------------------------ derived lines
    mandate_lbn = C.shared_line(mandate_pal, lebanon)
    mandate_syr = C.shared_line(mandate_pal, syria_full)
    mandate_jor = C.shared_line(mandate_pal, jordan)
    mandate_egy = C.shared_line(mandate_pal, egypt_full)
    green_line = C.union(C.shared_line(israel_1967, wb_ej), C.shared_line(israel_1949, latrun))
    isr_syr_1949 = C.shared_line(israel_1949, syria_full)
    gaza_egy = C.shared_line(gaza, egypt_full)
    purple_line = C.shared_line(golan, syria_1967)
    suez_canal = C.lines_only(C.polyline(H.SUEZ_CANAL).intersection(egypt_full))

    F: list[dict] = []
    Z, L = C.zone, C.line
    fine, coarse = C.TOL_FINE, C.TOL_COARSE

    # ============================================================ 1917-1948: Ottoman, mandates
    F.append(Z(ottoman, 'Ottoman Syria and Palestine (Allied military occupation)', 'ottoman',
               SCOPE_START, day_before(SAN_REMO), tol=coarse, source=NE10,
               note='Former Ottoman provinces of Syria, Beirut, Jerusalem and the Hauran (Palestine, '
                    'Transjordan, Lebanon, Syria) occupied by Allied forces from late 1917 (Jerusalem '
                    'fell 9 Dec 1917; Damascus 1 Oct 1918) and run as Occupied Enemy Territory '
                    'Administrations until the San Remo conference (25 Apr 1920). Drawn with the '
                    'later mandate/state outlines; the Ottoman provinces had no such borders.'))
    F.append(Z(mandate_pal, 'Mandatory Palestine (British Mandate)', 'british-mandate', SAN_REMO,
               MANDATE_END, tol=fine, source=NE10,
               note='Palestine allocated to Britain at San Remo (25 Apr 1920); civil administration '
                    'from 1 July 1920; Mandate in force 29 Sept 1923; ended 14 May 1948. Outline = '
                    'today\'s Israel within the Green Line + West Bank + Gaza Strip + East Jerusalem '
                    '+ the 1949 no-man\'s lands.'))
    F.append(Z(jordan, 'Transjordan (British sphere, pre-Emirate)', 'british-mandate', SAN_REMO,
               day_before(TRANSJORDAN_EMIRATE), tol=coarse, source=NE10,
               note='Transjordan between San Remo and the establishment of Abdullah\'s government in '
                    'Amman (11 Apr 1921): nominally within the British Palestine mandate area, in '
                    'practice under local governments with British advisers after the fall of the '
                    'Arab Kingdom of Syria (July 1920). Drawn with the modern Jordanian outline.'))
    F.append(Z(jordan, 'Emirate of Transjordan (British Mandate)', 'british-mandate',
               TRANSJORDAN_EMIRATE, day_before(JORDAN_INDEP), tol=coarse, source=NE10,
               note='Emirate of Transjordan under the Palestine Mandate (excluded from the Jewish '
                    'national-home provisions by the 1922 Transjordan memorandum); independent as the '
                    'Hashemite Kingdom of Transjordan on 25 May 1946. Modern Jordanian outline.'))
    F.append(Z(jordan, 'Jordan', 'other-state', JORDAN_INDEP, day_before(SIX_DAY_END), tol=coarse,
               source=NE10,
               note='Hashemite Kingdom of Transjordan (Jordan from 1949); East Bank only - the West '
                    'Bank it annexed in 1950 is drawn as a separate zone.'))
    F.append(Z(lebanon, 'Greater Lebanon (French Mandate)', 'french-mandate', SAN_REMO,
               day_before(LEBANON_INDEP), tol=fine, source=NE10,
               note='State of Greater Lebanon proclaimed 1 Sept 1920 within the French Mandate for '
                    'Syria and Lebanon (in force 29 Sept 1923); independence recognised 22 Nov 1943.'))
    F.append(Z(lebanon, 'Lebanon', 'other-state', LEBANON_INDEP, day_before(SIX_DAY_END), tol=fine,
               source=NE10))
    F.append(Z(syria_full, 'Syria (French Mandate)', 'french-mandate', SAN_REMO,
               day_before(SYRIA_INDEP), tol=coarse, source=NE10,
               note='French Mandate for Syria (the states of Damascus, Aleppo, the Alawites and Jabal '
                    'Druze, later the Syrian Republic), including the Golan; the Sanjak of '
                    'Alexandretta (ceded to Turkey in 1939) is not drawn. Last French troops left '
                    '17 Apr 1946.'))
    F.append(Z(syria_full, 'Syria', 'other-state', SYRIA_INDEP, day_before(SIX_DAY_END), tol=coarse,
               source=NE10, note='Syria including the Golan Heights (captured by Israel in June 1967).'))
    F.append(Z(egypt_full, 'Egypt', 'other-state', SCOPE_START, day_before(SUEZ_START), tol=coarse,
               source=NE10,
               note='Egypt including Sinai (British protectorate until 1922; kingdom 1922-53; '
                    'republic from 1953).'))

    for geom, name in ((mandate_lbn, 'Palestine-Lebanon mandate boundary (1923)'),
                       (mandate_syr, 'Palestine-Syria mandate boundary (1923)')):
        F.append(L(geom, name, 'mandate', MANDATE_IN_FORCE, MANDATE_END, tol=0.002, source=DERIVED,
                   note='Boundary between the British and French mandates fixed by the Paulet-Newcombe '
                        'agreement (1923), following the 1920 Franco-British convention; later the '
                        'basis of the 1949 armistice lines.'))
    F.append(L(mandate_jor, 'Palestine-Transjordan boundary (1922)', 'mandate', MANDATE_IN_FORCE,
               MANDATE_END, tol=coarse, source=DERIVED,
               note='Administrative line between Palestine and Transjordan (Jordan river, Dead Sea, '
                    'Wadi Araba to Aqaba) fixed by the 1922 Transjordan memorandum / 1928 agreement; '
                    'drawn along the modern Israel/West Bank-Jordan line.'))
    F.append(L(mandate_egy, 'Palestine-Egypt boundary (1906 line)', 'mandate', MANDATE_IN_FORCE,
               MANDATE_END, tol=coarse, source=DERIVED,
               note='The 1906 Ottoman-Egyptian administrative line from Rafah to Taba, inherited by '
                    'the Mandate and later by Israel and the Gaza Strip.'))

    # ============================================================ 1947-48: UN partition plan
    F.append(Z(jewish, 'Proposed Jewish state (UN partition plan, 1947)', 'partition-jewish-state',
               PARTITION_PLAN, MANDATE_END, approximate=True, tol=0.002,
               note='Jewish state proposed by UNGA resolution 181 (II): eastern Galilee with Safed, '
                    'Tiberias, the Hula and Beisan valleys and the Jezreel valley; the coastal plain '
                    'from Haifa bay to south of Rehovot (Jaffa excluded); the Negev and Arabah to '
                    'Aqaba. About 56% of Mandatory Palestine. The three sections touch at two points. '
                    'Hand-digitised; internal lines approximate to a few km.',
               source=PARTITION_SOURCE))
    F.append(Z(arab, 'Proposed Arab state (UN partition plan, 1947)', 'partition-arab-state',
               PARTITION_PLAN, MANDATE_END, approximate=True, tol=0.002,
               note='Arab state proposed by UNGA resolution 181 (II): western and central Galilee '
                    '(Acre, Nazareth); the central hill country from Jenin to Hebron (Nablus, Ramallah, '
                    'Lod and Ramla); the Jaffa enclave; the southern coast from Isdud through Gaza to '
                    'Rafah with Beersheba and a wedge of the Negev along the Egyptian frontier (the '
                    'wedge\'s southern tip is uncertain, drawn near 30.6N). About 43% of Palestine. '
                    'Hand-digitised; internal lines approximate to a few km.',
               source=PARTITION_SOURCE))
    F.append(Z(jerusalem_cs, 'Jerusalem corpus separatum (UN partition plan, 1947)',
               'partition-jerusalem', PARTITION_PLAN, MANDATE_END, approximate=True,
               note='International city proposed by UNGA resolution 181 (II) under UN Trusteeship '
                    'Council administration: Jerusalem and Bethlehem with the surrounding villages, '
                    'bounded by Abu Dis (east), Bethlehem (south), Ein Karim/Motsa (west) and Shu\'fat '
                    '(north). Hand-digitised, approximate.',
               source=PARTITION_SOURCE))
    F.append(L(partition_line, 'UN partition plan boundary (Jewish-Arab states, 1947)',
               'partition-proposal', PARTITION_PLAN, MANDATE_END, approximate=True, tol=0.001,
               note='Proposed boundary between the Jewish and Arab states of the 1947 partition plan, '
                    'including the Jaffa enclave. Hand-digitised, approximate; never implemented.',
               source=PARTITION_SOURCE))
    F.append(L(jerusalem_line, 'UN partition plan: Jerusalem corpus separatum outline (1947)',
               'partition-proposal', PARTITION_PLAN, MANDATE_END, approximate=True, tol=0.001,
               note='Outline of the proposed international Jerusalem area. Hand-digitised, approximate; '
                    'never implemented.',
               source=PARTITION_SOURCE))

    # ============================================================ 1948-67: armistice layout
    F.append(Z(israel_1949, 'Israel', 'israel', ISRAEL_START, day_before(SIX_DAY_END), tol=fine,
               source=NED,
               note='Israel shown at its 1949 armistice extent (frontlines moved throughout the '
                    '1948-49 war; the Negev and Eilat were taken in Oct 1948-Mar 1949). Excludes the '
                    'Latrun and Jerusalem no-man\'s lands; the Israel-Syria demilitarised zones are '
                    'drawn as part of Israel.'))
    F.append(Z(wb_ej, 'West Bank and East Jerusalem (Jordanian-administered)', 'jordan-administered',
               ISRAEL_START, '1967-06-06', tol=fine, source=NE10,
               note='Territory held by the Arab Legion at the end of the 1948-49 war and annexed by '
                    'Jordan in April 1950 (recognised only by Britain and Pakistan), including the '
                    'Old City of Jerusalem; drawn with the Jerusalem no-man\'s land and the '
                    'Israeli-held Mount Scopus enclave. Lost to Israel on 5-7 June 1967.'))
    gaza_note = ('Gaza Strip under Egyptian military administration after the 1949 armistice '
                 '(not annexed; the All-Palestine Government sat here nominally 1948-59).')
    F.append(Z(gaza, 'Gaza Strip (Egyptian-administered)', 'egypt-administered', ISRAEL_START,
               day_before(SUEZ_START), tol=fine, source=NE10, note=gaza_note))
    F.append(Z(gaza, 'Gaza Strip (Egyptian-administered)', 'egypt-administered', SUEZ_WITHDRAWN,
               '1967-06-06', tol=fine, source=NE10,
               note=gaza_note + ' Egyptian administration resumed after the Israeli withdrawal of '
                    'March 1957 (UNEF deployed along the armistice line); lost to Israel 5-7 June 1967.'))

    F.append(L(C.union(isr_egy, gaza_line), 'Israel-Egypt armistice line (1949)', 'armistice',
               ARMISTICE_EGY, day_before(SIX_DAY_START), tol=0.002, source=DERIVED,
               note='Egypt-Israel General Armistice Agreement (Rhodes, 24 Feb 1949): the international '
                    'frontier from Rafah to the Gulf of Aqaba and the demarcation line around the '
                    'Egyptian-held Gaza Strip (the al-Auja demilitarised zone is not drawn).'))
    F.append(L(gaza_egy, 'Gaza Strip-Egypt line (1906 line)', 'international', ARMISTICE_EGY,
               day_before(SIX_DAY_END), tol=0.002, source=DERIVED,
               note='Former Palestine-Egypt frontier between the Egyptian-administered Gaza Strip and '
                    'Egypt proper.'))
    F.append(L(green_line, '1949 Armistice Line (Green Line)', 'armistice', ARMISTICE_JOR,
               day_before(SIX_DAY_END), tol=0.002, source=DERIVED,
               note='Israel-Jordan General Armistice Agreement (3 Apr 1949) demarcation line around '
                    'the West Bank, drawn in green on the armistice maps; both edges of the Latrun '
                    'no-man\'s land are shown, the Jerusalem no-man\'s land is drawn inside the '
                    'Jordanian zone.'))
    F.append(L(isr_syr_1949, 'Israel-Syria armistice line (1949)', 'armistice', ARMISTICE_SYR,
               day_before(SIX_DAY_START), tol=0.002, source=DERIVED,
               note='Israel-Syria General Armistice Agreement (20 July 1949): the line runs along the '
                    'western edge of the Golan, mostly on the 1923 mandate boundary. The three '
                    'demilitarised zones (Hula, east of the Sea of Galilee, Hamat Gader) where Syrian '
                    'forces had stood west of the boundary are not drawn separately.'))

    # ============================================================ 1956-57: Suez crisis
    F.append(Z(sinai, 'Sinai (Israeli-occupied, Suez crisis)', 'israeli-occupied', SUEZ_START,
               day_before(SUEZ_WITHDRAWN), tol=coarse, source=NE10, approximate=True,
               note='Sinai occupied during the Suez crisis (Operation Kadesh, 29 Oct - 5 Nov 1956); '
                    'Israeli forces halted about 16 km east of the canal, so the strip along the canal '
                    'is over-drawn. Phased withdrawal Dec 1956 - Mar 1957 under UN pressure; Sharm '
                    'el-Sheikh and Gaza evacuated by 8 Mar 1957.',))
    F.append(Z(gaza, 'Gaza Strip (Israeli-occupied, Suez crisis)', 'israeli-occupied', SUEZ_START,
               day_before(SUEZ_WITHDRAWN), tol=fine, source=NE10,
               note='Gaza Strip held by Israel from 2 Nov 1956 until the withdrawal of 6-8 Mar 1957, '
                    'when UNEF took over the armistice line.'))
    F.append(Z(egypt_west, 'Egypt', 'other-state', SUEZ_START, day_before(SUEZ_WITHDRAWN),
               tol=coarse, source=NE10,
               note='Egypt west of the Suez Canal while Sinai was occupied (Nov 1956 - Mar 1957); the '
                    'Anglo-French landing at Port Said (5-22 Dec 1956) is not drawn.'))
    F.append(Z(egypt_full, 'Egypt', 'other-state', SUEZ_WITHDRAWN, day_before(SIX_DAY_END),
               tol=coarse, source=NE10, note='Egypt including Sinai after the Israeli withdrawal of March 1957.'))
    F.append(Z(unef, 'UNEF I deployment area', 'un-buffer', SUEZ_WITHDRAWN, UNEF_END,
               approximate=True, tol=0.002,
               note='First UN Emergency Force (UNGA resolutions 998/1000, Nov 1956): after the Israeli '
                    'withdrawal it patrolled, on the Egyptian side only, the Gaza armistice line, the '
                    'Sinai frontier from Rafah to the Gulf of Aqaba and Sharm el-Sheikh (Straits of '
                    'Tiran). Drawn as a nominal ~5 km strip plus a Sharm el-Sheikh area; approximate. '
                    'Withdrawn at Egypt\'s request on 19 May 1967.',
               source='buffers of the Natural Earth armistice/frontier lines, deployment per UN '
                      '(UNEF I) descriptions; widths nominal'))

    # ============================================================ 1967-82: after the Six-Day War
    F.append(Z(east_jer, 'East Jerusalem (Israeli-occupied)', 'israeli-occupied', SIX_DAY_END,
               day_before(EJ_ANNEXED), tol=0.002, source=NED,
               note='East Jerusalem between the end of the June 1967 war and its incorporation under '
                    'Israeli law on 28 June 1967.'))
    F.append(Z(sinai, 'Sinai (Israeli-occupied)', 'israeli-occupied', SIX_DAY_END,
               day_before(SINAI_RETURNED), tol=coarse, source=NE10,
               note='Sinai Peninsula occupied by Israel from June 1967 (to the east bank of the Suez '
                    'Canal; an Israeli bridgehead west of the canal in Oct 1973 - Mar 1974 is not '
                    'drawn). Israel pulled back from the canal under the 1974 and 1975 disengagement '
                    'agreements and returned Sinai in stages under the 1979 treaty (El Arish May 1979, '
                    'two-thirds by Jan 1980, the rest by 25 Apr 1982; Taba in 1989); those stages are '
                    'not drawn.'))
    F.append(Z(golan, 'Golan Heights (Israeli-occupied)', 'israeli-occupied', SIX_DAY_END,
               day_before(GOLAN_LAW), tol=fine, source=NED,
               note='Golan Heights captured from Syria on 9-10 June 1967 and held under military '
                    'administration until the Golan Heights Law of 14 Dec 1981; drawn at the post-1974 '
                    'extent (Quneitra and the Oct 1973 salient returned in June 1974). Includes the '
                    'Shebaa Farms, claimed by Lebanon.'))
    F.append(Z(egypt_west, 'Egypt', 'other-state', SIX_DAY_END, day_before(SINAI_RETURNED),
               tol=coarse, source=NE10,
               note='Egypt west of the Suez Canal while Sinai was under Israeli occupation (June 1967 '
                    '- Apr 1982); the staged Israeli withdrawals from 1974 are not drawn.'))

    F.append(L(suez_canal, 'Suez Canal ceasefire line (1967)', 'ceasefire', SIX_DAY_END, SINAI_I,
               approximate=True,
               note='Israeli-Egyptian ceasefire line along the Suez Canal after June 1967 (War of '
                    'Attrition 1967-70; crossed in both directions in Oct 1973). Superseded by the '
                    'Sinai I disengagement (18 Jan 1974): Israeli withdrawal east of the canal '
                    'completed 4 Mar 1974. Canal alignment hand-drawn, approximate.',
               source='hand-digitised canal alignment (Port Said - Ismailia - Suez), clipped to the '
                      'Natural Earth Egypt polygon'))
    F.append(L(purple_line, 'Golan ceasefire line (Purple Line, 1967)', 'ceasefire', SIX_DAY_END,
               day_before(UNDOF_START), tol=0.002, source=DERIVED, approximate=True,
               note='Israel-Syria ceasefire line of 10 June 1967, drawn in purple on UN maps; shown '
                    'along the later 1974 line (the actual 1967 line ran slightly further east around '
                    'Quneitra, and the Oct 1973 fighting moved it temporarily). Replaced by the 31 May '
                    '1974 disengagement agreement.'))
    F.append(L(isr_egy, 'Israel-Egypt border (1979 treaty)', 'international', EGY_ISR_TREATY,
               day_before(SINAI_RETURNED), tol=coarse, source=DERIVED,
               note='International boundary recognised by the Egypt-Israel peace treaty of 26 Mar 1979 '
                    '(the 1906 line from Rafah to Taba), while Sinai east of it was still being handed '
                    'back in stages.'))

    # ============================================================ 1978-85: south Lebanon
    F.append(Z(south_of_litani, 'Operation Litani area (Israeli-occupied)', 'israeli-occupied',
               LITANI_OP_START, LITANI_OP_END, approximate=True, tol=0.002,
               note='South Lebanon up to the Litani river occupied by Israel in Operation Litani '
                    '(14-21 Mar 1978); the Tyre pocket was not entered. Withdrawal in stages to '
                    '13 June 1978, when the border strip was handed to Major Haddad\'s militia. '
                    'Hand-digitised Litani line, simplified.',
               source='hand-digitised from UN Secretary-General reports on UNIFIL (1978) and reference '
                      'maps; Lebanese border edges from Natural Earth'))
    F.append(Z(unifil_1978, 'UNIFIL area of operations', 'un-buffer', UNIFIL_START,
               day_before(SECURITY_ZONE_START), approximate=True, tol=0.002,
               note='UN Interim Force in Lebanon (UNSC 425/426, 19 Mar 1978; first troops 23 Mar 1978) '
                    'between the Litani and the Israeli-backed Haddad enclave along the border, which '
                    'is excluded; the 1978 deployment also excluded the Tyre pocket. Overrun by the '
                    'June 1982 invasion; UNIFIL stayed in place. Simplified (the real area was a '
                    'patchwork).',
               source='hand-digitised from UN cartographic UNIFIL deployment maps; Litani and enclave '
                      'edges approximate'))
    F.append(Z(south_of_awali, '1982 invasion zone, south Lebanon (Israeli-occupied)',
               'israeli-occupied', LEBANON_INVASION, day_before(SECURITY_ZONE_START),
               approximate=True, tol=0.002,
               note='Lebanon south of the Awali river held by Israel after the June 1982 invasion '
                    '(Operation Peace for Galilee). Israeli forces also besieged West Beirut (June-Aug '
                    '1982) and held the Shouf until the pull-back to the Awali of 3-4 Sept 1983; they '
                    'withdrew to the Litani/Nabatieh in Feb 1984 and to the "security zone" by 10 June '
                    '1985. Only the post-Sept-1983 Awali line is drawn; approximate.',
               source='hand-digitised from UN Secretary-General reports on UNIFIL (1982-85) and press '
                      'maps of the Israeli deployment; Lebanese border edges from Natural Earth'))

    # ============================================================ continuing post-1967 layers
    F.extend(M.features())
    return F


def build():
    feats = features()
    return [C.write_chapter(ch, feats) for ch in CHAPTERS]


if __name__ == '__main__':
    C.report(build())
