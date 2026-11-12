# Portfolio

My portfolio site, built with Astro. The home page is a desk: one sheet of engineering paper on a cutting mat, with a snapshot of each project lying around it. Everything on the desk can be picked up and moved.

| Page | What is on it |
|---|---|
| `/` | The desk. Drag the sheet, the snapshots and the sticky note. Rearrange or shuffle the name tiles. Drop the rubber stamp to leave a mark. Pull the lamp cord for night. The rulers follow the pointer, and "Tidy the desk" puts it all back. |
| `/work/` | A card per project, filtered by what each one is built with. |
| `/work/<id>/` | A case study: at a glance, something to try, the problem, how it works, decisions, results, limits, evidence. |
| `/about/` | A name badge that swings and flips, a short bio, three habits, the toolbox, contact. |
| `/play/` | Two toys made from the projects, and the real Classmap web map. |

On a phone or a short window the desk becomes a stack. The tiles and the stamp still work there; nothing else drags.

Each case study has something to try:

- **Pacer:** pick a workload and a cache size to see any of the 16 result cells from the repo.
- **TileLens:** a live recording with chapters, and the six-step pipeline to walk through.
- **Classmap:** the real web map, running in the page.

Results open to show where each number comes from. Captures open in a viewer that says how each one was made.

The toys on the play page:

- **Be the cache:** four slots, 32 requests, and you choose what to evict. Scored against FIFO, LRU and perfect foresight on the same traffic.
- **Find the best play:** the highest-scoring words a rack of tiles can spell from the TileLens demo word list, with the search timed in the browser.

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
```

| Command | What it does |
|---|---|
| `npm run build` | Type-check (`astro check`) and build static files to `dist/` |
| `npm run preview` | Serve `dist/` on :4321 (Astro runs it in the background; `npx astro preview stop` ends it) |
| `npm run e2e` | 23 browser tests in Chrome (builds and serves first) |
| `npm run audit` | axe accessibility checks on every page, light and dark (needs the preview running) |
| `npm run sync` | Pull facts, media, the map and the word list from `../showcase` and the project repos |

`node scripts/shots.mjs` saves review screenshots to `_shots/` (needs the preview running).

## Layout

| Path | What it is |
|---|---|
| `src/pages/index.astro` | Home: the desk |
| `src/pages/work/index.astro` | Work: the project cards and the filter |
| `src/pages/work/[id].astro` | Case study page, one per project in `featured_order` |
| `src/pages/about.astro`, `src/pages/play.astro` | About and Play |
| `src/layouts/Base.astro` | Head, fonts, theme, header and footer |
| `src/components/Islands.tsx` | The case study pieces (React), hydrated only where used |
| `src/components/Toys.tsx` | The two toys (React) |
| `src/components/Tiles.astro` | A word as letter tiles |
| `src/scripts/desk.ts` | Dragging, the stamp and the rulers |
| `src/scripts/tiles.ts` | The name rack: drag to reorder, shuffle, solve |
| `src/scripts/chrome.ts` | The lamp cord, the reading ruler, arrivals on scroll |
| `src/scripts/badge.ts` | The swinging name badge |
| `src/styles/` | `tokens.css` first, then `base.css`, `desk.css`, `pages.css`, `islands.css`. `global.css` imports them in that order |
| `src/data/` | `projects.json`, `case-studies.json`, `pacer-results.json`, `manifest.json`, `demo-words.txt` |
| `public/` | Media, the resume PDF, and the built Classmap web map |

## Change the look

Everything reads from `src/styles/tokens.css`. The desk is made of a few materials, each set once for light and once for dark:

| Tokens | What they are |
|---|---|
| `--desk`, `--mat` | The table and the cutting mat |
| `--paper`, `--ink`, `--muted`, `--pad` | Paper, text, and the green print on the engineering pad |
| `--blue` | The pen: links and primary buttons |
| `--red` | The red pen: stamps, notes and limits |
| `--hi`, `--mark` | The highlighter: pressed tiles and link underlines |
| `--tile` | Letter tiles and buttons |

Type is Recursive (casual for headings, mono for text) and Caveat for handwriting.

## Add a project

1. Add it to `projects` and `featured_order` in `src/data/projects.json` (or in `../showcase/content/projects.json`, then `npm run sync`), with `accent`, `results`, `decisions` and `limits`.
2. Add its story to `src/data/case-studies.json`: headline, summary, problem, contribution, architecture, tradeoffs, takeaway, sourceLinks.
3. Add its captures under `public/media/<id>/` and list them in `src/data/manifest.json`.

It gets a card on the work page and a case study page. For a card image, a headline number or an interactive piece, add its id to `ProjectCard.astro`, `headline` in `src/lib/data.ts`, and `work/[id].astro`. For a snapshot on the desk, give it a photo in `index.astro` and a place (`.snap.s4`) in `desk.css`.

## Deploy

Static output. `.github/workflows/deploy.yml` builds on a push to `main` and publishes to GitHub Pages, passing the site origin and base path to the build. Set Settings > Pages > Source to "GitHub Actions" once.

For any other static host: `SITE=https://example.com BASE=/ npm run build`, then publish `dist/`.

## Notes

- Motion is off for anyone who asks for reduced motion. Without JavaScript the pages still read; only the playing stops.
- Where the desk was left is kept for the browser session, not longer.
- The map demo loads tiles from OpenFreeMap only after "Load the live map" is pressed.
- Fonts are Recursive and Caveat, bundled from `@fontsource` (SIL Open Font License).
- The rack toy uses the hand-made demo word list from the TileLens repo.
- Not affiliated with UC Santa Cruz or any game.
