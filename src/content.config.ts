import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const media = z.object({
  kind: z.enum(['video', 'image']),
  group: z.enum(['demo', 'interface', 'results']),
  src: z.string(),
  poster: z.string().optional(),
  alt: z.string(),
  caption: z.string(),
  width: z.number(),
  height: z.number(),
})

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    techStack: z.array(z.string()),
    githubUrl: z.url().optional(),
    liveUrl: z.url().optional(),
    category: z.string().optional(),
    stat: z.string().optional(),
    order: z.number().default(99),
    problem: z.string(),
    solution: z.string(),
    next: z.array(z.string()).min(1),
    results: z.array(z.string()).default([]),
    struggles: z.array(z.object({ issue: z.string(), fix: z.string() })).default([]),
    media: z.array(media).default([]),
    mediaNote: z.string().optional(),
  }),
})

export const collections = { projects }
