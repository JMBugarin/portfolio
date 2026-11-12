import stories from '../data/case-studies.json'
import manifest from '../data/manifest.json'
import data from '../data/projects.json'

export type Result = { claim: string; source: string; rerun: boolean }
export type Project = {
  id: string; name: string; repo: string; commit: string; one_liner: string; category: string
  stack: string[]; decisions: string[]; results: Result[]; limits: string[]
}
export type Story = {
  headline: string; summary: string; problem: string; contribution: string; takeaway: string
  architecture: { title: string; body: string }[]
  tradeoffs: { title: string; choice: string; cost: string }[]
  sourceLinks: { label: string; url: string }[]
}
export type Asset = { project: string; purpose: string; capture_method: string; kind: string; file: string; width?: number; height?: number; portrait?: boolean }

export const url = (path = '') => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`

export const projects = data.featured_order.map((id) => (data.projects as Project[]).find((p) => p.id === id)!).filter(Boolean)
export const story = (id: string) => (stories as Record<string, Story>)[id]
export const assets = manifest as Asset[]
export const links = data.profile.links
export const email = links.email.replace('mailto:', '')
export const ethocal = (data.other as { id: string; name: string; note: string; contribution?: string }[]).find((o) => o.id === 'ethocal')!
export const verifiedOn = new Date(`${data.verified_on}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// One headline number per project, with the place it comes from.
export const headline: Record<string, { value: string; unit: string; label: string; source: string }> = {
  pacer: { value: '13', unit: '/ 16', label: 'test cells ahead of the best tuned heuristic', source: 'Held-out hour, four public Qwen traces × four cache sizes. Simulation.' },
  tilelens: { value: '2.2', unit: 'ms', label: 'median move search', source: 'Mid-game 13×13 boards, 204k-word list. Measures search, not the whole screen-to-overlay loop.' },
  classmap: { value: '87', unit: '/ 87', label: 'official classrooms resolve', source: "UCSC's general-assignment classrooms, each to a building, room and position." },
}
