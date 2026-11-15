# Gray Fog Portfolio

Joshua Bugarin’s Astro portfolio: a muted graphite, sage, and silver engineering archive inspired by gothic architecture. A framed cathedral illustration introduces four visible project previews and their evidence. The optional Three.js / GSAP banquet table offers another way to explore the same work. The project index and case studies are statically rendered HTML.

The existing project facts, evidence, media, contact details, résumé, and `/work/` URLs are retained. Four real projects occupy seats I–IV: Pacer, TileLens, Classmap, and Ethocal. Seats V–VI are explicitly reserved for future work; they do not open fabricated case studies.

## Run and check

```sh
npm install
npm run dev
npm run build          # Astro type checking and static build
npm run verify:asset   # GLB contract, mesh names, origins, UVs, sizes and compression
npm run e2e            # 16 navigation, fallback, lifecycle and keyboard checks
npm run audit          # axe audit; start a local server on :4321 first
npm run profile:scene  # 5-second frame samples at normal and 4× CPU throttle
```

Astro 7 can retain a background dev server. `npx astro dev status` shows its URL. After introducing a content configuration, restart a previously running server so it discovers the collection. Use `npx astro dev stop` followed by `npm run dev`, or restart with `npm run dev -- --force`. Tests can reuse a local server on port 4321; in CI they build and serve the production output. `QA_BASE` overrides the server URL for the browser tests, audit, and profiler.

## Structure

| File | Responsibility |
| --- | --- |
| `src/components/TarotTableScene.astro` | Static project cards, scene container, accessible chair controls, preview card and native bio dialog |
| `src/scripts/tarot-table.ts` | Client custom element; eligibility, lazy loading, grid toggle and Astro lifecycle |
| `src/scripts/tarot-webgl.ts` | Three.js renderer, GLB loading, lights, four procedural mist planes, parallax, raycasting, sigils and GSAP departure |
| `src/scripts/transitions.ts` | 0.85 s mist departure, client navigation, 0.5 s arrival |
| `src/layouts/Base.astro` | Existing shared layout, ClientRouter, local fonts and transition cover |
| `src/content/config.ts` | Collection schema and glob loader, using Astro 7’s `astro/zod` |
| `src/content.config.ts` | Astro 7’s discovery entry point for that configuration |
| `src/content/projects/*.md` | The six seat bindings and Markdown content |
| `src/pages/projects/[slug].astro` | Canonical project pages; enriched existing case studies or standalone Markdown |
| `src/components/CaseStudy.astro` | Existing project evidence, decisions, media, source links and limits |
| `src/lib/data.ts`, `src/data/` | Verified project facts and original artwork metadata |
| `src/styles/sanctum.css` | Scene, slide-over and reading presentation |
| `src/styles/silver.css` | Muted architectural theme, responsive hero, project previews and shared reading refinements |
| `src/components/ProjectCrest.astro` | Consistent project identity across the work index and both case-study route families |
| `public/images/gray-sanctum.webp` | Original cathedral hero illustration, 1086 × 1448, 272 KB |
| `public/models/tarot-table.glb` | Self-contained, Draco-compressed runtime model |
| `public/draco/` | Local JavaScript/WASM decoder files copied from the installed Three.js version |

Styling uses Tailwind 4 through its Vite integration alongside the existing custom CSS. Preflight is omitted to preserve established component styles. Literata headings and italic accents, Inter body text, and the card fonts are bundled locally. No font or decoder CDN is required.

## Add or replace a seat

Update the corresponding Markdown file under `src/content/projects/`. The schema requires `title`, `romanNumeral` (I–VI), `arcana`, `seatMeshName`, a summary up to 140 characters, `stack`, and `featuredOrder`. Source and live URLs are optional. Keep every seat binding unique.

For existing projects, `projectId` matches an ID in `src/lib/data.ts`; the page retains the fact-rich case study and renders the Markdown introduction. New projects can omit `projectId`: their Markdown body becomes a standalone case study. Change `reserved: true` to `false` when real work is ready. A reserved entry has no project link and does not generate an empty project page.

The existing `/work/<id>/` pages continue to work. Landing-page cards use `/projects/<id>/`.

## Model contract

The runtime export contains **21,474 triangles** and is **5,771,056 bytes** (5.77 MB, under the decimal 6 MB target). All textures are embedded, with maximum dimensions of 2048×2048. ORM uses red for occlusion, green for roughness, and blue for metalness. The source bronze regions retain metallic 0.85 and roughness 0.45; a runtime material shader desaturates their color to aged silver without changing the PBR maps. One shared baked PBR material serves nine meshes:

