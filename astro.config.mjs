import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// SITE and BASE are set by the Pages workflow. Locally the site is served from the root.
export default defineConfig({
  site: process.env.SITE ?? 'http://localhost:4321',
  base: process.env.BASE ?? '/',
  trailingSlash: 'always',
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  devToolbar: { enabled: false },
})
