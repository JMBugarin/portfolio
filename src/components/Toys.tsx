import { useEffect, useMemo, useState } from 'react'
import list from '../data/demo-words.txt?raw'
import { points, score } from '../lib/tiles'

// Be the cache: four slots, a stream of requests, and the player decides what to evict.
const BLOCKS = [...'ABCDEFGH']
const SLOTS = 4
const LENGTH = 32
const PACE = 380

type Chooser = (cache: string[], at: number, seq: string[], born: Record<string, number>, last: Record<string, number>) => string
const fifo: Chooser = (cache, _at, _seq, born) => cache.reduce((a, b) => (born[b] < born[a] ? b : a))
const lru: Chooser = (cache, _at, _seq, _born, last) => cache.reduce((a, b) => (last[b] < last[a] ? b : a))
const foresight: Chooser = (cache, at, seq) => {
  const next = (b: string) => { const i = seq.indexOf(b, at + 1); return i < 0 ? Infinity : i }
  return cache.reduce((a, b) => (next(b) > next(a) ? b : a))
}

function replay(seq: string[], choose: Chooser) {
  const cache: string[] = [], born: Record<string, number> = {}, last: Record<string, number> = {}
  let hits = 0, evictions = 0
  seq.forEach((b, at) => {
    if (cache.includes(b)) hits++
    else if (cache.length < SLOTS) { cache.push(b); born[b] = at }
    else { cache[cache.indexOf(choose(cache, at, seq, born, last))] = b; born[b] = at; evictions++ }
    last[b] = at
  })
  return { hits, evictions }
}

// Seeded, so a round can be replayed: a small hot set that drifts, some recent repeats, some noise.
function traffic(seed: number) {
  const rnd = () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const pick = (from: string[]) => from[Math.floor(rnd() * from.length)]
  const hot = [...BLOCKS].sort(() => rnd() - 0.5).slice(0, 3)
  const seq: string[] = []
  for (let i = 0; i < LENGTH; i++) {
    if (i && i % 8 === 0) hot[Math.floor(rnd() * 3)] = pick(BLOCKS.filter((b) => !hot.includes(b)))
    const r = rnd()
    let b = r < 0.4 ? pick(hot) : r < 0.6 && seq.length > 3 ? seq[seq.length - 2 - Math.floor(rnd() * 3)] : pick(BLOCKS)
    if (b === seq[seq.length - 1]) b = pick(BLOCKS.filter((x) => x !== b))
    seq.push(b)
  }
  return seq
}
function deal(seed: number) {
  let seq = traffic(seed)
  while (replay(seq, lru).evictions < 8) seq = traffic(++seed)
  return { seed, seq }
}

type Round = {
  seed: number; seq: string[]; at: number; cache: string[]; marks: ('hit' | 'miss')[]
  last: Record<string, number>; uses: Record<string, number>
  running: boolean; waiting: boolean; peeked: boolean; flash: number
}
const fresh = (seed: number): Round => ({ ...deal(seed), at: 0, cache: [], marks: [], last: {}, uses: {}, running: false, waiting: false, peeked: false, flash: -1 })
const take = (g: Round, slot: number, mark: 'hit' | 'miss'): Round => {
  const b = g.seq[g.at]
  const cache = [...g.cache]
  cache[slot] = b
  return { ...g, cache, marks: [...g.marks, mark], last: { ...g.last, [b]: g.at }, uses: { ...g.uses, [b]: mark === 'hit' ? g.uses[b] + 1 : 1 }, at: g.at + 1, waiting: false, flash: slot }
}
const step = (g: Round): Round => {
  const held = g.cache.indexOf(g.seq[g.at])
  if (held >= 0) return take(g, held, 'hit')
  if (g.cache.length < SLOTS) return take(g, g.cache.length, 'miss')
  return { ...g, waiting: true }
}

