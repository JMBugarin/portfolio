import { lazy, Suspense, useEffect, useRef, useState } from "react";
import data from "./data/projects.json";
import storiesData from "./data/case-studies.json";
import {
  asset,
  assets,
  imageProps,
  Gallery,
  Results,
  Video,
  type Project,
} from "./parts";

const PacerExplorer = lazy(() =>
  import("./interactive").then((m) => ({ default: m.PacerExplorer })),
);
const TileLensPlayer = lazy(() =>
  import("./interactive").then((m) => ({ default: m.TileLensPlayer })),
);
const ClassmapDemo = lazy(() =>
  import("./interactive").then((m) => ({ default: m.ClassmapDemo })),
);
const projects = data.featured_order
  .map((id) => (data.projects as Project[]).find((p) => p.id === id)!)
  .filter(Boolean);
type Story = {
  headline: string;
  summary: string;
  problem: string;
  contribution: string;
  architecture: { title: string; body: string }[];
  tradeoffs: { title: string; choice: string; cost: string }[];
  takeaway: string;
  sourceLinks: { label: string; url: string }[];
};
const stories = storiesData as Record<string, Story>;
const email = "jbugarin85424@gmail.com";
const meta: Record<
  string,
  { short: string; tag: string; metric: string; metricNote: string }
