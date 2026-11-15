import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { glob } from 'astro/loaders'

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    romanNumeral: z.enum(['I', 'II', 'III', 'IV', 'V', 'VI']),
    arcana: z.string(),
    seatMeshName: z.string().regex(/^Seat_0[1-6]$/),
    summary: z.string().max(140),
    stack: z.array(z.string()),
    featuredOrder: z.number().int().min(1).max(6),
    projectId: z.string().optional(),
    reserved: z.boolean().default(false),
    repoUrl: z.url().optional(),
    liveUrl: z.url().optional(),
  }),
})

export const collections = { projects }
