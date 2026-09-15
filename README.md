# Middle East Crisis: A Sourced 3D Timeline

An interactive, fully cited 3D globe timeline of the Israeli–Palestinian / Arab–Israeli conflict and its regional extensions, from the Balfour Declaration (2 November 1917) to 9 September 2026. Scrub a 109-year timeline; watch mandates, partition lines, armistice lines, occupation lines and current control zones change on the globe; click any event for a neutral summary, how the main parties frame it, attributed casualty figures shown side by side, and at least two sources.

Built with Vite 6, React 19, TypeScript (strict), three.js via @react-three/fiber and @react-three/drei, and Tailwind CSS 4. No backend, no analytics, no accounts.

## Running and building

Requirements: Node 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then bundles to dist/
npm run preview    # serves dist/ at http://127.0.0.1:4173
npm run validate   # schema-validates events, chapters and boundaries
npm run validate -- --links   # also checks every source URL is reachable
npm test           # Playwright smoke test at 1440px and 375px (needs a build first)
```

The Playwright test uses Chromium. If a pre-installed Chromium should be used instead of Playwright's managed download, set `CHROMIUM_PATH=/path/to/chrome` before `npm test`.

Deploy `dist/` to any static host. The repository's `vercel.json` builds the app and serves it from the domain root; `/timeline` redirects there, which is where an earlier layout served it. All data is bundled or served as static assets; per-era boundary GeoJSON is fetched lazily when a chapter is first shown.

## Project layout

```
src/scene/        Globe.tsx (canvas, sphere, layers), BoundaryLayer.tsx, WorldOutlines.tsx,
                  EventMarkers.tsx, CameraRig.tsx, geo.ts, geojson.ts
src/ui/           Timeline.tsx (scrubber, play/pause, speed, chapter markers), SidePanel.tsx,
                  ChapterPanel.tsx, DetailPanel.tsx, Legend.tsx, Header.tsx
