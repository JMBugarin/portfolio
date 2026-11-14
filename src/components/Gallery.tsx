import { useEffect, useRef, useState } from 'react'
import type { Capture } from '../lib/data'

// Thumbnails that are plain links to each capture. With JavaScript they open in a viewer instead.
export function Gallery({ captures, label }: { captures: Capture[]; label: string }) {
  const [at, setAt] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (at !== null && !d.open) d.showModal()
    if (at === null && d.open) d.close()
  }, [at])
  const step = (by: number) => setAt((v) => (v === null ? v : (v + by + captures.length) % captures.length))
  const current = at === null ? null : captures[at]
  return (
    <section className="gallery" aria-label={label}>
      <ul>
        {captures.map((c, i) => (
          <li key={c.src} className={c.portrait ? 'portrait' : undefined}>
            <a
              href={c.src}
              aria-label={`Open capture ${i + 1} of ${captures.length}: ${c.purpose}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return
                e.preventDefault()
                setAt(i)
              }}
            >
              <img src={c.src} srcSet={c.srcset} sizes="(min-width: 44rem) 280px, 46vw" alt="" loading="lazy" decoding="async" width={c.width} height={c.height} />
            </a>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        aria-label={label}
        onClose={() => setAt(null)}
        onClick={(e) => e.target === dialog.current && setAt(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1)
          if (e.key === 'ArrowLeft') step(-1)
        }}
      >
        {current && (
          <figure>
            <img src={current.src} srcSet={current.srcset} sizes="92vw" alt={current.purpose} width={current.width} height={current.height} />
            <figcaption>
              <b>{at! + 1} / {captures.length} · {current.purpose}</b>
              {current.method}
            </figcaption>
            <div className="dialog-nav">
              <button type="button" className="btn" onClick={() => step(-1)}>Previous</button>
              <button type="button" className="btn" onClick={() => step(1)}>Next</button>
              <button type="button" className="btn primary" onClick={() => setAt(null)} autoFocus>Close</button>
            </div>
          </figure>
        )}
      </dialog>
    </section>
  )
}
