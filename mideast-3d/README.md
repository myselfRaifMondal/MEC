# Middle East Crisis: A Sourced 3D Timeline

An interactive, fully cited 3D globe timeline of the Israeli–Palestinian / Arab–Israeli conflict and its regional extensions, from the Balfour Declaration (2 November 1917) to 9 September 2026. Scrub a 109-year timeline; watch mandates, partition lines, armistice lines, occupation lines and current control zones change on the globe; click any event for a neutral summary, how the main parties frame it, attributed casualty figures shown side by side, and at least two sources.

Built with Vite 6, React 19, TypeScript (strict), three.js via @react-three/fiber and @react-three/drei, and Tailwind CSS 4. No backend, no analytics, no accounts.

## Running and building

Requirements: Node 20 or newer.

```bash
cd mideast-3d
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then bundles to dist/
npm run preview    # serves dist/ at http://127.0.0.1:4173
npm run validate   # schema-validates events, chapters and boundaries
npm run validate -- --links   # also checks every source URL is reachable
npm test           # Playwright smoke test at 1440px and 375px (needs a build first)
```

The Playwright test uses Chromium. If a pre-installed Chromium should be used instead of Playwright's managed download, set `CHROMIUM_PATH=/path/to/chrome` before `npm test`.

Deploy `dist/` to any static host. All data is bundled or served as static assets; per-era boundary GeoJSON is fetched lazily when a chapter is first shown.

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

Research was carried out era by era. Each era's output lives in `src/data/research/<era>.json` together with the boundary changes, excluded events and open uncertainties the researcher recorded. Events dated after 1 September 2024 were then re-checked by a separate, independent pass that had to find at least one source not already cited, confirm date, place and every figure, and downgrade anything it could not confirm. Events dated after 1 June 2026 fall after the model's training data; every fact about them comes from pages fetched on 9 September 2026, and the validator refuses any such event whose sources were not accessed that day or that is not marked verified.

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

{{DATA_STATUS}}

## Known limitations

{{LIMITATIONS}}

## Licence

Code: see `LICENSE` in the repository root. Natural Earth data is in the public domain. Event summaries and chapter narratives are original text; cited sources remain the property of their publishers.
