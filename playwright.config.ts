import { defineConfig } from '@playwright/test'

const baseURL = process.env.QA_BASE ?? 'http://localhost:4321'
const previewPort = new URL(baseURL).port || '4321'

export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  workers: 2,
  use: {
    baseURL,
    channel: 'chrome',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npx astro preview --port ${previewPort} --ignore-lock`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
