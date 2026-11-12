import { useEffect, useRef, useState } from "react";
import cells from "./data/pacer-results.json";
import { asset } from "./parts";

type Cell = (typeof cells)[number];
const traces = [...new Set(cells.map((c) => c.trace))];
const caches = [...new Set(cells.map((c) => c.cache))];
const traceNote: Record<string, string> = {
  "To-C chat": "consumer chat traffic",
  "To-B API": "business API traffic",
  Coder: "coding assistant traffic",
  Thinking: "reasoning-model traffic",
};

export function PacerExplorer() {
  const [trace, setTrace] = useState(traces[0]);
  const [cache, setCache] = useState(caches[1]);
  const cell = cells.find(
    (c) => c.trace === trace && c.cache === cache,
  ) as Cell;
  const top = Math.max(
    ...cells.filter((c) => c.trace === trace).map((c) => c.belady),
  );
  const tied = cell.lo <= 0;
  const rows = [
    { name: "LRU (the default)", v: cell.lru, cls: "" },
    { name: `Best tuned heuristic (${cell.bestName})`, v: cell.best, cls: "" },
    { name: "ATC'25 policy", v: cell.atc, cls: "" },
    { name: "Pacer", v: cell.pacer, cls: "hi" },
    { name: "Perfect foresight", v: cell.belady, cls: "ref" },
  ];
  const wins = cells.filter((c) => c.lo > 0).length;
  const choose = (next: Cell) => {
    setTrace(next.trace);
    setCache(next.cache);
  };
  return (
    <section className="explorer" aria-label="Pacer results explorer">
      <h3 className="module-title">
        Inspect the experiment{" "}
        <span>recorded simulation results · 16 test cells</span>
      </h3>
      <p className="experiment-intro">
        A cache saves work when it keeps a block the next request needs. Change
        the workload and available memory to see when the learned policy
        helps—and when it does not.
      </p>
      <div className="controls">
        <div role="group" aria-label="Workload trace">
          {traces.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={t === trace}
              onClick={() => setTrace(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Cache size">
          {caches.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === cache}
              onClick={() => setCache(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div
        className="bars"
        role="img"
        aria-label={`Hit ratio on ${trace} at ${cache} cache: ${rows.map((r) => `${r.name} ${r.v}%`).join(", ")}`}
      >
        {rows.map((r) => (
          <div className={`bar ${r.cls}`} key={r.name}>
            <span>{r.name}</span>
            <div className="track">
              <div
                className="fill"
                style={{ width: `${(r.v / top) * 100}%` }}
              />
            </div>
            <span className="val">{r.v.toFixed(2)}%</span>
          </div>
        ))}
      </div>
      <p className="verdict" aria-live="polite">
        <b className={tied ? "tie" : "win"}>
          {tied ? "Statistically tied." : "Pacer is ahead."}
        </b>{" "}
        Against the best tuned heuristic: {cell.delta > 0 ? "+" : ""}
        {cell.delta.toFixed(2)} points, 95% interval {cell.lo.toFixed(2)} to{" "}
        {cell.hi.toFixed(2)}.
        {tied &&
          " The interval includes zero, so this cell does not count as a win."}
      </p>
      <p className="axis">
        Block hit ratio on the held-out hour of the {trace} trace (
        {traceNote[trace]}), cache = {cache} of unique blocks. Simulation. Bars
        share one scale per workload. Perfect foresight is Belady's offline
        bound. Across all cells: ahead in {wins}, tied in {cells.length - wins},
        behind in 0.
      </p>
      <div className="matrix-controls">
        <button type="button" onClick={() => choose(cells[0])}>
          Show a clear win
        </button>
        <button type="button" onClick={() => choose(cells[2])}>
          Show where it ties
        </button>
      </div>
      <details className="experiment-notes">
        <summary>Compare all workloads at a glance</summary>
        <p className="axis">
          Each cell is Pacer’s gain over the best tuned heuristic, in percentage
          points. Select a cell to inspect the policies and confidence interval
          above. A dot marks an interval that includes zero.
        </p>
        <div className="table-wrap">
          <table className="result-matrix">
            <caption>
              Pacer vs. the strongest heuristic · held-out simulation
            </caption>
            <thead>
              <tr>
                <th scope="col">Workload / cache</th>
                {caches.map((c) => (
                  <th scope="col" key={c}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {traces.map((t) => (
                <tr key={t}>
                  <th scope="row">{t}</th>
                  {caches.map((c) => {
                    const item = cells.find(
                      (x) => x.trace === t && x.cache === c,
                    )!;
                    return (
                      <td key={c}>
                        <button
                          type="button"
                          className={`matrix-cell ${item.lo > 0 ? "win" : "tie"}`}
                          aria-label={`${t}, ${c} cache: plus ${item.delta.toFixed(2)} points, ${item.lo > 0 ? "ahead" : "statistically tied"}`}
                          aria-pressed={trace === t && cache === c}
                          onClick={() => choose(item)}
                        >
                          +{item.delta.toFixed(2)}
                          {item.lo <= 0 ? " ·" : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <details className="experiment-notes">
        <summary>What changes inside the cache?</summary>
        <p>
          <strong>LRU</strong> discards the least recently used block.{" "}
          <strong>Pacer</strong> estimates whether each sampled block will be
          reused within the cache’s recent eviction horizon, then evicts the
          least likely one. The model sees metadata available at the time, not
          the next request.
        </p>
        <p>
          <strong>The tradeoff:</strong> a higher hit ratio is not automatically
          lower latency. These are trace-driven simulations with one model per
          workload and one temporal split. The separate laptop replay found a
          much smaller timing gain.
        </p>
        <p className="axis">
          The best heuristic is picked with hindsight per cell. Intervals use
          twelve five-minute buckets; displayed gains are from unrounded source
          values.{" "}
          <a href="https://github.com/JMBugarin/pacer/blob/9775802/docs/results.md">
            Read the results and limitations ↗
          </a>
        </p>
      </details>
      <details>
        <summary>Show all 16 cells as a table</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Trace</th>
                <th scope="col">Cache</th>
                <th scope="col">LRU</th>
                <th scope="col">Best heuristic</th>
                <th scope="col">ATC'25</th>
                <th scope="col">Pacer</th>
                <th scope="col">Pacer vs best (95% CI)</th>
                <th scope="col">Belady</th>
              </tr>
            </thead>
            <tbody>
              {cells.map((c) => (
                <tr key={c.trace + c.cache}>
                  <td>{c.trace}</td>
                  <td>{c.cache}</td>
                  <td>{c.lru.toFixed(2)}</td>
                  <td>
                    {c.best.toFixed(2)} ({c.bestName})
                  </td>
                  <td>{c.atc.toFixed(2)}</td>
                  <td>
                    <b>{c.pacer.toFixed(2)}</b>
                  </td>
                  <td>
                    {c.delta > 0 ? "+" : ""}
                    {c.delta.toFixed(2)} [{c.lo.toFixed(2)}, {c.hi.toFixed(2)}]
                  </td>
                  <td>{c.belady.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="axis">
        <a href="https://github.com/JMBugarin/pacer/blob/9775802/README.md#results">
          Source: Pacer’s published results table ↗
        </a>{" "}
        · Values are loaded from the shared content snapshot; this page does not
        run a benchmark.
      </p>
    </section>
  );
}

const chapters = [
  { t: 0, label: "A seven-tile play lands" },
  { t: 8, label: "A play is held while tiles go down" },
  { t: 22, label: "New rack read, new top play" },
  { t: 33, label: "The board grows, the panel re-ranks" },
  { t: 45, label: "Play accepted" },
];
const steps = [
  {
    name: "Capture",
    note: "~10 Hz",
    text: "Grab the display about ten times a second. If the captured pixels have not changed and the position has settled, skip the remaining work.",
  },
  {
    name: "Align",
    note: "every moved frame",
    text: "Find the board from the colors of its squares. Zooming, panning and resizing need no setup; the preview clears while the board moves.",
  },
  {
    name: "Read",
    note: "OpenCV + NumPy",
    text: "Classify every square as empty or a tile, then read each letter and the point value printed on it.",
  },
  {
    name: "Settle",
    note: "3 frames in a row",
    text: "A position must read the same on three frames. Unclear tiles are repaired from the word list, or flagged for one tap. Never guessed.",
  },
  {
    name: "Search",
    note: "DAWG, 204k words",
    text: "A word-graph search in a separate process finds legal placements and keeps the top three by total score. A completed search is exact; an interrupted search is labeled “best found so far.”",
  },
  {
    name: "Preview",
    note: "click-through overlay",
    text: "The best play is drawn as ghost tiles over the game. The overlay ignores input and never clicks or places anything.",
  },
];

export function TileLensPlayer() {
  const video = useRef<HTMLVideoElement>(null);
  const [now, setNow] = useState(0);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("");
  const pendingSeek = useRef<number | null>(null);
  const active = chapters.reduce((a, c, i) => (now >= c.t ? i : a), 0);
  const seek = (t: number) => {
    const v = video.current;
    if (!v) return;
    pendingSeek.current = t;
    setStatus("Loading the recorded demonstration…");
    if (v.readyState > 0) {
      v.currentTime = t;
      pendingSeek.current = null;
    }
    // play() is called during the user gesture, including when metadata has not loaded yet.
    void v
      .play()
      .catch(() =>
        setStatus(
          "Playback did not start. Use the video’s play control, or open the recording below.",
        ),
      );
  };
  return (
    <>
      <section
        className="player"
        aria-label="TileLens recorded demonstration with chapters"
      >
        <figure className="video">
          <video
            ref={video}
            controls
            preload="none"
            poster={asset("media/tilelens/discord-live-02.jpg")}
            playsInline
            aria-label="Recorded demonstration of TileLens over a Letter League game in Discord"
            src={asset("media/tilelens/tilelens-discord-live.mp4")}
            onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              if (pendingSeek.current !== null) {
                e.currentTarget.currentTime = pendingSeek.current;
                pendingSeek.current = null;
              }
            }}
            onPlaying={() => setStatus("")}
            onError={() =>
              setStatus(
                "The recording could not load. The chapter descriptions and screenshots remain available; you can also open the MP4 directly.",
              )
            }
          />
          <figcaption>
            Recorded demonstration · Discord Letter League, 11 Nov 2026. Real
            time, about 50 seconds; player card blurred. This is footage of the
            desktop app, not software running in your browser.
          </figcaption>
        </figure>
        <ol className="chapters" aria-label="Jump to a moment">
          {chapters.map((c, i) => (
            <li key={c.t}>
              <button
                type="button"
                aria-current={i === active ? "true" : undefined}
                onClick={() => seek(c.t)}
              >
                <span className="t">0:{String(c.t).padStart(2, "0")}</span>
                {c.label}
              </button>
            </li>
          ))}
        </ol>
        <p className="interaction-status" role="status">
          {status}
        </p>
        <p className="axis">
          <a href={asset("media/tilelens/tilelens-discord-live.mp4")}>
            Open the recording (MP4) ↗
          </a>
        </p>
      </section>
      <section
        className="pipeline"
        aria-label="How TileLens works, step by step"
      >
        <h3 className="module-title">
          Try it: walk the pipeline <span>six steps, ten times a second</span>
        </h3>
        <div
          role="tablist"
          aria-label="Pipeline steps"
          onKeyDown={(e) => {
            if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key))
              return;
            e.preventDefault();
            const next =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? steps.length - 1
                  : (step + (e.key === "ArrowRight" ? 1 : -1) + steps.length) %
                    steps.length;
            setStep(next);
            (e.currentTarget.children[next] as HTMLElement).focus();
          }}
        >
          {steps.map((s, i) => (
            <button
              key={s.name}
              type="button"
              role="tab"
              id={`step-${i}`}
              aria-selected={i === step}
              aria-controls="step-panel"
              tabIndex={i === step ? 0 : -1}
              onClick={() => setStep(i)}
            >
              <span className="n">{i + 1}</span>
              {s.name}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id="step-panel"
          aria-labelledby={`step-${step}`}
          className="step-panel"
          tabIndex={0}
        >
          <p>{steps[step].text}</p>
          <span className="note">{steps[step].note}</span>
        </div>
        <p className="axis">
          Architecture walkthrough ·{" "}
          <a href="https://github.com/JMBugarin/tilelens/blob/5b157ca/docs/live-loop.md">
            Read the live-loop implementation notes ↗
          </a>
        </p>
      </section>
    </>
  );
}

const places = [
  {
    label: "Walk: Kresge → Baskin Engineering",
    hash: "#/r/kresge-college/baskin-engineering",
  },
  { label: "McHenry Library", hash: "#/p/mchenry-library" },
  { label: "Science Hill", hash: "#/p/science-hill" },
  {
    label: "Walk: Quarry Plaza → McHenry",
    hash: "#/r/quarry-plaza/mchenry-library",
  },
];

export function ClassmapDemo() {
  const [hash, setHash] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    addEventListener("online", update);
    addEventListener("offline", update);
    return () => {
      removeEventListener("online", update);
      removeEventListener("offline", update);
    };
  }, []);
  const navigate = (next: string | null) => {
    if (next !== hash) {
      setLoaded(false);
      setHash(next);
    }
  };
  const demoUrl = `${asset("demos/classmap-map/index.html")}${hash ?? places[0].hash}`;
  return (
    <section className="mapdemo" aria-label="Classmap web map, live">
      <h3 className="module-title">
        Try the real web map <span>live software · loaded only on request</span>
      </h3>
      {hash === null ? (
        <div className="map-gate">
          <img
            src={asset("media/classmap/web-04-route.jpg")}
            alt=""
            loading="lazy"
          />
          <button
            type="button"
            className="primary"
            onClick={() => navigate(places[0].hash)}
          >
            Load the live map
          </button>
          <p>
            The project’s bundled web build, with search and walking routes. Map
            tiles load from OpenFreeMap and require a connection and WebGL.
          </p>
        </div>
      ) : (
        <>
          <div className="controls">
            <div role="group" aria-label="Jump to a place or route">
              {places.map((p) => (
                <button
                  key={p.hash}
                  type="button"
                  aria-pressed={p.hash === hash}
                  onClick={() => navigate(p.hash)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="interaction-actions">
            <a href={demoUrl} target="_blank" rel="noopener noreferrer">
              Open map in a full tab ↗
            </a>
            <button type="button" onClick={() => navigate(null)}>
              Unload map
            </button>
          </div>
          <p className="interaction-status" role="status">
            {loaded
              ? "Map application loaded."
              : "Loading the map application…"}
            {!online &&
              " You appear to be offline; map tiles may be unavailable."}
          </p>
          <iframe
            key={hash}
            title="Classmap web map of UC Santa Cruz"
            src={demoUrl}
            loading="lazy"
            onLoad={() => setLoaded(true)}
          />
          <p className="axis">
            Search works too: try "BE", "mchenery libr" (typo on purpose) or
            "science hill". Not affiliated with UC Santa Cruz.
          </p>
        </>
      )}
      <p className="axis">
        If tiles stay blank, use the project screenshots and recorded
        walkthrough below. The web map is separate from the Flutter app; photo
        import is shown in the iOS Simulator recording.
      </p>
    </section>
  );
}
