import { useRef, useState } from 'react'
import cells from './data/pacer-results.json'
import { asset } from './parts'

type Cell = (typeof cells)[number]
const traces = [...new Set(cells.map((c) => c.trace))]
const caches = [...new Set(cells.map((c) => c.cache))]
const traceNote: Record<string, string> = {
  'To-C chat': 'consumer chat traffic',
  'To-B API': 'business API traffic',
  Coder: 'coding assistant traffic',
  Thinking: 'reasoning-model traffic',
}

export function PacerExplorer() {
  const [trace, setTrace] = useState(traces[0])
  const [cache, setCache] = useState(caches[1])
  const cell = cells.find((c) => c.trace === trace && c.cache === cache) as Cell
  const top = Math.max(...cells.filter((c) => c.trace === trace).map((c) => c.belady))
  const tied = cell.lo <= 0
  const rows = [
    { name: 'LRU (the default)', v: cell.lru, cls: '' },
    { name: `Best tuned heuristic (${cell.bestName})`, v: cell.best, cls: '' },
    { name: "ATC'25 policy", v: cell.atc, cls: '' },
    { name: 'Pacer', v: cell.pacer, cls: 'hi' },
    { name: 'Perfect foresight', v: cell.belady, cls: 'ref' },
  ]
  const wins = cells.filter((c) => c.lo > 0).length
  return (
    <section className="explorer" aria-label="Pacer results explorer">
      <h4>
        Try it: all 16 test cells <span>pick a workload and a cache size</span>
      </h4>
      <div className="controls">
        <div role="group" aria-label="Workload trace">
          {traces.map((t) => (
            <button key={t} type="button" aria-pressed={t === trace} onClick={() => setTrace(t)}>
              {t}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Cache size">
          {caches.map((c) => (
            <button key={c} type="button" aria-pressed={c === cache} onClick={() => setCache(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="bars" role="img" aria-label={`Hit ratio on ${trace} at ${cache} cache: ${rows.map((r) => `${r.name} ${r.v}%`).join(', ')}`}>
        {rows.map((r) => (
          <div className={`bar ${r.cls}`} key={r.name}>
            <span>{r.name}</span>
            <div className="track">
              <div className="fill" style={{ width: `${(r.v / top) * 100}%` }} />
            </div>
            <span className="val">{r.v.toFixed(2)}%</span>
          </div>
        ))}
      </div>
      <p className="verdict" aria-live="polite">
        <b className={tied ? 'tie' : 'win'}>{tied ? 'Statistically tied.' : 'Pacer is ahead.'}</b> Against the best tuned heuristic:{' '}
        {cell.delta > 0 ? '+' : ''}
        {cell.delta.toFixed(2)} points, 95% interval {cell.lo.toFixed(2)} to {cell.hi.toFixed(2)}.
        {tied && ' The interval includes zero, so this cell does not count as a win.'}
      </p>
      <p className="axis">
        Block hit ratio on the held-out hour of the {trace} trace ({traceNote[trace]}), cache = {cache} of unique blocks. Simulation. Bars share one
        scale per workload. Perfect foresight is Belady's offline bound. Across all cells: ahead in {wins}, tied in {cells.length - wins}, behind in 0.
      </p>
      <details>
        <summary>Show all 16 cells as a table</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Trace</th>
                <th>Cache</th>
                <th>LRU</th>
                <th>Best heuristic</th>
                <th>ATC'25</th>
                <th>Pacer</th>
                <th>Pacer vs best (95% CI)</th>
                <th>Belady</th>
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
                    {c.delta > 0 ? '+' : ''}
                    {c.delta.toFixed(2)} [{c.lo.toFixed(2)}, {c.hi.toFixed(2)}]
                  </td>
                  <td>{c.belady.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}

const chapters = [
  { t: 0, label: 'A seven-tile play lands' },
  { t: 8, label: 'A play is held while tiles go down' },
  { t: 22, label: 'New rack read, new top play' },
  { t: 33, label: 'The board grows, the panel re-ranks' },
  { t: 45, label: 'Play accepted' },
]
const steps = [
  { name: 'Capture', note: '~10 Hz', text: 'Grab the display about ten times a second. Frames that did not change are skipped, so an idle board costs almost nothing.' },
  { name: 'Align', note: 'every moved frame', text: 'Find the board from the colors of its squares. Zooming, panning and resizing need no setup; the preview clears while the board moves.' },
  { name: 'Read', note: 'OpenCV + NumPy', text: 'Classify every square as empty or a tile, then read each letter and the point value printed on it.' },
  { name: 'Settle', note: '3 frames in a row', text: 'A position must read the same on three frames. Unclear tiles are repaired from the word list, or flagged for one tap. Never guessed.' },
  { name: 'Search', note: 'DAWG, 204k words', text: 'A word-graph search in a separate process finds every legal placement and keeps the top three by total score.' },
  { name: 'Preview', note: 'click-through overlay', text: 'The best play is drawn as ghost tiles over the game. The overlay ignores input and never clicks or places anything.' },
]

export function TileLensPlayer() {
  const video = useRef<HTMLVideoElement>(null)
  const [now, setNow] = useState(0)
  const [step, setStep] = useState(0)
  const active = chapters.reduce((a, c, i) => (now >= c.t ? i : a), 0)
  const seek = (t: number) => {
    const v = video.current
    if (!v) return
    v.currentTime = t
    void v.play().catch(() => undefined)
  }
  return (
    <>
      <section className="player" aria-label="TileLens live recording with chapters">
        <figure className="video">
          <video
            ref={video}
            controls
            preload="none"
            poster={asset('media/tilelens/discord-live-02.jpg')}
            playsInline
            aria-label="TileLens over a live Letter League game in Discord"
            src={asset('media/tilelens/tilelens-discord-live.mp4')}
            onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
          />
          <figcaption>Live over Discord Letter League, 11 Nov 2026. Real time, about 50 seconds. Player card blurred.</figcaption>
        </figure>
        <ol className="chapters" aria-label="Jump to a moment">
          {chapters.map((c, i) => (
            <li key={c.t}>
              <button type="button" aria-current={i === active} onClick={() => seek(c.t)}>
                <span className="t">0:{String(c.t).padStart(2, '0')}</span>
                {c.label}
              </button>
            </li>
          ))}
        </ol>
      </section>
      <section className="pipeline" aria-label="How TileLens works, step by step">
        <h4>
          Try it: walk the pipeline <span>six steps, ten times a second</span>
        </h4>
        <div
          role="tablist"
          aria-label="Pipeline steps"
          onKeyDown={(e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
            const next = (step + (e.key === 'ArrowRight' ? 1 : -1) + steps.length) % steps.length
            setStep(next)
            ;(e.currentTarget.children[next] as HTMLElement).focus()
          }}
        >
          {steps.map((s, i) => (
            <button key={s.name} type="button" role="tab" id={`step-${i}`} aria-selected={i === step} aria-controls="step-panel" tabIndex={i === step ? 0 : -1} onClick={() => setStep(i)}>
              <span className="n">{i + 1}</span>
              {s.name}
            </button>
          ))}
        </div>
        <div role="tabpanel" id="step-panel" aria-labelledby={`step-${step}`} className="step-panel">
          <p>{steps[step].text}</p>
          <span className="note">{steps[step].note}</span>
        </div>
      </section>
    </>
  )
}

const places = [
  { label: 'Walk: Kresge → Baskin Engineering', hash: '#/r/kresge-college/baskin-engineering' },
  { label: 'McHenry Library', hash: '#/p/mchenry-library' },
  { label: 'Science Hill', hash: '#/p/science-hill' },
  { label: 'Walk: Quarry Plaza → McHenry', hash: '#/r/quarry-plaza/mchenry-library' },
]

export function ClassmapDemo() {
  const [hash, setHash] = useState<string | null>(null)
  return (
    <section className="mapdemo" aria-label="Classmap web map, live">
      <h4>
        Try it: the real web map <span>the same build the repo produces, running in this page</span>
      </h4>
      {hash === null ? (
        <div className="map-gate">
          <img src={asset('media/classmap/web-04-route.jpg')} alt="" loading="lazy" />
          <button type="button" className="primary" onClick={() => setHash(places[0].hash)}>
            Load the live map
          </button>
          <p>Loads map tiles from OpenFreeMap. Nothing is sent anywhere else.</p>
        </div>
      ) : (
        <>
          <div className="controls">
            <div role="group" aria-label="Jump to a place or route">
              {places.map((p) => (
                <button key={p.hash} type="button" aria-pressed={p.hash === hash} onClick={() => setHash(p.hash)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <iframe key={hash} title="Classmap web map of UC Santa Cruz" src={`${asset('demos/classmap-map/index.html')}${hash}`} loading="lazy" />
          <p className="axis">Search works too: try "BE", "mchenery libr" (typo on purpose) or "science hill". Not affiliated with UC Santa Cruz.</p>
        </>
      )}
    </section>
  )
}
