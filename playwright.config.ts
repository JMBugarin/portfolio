import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  use: { baseURL: 'http://localhost:4321', channel: 'chrome' },
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:4321', reuseExistingServer: true, timeout: 120_000 },
})
