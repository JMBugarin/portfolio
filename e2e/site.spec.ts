import { expect, test } from '@playwright/test'

const ready = (page: import('@playwright/test').Page) => page.waitForFunction(() => document.querySelectorAll('astro-island').length > 0 && !document.querySelector('astro-island[client="load"][ssr]'))
const pages = ['/', '/work/pacer/', '/work/tilelens/', '/work/classmap/', '/work/ethocal/']

test('every page loads without errors and has one h1', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  for (const path of pages) {
    await page.goto(path)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('home lists the three projects and links to their case studies', async ({ page }) => {
  await page.goto('/')
  for (const name of ['Pacer', 'TileLens', 'Classmap']) await expect(page.locator('.project').getByRole('link', { name, exact: true })).toBeVisible()
  await page.locator('.project').getByRole('link', { name: 'TileLens', exact: true }).click()
  await expect(page).toHaveURL(/\/work\/tilelens\/$/)
  await expect(page.locator('h1')).toBeVisible()
  await page.getByRole('link', { name: /All work/ }).click()
  await expect(page).toHaveURL(/\/#work$/)
})

test('the name rack shuffles and solves', async ({ page }) => {
  await page.goto('/')
  const status = page.locator('#rack-status')
  await expect(status).toContainText('JOSHUA · 16 pts')
  await page.getByRole('button', { name: 'Shuffle the rack' }).click()
  await expect(status).toContainText('not a word yet')
  await page.getByRole('button', { name: 'Find the best play' }).click()
  await expect(status).toContainText('JOSHUA · 16 pts')
})

test('the theme switch works and is remembered', async ({ page }) => {
  await page.goto('/')
  const before = await page.evaluate(() => document.documentElement.dataset.theme)
  await page.getByRole('button', { name: 'Switch between light and dark' }).click()
  const after = await page.evaluate(() => document.documentElement.dataset.theme)
  expect(after).not.toBe(before)
  await page.goto('/work/pacer/')
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(after)
})

test('copy email reports what happened', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('button', { name: 'Copy email' }).click()
  await expect(page.locator('#copied')).toHaveText('Email copied.')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('@')
})

test('the Pacer explorer shows the real cell for a workload and cache size', async ({ page }) => {
  await page.goto('/work/pacer/')
  await ready(page)
  const box = page.getByRole('region', { name: 'Pacer results explorer' })
  await box.getByRole('button', { name: 'Coder' }).click()
  await box.getByRole('button', { name: '5%', exact: true }).click()
  await expect(box.locator('.bar.hi .val')).toHaveText('58.47%')
  await expect(box.locator('.verdict')).toContainText('Pacer is ahead')
  await box.getByRole('button', { name: 'To-C chat' }).click()
  await box.getByRole('button', { name: '10%' }).click()
  await expect(box.locator('.verdict')).toContainText('Statistically tied')
  await box.getByText('Show all 16 cells as a table').click()
  await expect(box.locator('tbody tr')).toHaveCount(16)
})

test('a result opens its source, and one button opens them all', async ({ page }) => {
  await page.goto('/work/tilelens/')
  const first = page.locator('.results button').first()
  await first.scrollIntoViewIfNeeded()
  await first.click()
  await expect(page.locator('.results .source').first()).toContainText('bench_solver.py')
  await page.getByRole('button', { name: 'Show where every number comes from' }).click()
  expect(await page.locator('.results .source').count()).toBeGreaterThan(2)
})

test('pipeline steps work with arrow keys', async ({ page }) => {
  await page.goto('/work/tilelens/')
  await ready(page)
  await page.getByRole('tab', { name: /Capture/ }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: /Align/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toContainText('colors of its squares')
})

test('a chapter button seeks and plays the live recording', async ({ page }) => {
  await page.goto('/work/tilelens/')
  await ready(page)
  await page.getByRole('button', { name: /New rack read/ }).click()
  await page.waitForFunction(() => {
    const v = document.querySelector<HTMLVideoElement>('.player video')
    return !!v && v.readyState >= 2 && v.currentTime >= 21.5 && !v.paused
  })
  await expect(page.getByRole('button', { name: /New rack read/ })).toHaveAttribute('aria-current', 'true')
})

test('every video file loads', async ({ page }) => {
  for (const path of ['/work/pacer/', '/work/tilelens/', '/work/classmap/']) {
    await page.goto(path)
    const durations = await page.evaluate(async () => {
      const out: number[] = []
      for (const v of document.querySelectorAll('video')) {
        v.preload = 'metadata'
        v.load()
        await new Promise((ok, bad) => { v.onloadedmetadata = ok; v.onerror = bad })
        out.push(Math.round(v.duration))
      }
      return out
    })
    expect(durations.length).toBeGreaterThan(0)
    for (const d of durations) expect(d).toBeGreaterThan(25)
  }
})

test('the evidence gallery opens, steps with arrows and closes with Escape', async ({ page }) => {
  await page.goto('/work/tilelens/')
  const gallery = page.getByRole('region', { name: 'TileLens captures' })
  await gallery.scrollIntoViewIfNeeded()
  await gallery.getByRole('button', { name: /Open capture 1 of/ }).click()
  const caption = gallery.locator('dialog figcaption')
  await expect(caption).toContainText('1 /')
  await page.keyboard.press('ArrowRight')
  await expect(caption).toContainText('2 /')
  await page.keyboard.press('Escape')
  await expect(gallery.locator('dialog')).toBeHidden()
})

test('the live map loads on request and follows the place buttons', async ({ page }) => {
  await page.goto('/work/classmap/')
  await ready(page)
  await page.getByRole('button', { name: 'Load the live map' }).click()
  const frame = page.frameLocator('iframe[title="Classmap web map of UC Santa Cruz"]')
  await expect(frame.getByText('Walking directions')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'McHenry Library' }).click()
  await expect(frame.getByRole('heading', { name: 'McHenry Library' })).toBeVisible({ timeout: 30_000 })
})

test('outside links and the resume point at real things', async ({ page, request }) => {
  await page.goto('/')
  const hrefs = await page.locator('a[href^="http"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))
  const outside = hrefs.filter((h) => !h.startsWith('http://localhost'))
  expect(outside).toEqual(expect.arrayContaining(['https://github.com/JMBugarin', 'https://linkedin.com/in/Joshua-bugarin']))
  for (const h of outside) expect(h).toMatch(/^https:\/\/(github\.com\/JMBugarin|linkedin\.com\/in\/Joshua-bugarin)/)
  const resume = await page.getByRole('link', { name: 'Resume (PDF)' }).getAttribute('href')
  const res = await request.get(resume!)
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('pdf')
})

test('an unknown address gets the 404 page', async ({ page }) => {
  const res = await page.goto('/nope/')
  expect(res?.status()).toBe(404)
  await expect(page.locator('h1')).toContainText('No legal play')
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })
  test('nothing overflows sideways on any page', async ({ page }) => {
    for (const path of pages) {
      await page.goto(path)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), path).toBeLessThanOrEqual(0)
    }
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('transitions are off', async ({ page }) => {
    await page.goto('/')
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--t').trim())).toMatch(/^0m?s$/)
  })
})
