import { expect, test, type Page } from '@playwright/test'

const ready = (page: Page) => page.waitForFunction(() => document.querySelectorAll('astro-island').length > 0 && !document.querySelector('astro-island[client="load"][ssr]'))
const pages = ['/', '/work/', '/work/pacer/', '/work/tilelens/', '/work/classmap/', '/work/ethocal/', '/about/']
const middle = async (page: Page, selector: string) => {
  const box = (await page.locator(selector).boundingBox())!
  return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }
}
const drag = async (page: Page, selector: string, dx: number, dy: number) => {
  const { x, y } = await middle(page, selector)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 5 })
  await page.mouse.move(x + dx, y + dy, { steps: 5 })
  await page.mouse.up()
}

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

test('the home sheet leads to the work, and the work to its case studies', async ({ page }) => {
  await page.goto('/')
  for (const name of ['Pacer', 'TileLens', 'Classmap']) await expect(page.locator('.snap', { hasText: name })).toBeVisible()
  await page.getByRole('link', { name: 'See the work' }).click()
  await expect(page).toHaveURL(/\/work\/$/)
  for (const name of ['Pacer', 'TileLens', 'Classmap', 'Ethocal']) await expect(page.locator('.project').getByRole('link', { name, exact: true })).toBeVisible()
  await page.locator('.project').getByRole('link', { name: 'TileLens', exact: true }).click()
  await expect(page).toHaveURL(/\/work\/tilelens\/$/)
  await expect(page.locator('h1')).toBeVisible()
  await page.getByRole('link', { name: 'All work' }).click()
  await expect(page).toHaveURL(/\/work\/$/)
  await page.getByRole('link', { name: 'Joshua Bugarin, home' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test.describe('the desk', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the name rack shuffles, solves and can be rearranged by hand', async ({ page }) => {
    await page.goto('/')
    const status = page.locator('[data-rack-status]')
    await expect(status).toContainText('JOSHUA · 16 pts')
    await page.getByRole('button', { name: 'Shuffle the rack' }).click()
    await expect(status).toContainText('not a word yet')
    await page.getByRole('button', { name: 'Find the best play' }).click()
    await expect(status).toContainText('JOSHUA · 16 pts')
    await drag(page, '.name .tile >> nth=0', 80, 0)
    await expect(status).toContainText('OSJHUA · not a word yet')
  })

  test('things can be dragged, a drag is not a click, and the desk tidies up', async ({ page }) => {
    await page.goto('/')
    const snap = '[data-drag="snap-tilelens"]'
    const before = await middle(page, snap)
    await drag(page, snap, -200, 120)
    expect(await middle(page, snap)).toEqual({ x: before.x - 200, y: before.y + 120 })
    await expect(page).toHaveURL(/\/$/)
    await page.reload()
    expect(await middle(page, snap)).toEqual({ x: before.x - 200, y: before.y + 120 })
    await page.getByRole('button', { name: 'Tidy the desk' }).click()
    await expect.poll(() => middle(page, snap)).toEqual(before)
    await expect(page.getByRole('button', { name: 'Tidy the desk' })).toBeHidden()
    await page.locator(snap).click()
    await expect(page).toHaveURL(/\/work\/tilelens\/$/)
  })

  test('the stamp leaves a mark where it is dropped, or on the sheet when pressed', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Stamp the desk' }).click()
    await expect(page.locator('.sheet .ink-mark')).toHaveCount(1)
    await expect(page.locator('#desk-status')).toHaveText('Stamped: Checked.')
    await drag(page, '.stamper svg', 0, 150)
    await expect(page.locator('.ink-mark')).toHaveCount(2)
    await page.getByRole('button', { name: 'Tidy the desk' }).click()
    await expect(page.locator('.ink-mark')).toHaveCount(0)
  })
})

test('the lamp cord switches the theme, by press or by pull, and it is remembered', async ({ page }) => {
  await page.goto('/')
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme)
  const cord = page.getByRole('button', { name: 'Switch between light and dark' })
  const before = await theme()
  await cord.click()
  await expect.poll(theme).not.toBe(before)
  const after = await theme()
  await expect(cord).toHaveAttribute('aria-pressed', String(after === 'dark'))
  await page.goto('/work/pacer/')
  expect(await theme()).toBe(after)
  await drag(page, '#theme i', 0, 60)
  await expect.poll(theme).toBe(before)
})

test('the work filter keeps the projects built with a tool', async ({ page }) => {
  await page.goto('/work/')
  await page.getByRole('button', { name: /^Rust/ }).click()
  await expect(page.locator('.project:visible')).toHaveCount(1)
  await expect(page.locator('.project:visible')).toContainText('Pacer')
  await expect(page.locator('#filter-status')).toHaveText('Showing 1 of 4 projects.')
  await page.getByRole('button', { name: /^Flutter/ }).click()
  await expect(page.locator('.project:visible')).toHaveCount(2)
  await page.getByRole('button', { name: /^All/ }).click()
  await expect(page.locator('.project:visible')).toHaveCount(4)
})

test('the name badge flips', async ({ page }) => {
  await page.goto('/about/')
  const flip = page.getByRole('button', { name: 'Flip the badge' })
  await flip.click()
  await expect(flip).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.badge')).toHaveClass(/flipped/)
  await page.locator('.badge').click()
  await expect(flip).toHaveAttribute('aria-pressed', 'false')
})

test('copy email reports what happened', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/about/')
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
  test('the desk stacks, and the stamp still works by tap', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.sheet')).toBeVisible()
    await page.getByRole('button', { name: 'Stamp the desk' }).tap()
    await expect(page.locator('.ink-mark')).toHaveCount(1)
    await expect(page.locator('.ink-mark')).toBeInViewport()
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('transitions are off', async ({ page }) => {
    await page.goto('/')
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--t').trim())).toMatch(/^0m?s$/)
  })
})
