import { expect, test } from '@playwright/test'

test('loads without errors and shows the three entries', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('I build small tools')
  for (const name of ['Pacer', 'TileLens', 'Classmap']) await expect(page.locator('.contents').getByText(name, { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('the Pacer explorer shows the real cell for a workload and cache size', async ({ page }) => {
  await page.goto('/')
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

test('a number opens its source, and s opens them all', async ({ page }) => {
  await page.goto('/')
  const first = page.locator('#tilelens .results button').first()
  await first.click()
  await expect(page.locator('#tilelens .source').first()).toContainText('bench_solver.py')
  await expect(page.locator('#tilelens .source').first()).toContainText('re-run')
  await first.click()
  await page.keyboard.press('s')
  expect(await page.locator('.source').count()).toBeGreaterThan(8)
})

test('keyboard: j and k move between entries, t switches the theme, ? opens help', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.keyboard.press('j')
  await expect(page.locator('#pacer h2')).toBeFocused()
  await page.keyboard.press('j')
  await expect(page.locator('#tilelens h2')).toBeFocused()
  await page.keyboard.press('j')
  await expect(page.locator('#classmap h2')).toBeFocused()
  await page.keyboard.press('k')
  await expect(page.locator('#tilelens h2')).toBeFocused()
  const before = await page.evaluate(() => document.documentElement.dataset.theme)
  await page.keyboard.press('t')
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).not.toBe(before)
  await page.keyboard.press('?')
  await expect(page.getByRole('heading', { name: 'Keyboard' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Keyboard' })).toBeHidden()
})

test('pipeline steps work with arrow keys', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /Capture/ }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: /Align/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toContainText('colors of its squares')
})

test('a chapter button seeks and plays the live recording', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /New rack read/ }).click()
  await page.waitForFunction(() => {
    const v = document.querySelector<HTMLVideoElement>('.player video')
    return !!v && v.readyState >= 2 && v.currentTime >= 21.5 && !v.paused
  })
  await expect(page.getByRole('button', { name: /New rack read/ })).toHaveAttribute('aria-current', 'true')
})

test('every video file loads', async ({ page }) => {
  await page.goto('/')
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
  expect(durations).toHaveLength(3)
  for (const d of durations) expect(d).toBeGreaterThan(25)
})

test('the evidence drawer opens, steps with arrows and closes with Escape', async ({ page }) => {
  await page.goto('/')
  const drawer = page.getByRole('region', { name: 'TileLens captures' })
  await drawer.getByRole('button', { name: /Open capture 1 of/ }).click()
  const caption = drawer.locator('dialog figcaption')
  await expect(caption).toContainText('1 /')
  await page.keyboard.press('ArrowRight')
  await expect(caption).toContainText('2 /')
  await expect(drawer.locator('dialog img')).toHaveJSProperty('complete', true)
  await page.keyboard.press('Escape')
  await expect(drawer.locator('dialog')).toBeHidden()
})

test('the live map loads on request and follows the place buttons', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load the live map' }).click()
  const frame = page.frameLocator('iframe[title="Classmap web map of UC Santa Cruz"]')
  await expect(frame.getByText('Walking directions')).toBeVisible({ timeout: 30_000 })
  await expect(frame.getByText(/^\d+ min$/)).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'McHenry Library' }).click()
  await expect(frame.getByRole('heading', { name: 'McHenry Library' })).toBeVisible({ timeout: 30_000 })
})

test('outside links point at the verified places', async ({ page }) => {
  await page.goto('/')
  const hrefs = await page.locator('a[href^="http"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))
  expect(hrefs).toEqual(expect.arrayContaining(['https://github.com/JMBugarin/pacer', 'https://github.com/JMBugarin/tilelens', 'https://github.com/JMBugarin/ucsc-campus-router-v2', 'https://github.com/JMBugarin', 'https://linkedin.com/in/Joshua-bugarin']))
  for (const h of hrefs) expect(h).toMatch(/^https:\/\/(github\.com\/JMBugarin|linkedin\.com\/in\/Joshua-bugarin)/)
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })
  test('nothing overflows sideways and the explorer still works', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Thinking' }).click()
    await expect(page.locator('.explorer .bar.hi .val')).toHaveText('34.97%')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('transitions are off', async ({ page }) => {
    await page.goto('/')
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--t').trim())).toMatch(/^0m?s$/)
    await page.keyboard.press('j')
    await expect(page.locator('#pacer h2')).toBeFocused()
  })
})
