# The Grey Archive artwork

An original set of engraved project allegories for Joshua Bugarin's portfolio. The artwork is static and reusable; it does not require a different page implementation for each project.

## Status: exploratory study, not selected

Joshua did not select this palette, thin lettering/linework, or custom project-card direction. Keep these files as a record of the first exploration; do not use them as approved assets for the final site. The revised concept is a bolder shared deck that briefly shuffles and reveals projects on hover/focus or tap, followed by the same project-page template. Its final palette and typography remain open.

## Included

| Asset | Meaning |
| --- | --- |
| Pacer — The Keeper | A latched retention engine and a branching memory structure. Some archive compartments remain held; released blocks fall beside counterweights. |
| TileLens — The Lens | An optical instrument reading a letter lattice. A crimson unresolved tile makes uncertainty visible. |
| Classmap — The Cartographer | A paper navigation instrument and dividers above real campus-path geometry, with a highlighted graph route. |
| Card back | A reversible fan-vault and guilloche design, shared across the deck. |
| Card frame | A transparent version of the common front border and picture aperture. |
| Archive seal | An original JB monogram combining an archive door, branching terminals, and an instrument ring. Supplied in crimson and bone. |

Each project has a complete card face and a separate illustration-only version. Those illustration-only assets fit the same media/header slot on every project page.

## Files

The website-ready assets are in [public/art/grey-archive](../../public/art/grey-archive/).

- `pacer-card`, `tilelens-card`, `classmap-card`: 840 × 1440 SVG masters.
- `pacer-illustration`, `tilelens-illustration`, `classmap-illustration`: 680 × 910 SVG masters.
- `card-back` and `card-frame`: 840 × 1440 SVG masters.
- `archive-seal` and `archive-seal-bone`: 512 × 512 SVG masters.
- Each master also has a **PNG at twice its native dimensions** and a **WebP at native dimensions**.
- `manifest.json` records descriptions, palette, sources, and dimensions.

SVG typography is outlined. No external font, image, script, or icon-library request is needed to display an asset. Card corners, seal backgrounds, and the reusable frame preserve transparency. The illustration-only assets have a pale engraved picture field with transparency outside its arch.

The complete pack is [grey-archive-assets.zip](grey-archive-assets.zip). The [collection preview](collection-preview.png) shows all three fronts and the shared pieces. The [small-size proof](small-size-proof.png) shows the fronts at 280 pixels wide.

## Use in the portfolio

Use a card face for the homepage spread, or use the illustration-only version in the shared project-page template. Ordinary images are enough:

```astro
<img
  src="/art/grey-archive/pacer-illustration.webp"
  alt="An archive mechanism retaining some memory blocks while releasing others."
  width="680"
  height="910"
  loading="lazy"
/>
```

For a deployment under a URL subpath, use the portfolio's existing `url()` helper for the source path.

Keep the actual project name and description in HTML beside a homepage card, particularly at small sizes. Fine labels engraved into the artwork are decorative detail, not a replacement for readable page copy. Motion can act on the whole image; it is not built into the files.

Suggested illustration alt text:

- Pacer: “An archive mechanism retaining some memory blocks while releasing others.”
- TileLens: “An optical instrument magnifying a letter grid, with an unresolved tile marked in crimson.”
- Classmap: “Dividers over a campus-path drawing with a crimson route between McHenry Library and Baskin Engineering.”

Use an empty `alt` when the illustration repeats adjacent explanatory content and is purely decorative. A seal beside the written name can also have an empty `alt`.

## Visual rules

- Ink `#282B2D`, bone `#E8DFCB`, pale paper `#F0E9DA`, brass `#9B8655`, crimson `#8E303A`.
- One pointed architectural aperture, shared double rules, and a small registration diamond unify the deck.
- Project imagery is drawn from mechanisms in the actual work. No franchise characters, official tarot artwork, stock icons, or decorative particle assets are used.
- Hatching is part of individual surfaces, rather than a noise filter over the entire image.
- The card back has 180-degree rotational symmetry.

## Sources and credits

The illustrations and border geometry are original authored vector drawings. They were created directly as SVG; no image-generation service or API was used.

Typography is outlined from:

- **Basteleur** by Keussel, copyright 2021. [Official source](https://gitlab.com/velvetyne/basteleur). [Included SIL Open Font License](fonts/basteleur-license.txt).
- **Sligoil** by Ariel Martín Pérez, copyright 2025. [Official source](https://gitlab.com/velvetyne/sligoil). [Included SIL Open Font License](fonts/sligoil-license.txt).

The original font files and license notices are retained in `fonts/` for rebuilding.

**Classmap map data © OpenStreetMap contributors, ODbL.** [Copyright and attribution](https://www.openstreetmap.org/copyright). The map drawing uses the portfolio's bundled `public/demos/classmap-map/data/graph.json`. Its highlighted route is a shortest-distance graph study between nodes near McHenry Library and Baskin Engineering; it is not a navigation recommendation or a performance result. The card and illustration both include the map attribution. Preserve that attribution when cropping or reusing the map artwork.

## Rebuild

From the portfolio root:

```sh
uv run --with fonttools python design/grey-archive/build_assets.py
node design/grey-archive/export_assets.mjs
```

The Python script draws the SVG masters and outlines the included fonts. The export script uses the project's existing Sharp installation to make PNGs, WebPs, and flat review sheets. No runtime package was added.

The SVGs can also be edited directly in a vector editor. Rebuilding replaces generated SVGs, so keep any manual SVG edits separately or incorporate them into the drawing source first.
