# Drafting Table Portfolio

Joshua Bugarin's portfolio as a green self-healing cutting mat: draggable polaroids and sticky notes, index cards for projects, and label-tape contact links. A navbar switch turns it into a plain, high-contrast list.

Astro 7 and Tailwind CSS 4. Static output, no framework runtime, about 10 KB of JavaScript.

## Run and check

```sh
npm install
npm run dev
npm run build      # astro check + static build
npm run e2e        # browser checks against the built site on :4331
```

## Structure

| File | Responsibility |
| --- | --- |
| `src/content/projects/*.md` | One project per file. Frontmatter: `title`, `description`, `techStack`, `problem`, `solution`, `next` (bullets), `media` (videos and screenshots with alt text and size), optional `githubUrl`, `liveUrl`, `category`, `stat`, `order`. The Markdown body holds results, decisions and limits |
| `src/content.config.ts` | Collection schema |
| `src/data/site.ts` | Name, bio, links, toolbox, timeline |
| `src/layouts/Base.astro` | Head, view bootstrap, navbar, mat wrapper, rulers |
| `src/pages/index.astro` | Hero with polaroids and notes, about, projects, toolbox, contact, title block |
| `src/pages/projects/[id].astro` | Project sheet: why it was built, demos, interface, results, next steps |
| `src/components/MediaFigure.astro` | One demo video or screenshot with its caption |
| `public/media/<project>/` | Demo videos (H.264, faststart, loaded on play) and interface screenshots |
| `src/components/Avatar.astro` | Line-art self-portrait above the name |
| `src/components/Polaroid.astro` | Draggable photo linking to a project; images in `src/assets/polaroids/` |
| `src/styles/global.css` | Tailwind theme, `mat:` / `list:` variants, both views |
| `src/scripts/mat.ts` | View toggle, scroll-follow tilt origin, cursor parallax, anchor and focus scrolling |
| `src/scripts/drag.ts` | Drag to move anything with `data-drag` |

## Two views, one document

The markup is written once. With no `data-view` on `<html>` it is the clean list, so the page is readable without JavaScript. An inline head script sets `data-view="mat"` before first paint unless `localStorage.view` is `list`. `?view=list` or `?view=mat` forces and remembers a view, so a link can open straight into the clean list. Polaroids, notes, the avatar and other decoration are `mat-only`.

Tailwind utilities take a `mat:` or `list:` prefix (`mat:grid mat:lg:grid-cols-12`).

## The tilt

`.drafting-container` holds the perspective, `.engineering-mat` the rotation (12° on X, -1.4° on Z; 6° and -0.8° under 768 px). A tall page tilted once would swing toward the camera as it scrolls, so `mat.ts` moves `perspective-origin` and `transform-origin` to the middle of the viewport on every scroll frame. The mat slides under a fixed camera and native scrolling still works.

The browser aims anchor and focus scrolling at the projected box, which is far from the layout box on a tilted plane. In-page links and keyboard focus are scrolled by layout offset instead.

Every wrapper between the mat and a card needs `transform-style: preserve-3d` (class `lay`), and nothing in that chain can use `overflow`, `filter` or `opacity`, or the lift flattens.

## Dragging

Anything with `data-drag` can be moved with a mouse or pen. Touch scrolls the page as usual. The pointer delta is divided by the mat's local scale at the item, measured with a probe element, so items stay under the cursor on the tilted plane. The last item dragged stays on top. A drag never fires the polaroid's link; a plain click still opens the project. Positions reset on reload.

## Deploying under a subpath

Set `SITE` and `BASE` at build time. Links and the résumé go through `href()` in `src/data/site.ts`.

