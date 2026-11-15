import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
const browser = await chromium.launch({ channel: 'chrome' })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await context.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 }))
const page = await context.newPage()
const cdp = await context.newCDPSession(page)
const results = []
try {
  await page.goto(process.env.QA_BASE ?? 'http://localhost:4321')
  await page.locator('[data-seat="Seat_01"]:visible').waitFor({ timeout: 30000 })
  for (const rate of [1, 4]) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate })
    // Warmup excludes initial shader compilation / upload from the steady-state sample.
    await page.evaluate(() => new Promise(r => setTimeout(r, 1000)))
    const sample = await page.evaluate(async () => {
      const intervals = []; let previous = 0
      const start = performance.now()
      await new Promise(resolve => {
        function sample(now) {
          if (previous) intervals.push(now - previous)
          previous = now
          if (now - start >= 5000) { resolve(); return }
          requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
      intervals.sort((a, b) => a - b)
      const sum = intervals.reduce((a, b) => a + b, 0)
      const canvas = document.querySelector('[data-canvas] canvas')
      return { fps: intervals.length / (sum / 1000), p95_frame_ms: intervals[Math.floor(intervals.length * .95)], frames: intervals.length,
        rendered_pixel_ratio: canvas.width / canvas.clientWidth,
        viewport: [innerWidth, innerHeight], dpr: devicePixelRatio }
    })
    results.push({ cpu_throttle: rate, ...sample })
  }
  const report = { measured_at: new Date().toISOString(), browser: await browser.version(), scope: 'Local Chrome, 1440×900, 5-second steady-state RAF sample; 4× CPU throttle. Hardware-specific, not a universal FPS guarantee.', results }
  writeFileSync('design/tarot-performance.json', JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} finally { await browser.close() }
