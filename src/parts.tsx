import { useEffect, useRef, useState } from 'react'
import manifest from './data/manifest.json'

export type Result = { claim: string; source: string; rerun: boolean }
export type Project = {
  id: string
  name: string
  repo: string
  commit: string
  one_liner: string
  category: string
  stack: string[]
  decisions: string[]
  results: Result[]
  limits: string[]
}
export type Asset = { project: string; purpose: string; format: string; capture_method: string; kind: string; file: string; portrait?: boolean }

export const assets = manifest as Asset[]
export const asset = (file: string) => `${import.meta.env.BASE_URL}${file}`
const size = (format: string) => {
  const [width, height] = format.split('x').map(Number)
  return { width, height }
}

export function Results({ results, showAll, verifiedOn }: { results: Result[]; showAll: boolean; verifiedOn: string }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <ol className="results">
      {results.map((r, i) => {
        const shown = showAll || open === i
        return (
          <li key={r.claim} className={r.rerun ? 'rerun' : ''}>
            <button type="button" aria-expanded={shown} onClick={() => setOpen(open === i ? null : i)}>
              <span className="claim">{r.claim}</span>
              <span className="mark" aria-hidden="true">{shown ? '−' : '+'}</span>
            </button>
            {shown && (
              <p className="source">
                <b>Source</b> {r.source}
                {r.rerun ? <i> · re-run on {verifiedOn}</i> : <span> · from the repository, not re-run</span>}
              </p>
            )}
          </li>
        )
      })}
    </ol>
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
      <h4>
        Evidence drawer <span>{images.length} captures, each labeled with how it was made</span>
      </h4>
      <ul>
        {images.map((a, i) => (
          <li key={a.file} className={a.portrait ? 'portrait' : ''}>
            <button type="button" onClick={() => setAt(i)} aria-label={`Open capture ${i + 1} of ${images.length}: ${a.purpose}`}>
              <img src={asset(a.file)} alt="" loading="lazy" {...size(a.format)} />
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
            <img src={asset(current.file)} alt={current.purpose} />
            <figcaption>
              <b>
                {at! + 1} / {images.length} · {current.purpose}
              </b>
              {current.capture_method}
            </figcaption>
            <div className="dialog-nav">
              <button type="button" onClick={() => step(-1)}>← Previous</button>
              <button type="button" onClick={() => step(1)}>Next →</button>
              <button type="button" onClick={() => setAt(null)} autoFocus>Close</button>
            </div>
          </figure>
        )}
      </dialog>
    </section>
  )
}

export function Video({ file, poster, label, note, portrait }: { file: string; poster: string; label: string; note: string; portrait?: boolean }) {
  return (
    <figure className={portrait ? 'video portrait' : 'video'}>
      <video controls preload="none" playsInline aria-label={label} src={asset(file)} poster={asset(poster)} />
      <figcaption>{note}</figcaption>
    </figure>
  )
}
