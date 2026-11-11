import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import data from './data/projects.json'
import { ClassmapDemo, PacerExplorer, TileLensPlayer } from './interactive'
import { Gallery, Results, Video, type Project } from './parts'

const projects = data.featured_order.map((id) => (data.projects as Project[]).find((p) => p.id === id)!).filter(Boolean)
const verifiedOn = new Date(`${data.verified_on}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const ids = projects.map((p) => p.id)
const ethocal = (data.other as { id: string; name: string; note: string; contribution?: string }[]).find((o) => o.id === 'ethocal')

// Site copy and the interactive piece for each entry. A project in projects.json without an entry here still
// renders: its one-liner becomes the headline and it gets the results, decisions, limits and evidence drawer.
const extras: Record<string, { headline: ReactNode; intro: string; proud: string; module?: ReactNode; videos?: ReactNode }> = {
  pacer: {
    headline: (
      <>
        What should an LLM cache <em>forget?</em>
      </>
    ),
    intro:
      'When an LLM server runs out of room, it throws away cached prompt prefixes and later pays to recompute them. Pacer trains a small model to guess which blocks will be needed again, then tests that guess in a Rust simulator of 16 eviction policies on four public Alibaba Qwen production traces.',
    proud: 'I wrote ten success criteria before building anything. Four failed. They are in the repo too.',
    module: <PacerExplorer />,
    videos: <Video file="media/pacer/pacer-demo.mp4" poster="media/pacer/demo-table.jpg" label="Pacer make demo in a terminal" note="`make demo`, real time: five policies on the held-out hour of the chat trace. 38 seconds, most of it one slow baseline." />,
  },
  tilelens: {
    headline: (
      <>
        It reads the board <em>off the screen.</em>
      </>
    ),
    intro:
      'TileLens watches a tile game the way a player does, from pixels. It finds the board, reads every tile and its point value, searches every legal word placement, lists the best three and draws the top one as ghost tiles. Everything runs locally. It never clicks for you.',
    proud: 'A tile it cannot read is flagged, never guessed. Zero silent misreads on the synthetic test boards.',
    module: <TileLensPlayer />,
  },
  classmap: {
    headline: (
      <>
        Your class schedule, <em>on the campus map.</em>
      </>
    ),
    intro:
      'A schedule says "Baskin Engr 152". Your maps app shrugs. Classmap is an offline Flutter app that knows where UC Santa Cruz classrooms are, imports a schedule by paste, calendar file or photo, and hands the door to your own maps app for the walk. A separate web map adds walking routes.',
    proud: 'No server, no account, no paid API. The schedule never leaves the phone.',
    module: <ClassmapDemo />,
    videos: <Video portrait file="media/classmap/classmap-ios.mp4" poster="media/classmap/ios-03-room.jpg" label="Classmap app walkthrough in the iOS Simulator" note="The real app in the iOS Simulator with an invented schedule. Real time, 49 seconds." />,
  },
}

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch {
      /* private mode */
    }
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('theme', theme)
    } catch {
      /* private mode */
    }
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))] as const
}

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [sources, setSources] = useState(false)
  const [current, setCurrent] = useState(-1)
  const help = useRef<HTMLDialogElement>(null)

  const steering = useRef(0)
  const go = useCallback((to: number) => {
    const i = Math.max(0, Math.min(ids.length - 1, to))
    const el = document.getElementById(ids[i])
    if (!el) return
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    steering.current = Date.now() + (calm ? 0 : 1200)
    setCurrent(i)
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
    el.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const seen = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && Date.now() > steering.current && setCurrent(ids.indexOf(e.target.id))),
      { rootMargin: '-30% 0px -60% 0px' },
    )
    ;['top', ...ids].forEach((id) => {
      const el = document.getElementById(id)
      if (el) seen.observe(el)
    })
    return () => seen.disconnect()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|VIDEO)$/.test(t.tagName) || t.closest('dialog,[role=tablist]')) return
      if (e.key === 'j') go(current + 1)
      else if (e.key === 'k') go(current - 1)
      else if (e.key === 't') toggleTheme()
      else if (e.key === 's') setSources((v) => !v)
      else if (e.key === '?') help.current?.showModal()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [current, go, toggleTheme])

  return (
    <>
      <a className="skip" href="#entries">Skip to the projects</a>
      <header className="running">
        <span>
          <b>J. Bugarin</b> · Project notebook
        </span>
        <nav aria-label="Entries">
          {projects.map((p, i) => (
            <a key={p.id} href={`#${p.id}`} aria-current={i === current ? 'true' : undefined} onClick={(e) => (e.preventDefault(), go(i))}>
              <span>No. {String(i + 1).padStart(2, '0')}</span> {p.name}
            </a>
          ))}
        </nav>
        <span className="tools">
          <button type="button" aria-pressed={sources} onClick={() => setSources((v) => !v)} title="Show the source of every number (s)">
            Sources {sources ? 'on' : 'off'}
          </button>
          <button type="button" onClick={toggleTheme} title="Switch paper and night desk (t)">
            {theme === 'light' ? 'Night desk' : 'Paper'}
          </button>
          <button type="button" onClick={() => help.current?.showModal()} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
            ?
          </button>
        </span>
      </header>

      <main>
        <section className="masthead" id="top">
          <h1>
            I build small tools, <em>then check whether they actually work.</em>
          </h1>
          <div className="lede">
            <p>
              I'm Joshua Bugarin, a computer science student at UC Santa Cruz with a computer engineering minor, heading toward software and AI/ML
              engineering. I like projects where the answer can be measured: a cache that hits more often, a board read correctly, a classroom that
              resolves to an actual door.
            </p>
            <p className="margin">
              Every number on this page is a button. Press one to see where it came from and whether I re-ran it on {verifiedOn}.
            </p>
          </div>
          <ol className="contents">
            {projects.map((p, i) => (
              <li key={p.id}>
                <a href={`#${p.id}`} onClick={(e) => (e.preventDefault(), go(i))}>
                  <span className="no">No. {String(i + 1).padStart(2, '0')}</span>
                  <span className="t">{p.name}</span>
                  <span className="d">{p.category}</span>
                  <span className="o">{p.one_liner}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        <div id="entries">
          {projects.map((p, i) => {
            const x = extras[p.id]
            return (
              <article key={p.id} id={p.id} className="entry">
                <header>
                  <p className="eyebrow">
                    <b>No. {String(i + 1).padStart(2, '0')}</b> · {p.name} · {p.category}
                  </p>
                  <h2 tabIndex={-1}>{x?.headline ?? p.one_liner}</h2>
                </header>
                <div className="cols">
                  <div className="body">
                    <p className="intro">{x?.intro ?? p.one_liner}</p>
                    {x && (
                      <p className="proud">
                        <b>The part I'm proudest of</b>
                        {x.proud}
                      </p>
                    )}
                  </div>
                  <aside>
                    <dl>
                      <dt>Built with</dt>
                      <dd>{p.stack.join(' · ')}</dd>
                      <dt>Code</dt>
                      <dd>
                        <a href={p.repo}>{p.repo.replace('https://', '')}</a>
                        <span className="commit"> at {p.commit}</span>
                      </dd>
                    </dl>
                  </aside>
                </div>

                {x?.module}

                <div className="cols">
                  <div className="body">
                    <h3>Measured</h3>
                    <Results results={p.results} showAll={sources} verifiedOn={verifiedOn} />
                  </div>
                  <aside>
                    <h3>Decisions</h3>
                    <ul className="plain">
                      {p.decisions.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                    <h3 className="warn">Limits</h3>
                    <ul className="plain">
                      {p.limits.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </aside>
                </div>

                {x?.videos}
                <Gallery project={p.id} label={`${p.name} captures`} />
              </article>
            )
          })}
        </div>

        <section className="also">
          <h2>Also in the notebook</h2>
          {ethocal && (
            <p>
              <b>{ethocal.name}</b> (team project, private repo). {ethocal.note} {ethocal.contribution?.replace(/^Built/, 'I built')}
            </p>
          )}
          <h2>How I work</h2>
          <ul className="plain how">
            <li>
              <b>Measure first, then brag a little.</b> Every number here comes from a benchmark or test in the repo, and says what it was measured on.
            </li>
            <li>
              <b>Write the test that can embarrass me.</b> A brute-force solver to check the fast one. A reference simulator to check the Rust one.
            </li>
            <li>
              <b>Publish the misses.</b> Limits and failed criteria sit beside the results.
            </li>
          </ul>
        </section>
      </main>

      <footer>
        <div>
          <b>Find me</b>
          <a href={data.profile.links.github}>github.com/JMBugarin</a>
          <a href={data.profile.links.linkedin}>linkedin.com/in/Joshua-bugarin</a>
        </div>
        <p>
          Colophon. Set in Newsreader and IBM Plex Mono. The facts come from one file, <code>projects.json</code>, checked against each repository on{' '}
          {verifiedOn}. Captures are of the running software; simulated results and simulator screenshots are labeled as such.
        </p>
        <p className="keys">
          <kbd>j</kbd> <kbd>k</kbd> move between entries · <kbd>s</kbd> sources · <kbd>t</kbd> theme · <kbd>?</kbd> help
        </p>
      </footer>

      <dialog ref={help} className="help" onClick={(e) => e.target === help.current && help.current?.close()}>
        <h2>Keyboard</h2>
        <dl>
          <dt><kbd>j</kbd> / <kbd>k</kbd></dt>
          <dd>Next / previous entry</dd>
          <dt><kbd>s</kbd></dt>
          <dd>Show the source of every number</dd>
          <dt><kbd>t</kbd></dt>
          <dd>Paper or night desk</dd>
          <dt><kbd>←</kbd> / <kbd>→</kbd></dt>
          <dd>Pipeline steps, and captures in an open drawer</dd>
          <dt><kbd>Esc</kbd></dt>
          <dd>Close a drawer or this note</dd>
        </dl>
        <form method="dialog">
          <button autoFocus>Close</button>
        </form>
      </dialog>
    </>
  )
}