- `Bronze_Table`, `Head_Throne`, `Seat_01`–`Seat_06`, `Pillars`.
- All rotations are applied and scales are `(1,1,1)`.
- Chair origins are at the **center axis of the crest / top of the chair back**, as required by the revised tooltip contract. The original delivered Blender master still has floor-centered origins; the export script preserves it.
- `Sigil_Head` and `Sigil_01`–`Sigil_06` retain their original world transforms and carry crest panel size metadata. Local +Z faces out of each sigil anchor. Runtime glyph planes attach there.
- Draco level 6, position quantization 16 bits, normals 10 bits, UVs 14 bits. The required `KHR_draco_mesh_compression` extension is present.
- In glTF, Y is up and one unit is one metre. `design/tarot-asset.json` records the Blender export transforms; `design/tarot-runtime-validation.json` records an independent Draco decode.

To recreate this revised asset from the editable Blender master delivered earlier:

```sh
blender --background /path/to/Gray_Fog_Sanctum.blend --python scripts/export-tarot.py
npm run verify:asset
```

The script changes origins, applies transforms, scales the base-color atlas to 2K, preserves sigil transforms, and exports to `public/models/tarot-table.glb`. It does not save over the source `.blend`. After upgrading Three.js, copy its `examples/jsm/libs/draco/gltf/` decoder files to `public/draco/` again.

## Interaction and fallbacks

Visitors start with the project archive; eligible desktop visitors can choose **Enter the table**. The selected view is remembered for the browser session. In the optional scene, visitors get constrained camera parallax (±0.6 m horizontal, ±0.25 m vertical). Hovering a chair colors its crest muted sage, dollies the camera about 3%, and opens an HTML project preview. Chair labels support keyboard focus and Enter. The head throne opens a native, focus-trapped dialog with biography, contact links and résumé download.

Selecting a real project freezes interaction, moves the camera toward the chair, increases fog density from 0.045 to 0.38, and covers the page with mist before Astro navigation. The destination fades that cover over 0.5 seconds. Reading areas have no animated background fog; only the case-study hero carries a subtle CSS mist.

Below 768 px, with four or fewer reported CPU cores, with reduced motion, or with data saving enabled, the static grid is used and the Three.js/GSAP chunk, GLB and decoder are not requested. The mobile/low-core notice can be dismissed. The **Back to project index** control returns to the visible project previews. No JavaScript still leaves four usable project links and readable case studies. Failed model requests or a lost GPU context also reveal the index.

The renderer caps pixel ratio at 1.5, reduces it to 1 after sustained slow frames, and pauses outside the viewport or in hidden tabs. Astro swaps and grid toggles abort pending model transfers, stop animation frames and observers, kill tweens, and dispose geometries, materials, textures, the environment map, renderer and decoder workers. A decode already in progress settles before its worker pool is released.

## Validation

The November 14 visual refresh passed `npm run build`, all 16 browser tests, and the axe audit with zero violations in its nine route/view checks. Tests include explicit scene entry, default desktop avoiding 3D downloads, route identity consistency, 320/390 px layouts, reduced motion, no JavaScript, galleries, GPU loss, download cancellation, and browser history.


Validated locally on November 14, 2026:

- Production type check and static build pass.
- 16 browser tests pass, including 320 px / 390 px layouts, reduced motion, no JavaScript, history navigation, GPU context loss and disposal during a pending model request.
- axe reports zero violations across the index, all four canonical case studies, work index, about page, desktop 3D and mobile index. This supplements manual keyboard review; it is not a complete accessibility certification.
- Local Chrome at 1440×900 recorded approximately 60 FPS with 4× CPU throttling in a five-second steady-state sample at DPR 1. `design/tarot-performance.json` contains the measurements. This result is specific to this machine and browser, not a guarantee for every GPU or display.

Three.js remains a substantial lazy-loaded desktop chunk. It is not part of the mobile/grid path. Project pages load the shared Astro router and page behavior; only the pre-existing media gallery hydrates React when visible. They do not load the WebGL engine on a direct visit.

## Deploy

The existing GitHub Pages workflow builds on pushes to `main`, setting `SITE` and `BASE`. Asset, decoder, navigation and project URLs honor Astro’s base path. No deployment or push is performed by the local implementation task.

For another static host:

```sh
SITE=https://example.com BASE=/ npm run build
```

Publish `dist/`. Project facts and media can still be refreshed through the existing `npm run sync` workflow.
