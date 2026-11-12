# Portfolio

My portfolio site, built with Astro. A home page with three project cards, a case study page for each project, and a short page for Ethocal.

Each case study has something to try:

- **Pacer:** pick a workload and a cache size to see any of the 16 result cells from the repo.
- **TileLens:** a live recording with chapters, and the six-step pipeline to walk through.
- **Classmap:** the real web map, running in the page.

Results open to show where each number comes from. Captures open in a viewer that says how each one was made.

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
```

| Command | What it does |
|---|---|
| `npm run build` | Type-check (`astro check`) and build static files to `dist/` |
| `npm run preview` | Serve `dist/` on :4321 (Astro runs it in the background; `npx astro preview stop` ends it) |
| `npm run e2e` | 16 browser tests in Chrome (builds and serves first) |
| `npm run audit` | axe accessibility checks on every page, light and dark (needs the preview running) |
| `npm run sync` | Pull facts and media from `../showcase` |

## Layout

| Path | What it is |
|---|---|
| `src/pages/index.astro` | Home: hero, work, about, contact |
| `src/pages/work/[id].astro` | Case study page, one per project in `featured_order` |
| `src/components/Islands.tsx` | The interactive pieces (React), hydrated only where used |
| `src/components/NameTiles.astro` | The shuffling name rack in the hero |
| `src/styles/global.css` | All styles. Color and type tokens are at the top |
| `src/data/` | `projects.json`, `case-studies.json`, `pacer-results.json`, `manifest.json` |
| `public/` | Media, the resume PDF, and the built Classmap web map |

## Change the look

Everything reads from the tokens at the top of `src/styles/global.css`. The brand color is `--blue` (with `--blue-strong`, `--blue-soft` and `--on-blue`), set once for light and once for dark.

## Add a project

1. Add it to `projects` and `featured_order` in `src/data/projects.json` (or in `../showcase/content/projects.json`, then `npm run sync`), with `results`, `decisions` and `limits`.
2. Add its story to `src/data/case-studies.json`: headline, summary, problem, contribution, architecture, tradeoffs, takeaway, sourceLinks.
3. Add its captures under `public/media/<id>/` and list them in `src/data/manifest.json`.

It gets a card and a case study page. For a card image, a headline number or an interactive piece, add its id to `ProjectCard.astro`, `headline` in `src/lib/data.ts`, and `work/[id].astro`.

## Deploy

Static output. `.github/workflows/deploy.yml` builds on a push to `main` and publishes to GitHub Pages, passing the site origin and base path to the build. Set Settings > Pages > Source to "GitHub Actions" once.

For any other static host: `SITE=https://example.com BASE=/ npm run build`, then publish `dist/`.

## Notes

- The map demo loads tiles from OpenFreeMap only after "Load the live map" is pressed.
- Fonts are Geist and Geist Mono, bundled from `@fontsource` (SIL Open Font License).
- Not affiliated with UC Santa Cruz or any game.
