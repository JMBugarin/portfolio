import { defineConfig } from '@playwright/test'

const baseURL = process.env.QA_BASE ?? 'http://localhost:4331'
const port = new URL(baseURL).port || '4331'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: {
    baseURL,
    channel: 'chrome',
    viewport: { width: 1280, height: 800 },
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run build && npx astro preview --port ${port} --ignore-lock`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
