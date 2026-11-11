// Screenshots of the built site for review: node scripts/shots.mjs (needs `npm run preview` running)
import { chromium } from '@playwright/test'
const base = process.env.BASE ?? 'http://localhost:4321'
const browser = await chromium.launch({ channel: 'chrome' })
for (const [name, w, h, scheme] of [['desktop-light', 1360, 900, 'light'], ['desktop-dark', 1360, 900, 'dark'], ['phone-light', 390, 844, 'light']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1, colorScheme: scheme })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(base)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `_shots/${name}.png`, fullPage: true })
  if (errors.length) console.log(name, errors)
  await ctx.close()
}
await browser.close()
