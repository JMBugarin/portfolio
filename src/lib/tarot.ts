import { getCollection } from 'astro:content'
import { url } from './data'

export async function getTarotProjects() {
  const entries = (await getCollection('projects')).sort((a, b) => a.data.featuredOrder - b.data.featuredOrder)
  const seats = entries.map(e => e.data.seatMeshName)
  if (new Set(seats).size !== seats.length) throw new Error('Each project must bind to a different chair mesh.')
  return entries.map(e => ({
    ...e.data,
    slug: e.data.projectId ?? e.id,
    href: e.data.reserved ? null : url(`projects/${e.data.projectId ?? e.id}/`),
  }))
}
export type TarotProject = Awaited<ReturnType<typeof getTarotProjects>>[number]
