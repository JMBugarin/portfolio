import { useEffect, useRef, useState } from 'react'
import cells from '../data/pacer-results.json'
import { assets, url, type Result } from '../lib/data'

type Cell = (typeof cells)[number]
const traces = [...new Set(cells.map((c) => c.trace))]
const caches = [...new Set(cells.map((c) => c.cache))]
const traceNote: Record<string, string> = { 'To-C chat': 'consumer chat traffic', 'To-B API': 'business API traffic', Coder: 'coding assistant traffic', Thinking: 'reasoning-model traffic' }

export function PacerExplorer() {
  const [trace, setTrace] = useState(traces[0])
  const [cache, setCache] = useState(caches[1])
  const cell = cells.find((c) => c.trace === trace && c.cache === cache) as Cell
  const top = Math.max(...cells.filter((c) => c.trace === trace).map((c) => c.belady))
  const tied = cell.lo <= 0
  const wins = cells.filter((c) => c.lo > 0).length
  const rows = [
    { name: 'LRU (the default)', v: cell.lru, cls: '' },
    { name: `Best tuned heuristic (${cell.bestName})`, v: cell.best, cls: '' },
    { name: "ATC'25 policy", v: cell.atc, cls: '' },
    { name: 'Pacer', v: cell.pacer, cls: 'hi' },
    { name: 'Perfect foresight', v: cell.belady, cls: 'ref' },
  ]
  return (
    <section className="panel card" aria-label="Pacer results explorer">
      <div className="panel-head">
        <span className="panel-title">Try it · all 16 test cells</span>
        <div className="controls">
          <div className="seg" role="group" aria-label="Workload trace">
            {traces.map((t) => <button key={t} type="button" aria-pressed={t === trace} onClick={() => setTrace(t)}>{t}</button>)}
          </div>
          <div className="seg" role="group" aria-label="Cache size">
            {caches.map((c) => <button key={c} type="button" aria-pressed={c === cache} onClick={() => setCache(c)}>{c}</button>)}
          </div>
        </div>
      </div>
      <div className="bars" role="img" aria-label={`Hit ratio on ${trace} at ${cache} cache: ${rows.map((r) => `${r.name} ${r.v}%`).join(', ')}`}>
        {rows.map((r) => (
          <div className={`bar ${r.cls}`} key={r.name}>
            <span>{r.name}</span>
            <div className="track"><div className="fill" style={{ width: `${(r.v / top) * 100}%` }} /></div>
            <span className="val">{r.v.toFixed(2)}%</span>
          </div>
        ))}
      </div>
      <p className={tied ? 'verdict tie' : 'verdict'} aria-live="polite">
        <b>{tied ? 'Statistically tied.' : 'Pacer is ahead.'}</b> Against the best tuned heuristic: {cell.delta > 0 ? '+' : ''}{cell.delta.toFixed(2)} points, 95% interval {cell.lo.toFixed(2)} to {cell.hi.toFixed(2)}.
        {tied && ' The interval includes zero, so this cell does not count as a win.'}
      </p>
      <p className="note">
        Block hit ratio on the held-out hour of the {trace} trace ({traceNote[trace]}), cache = {cache} of unique blocks. Simulation. Bars share one scale per workload. Perfect foresight is Belady's offline bound. Across all cells: ahead in {wins}, tied in {cells.length - wins}, behind in 0.
      </p>
      <details>
        <summary>Show all 16 cells as a table</summary>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Trace</th><th>Cache</th><th>LRU</th><th>Best heuristic</th><th>ATC'25</th><th>Pacer</th><th>Pacer vs best (95% CI)</th><th>Belady</th></tr></thead>
            <tbody>
              {cells.map((c) => (
                <tr key={c.trace + c.cache}>
                  <td>{c.trace}</td><td>{c.cache}</td><td>{c.lru.toFixed(2)}</td><td>{c.best.toFixed(2)} ({c.bestName})</td><td>{c.atc.toFixed(2)}</td><td><b>{c.pacer.toFixed(2)}</b></td>
                  <td>{c.delta > 0 ? '+' : ''}{c.delta.toFixed(2)} [{c.lo.toFixed(2)}, {c.hi.toFixed(2)}]</td><td>{c.belady.toFixed(2)}</td>
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
    <div style={{ display: 'grid', gap: 20 }}>
      <section className="panel card" aria-label="TileLens live recording with chapters">
        <div className="panel-head"><span className="panel-title">Watch · a live game, real time</span></div>
        <div className="player">
          <figure>
            <div className="frame">
              <video ref={video} controls preload="none" playsInline poster={url('media/tilelens/discord-live-02-1600.webp')} aria-label="TileLens over a live Letter League game in Discord" src={url('media/tilelens/tilelens-discord-live.mp4')} onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} />
            </div>
            <figcaption>Live over Discord Letter League, Nov 11, 2026. About 50 seconds. Player card blurred.</figcaption>
          </figure>
          <ol className="chapters" aria-label="Jump to a moment">
            {chapters.map((c, i) => (
              <li key={c.t}>
                <button type="button" aria-current={i === active} onClick={() => seek(c.t)}>
                  <span className="t">0:{String(c.t).padStart(2, '0')}</span>{c.label}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="panel card" aria-label="How TileLens works, step by step">
        <div className="panel-head">
          <span className="panel-title">Try it · walk the pipeline</span>
          <div
            className="seg"
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
                {i + 1}. {s.name}
              </button>
            ))}
          </div>
        </div>
        <div role="tabpanel" id="step-panel" aria-labelledby={`step-${step}`} className="step-panel">
          <p>{steps[step].text}</p>
          <span>{steps[step].note}</span>
        </div>
      </section>
    </div>
  )
}

const places = [
  { label: 'Walk: Kresge → Baskin', hash: '#/r/kresge-college/baskin-engineering' },
  { label: 'McHenry Library', hash: '#/p/mchenry-library' },
  { label: 'Science Hill', hash: '#/p/science-hill' },
  { label: 'Walk: Quarry Plaza → McHenry', hash: '#/r/quarry-plaza/mchenry-library' },
]

export function ClassmapDemo() {
  const [hash, setHash] = useState<string | null>(null)
  return (
    <section className="panel card" aria-label="Classmap web map, live">
      <div className="panel-head">
        <span className="panel-title">Try it · the real web map</span>
        {hash !== null && (
          <div className="seg" role="group" aria-label="Jump to a place or route">
            {places.map((p) => <button key={p.hash} type="button" aria-pressed={p.hash === hash} onClick={() => setHash(p.hash)}>{p.label}</button>)}
          </div>
        )}
      </div>
      {hash === null ? (
        <div className="map-gate">
          <img src={url('media/classmap/web-04-route-1600.webp')} alt="" loading="lazy" />
          <div>
            <button type="button" className="btn primary" onClick={() => setHash(places[0].hash)}>Load the live map</button>
            <p>Loads map tiles from OpenFreeMap</p>
          </div>
        </div>
      ) : (
        <>
          <iframe key={hash} title="Classmap web map of UC Santa Cruz" src={`${url('demos/classmap-map/index.html')}${hash}`} />
          <p className="note">The same build the repo produces, running in this page. Search works too: try "BE" or "science hill". Not affiliated with UC Santa Cruz.</p>
        </>
      )}
    </section>
  )
}

export function Results({ results, verifiedOn }: { results: Result[]; verifiedOn: string }) {
  const [open, setOpen] = useState<number | null>(null)
  const [all, setAll] = useState(false)
  return (
    <div>
      <ol className="results">
        {results.map((r, i) => {
          const shown = all || open === i
          return (
            <li key={r.claim}>
              <button type="button" aria-expanded={shown} onClick={() => setOpen(open === i ? null : i)}>
                <span className="claim">{r.claim}</span>
                <span className={r.rerun ? 'mark' : 'mark repo'}>{r.rerun ? 're-run' : 'from repo'}</span>
              </button>
              {shown && (
                <p className="source">
                  <b>Source:</b> {r.source}. {r.rerun ? `I re-ran this on ${verifiedOn}.` : 'From the repository; not re-run.'}
                </p>
              )}
            </li>
          )
        })}
      </ol>
      <button type="button" className="link" style={{ marginTop: 16 }} aria-pressed={all} onClick={() => setAll((v) => !v)}>
        {all ? 'Hide the sources' : 'Show where every number comes from'}
      </button>
    </div>
  )
}

export function Gallery({ project, label }: { project: string; label: string }) {
  const images = assets.filter((a) => a.project === project && a.kind === 'image')
  const [at, setAt] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (at !== null && !d.open) d.showModal()
    if (at === null && d.open) d.close()
  }, [at])
  const step = (by: number) => setAt((v) => (v === null ? v : (v + by + images.length) % images.length))
  const current = at === null ? null : images[at]
  return (
    <section className="gallery" aria-label={label}>
      <ul>
        {images.map((a, i) => (
          <li key={a.file}>
            <button type="button" onClick={() => setAt(i)} aria-label={`Open capture ${i + 1} of ${images.length}: ${a.purpose}`}>
              <img src={url(a.file)} alt="" loading="lazy" width={a.width} height={a.height} />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        onClose={() => setAt(null)}
        onClick={(e) => e.target === dialog.current && setAt(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1)
          if (e.key === 'ArrowLeft') step(-1)
        }}
      >
        {current && (
          <figure>
            <img src={url(current.file)} alt={current.purpose} width={current.width} height={current.height} />
            <figcaption>
              <b>{at! + 1} / {images.length} · {current.purpose}</b>
              {current.capture_method}
            </figcaption>
            <div className="dialog-nav">
              <button type="button" className="btn" onClick={() => step(-1)}>← Previous</button>
              <button type="button" className="btn" onClick={() => step(1)}>Next →</button>
              <button type="button" className="btn" onClick={() => setAt(null)} autoFocus>Close</button>
            </div>
          </figure>
        )}
      </dialog>
    </section>
  )
}