> = {
  pacer: {
    short: "Teaching a cache what to forget.",
    tag: "Systems + machine learning",
    metric: "13 / 16",
    metricNote: "simulation cases ahead of the best tuned heuristic",
  },
  tilelens: {
    short: "From pixels to the next best play.",
    tag: "Computer vision + exact search",
    metric: "2.2 ms",
    metricNote: "median move search on mid-game 13 × 13 boards",
  },
  classmap: {
    short: "A classroom. An actual location.",
    tag: "Mobile + geospatial",
    metric: "87 / 87",
    metricNote: "official UCSC classrooms resolve to a location",
  },
};
const routeTo = (id: string) => `#/projects/${id}`;
const currentRoute = () => location.hash.slice(1) || "/";
function useRoute() {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    const go = () => setRoute(currentRoute());
    addEventListener("hashchange", go);
    return () => removeEventListener("hashchange", go);
  }, []);
  return route;
}
function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);
  return [
    theme,
    () => setTheme((t) => (t === "light" ? "dark" : "light")),
  ] as const;
}
function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
function ContactLinks({ resume = true }: { resume?: boolean }) {
  return (
    <div className="contact-links">
      <a href={data.profile.links.github}>
        GitHub <Arrow />
      </a>
      <a href={data.profile.links.linkedin}>
        LinkedIn <Arrow />
      </a>
      <a href={`mailto:${email}`}>
        Email <Arrow />
      </a>
      {resume && (
        <a
          href={asset("resume/Joshua-Bugarin-Resume.pdf")}
          target="_blank"
          rel="noreferrer"
        >
          Resume <span className="tiny">PDF</span> <Arrow />
        </a>
      )}
    </div>
  );
}
function ProjectVisual({ id }: { id: string }) {
  if (id === "pacer")
    return (
      <div className="project-visual pacer-visual">
        <div className="visual-label">
          <span>HELD-OUT CHAT TRACE</span>
          <span>2% CACHE</span>
        </div>
        <div className="mini-chart">
          <div>
            <span>LRU</span>
            <i style={{ width: "60.9%" }} />
            <b>24.36%</b>
          </div>
          <div className="highlight">
            <span>Pacer</span>
            <i style={{ width: "75.5%" }} />
            <b>30.19%</b>
          </div>
        </div>
        <div className="visual-foot">
          <span>BLOCK HIT RATIO ↑</span>
          <span>SIMULATED RESULTS</span>
        </div>
      </div>
    );
  if (id === "tilelens")
    return (
      <div className="project-visual tilelens-visual">
        <img
          {...imageProps(
            "media/tilelens/discord-live-02.jpg",
            "(max-width: 760px) 100vw, 400px",
          )}
          alt="TileLens showing word suggestions and ghost tiles over a real Letter League board"
          decoding="async"
        />
        <span className="media-stamp">RECORDED · REAL GAME</span>
      </div>
    );
  if (id !== "classmap") {
    const cover = assets.find((a) => a.project === id && a.kind === "image");
    return (
      <div className="project-visual">
        {cover ? (
          <img {...imageProps(cover.file)} alt={cover.purpose} />
        ) : (
          <p className="empty">Explore the project →</p>
        )}
      </div>
    );
  }
  return (
    <div className="project-visual classmap-visual">
      <img
        {...imageProps("media/classmap/ios-02-search.jpg", "140px")}
        alt="Classmap room search in the iOS Simulator"
        decoding="async"
      />
      <img
        {...imageProps("media/classmap/ios-06-class-on-map.jpg", "140px")}
        alt="A class located on the UCSC map in the iOS Simulator"
        decoding="async"
      />
      <span className="media-stamp">iOS SIMULATOR CAPTURES</span>
    </div>
  );
}
function Home() {
  const [filter, setFilter] = useState("All work");
  const [query, setQuery] = useState("");
  const others = data.other.filter((p) => p.id !== "coursework");
  const rows = [
    ...projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.one_liner,
      group:
        p.id === "pacer"
          ? "Systems + ML"
          : p.id === "tilelens"
            ? "Vision"
            : "Mobile",
      stack: p.stack.slice(0, 4).join(" · "),
    })),
    ...others.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.contribution || p.note,
      group: "Mobile",
      stack: "Flutter · Dart · Team project",
    })),
  ];
  const filtered = rows.filter(
    (p) =>
      (filter === "All work" || p.group === filter) &&
      `${p.name} ${p.description} ${p.stack}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <section className="hero" aria-labelledby="home-title">
        <div>
          <p className="eyebrow">SOFTWARE ENGINEERING & AI / ML</p>
          <h1 id="home-title">
            Joshua Bugarin<span className="red">.</span>
          </h1>
          <p className="hero-line">
            Small tools. <em>Serious engineering.</em>
          </p>
          <p className="hero-copy">
            I build systems that make better decisions—from what an LLM cache
            keeps to where your next class actually is. Then I check the work.
          </p>
          <ContactLinks />
        </div>
        <aside className="hero-note" role="note">
          <span className="note-number">FIELD NOTES / 2026</span>
          <p>
            Good demos are nice.
            <br />
            <em>Evidence is better.</em>
          </p>
          <div className="note-rule" />
          <span>
            Computer Science @ UC Santa Cruz
            <br />
            Computer Engineering minor
          </span>
          <a href="#/about">
            A little about me <span aria-hidden="true">→</span>
          </a>
        </aside>
      </section>
      <section id="work" className="selected" aria-labelledby="work-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / SELECTED WORK</p>
            <h2 id="work-title">
              Built. Tested. <em>Worth a closer look.</em>
            </h2>
          </div>
          <span className="section-note">
            Three projects. Three different rabbit holes.
          </span>
        </div>
        <div className="project-grid">
          {projects.map((p, i) => (
            <article className={`project-card ${p.id}`} key={p.id}>
              <div className="project-card-heading">
                <h3>
                  <a href={routeTo(p.id)}>{p.name}</a>
                </h3>
                <span className="tiny">
                  0{i + 1} <Arrow />
                </span>
              </div>
              <a
                className="visual-link"
                href={routeTo(p.id)}
                aria-label={`Explore ${p.name}`}
              >
                <ProjectVisual id={p.id} />
              </a>
              <div className="project-card-body">
                <div className="card-eyebrow">
                  <span>
                    0{i + 1} / {meta[p.id]?.tag || p.category}
                  </span>
                  <Arrow />
                </div>
                <p className="card-description">
                  {meta[p.id]?.short || p.one_liner}
                </p>
                <p className="stack">{p.stack.slice(0, 3).join(" / ")}</p>
                <div className="card-result">
                  <strong>{meta[p.id]?.metric}</strong>
                  <span>{meta[p.id]?.metricNote}</span>
                </div>
                <a className="case-link" href={routeTo(p.id)}>
                  Open case study <span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="collection" aria-labelledby="collection-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">02 / THE COLLECTION</p>
            <h2 id="collection-title">The rest of the story.</h2>
          </div>
          <label className="search">
            <span className="sr-only">Search projects</span>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Find a project or technology"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="filters" role="group" aria-label="Filter projects">
          {["All work", "Systems + ML", "Vision", "Mobile"].map((f) => (
            <button
              key={f}
              aria-pressed={f === filter}
              onClick={() => setFilter(f)}
            >
              {f}
              <span>
                {f === "All work"
                  ? rows.length
                  : rows.filter((p) => p.group === f).length}
              </span>
            </button>
          ))}
        </div>
        <p className="sr-only" role="status">
          {filtered.length} projects found
        </p>
        <div className="project-list">
          {filtered.map((p) => (
            <a key={p.id} href={routeTo(p.id)} className="project-row">
              <h3>{p.name}</h3>
              <div>
                <p>{p.description}</p>
                <span>{p.stack}</span>
              </div>
              <span aria-hidden="true">↗</span>
            </a>
          ))}
          {!filtered.length && (
            <p className="empty">
              No projects match that search. Try “Python” or clear the filters.
            </p>
          )}
        </div>
      </section>
      <section id="about" className="about" aria-labelledby="about-title">
        <div>
          <p className="eyebrow">03 / THE PERSON BEHIND THE TESTS</p>
          <h2 id="about-title">
            Curious enough to build it.
            <br />
            <em>Skeptical enough to test it.</em>
          </h2>
        </div>
        <div>
          <p>
            I'm Joshua, a computer science student at UC Santa Cruz with a
            computer engineering minor. I work across systems, machine learning,
            computer vision, and mobile software.
          </p>
          <p>
            I like the part where a promising idea meets an inconvenient test. A
            fast solver checked by a slow one. A model compared with tuned
            baselines. A room name that has to resolve to a real door.
          </p>
          <div className="about-details">
            <span>Santa Cruz, CA</span>
            <span>Expected graduation · June 2028</span>
          </div>
          <a
            className="text-link"
            href={asset("resume/Joshua-Bugarin-Resume.pdf")}
            target="_blank"
            rel="noreferrer"
          >
            Read my resume (PDF) <Arrow />
          </a>
          <small>Original resume · November 10, 2026</small>
        </div>
      </section>
      <Contact />
    </>
  );
}
function Contact() {
  const [copied, setCopied] = useState("");
  return (
    <section id="contact" className="contact" aria-labelledby="contact-title">
      <div>
        <p className="eyebrow">LET'S BUILD SOMETHING USEFUL</p>
        <h2 id="contact-title">Have a good problem?</h2>
        <p>I'd like to hear about it.</p>
      </div>
      <div>
        <a className="email-link" href={`mailto:${email}`}>
          {email} <Arrow />
        </a>
        <div className="contact-actions">
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(email);
                setCopied("Email copied.");
              } catch {
                setCopied("Copy unavailable. Select the email address above.");
              }
            }}
          >
            Copy email
          </button>
          <span role="status">{copied}</span>
        </div>
        <ContactLinks resume={false} />
      </div>
    </section>
  );
}
function CaseStudy({ project }: { project: Project }) {
  const p = project,
    s = stories[p.id];
  const [showSources, setShowSources] = useState(false);
  const [node, setNode] = useState(0);
  const next =
    projects[(projects.findIndex((x) => x.id === p.id) + 1) % projects.length];
  return (
    <article className={`case-study ${p.id}`}>
      <div className="case-top">
        <a className="back-link" href="#/work">
          ← All work
        </a>
        <span className="eyebrow">{p.category} / ORIGINAL SOLO PROJECT</span>
      </div>
      <header className="case-hero">
        <div>
          <p className="eyebrow">{p.name} / ENGINEERING CASE STUDY</p>
          <h1>{s?.headline || p.one_liner}</h1>
          <p className="case-summary">{s?.summary || p.one_liner}</p>
          <div className="case-actions">
            <a className="button primary" href={p.repo}>
              View source <Arrow />
            </a>
            <a className="button" href={`${routeTo(p.id)}?section=experiment`}>
              Explore the{" "}
              {p.id === "pacer"
                ? "results"
                : p.id === "tilelens"
                  ? "recording"
                  : "live map"}{" "}
              ↓
            </a>
          </div>
        </div>
        <aside className="case-facts" role="note">
          <dl>
            <dt>My role</dt>
            <dd>Design, implementation & testing</dd>
            <dt>Built with</dt>
            <dd>{p.stack.join(" · ")}</dd>
            <dt>Evidence snapshot</dt>
            <dd>
              November 11, 2026
              <br />
              <a href={`${p.repo}/tree/${p.commit}`}>
                Commit {p.commit} <Arrow />
              </a>
            </dd>
          </dl>
        </aside>
      </header>
      <nav className="case-nav" aria-label="Case study sections">
        {[
          "Overview",
          "Experiment",
          "Architecture",
          "Decisions",
          "Results",
          "Evidence",
        ].map((label) => (
          <a
            key={label}
            href={`${routeTo(p.id)}?section=${label.toLowerCase()}`}
          >
            {label}
          </a>
        ))}
      </nav>
      <section id="overview" tabIndex={-1} className="overview case-section">
        <div>
          <p className="eyebrow">THE PROBLEM</p>
          <h2>{meta[p.id]?.short || p.name}</h2>
          <p>{s?.problem || p.one_liner}</p>
        </div>
        <div>
          <p className="eyebrow">WHAT I BUILT</p>
          <p>{s?.contribution || p.one_liner}</p>
          <p className="takeaway">{s?.takeaway}</p>
        </div>
      </section>
      <section
        id="experiment"
        tabIndex={-1}
        className="case-section experiment"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">UNDER THE HOOD / TRY IT</p>
            <h2>
              {p.id === "pacer"
                ? "Make the comparison yourself."
                : p.id === "tilelens"
                  ? "Pixels in. Plays out."
                  : "Find your way around."}
            </h2>
          </div>
          <span className="type-badge">
            {p.id === "pacer"
              ? "RECORDED EXPERIMENT DATA"
              : p.id === "tilelens"
                ? "RECORDED SOFTWARE DEMO"
                : "LIVE SOFTWARE"}
          </span>
        </div>
        <Suspense fallback={<p role="status">Loading the interactive view…</p>}>
          {p.id === "pacer" ? (
            <PacerExplorer />
          ) : p.id === "tilelens" ? (
            <TileLensPlayer />
          ) : p.id === "classmap" ? (
            <ClassmapDemo />
          ) : (
            <p>Explore the repository for implementation details.</p>
          )}
        </Suspense>
      </section>
      {s && (
        <section
          id="architecture"
          tabIndex={-1}
          className="case-section architecture"
        >
          <p className="eyebrow">HOW THE SYSTEM WORKS</p>
          <h2>Follow the data.</h2>
          <p className="section-intro">
            Select a stage to inspect the implementation. This is an explanation
            of the system, not a running model.
          </p>
          <div className="architecture-layout">
            <div
              role="tablist"
              aria-label={`${p.name} architecture`}
              aria-orientation="vertical"
              onKeyDown={(e) => {
                if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key))
                  return;
                e.preventDefault();
                const n =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? s.architecture.length - 1
                      : (node +
                          (e.key === "ArrowDown" ? 1 : -1) +
                          s.architecture.length) %
                        s.architecture.length;
                setNode(n);
                (e.currentTarget.children[n] as HTMLElement).focus();
              }}
            >
              {s.architecture.map((a, i) => (
                <button
                  role="tab"
                  id={`arch-${i}`}
                  aria-controls="architecture-panel"
                  aria-selected={node === i}
                  tabIndex={node === i ? 0 : -1}
                  key={a.title}
                  onClick={() => setNode(i)}
                >
                  <span>0{i + 1}</span>
                  {a.title}
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id="architecture-panel"
              aria-labelledby={`arch-${node}`}
              tabIndex={0}
            >
              <span className="architecture-number" aria-hidden="true">0{node + 1}</span>
              <h3>{s.architecture[node].title}</h3>
              <p>{s.architecture[node].body}</p>
              <span className="tiny">
                IMPLEMENTATION WALKTHROUGH · {p.name.toUpperCase()}
              </span>
            </div>
          </div>
        </section>
      )}
      <section id="decisions" tabIndex={-1} className="case-section">
        <p className="eyebrow">ENGINEERING IS CHOOSING</p>
        <h2>The decisions. And the bill.</h2>
        <div className="tradeoffs">
          {s?.tradeoffs.map((t) => (
            <details key={t.title} open>
              <summary>{t.title}</summary>
              <p>{t.choice}</p>
              <p className="tradeoff-cost">
                <b>The tradeoff</b>
                {t.cost}
              </p>
            </details>
          )) || p.decisions.map((t) => <p key={t}>{t}</p>)}
        </div>
      </section>
      <section id="results" tabIndex={-1} className="case-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE EVIDENCE</p>
            <h2>What held up.</h2>
          </div>
          <button
            className="button"
            aria-pressed={showSources}
            onClick={() => setShowSources((v) => !v)}
          >
            {showSources ? "Hide" : "Show"} all sources
          </button>
        </div>
        <p className="section-intro">
          Measurements from the verified project snapshot. Open any result for
          its source and whether it was re-run in the showcase audit.
        </p>
        <Results
          results={p.results}
          showAll={showSources}
          verifiedOn="11 Nov 2026"
          repo={p.repo}
          commit={p.commit}
        />
        <aside className="limits" role="note">
          <h3>Where it stops.</h3>
          <ul>
            {p.limits.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          {p.id === "pacer" && (
            <p>
              Simulation hit-rate improvements and the separate MLX laptop
              replay measure different things. Neither is a production
              deployment.
            </p>
          )}
        </aside>
      </section>
      <section id="evidence" tabIndex={-1} className="case-section">
        <p className="eyebrow">SHOW, THEN TELL</p>
        <h2>From the running software.</h2>
        {p.id === "pacer" && (
          <Video
            file="media/pacer/pacer-demo.mp4"
            poster="media/pacer/demo-table.jpg"
            label="Pacer recorded terminal demonstration"
            note="Recorded demonstration · make demo on the held-out chat trace. Real time, about 39 seconds. Silent recording; the terminal shows policy execution and the final hit-rate table."
          />
        )}
        {p.id === "classmap" && (
          <div className="recordings">
            <Video
              portrait
              file="media/classmap/classmap-ios.mp4"
              poster="media/classmap/ios-03-room.jpg"
              label="Classmap iOS Simulator recording"
              note="Recorded demonstration · iOS Simulator, 49 seconds. Search for a room, import an invented class schedule, and locate the class on the map. Silent recording."
            />
            <Video
              file="media/classmap/classmap-web.mp4"
              poster="media/classmap/web-04-route.jpg"
              label="Classmap web recording"
              note="Recorded demonstration · real web build, 29 seconds. Room search and a walking route. Silent recording. Available even when the live map cannot load."
            />
          </div>
        )}
        <Gallery project={p.id} label={`${p.name} captures`} />
        <div className="source-links">
          <h3>Read the engineering notes</h3>
          {s?.sourceLinks.map((l) => (
            <a key={l.url} href={l.url}>
              {l.label} <Arrow />
            </a>
          ))}
        </div>
      </section>
      <a className="next-project" href={routeTo(next.id)}>
        <div>
          <span className="eyebrow">NEXT CASE STUDY</span>
          <h2>{next.name}</h2>
        </div>
        <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}
function Ethocal() {
  const p = data.other.find((p) => p.id === "ethocal")!;
  return (
    <article className="ethocal">
      <a className="back-link" href="#/work">
        ← All work
      </a>
      <p className="eyebrow">TEAM PROJECT / FLUTTER + DART</p>
      <h1>Ethocal</h1>
      <p className="case-summary">
        A sustainable shopping app, built with a team of five.
      </p>
      <section className="overview">
        <div>
          <h2>The project</h2>
          <p>{p.note}</p>
        </div>
        <div>
          <h2>My contribution</h2>
          <p>{p.contribution}</p>
          <p className="muted">
            Contribution described by Joshua on November 11, 2026. The private
            repository does not independently attribute these changes.
          </p>
        </div>
      </section>
      <aside className="limits" role="note">
        <h3>What is available</h3>
        <p>
          The repository is private. No verified public demo or recording is
          available, so this entry documents the contribution without presenting
          a simulated app.
        </p>
      </aside>
      <Contact />
    </article>
  );
}
export default function App() {
  const rawRoute = useRoute();
  const [route, routeQuery] = rawRoute.split("?");
  const [theme, toggleTheme] = useTheme();
  const main = useRef<HTMLElement>(null);
  const id = route.startsWith("/projects/") ? route.split("/")[2] : null;
  const project = projects.find((p) => p.id === id);
  const isHome = ["/", "/work", "/about", "/contact"].includes(route);
  useEffect(() => {
    document.title = project
      ? `${project.name} — Joshua Bugarin`
      : id === "ethocal"
        ? "Ethocal — Joshua Bugarin"
        : "Joshua Bugarin — Software engineering & AI/ML";
    const section =
      isHome && route !== "/"
        ? route.slice(1)
        : new URLSearchParams(routeQuery).get("section");
    requestAnimationFrame(() => {
      if (section) {
        const target = document.getElementById(section);
        target?.scrollIntoView();
        target?.focus({ preventScroll: true });
      } else {
        window.scrollTo(0, 0);
        main.current?.focus({ preventScroll: true });
      }
    });
  }, [rawRoute, routeQuery, route, project, isHome, id]);
  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="running">
        <a className="brand" href="#/" aria-label="Joshua Bugarin home">
          <span className="monogram">
            jb<span>.</span>
          </span>
          <span>
            JOSHUA BUGARIN
            <span className="brand-sub">ENGINEER / BUILDER / TESTER</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a
            href="#/work"
            aria-current={project || route === "/work" ? "page" : undefined}
          >
            Work
          </a>
          <a
            href="#/about"
            aria-current={route === "/about" ? "page" : undefined}
          >
            About
          </a>
          <a
            href="#/contact"
            aria-current={route === "/contact" ? "page" : undefined}
          >
            Contact
          </a>
          <a
            href={asset("resume/Joshua-Bugarin-Resume.pdf")}
            target="_blank"
            rel="noreferrer"
          >
            Resume <Arrow />
          </a>
          <button
            className="theme-switch"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          >
            {theme === "light" ? "◐" : "◑"}
          </button>
        </nav>
      </header>
      <main id="main" tabIndex={-1} ref={main}>
        {isHome ? (
          <Home />
        ) : project ? (
          <CaseStudy key={project.id} project={project} />
        ) : id === "ethocal" ? (
          <Ethocal />
        ) : (
          <section className="not-found">
            <p className="eyebrow">404 / MISSING FIELD NOTE</p>
            <h1>This page wandered off.</h1>
            <a className="button primary" href="#/">
              Back to the work →
            </a>
          </section>
        )}
      </main>
      <footer>
        <a className="brand" href="#/">
          Joshua Bugarin<span className="red">.</span>
        </a>
        <p>Built with curiosity. Backed by evidence.</p>
        <span>© 2026 · Santa Cruz, CA</span>
        <a href="#/contact">
          Get in touch <Arrow />
        </a>
      </footer>
    </>
  );
}