export function CacheGame() {
  const [g, setG] = useState(() => fresh(1))
  const [peek, setPeek] = useState(false)
  const done = g.at >= LENGTH
  const incoming = done ? null : g.seq[g.at]
  const hits = g.marks.filter((m) => m === 'hit').length

  useEffect(() => {
    if (!g.running || g.waiting || done) return
    const timer = setTimeout(() => setG(step), PACE)
    return () => clearTimeout(timer)
  }, [g, done])

  const evict = (slot: number) => setG((r) => (r.waiting ? take(r, slot, 'miss') : r))
  const scores = useMemo(() => ({ fifo: replay(g.seq, fifo).hits, lru: replay(g.seq, lru).hits, best: replay(g.seq, foresight).hits }), [g.seq])
  const pct = (n: number) => `${((n / LENGTH) * 100).toFixed(1)}%`
  const rows = [
    { name: g.peeked ? 'You, with a look ahead' : 'You', v: hits, cls: 'hi' },
    { name: 'FIFO: evict the oldest arrival', v: scores.fifo, cls: '' },
    { name: 'LRU: evict the least recently used', v: scores.lru, cls: '' },
    { name: 'Perfect foresight', v: scores.best, cls: 'ref' },
  ]
  const gap = hits - scores.lru
  const verdict = gap > 0 ? `You beat LRU by ${gap} ${gap === 1 ? 'hit' : 'hits'}.` : gap < 0 ? `LRU beat you by ${-gap} ${gap === -1 ? 'hit' : 'hits'}.` : 'You tied LRU.'
  const status = !g.running
    ? `${SLOTS} slots, ${LENGTH} requests. Start when you are ready.`
    : done
      ? `Done: ${hits} hits in ${LENGTH} requests.`
      : g.waiting
        ? `${incoming} is not in the cache, and the cache is full. Pick a block to evict.`
        : `Request ${g.at + 1} of ${LENGTH}: ${incoming}.`

  return (
    <section
      className="panel card cache"
      aria-label="Be the cache"
      onKeyDown={(e) => {
        const slot = Number(e.key) - 1
        if (g.waiting && slot >= 0 && slot < SLOTS) evict(slot)
      }}
    >
      <div className="panel-head">
        <span className="panel-title">Try it · you are the eviction policy</span>
        <div className="controls">
          {!g.running && <button type="button" className="btn primary small" onClick={() => setG((r) => ({ ...r, running: true, peeked: peek }))}>Start</button>}
          {g.running && <button type="button" className="btn small" onClick={() => setG(() => ({ ...fresh(g.seed), running: true, peeked: peek }))}>{done ? 'Same traffic again' : 'Restart'}</button>}
          <button type="button" className="btn small" onClick={() => setG(() => ({ ...fresh(g.seed + 1), running: g.running, peeked: peek }))}>New traffic</button>
        </div>
      </div>

      <ol className="strip" aria-hidden="true">
        {g.seq.map((b, i) => (
          <li key={i} className={i < g.at ? g.marks[i] : i === g.at && g.running ? 'now' : 'later'}>{(g.running && i <= g.at) || peek ? b : '?'}</li>
        ))}
      </ol>

      <div className="cache-row">
        <div className="incoming">
          <span className="label">Request</span>
          <span className={g.waiting ? 'tile wanted' : 'tile'} key={g.at}>{done ? '·' : g.running && incoming ? incoming : '?'}</span>
        </div>
        <ol className="slots" aria-label="Cache slots">
          {Array.from({ length: SLOTS }, (_, i) => {
            const b = g.cache[i]
            if (!b) return <li key={i}><span className="slot empty">empty</span></li>
            const idle = g.at - 1 - g.last[b]
            return (
              <li key={i}>
                <button type="button" className="slot" aria-disabled={!g.waiting} onClick={() => evict(i)} aria-label={`Evict ${b}: idle for ${idle} ${idle === 1 ? 'request' : 'requests'}, used ${g.uses[b]} ${g.uses[b] === 1 ? 'time' : 'times'}`}>
                  <kbd>{i + 1}</kbd>
                  <span className={i === g.flash ? `tile ${g.marks[g.at - 1]}` : 'tile'} key={i === g.flash ? g.at : 'still'}>{b}</span>
                  <span className="slot-meta">idle {idle}<br />used {g.uses[b]}×</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <p className={g.waiting ? 'cache-status ask' : 'cache-status'}>{status}{g.running && !done && <span className="muted"> Hits so far: {hits} of {g.at}.</span>}</p>
      <p className="sr-only" role="status">{g.waiting || done || !g.running ? status : ''}</p>
      <label className="peek">
        <input type="checkbox" checked={peek} onChange={(e) => { setPeek(e.target.checked); if (e.target.checked) setG((r) => ({ ...r, peeked: r.running || r.peeked })) }} />
        Show what is coming. A real cache cannot.
      </label>

      {done && (
        <div className="cache-result">
          <div className="bars" role="img" aria-label={`Hit ratio on this traffic: ${rows.map((r) => `${r.name} ${pct(r.v)}`).join(', ')}`}>
            {rows.map((r) => (
              <div className={`bar ${r.cls}`} key={r.name}>
                <span>{r.name}</span>
                <div className="track"><div className="fill" style={{ width: `${(r.v / LENGTH) * 100}%` }} /></div>
                <span className="val">{pct(r.v)}</span>
              </div>
            ))}
          </div>
          <p className={gap > 0 ? 'verdict' : 'verdict tie'}><b>{verdict}</b>{hits === scores.best ? ' That matches perfect foresight.' : ` Perfect foresight gets ${scores.best} of ${LENGTH}.`}</p>
        </div>
      )}
      <p className="note">A toy: {SLOTS} slots, {LENGTH} requests, made-up traffic. Pacer makes this choice with a small model in 49 to 230 ns per evicted block, and its numbers come from simulation on public Qwen traces.</p>
    </section>
  )
}

// Find the best play: every word the rack can spell from TileLens's demo list, by letter values alone.
const words = list.split('\n').map((w) => w.trim()).filter((w) => w && !w.startsWith('#'))
const BAG = 'AAAAAAAAABBCCDDDDEEEEEEEEEEEEFFGGGHHIIIIIIIIIJKLLLLMMNNNNNNOOOOOOOOPPQRRRRRRSSSSTTTTTTUUUUVVWWXYYZ'
const count = (s: string) => {
  const n: Record<string, number> = {}
  for (const c of s) n[c] = (n[c] ?? 0) + 1
  return n
}
function search(rack: string) {
  const have = count(rack)
  const plays: { word: string; score: number }[] = []
  for (const word of words) {
    if (word.length > rack.length) continue
    const need: Record<string, number> = {}
    let fits = true
    for (const c of word) {
      need[c] = (need[c] ?? 0) + 1
      if (need[c] > (have[c] ?? 0)) { fits = false; break }
    }
    if (fits) plays.push({ word, score: score(word) })
  }
  return plays.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word)).slice(0, 3)
}

export function RackSolver() {
  const [rack, setRack] = useState('CHECKIT')
  const [typed, setTyped] = useState('')
  const [pick, setPick] = useState(0)
  const [took, setTook] = useState<number | null>(null)
  const plays = useMemo(() => search(rack), [rack])

  useEffect(() => {
    const runs = 200
    const t0 = performance.now()
    for (let i = 0; i < runs; i++) search(rack)
    setTook((performance.now() - t0) / runs)
  }, [rack])

  const load = (letters: string) => {
    setRack(letters)
    setPick(0)
  }
  const play = plays[pick]?.word ?? ''
  const left = count(play)
  const spare: string[] = []
  for (const c of rack) {
    if (left[c]) left[c]--
    else spare.push(c)
  }

  return (
    <section className="panel card solver" aria-label="Find the best play">
      <div className="panel-head">
        <span className="panel-title">Try it · search a rack</span>
        <div className="controls">
          <button type="button" className="btn small" onClick={() => load(Array.from({ length: 7 }, () => BAG[Math.floor(Math.random() * BAG.length)]).join(''))}>Deal a rack</button>
        </div>
      </div>

      <p className="tiles rack-tiles" role="img" aria-label={play ? `Rack ${rack}, playing ${play}` : `Rack ${rack}`}>
        {[...play].map((c, i) => <span className="tile played" key={`p${i}`}>{c}<i>{points[c]}</i></span>)}
        {spare.map((c, i) => <span className="tile spare" key={`s${i}`}>{c}<i>{points[c]}</i></span>)}
      </p>

      <form
        className="rack-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (typed.length > 1) load(typed)
        }}
      >
        <label htmlFor="rack-input">Or type two to seven letters</label>
        <input id="rack-input" type="text" inputMode="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={7} value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
        <button type="submit" className="btn small" disabled={typed.length < 2}>Search</button>
      </form>

      {plays.length ? (
        <ol className="plays" aria-label="Best plays">
          {plays.map((p, i) => (
            <li key={p.word}>
              <button type="button" aria-pressed={i === pick} onClick={() => setPick(i)}>
                <span className="rank">{i + 1}</span>
                <span className="word">{p.word}</span>
                <span className="pts">{p.score} pts</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="verdict tie">No word in the list fits these tiles.</p>
      )}

      <p className="note" aria-live="polite">
        Searched {words.length.toLocaleString('en-US')} words{took === null ? '' : ` in ${took.toFixed(3)} ms, averaged over 200 runs in your browser`}. Rack only: no board, no bonus squares, no crossing words, letter values alone. The list is the demo word list from the TileLens repo. TileLens itself searches a whole board.
      </p>
    </section>
  )
}
