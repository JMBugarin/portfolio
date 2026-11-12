// Review screenshots of the built site: node scripts/shots.mjs (needs `npm run preview` running)
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const base = process.env.BASE ?? 'http://localhost:4321'
mkdirSync('_shots', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const scroll = async (page) => {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) }
    scrollTo(0, 0)
  })
  await page.waitForTimeout(500)
}
for (const [name, path, w, h, scheme] of [
  ['home-light', '/', 1360, 900, 'light'], ['home-dark', '/', 1360, 900, 'dark'], ['home-phone', '/', 390, 844, 'light'],
  ['work-light', '/work/', 1360, 900, 'light'], ['pacer-light', '/work/pacer/', 1360, 900, 'light'], ['tilelens-dark', '/work/tilelens/', 1360, 900, 'dark'],
  ['classmap-phone', '/work/classmap/', 390, 844, 'light'], ['about-light', '/about/', 1360, 900, 'light'], ['play-dark', '/play/', 1360, 900, 'dark'],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1, colorScheme: scheme, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(base + path)
  await scroll(page)
  await page.screenshot({ path: `_shots/${name}.png`, fullPage: true })
  if (errors.length) console.log(name, errors)
  await ctx.close()
}
await browser.close()