src/state/        store.ts (tiny external store; window.__mideast test hook)
src/data/         types.ts (data contract), events.json, chapters.json, loader.ts
src/data/boundaries/   world-110m.geojson + one GeoJSON file per chapter
src/data/research/     per-era research output that events.json and chapters.json are merged from
scripts/          validate-data.ts, build-boundaries.py + boundaries/ (reproducible GeoJSON build)
tests/            smoke.spec.ts (Playwright)
```

## Data methodology

### Events (`src/data/events.json`)

Every event conforms to `TimelineEvent` in `src/data/types.ts` and is checked by `scripts/validate-data.ts`:

- `id`, `date` (and `endDate` for multi-day events), `lat`/`lng`, `location`, `title`
- `category`: one of war, treaty, attack, ceasefire, displacement, political
- `significance` 1–5 (drives marker size)
- `summary`: 80–150 words, descriptive and past tense
- `perspectives`: at least two parties and how each frames the event, listed without endorsement
- `sources`: at least two, from at least two different publishers, each with title, URL, publisher and access date
- `casualties` (where applicable): one structured row per reported figure, each with its attribution
- `era`: the chapter the event belongs to
- `verified`: true only when the event, its date and its key figures were confirmed against at least two sources that were actually read

Research was carried out era by era on 9 and 14 September 2026. Each era's output lives in `src/data/research/<era>.json` together with the boundary changes, excluded events and open uncertainties the researcher recorded. A second, independent verification pass then went over every event with fresh searches and had to corroborate the event, its date, its place and every casualty figure in results from two different publishers before it could keep `verified: true`; it replaced any cited URL that did not appear verbatim in a search result and added the corroborating sources it found.

**How "verified" was established.** The research environment could run web searches (which return the URL and the relevant text of each matching page) but could not open publisher pages directly. "Verified" therefore means: the event, date, place and key figures are corroborated by the search-result content of at least two different publishers, and every cited URL was taken verbatim from a search result. It does not mean each page was read in full. Sources carry the date the research was run as `accessedDate`. Before publication, run `npm run validate -- --links` from a normal network to confirm every URL still resolves.

Events dated after 1 June 2026 fall after the model's training data; nothing about them was written from memory, and the validator refuses any such event that is not marked verified or whose sources were not accessed on the research date.

Unverified events are kept in the data set for transparency but are excluded from the default view (`loader.ts` exports only verified events to the scene and panels).

### Boundaries (`src/data/boundaries/*.geojson`)

Boundary layers are built reproducibly by `scripts/build-boundaries.py`, which downloads Natural Earth 1:10m and 1:110m admin-0 data (public domain) if missing and derives:

- modern polygons for Israel within the 1949 lines, the West Bank, the Gaza Strip, the Golan Heights, Lebanon, Syria, Jordan and Egypt (Sinai cut along the Suez Canal) from Natural Earth
- shared boundary lines (mandate boundaries, the 1949 armistice "Green Line", the Israel–Egypt and Israel–Jordan treaty borders, the Blue Line) from polygon adjacency rather than by hand
- hand-digitised, explicitly approximate geometries where no public dataset exists: the 1947 partition plan, East Jerusalem's expanded municipal boundary, Oslo Area A, the West Bank barrier route, the southern Lebanon zones, UNDOF/UNIFIL areas and the post-2023 Israeli control zones in Gaza, Lebanon and Syria (including the October 2025 "Yellow Line")

Every feature carries `validFrom`/`validTo` dates, and hand-drawn features carry `approximate: true`, a note and the source they were drawn from. The legend and README say so plainly: these are simplified renderings for orientation, not survey-grade lines.

### Chapters (`src/data/chapters.json`)

Twelve eras, each with a 150–250 word overview and a camera pose. Overviews follow the same neutrality rules as event summaries and cite their sources in `src/data/research/chapters-sources.json`.

## Sources and neutrality

**Sourcing rules.** Every event cites at least two sources from at least two different publishers, preferring United Nations bodies (OCHA, UNRWA, the ICJ, the UN question-of-Palestine archive), the ICRC, Reuters, AP, BBC, Al Jazeera, The Times of Israel, Haaretz, The Guardian, The New York Times, Encyclopaedia Britannica, the Council on Foreign Relations, official archives (the Avalon Project, the Israel Ministry of Foreign Affairs, the US Office of the Historian, the UK National Archives), human-rights organisations and academic publishers. Wikipedia is not cited. `npm run validate -- --links` re-checks every URL; a handful of major outlets block automated requests and are reported as "bot-blocked" rather than dead.

**Casualty figures.** Figures are never stated bare. Each is attributed inline ("per the Gaza Health Ministry", "per the IDF", "per UN OCHA") and, where sources disagree, shown side by side in the detail panel's "Reported figures" table with a note on the date or method of the count.

**Terminology.** Summaries use descriptive, non-partisan terms: "West Bank barrier" (not "security fence" or "apartheid wall"), "settlements" (not "communities" or "colonies"), "attack" and "militants" (not "terrorist attack" or "resistance operation"), "killed" (not "martyred" or "eliminated"), "Israeli-occupied" for territory held since 1967 in line with UN usage, "Temple Mount / Haram al-Sharif" with both names, and "Nakba" alongside "1948 Palestinian displacement". Where a party uses a different term, the term is recorded in that party's perspective entry rather than in the narrative voice.

**Perspectives.** The "Perspectives" section of each event lists how the major parties (Israeli government, Palestinian Authority, Hamas, Hezbollah, Iran, Egypt, Jordan, the United Nations, the United States and others as relevant) characterise the event. They are descriptions of positions, not endorsements; the site does not adjudicate who is right.

**Contested existence.** If independent sources disagree about whether an event happened at all, the event is marked unverified, hidden from the default view and recorded with the conflicting sources in the era's research file.

**Content.** No graphic imagery. Markers, maps and text only. Images, when present, are Creative Commons with attribution shown in the panel.

## Data status

As of 14 September 2026 (`npm run validate` output):

| Measure | Value |
| --- | --- |
| Chapters | 12 |
| Events | 245 (243 verified, 2 unverified and hidden by default) |
| Events dated after 1 June 2026 | 8, all verified |
| Source citations | 1,246 (5.1 per event) from 258 distinct publishers |
| Events with structured, attributed casualty figures | 134 |
| Boundary features across 12 chapter files | 348 (117 flagged approximate / hand-digitised) |
| Categories | political 83, attack 65, war 48, treaty 25, ceasefire 13, displacement 11 |
| Production bundle | about 600 KB gzipped JavaScript plus lazily fetched GeoJSON (40 to 68 KB per chapter) |
| Lighthouse (desktop preset, headless software WebGL) | performance 75 |
| Playwright smoke test | 6 of 6 passing at 1440 px and 375 px |

Unverified events (kept in the data, excluded from the default view):

- `1948-04-13-hadassah-medical-convoy-attack`: no publisher page specifically about the attack could be located through the research channel; sources cover it only indirectly.
- `1985-06-10-israel-withdraws-to-south-lebanon-security-zone`: the June 1985 completion is corroborated but no source stated the exact day used for the event date.

No event was found where sources disagree on whether it happened at all. Events the researchers considered but dropped, and every figure or date that sources dispute, are listed per era in `src/data/research/<era>.json` under `excluded` and `uncertainties`.

## Known limitations

- Source pages could not be opened directly during research (see "How verified was established"), so URL liveness has not been checked from inside the research environment; run `npm run validate -- --links` before deploying.
- Casualty figures for the 2023 to 2026 period are frequently revised by the reporting bodies; the figures shown carry the date of the count where the source gave one, and later revisions are not tracked automatically.
- Boundary geometry marked `approximate` is a simplified hand rendering (the 1947 partition plan, East Jerusalem, Oslo Area A, the West Bank barrier, the southern Lebanon zones, UNDOF/UNIFIL areas and every post-2023 control zone including the Gaza "Yellow Line"); Area B is not drawn, and Israeli positions in Lebanon and Syria during 2026 are shown at their last confirmed extent.
- The timeline uses a non-linear scale so that the 2023 to 2026 chapters remain scrubbable; the three most recent chapter markers are narrow on a 375 px screen, and chapter navigation there is easiest with the slider or the panel's previous/next buttons.
- Line width in WebGL is one pixel, so line hierarchy is conveyed by colour and dashing only.
- Playwright uses Chromium; set `CHROMIUM_PATH` if a pre-installed browser should be used.

## Licence

Code: see `LICENSE` in the repository root. Natural Earth data is in the public domain. Event summaries and chapter narratives are original text; cited sources remain the property of their publishers.
