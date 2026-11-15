# Martian Map

**Hyperlocal EVA route planning and decision support for astronauts on Mars.**
NASA Space Apps Challenge 2026 · *Interplanetary Survival Guide: Martian Map*

[Türkçe](README.tr.md)

Martian Map turns real orbital data into a walking plan. For every square metre of the scene it scores how safe the ground is, how much science it offers and how far the data can be trusted. It then orders several science targets inside an oxygen, cooling-water and time budget and returns a main route, a backup route, a safe corridor, shelters and a walk-back limit, together with a plain GO / CAUTION / NO-GO verdict and the reasons behind it.

Everything runs in the browser. There is no server, no account and no language model: the planner is deterministic, so the same inputs always give the same route.

## Quick start

You need [Node.js](https://nodejs.org) 20.19 or newer. Nothing else.

```bash
git clone https://github.com/farukhv/nasa.git
cd nasa
npm run dev
```

The first run installs the dependencies by itself (about a minute), then prints the local address, normally <http://localhost:5173>. Later runs start immediately. The scene data ships with the repository, so the app works offline once the dependencies are installed.

| Command | What it does |
|---|---|
| `npm run dev` | Installs what is missing and starts the app with live reload |
| `npm run build` | Type-checks and builds a static site into `app/dist` |
| `npm run preview` | Serves the built site locally |
| `npm run lint` | Runs the linter |

## Using the app

A guided tour opens on the first visit and can be restarted with the **Tour** button. The controls at the top right are always visible:

- **TR / EN** switches the interface language. The choice is remembered; on a first visit the browser language decides.
- **☀ / ☾** switches between the dark and the light theme.
- **Helmet HUD** shows the route from the astronaut's point of view.

On the map, the solid green line is the main route, the dashed cyan line is plan B and the pink hatched areas are no-go zones. Hover any line or marker to see what it is. Scroll to zoom, drag to pan, double-click to fit.

| Key | Action | Key | Action |
|---|---|---|---|
| `1` | Back to the nominal plan | `B` | Switch between route A and B |
| `2` | Solar particle event | `L` | Cycle the map layer |
| `3` | Suit oxygen leak | `H` | Helmet HUD |
| `4` | Injured crewmate | `F` | Fit the map to the window |
| `5` | Replan from 45% of the walk | `P` | Print the cuff checklist |
| `6` | Switch scene | `Esc` | Leave the HUD or the tour |

## What it does

- **Two real scenes.** Jezero · Three Forks (HiRISE 25 cm ortho image, 1 m terrain model, CRISM mineralogy, Perseverance waypoints and Navcam frames) and Elysium · InSight (a single HiRISE image with no terrain model, to show how the system behaves with less data).
- **Three scores per cell.** Safety from rock abundance, slope, ground resistance, radiation, return oxygen and temperature; science from geology, fresh surfaces, diversity, proximity and hydration; confidence from image quality, data coverage, sensor agreement, stability and position accuracy.
- **Hard no-go rules.** Slopes above 25°, rock abundance above 40% and hazardous ground are walls, whatever their science value.
- **Target ordering inside a budget.** A prize-collecting orienteering solver picks and orders the targets that fit the oxygen and time budget, and says why any target was skipped.
- **Route A and plan B.** A* at full resolution; plan B is found by blocking the weakest link of route A.
- **Walk-back limit.** At every point the remaining oxygen must cover 1.2 times the oxygen needed to return; the first violation is the point of no return.
- **Shelters and corridor.** Time to the habitat or the rover from every point, sheltered waiting points along the way, and a corridor that widens with position uncertainty.
- **Replanning during the walk.** Solar particle event, suit leak, injured crewmate, lost rover, lost positioning and dust storms are replanned from the astronaut's current position.
- **EVA time window.** A score for every half hour of the day from sun geometry, temperature and the dust devil peak.
- **Honest about its data.** Every input is tagged as observed, derived, modelled or assumed, and the verdict drops to CAUTION when confidence is low.

## How it works

```
orbital image + terrain model + mineral map
        │  pipeline/build_scene.py  (Python, offline, optional)
        ▼
per-cell feature channels  →  data/public/scenes/<scene>/
        │  loaded in a Web Worker
        ▼
fields.ts   safety S, science V, confidence C, no-go mask, shade, line of sight
search.ts   Dijkstra (return-oxygen field), A* (legs), distance transform
route.ts    target ordering, route A, plan B, corridor, shelters, walk-back, scoring
        ▼
React interface: map (Canvas), panels, route profile, helmet HUD
```

The path cost of a step is `w_d·ΔO₂ + w_s·(100 − S) + w_v·(100 − V)` with safety and science weighted 70 : 30 by default; no-go cells are excluded before any cost is computed. Oxygen use follows a walk-back model derived from Apollo metabolic rates, scaled for slope, ground type, carried samples and fatigue. All weights, coefficients and thresholds live in one file, `app/src/engine/config.ts`, each with its source, and the main ones can be changed from the interface.

## Project structure

| Path | Contents |
|---|---|
| `app/src/engine/config.ts` | Every weight, coefficient and threshold, with its source |
| `app/src/engine/fields.ts` | Cell scores, no-go mask, shade, viewshed, radiation, temperature |
| `app/src/engine/search.ts` | Dijkstra, A*, distance transform |
| `app/src/engine/route.ts` | Target ordering, routes A and B, corridor, shelters, walk-back, scoring |
| `app/src/engine/physio.ts` | Oxygen, cooling water, walking speed, fatigue, sun and dust models |
| `app/src/engine/messages.ts` | Planner explanations and warnings in both languages |
| `app/src/workers/planner.worker.ts` | Runs the planner off the main thread |
| `app/src/i18n/` | Interface dictionaries (`tr.ts`, `en.ts`) and the language context |
| `app/src/ui/` | Map, panels, route profile, helmet HUD, guided tour, print sheet |
| `app/src/scenes.ts` | Scene descriptions and science targets |
| `data/public/` | Prebuilt scene channels, base images and rover imagery served by the app |
| `pipeline/` | Python preprocessing that produces the scene channels |
| `scripts/ensure-deps.mjs` | Installs the app dependencies on demand |

### Adding a language

Copy `app/src/i18n/en.ts`, translate the values and register the new dictionary in `app/src/i18n/index.ts`. Dictionaries are typed against `tr.ts`, so a missing key fails the build. Add the matching entries to `app/src/engine/messages.ts` and to the bilingual fields in `config.ts` and `scenes.ts`.

## Rebuilding the scene data (optional)

The app does not need this step. It is only for regenerating the scenes from the original sources, and it needs Python 3.10+ and an internet connection.

```bash
pip install -r pipeline/requirements.txt
python pipeline/fetch_jezero.py          # HiRISE tiles from Mars Trek and the USGS 1 m terrain model window
python pipeline/build_scene.py jezero    # feature channels → data/public/scenes/jezero
python pipeline/build_scene.py insight   # needs PIA26515.tif in the repository root
```

`PIA26515.tif` is the HiRISE image of the InSight landing site published by NASA; download it from the NASA Photojournal and place it in the repository root. Raw downloads go to `data/raw/` and are not committed.

## Data and credits

- HiRISE imagery: NASA/JPL-Caltech/University of Arizona
- Terrain model: USGS Astrogeology Science Center (CC0)
- CRISM mineral map: Parente, Itoh and Saranathan, Zenodo 5575824 (CC BY)
- Perseverance waypoints, sample tube locations and Navcam, Mastcam-Z and WATSON images: NASA/JPL-Caltech (with ASU and MSSS)
- Spirit Pancam panorama: NASA/JPL/Cornell

Temperature, sun geometry and radiation are models, and the Elysium scene has no measured terrain model; the interface marks these as modelled or assumed. This is a hackathon prototype for exploring a concept, not flight software.
