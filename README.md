# Project notebook

My portfolio site: three projects, each with the measurements, the misses and something to try.

- **Pacer:** pick a workload and a cache size to see all 16 result cells from the repo.
- **TileLens:** a live recording with chapters, and the six-step pipeline to walk through.
- **Classmap:** the real web map, running in the page.

Every number is a button that shows its source and whether it was re-run. Captures open in a drawer that says how each one was made.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run build` | Type-check and build static files to `dist/` |
| `npm run preview` | Serve `dist/` on :4321 |
| `npm run e2e` | Browser tests in Chrome (builds and serves first) |
| `npm run sync` | Pull facts and media from `../showcase` (macOS, uses `sips`) |

Keyboard: `j` / `k` move between entries, `s` shows every source, `t` switches paper and night desk, `?` lists the rest.

## Where things come from

| Path | Source |
|---|---|
| `src/data/projects.json` | `../showcase/content/projects.json`: names, one-liners, stack, results with sources, limits, order |
| `src/data/manifest.json`, `public/media/` | `../showcase/media/manifest.json` and its files, resized to JPEG. Videos are copied as they are |
| `src/data/pacer-results.json` | The results table in Pacer's README, which its own report tool writes |
| `public/demos/classmap-map/` | `web/dist` from the Classmap repo, unchanged |

`npm run sync` rebuilds all four. Nothing else is hand-copied.

## Add a project

1. Add it to `projects` and `featured_order` in `../showcase/content/projects.json`, with `results` (each with a `source` and `rerun`), `decisions` and `limits`.
2. Put its captures under `../showcase/media/<id>/` and regenerate the showcase manifest.
3. `npm run sync`.

It now renders with its results, decisions, limits and evidence drawer. For a custom headline, intro or interactive piece, add an entry for its id to `extras` in `src/App.tsx`.

## Deploy

The build is plain static files with relative paths, so it works at a domain root or a sub-path.

GitHub Pages: push to `main` and `.github/workflows/deploy.yml` builds and publishes. In the repository settings, set Pages > Source to "GitHub Actions" once.

## Notes

- The map demo loads tiles from OpenFreeMap when you press "Load the live map". Nothing loads from other sites before that.
- Fonts are Newsreader and IBM Plex Mono, bundled from `@fontsource` (SIL Open Font License).
- Not affiliated with UC Santa Cruz or any game.
