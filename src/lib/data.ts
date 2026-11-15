import pages from '../data/case-studies.json'
import manifest from '../data/manifest.json'
import variants from '../data/media-variants.json'
import cells from '../data/pacer-results.json'
import data from '../data/projects.json'
import { arcana, isArcana, type ArcanaId } from './arcana'

export type Link = { label: string; url: string; note?: string }
export type Result = { claim: string; source: string; rerun: boolean }
export type Picture = { src: string; srcset?: string; width: number; height: number; alt: string; focus?: string }
export type Media = Picture & { video?: string; caption?: string; portrait: boolean }
export type Capture = Picture & { purpose: string; method: string; portrait: boolean }
export type Table = { caption: string; head: string[]; rows: string[][]; note: string }
export type Project = {
  id: string; name: string; category: string; summary: string; card: string
  arcana: { id: ArcanaId; numeral: string; title: string }
  role: string; dates?: string; status?: string; team: boolean; stack: string[]
  source?: Link & { commit: string }
  links: Link[]
  sealed?: string
  problem?: string; built?: string; parts: { title: string; body: string }[]; contribution?: string; contributionNote?: string
  cover?: Picture; media: Media[]; captures: Capture[]
  decisions: { title: string; choice: string; tradeoff: string }[]
  stat?: { value: string; unit: string; label: string; source: string }
  results: Result[]; table?: Table; lesson?: string; limits: string[]; sources: Link[]
}

// What each project page says. Facts that are synced from the project repos stay in projects.json.
type Page = {
  arcana: string; category?: string; stack?: string[]; summary: string; card: string; role: string; dates?: string; status?: string; team?: boolean
  links?: Link[]; sealed?: string
  cover?: { file: string; alt: string; focus?: string }
  stat?: Project['stat']
  problem?: string; built?: string; parts?: Project['parts']; contribution?: string; contributionNote?: string
  media?: { file: string; poster?: string; alt: string; caption?: string }[]
  decisions?: Project['decisions']; lesson?: string; limits?: string[]; sources?: Link[]
}
type Facts = { id: string; name: string; repo?: string; commit?: string; category?: string; stack?: string[]; results?: Result[]; limits?: string[] }
type Asset = { project: string; purpose: string; capture_method: string; kind: string; file: string; width: number; height: number; portrait?: boolean }
type Variant = { src: string; small: string; width: number; height: number }

const content: Record<string, Page> = pages
const facts: Facts[] = [...data.projects, ...data.other]
const assets: Asset[] = manifest
const sizes: Record<string, Variant> = variants

export const url = (path = '') => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
const href = (to: string) => (/^[a-z]+:/.test(to) ? to : url(to))

const picture = (file: string, alt: string, focus?: string): Picture => {
  const v = sizes[file]
  if (!v) throw new Error(`No image variant recorded for ${file}`)
  const small = Number(v.small.match(/-(\d+)\.webp$/)?.[1])
  const srcset = small && v.small !== v.src ? `${url(v.small)} ${small}w, ${url(v.src)} ${v.width}w` : undefined
  return { src: url(v.src), srcset, width: v.width, height: v.height, alt, focus }
}

const cellTable = (): Table => {
  const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}`
  const ahead = cells.filter((c) => c.lo > 0).length
  return {
    caption: 'Block hit ratio (%) on the held-out hour, for every trace and cache size. Simulation.',
    head: ['Trace', 'Cache', 'LRU', 'Best tuned heuristic', "ATC'25", 'Pacer', 'Pacer vs best (95% CI)', 'Belady'],
    rows: cells.map((c) => [c.trace, c.cache, c.lru.toFixed(2), `${c.best.toFixed(2)} (${c.bestName})`, c.atc.toFixed(2), c.pacer.toFixed(2), `${signed(c.delta)} [${signed(c.lo)}, ${signed(c.hi)}]`, c.belady.toFixed(2)]),
    note: `Pacer is ahead in ${ahead} cells and statistically tied in ${cells.length - ahead}, where the interval includes zero. It is behind in none. Belady is the offline bound with perfect foresight.`,
  }
}
const tables: Record<string, () => Table> = { pacer: cellTable }

const build = (id: string): Project => {
  const page = content[id]
  const fact = facts.find((f) => f.id === id)
  if (!page || !fact) throw new Error(`Project "${id}" needs an entry in both projects.json and case-studies.json`)
  if (!isArcana(page.arcana)) throw new Error(`Project "${id}" names a card that is not in the deck: ${page.arcana}`)
  const media = (page.media ?? []).map((m): Media => {
    const clip = m.file.endsWith('.mp4') ? assets.find((a) => a.file === m.file) : undefined
    const still = picture(clip ? m.poster! : m.file, m.alt)
    // A recording keeps its own shape; its poster is cropped to fit.
    const { width, height } = clip ?? still
    return { ...still, width, height, video: clip && url(clip.file), caption: m.caption, portrait: height > width }
  })
  const shown = new Set((page.media ?? []).filter((m) => !m.file.endsWith('.mp4')).map((m) => m.file))
  const captures = assets
    .filter((a) => a.project === id && a.kind === 'image' && !shown.has(a.file))
    .map((a): Capture => ({ ...picture(a.file, a.purpose), purpose: a.purpose, method: a.capture_method, portrait: !!a.portrait }))
  return {
    id,
    name: fact.name,
    arcana: { id: page.arcana, ...arcana(page.arcana) },
    category: page.category ?? fact.category ?? '',
    summary: page.summary,
    card: page.card,
    role: page.role,
    dates: page.dates,
    status: page.status,
    team: !!page.team,
    stack: page.stack ?? fact.stack ?? [],
    source: fact.repo && fact.commit ? { label: fact.repo.replace('https://', ''), url: fact.repo, commit: fact.commit } : undefined,
    links: (page.links ?? []).map((l) => ({ ...l, url: href(l.url) })),
    sealed: page.sealed,
    problem: page.problem,
    built: page.built,
    parts: page.parts ?? [],
    contribution: page.contribution,
    contributionNote: page.contributionNote,
    cover: page.cover && picture(page.cover.file, page.cover.alt, page.cover.focus),
    media,
    captures,
    decisions: page.decisions ?? [],
    stat: page.stat,
    results: fact.results ?? [],
    table: tables[id]?.(),
    lesson: page.lesson,
    limits: page.limits ?? fact.limits ?? [],
    sources: page.sources ?? [],
  }
}

// The hand, the work index and the project pages all use this order.
export const projects = [...data.featured_order, 'ethocal'].map(build)
export const links = data.profile.links
// The owner's own card, and the seats this deck has taken at the table of twenty-two.
export const owner = { id: 'fool' as const, ...arcana('fool') }
const number: Record<string, number> = { I: 1, V: 5, X: 10 }
const seat = (numeral: string) => [...numeral].reduce((sum, c, i, all) => sum + (number[c] < (number[all[i + 1]] ?? 0) ? -number[c] : number[c]), 0) || 0
export const seats = [owner, ...projects.map((p) => p.arcana)].map((c) => seat(c.numeral))
export const email = links.email.replace('mailto:', '')
export const verifiedOn = new Date(`${data.verified_on}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export const nav = [
  { id: 'work', label: 'Work', path: 'work/' },
  { id: 'about', label: 'About', path: 'about/' },
  { id: 'resume', label: 'Resume', path: links.resume },
  { id: 'contact', label: 'Contact', path: 'about/#contact' },
] as const
export type PageId = 'home' | 'work' | 'about'
