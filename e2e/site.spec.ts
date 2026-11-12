import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
const cells: Array<{ trace: string; cache: string; pacer: number; lo: number }> = JSON.parse(readFileSync(new URL('../src/data/pacer-results.json', import.meta.url), 'utf8'))

const routes = ['/','/#/projects/pacer','/#/projects/tilelens','/#/projects/classmap','/#/projects/ethocal']
const email = 'jbugarin85424@gmail.com'

async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
}

test('home and direct project URLs render without broken local requests or console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('response', response => { if (response.url().startsWith('http://localhost:4321/') && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  for (const route of routes) {
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
    await page.locator('footer').scrollIntoViewIfNeeded()
    const images = page.locator('img')
    for (let i = 0; i < await images.count(); i++) {
      await images.nth(i).scrollIntoViewIfNeeded()
      await expect.poll(() => images.nth(i).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    }
    await noHorizontalOverflow(page)
  }
  expect(errors).toEqual([])
})

test('recruiter links, resume and contact copy are real', async ({ page, context, request }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Joshua Bugarin.')
  await expect(page.locator('.hero').getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/JMBugarin')
  await expect(page.locator('.hero').getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://linkedin.com/in/Joshua-bugarin')
  await expect(page.locator('.hero').getByRole('link', { name: 'Email' })).toHaveAttribute('href', `mailto:${email}`)
  const resume = await request.get('/resume/Joshua-Bugarin-Resume.pdf')
  expect(resume.status()).toBe(200)
  expect(resume.headers()['content-type']).toContain('application/pdf')
  expect((await resume.body()).subarray(0, 5).toString()).toBe('%PDF-')
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Contact', exact: true }).click()
  await expect(page).toHaveURL(/#\/contact$/)
  await page.getByRole('button', { name: 'Copy email', exact: true }).click()
  await expect(page.locator('.contact-actions [role=status]')).toHaveText('Email copied.')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(email)
})

test('collection combines category and technology search, including the empty state', async ({ page }) => {
  await page.goto('/')
  const collection = page.locator('.collection')
  await expect(collection.locator('.project-row')).toHaveCount(4)
  await collection.getByRole('button', { name: /^Mobile/ }).click()
  await expect(collection.locator('.project-row')).toHaveCount(2)
  await expect(collection.locator('.project-row h3')).toHaveText(['Classmap','Ethocal'])
  await collection.getByRole('searchbox', { name: 'Search projects' }).fill('Flutter')
  await expect(collection.locator('.project-row')).toHaveCount(2)
  await collection.getByRole('searchbox', { name: 'Search projects' }).fill('no-such-project')
  await expect(collection.locator('.project-row')).toHaveCount(0)
  await expect(collection.getByText(/No projects match/)).toBeVisible()
  await collection.getByRole('button', { name: /^All work/ }).click()
  await collection.getByRole('searchbox', { name: 'Search projects' }).fill('Python')
  await expect(collection.locator('.project-row h3')).toHaveText(['Pacer','TileLens'])
})

test('project navigation, history, direct refresh and unknown-route recovery work', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Explore Pacer', exact: true }).click()
  await expect(page).toHaveURL(/#\/projects\/pacer$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('LLM cache')
  await page.reload()
  await expect(page).toHaveTitle('Pacer — Joshua Bugarin')
  await page.getByRole('link', { name: /NEXT CASE STUDY TileLens/ }).click()
  await expect(page).toHaveURL(/#\/projects\/tilelens$/)
  await page.goBack()
  await expect(page).toHaveURL(/#\/projects\/pacer$/)
  await page.getByRole('link', { name: '← All work', exact: true }).click()
  await expect(page).toHaveURL(/#\/work$/)
  await expect(page.locator('#work-title')).toBeInViewport()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'About', exact: true }).click()
  await expect(page.locator('#about-title')).toBeInViewport()
  await page.goto('/#/projects/pacer?section=architecture')
  await expect(page.locator('#architecture')).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Follow the data.' })).toBeInViewport()
  await page.reload()
  await expect(page.locator('#architecture')).toBeFocused()
  await page.goto('/#/missing')
  await expect(page.getByRole('heading', { name: 'This page wandered off.' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to the work →' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Joshua Bugarin.')
})

test('Pacer controls display all 16 verified results and the win/tie presets', async ({ page }) => {
  await page.goto('/#/projects/pacer')
  const explorer = page.getByRole('region', { name: 'Pacer results explorer' })
  for (const cell of cells) {
    await explorer.getByRole('group', { name: 'Workload trace' }).getByRole('button', { name: cell.trace, exact: true }).click()
    await explorer.getByRole('group', { name: 'Cache size' }).getByRole('button', { name: cell.cache, exact: true }).click()
    await expect(explorer.locator('.bar.hi .val')).toHaveText(`${cell.pacer.toFixed(2)}%`)
    await expect(explorer.locator('.verdict')).toContainText(cell.lo <= 0 ? 'Statistically tied.' : 'Pacer is ahead.')
  }
  await explorer.getByRole('button', { name: 'Show where it ties' }).click()
  await expect(explorer.locator('.verdict')).toContainText('The interval includes zero')
  await explorer.getByRole('button', { name: 'Show a clear win' }).click()
  await expect(explorer.locator('.verdict')).toContainText('Pacer is ahead.')
  await explorer.getByText('Compare all workloads at a glance', { exact: true }).click()
  await expect(explorer.locator('.result-matrix button')).toHaveCount(16)
  await explorer.getByRole('button', { name: /^Thinking, 2% cache/ }).click()
  await expect(explorer.locator('.bar.hi .val')).toHaveText('34.97%')
  await explorer.getByText('Show all 16 cells as a table', { exact: true }).click()
  await expect(explorer.locator('table:not(.result-matrix) tbody tr')).toHaveCount(16)
})

test('results disclose provenance individually and together', async ({ page }) => {
  await page.goto('/#/projects/tilelens')
  const first = page.locator('.results button').first()
  await first.click()
  await expect(first).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('.source').first()).toContainText('bench_solver.py')
  await expect(page.locator('.source').first()).toContainText('showcase audit')
  await page.getByRole('button', { name: 'Show all sources' }).click()
  await expect(page.locator('.source')).toHaveCount(4)
  await expect(page.locator('.source').last()).toContainText('not re-run')
  await expect(page.locator('.source a').first()).toHaveAttribute('href', /github\.com\/JMBugarin\/tilelens\/tree\//)
})

test('architecture and pipeline tabs support arrow, Home and End keys', async ({ page }) => {
  await page.goto('/#/projects/tilelens')
  const pipeline = page.getByRole('tablist', { name: 'Pipeline steps' })
  await pipeline.getByRole('tab', { name: /Capture/ }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(pipeline.getByRole('tab', { name: /Align/ })).toBeFocused()
  await expect(page.locator('#step-panel')).toContainText('colors of its squares')
  await page.keyboard.press('End')
  await expect(pipeline.getByRole('tab', { name: /Preview/ })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Home')
  await expect(pipeline.getByRole('tab', { name: /Capture/ })).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(pipeline.getByRole('tab', { name: /Preview/ })).toBeFocused()
  const architecture = page.getByRole('tablist', { name: 'TileLens architecture' })
  await architecture.getByRole('tab').first().focus()
  await page.keyboard.press('ArrowDown')
  await expect(architecture.getByRole('tab').nth(1)).toBeFocused()
  await expect(architecture.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('End')
  await expect(architecture.getByRole('tab').last()).toBeFocused()
  await page.keyboard.press('Home')
  await expect(architecture.getByRole('tab').first()).toBeFocused()
})

test('cold video chapter jumps play and update the active chapter', async ({ page }) => {
  await page.goto('/#/projects/tilelens')
  await page.getByRole('button', { name: /New rack read/ }).click()
  await page.waitForFunction(() => {
    const video = document.querySelector<HTMLVideoElement>('.player video')
    return !!video && video.readyState >= 2 && video.currentTime >= 21.5 && !video.paused
  })
  await expect(page.getByRole('button', { name: /New rack read/ })).toHaveAttribute('aria-current', 'true')
  await page.getByRole('button', { name: /A seven-tile play lands/ }).click()
  await expect.poll(() => page.locator('.player video').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeLessThan(8)
})

test('all displayed recordings load and play with native controls and no autoplay', async ({ page }) => {
  for (const project of ['pacer','tilelens','classmap']) {
    await page.goto(`/#/projects/${project}`)
    const videos = page.locator('video')
    await expect(videos).toHaveCount(project === 'classmap' ? 2 : 1)
    for (let i = 0; i < await videos.count(); i++) {
      const video = videos.nth(i)
      await expect(video).toHaveAttribute('preload', 'none')
      await expect(video).toHaveJSProperty('autoplay', false)
      await expect(video).toHaveJSProperty('controls', true)
      await video.scrollIntoViewIfNeeded()
      const duration = await video.evaluate(async (element: HTMLVideoElement) => {
        element.muted = true
        await element.play()
        return element.duration
      })
      expect(duration).toBeGreaterThan(25)
      await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0)
      await video.evaluate((element: HTMLVideoElement) => element.pause())
    }
  }
})

test('capture viewer traps focus, steps with arrows, and restores focus on Escape', async ({ page }) => {
  await page.goto('/#/projects/tilelens')
  const drawer = page.getByRole('region', { name: 'TileLens captures' })
  const trigger = drawer.getByRole('button', { name: /Open capture 1 of/ })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'tilelens capture viewer' })
  await expect(dialog).toBeVisible()
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('ArrowRight')
  await expect(dialog.locator('figcaption')).toContainText('2 /')
  await page.keyboard.press('ArrowLeft')
  await expect(dialog.locator('figcaption')).toContainText('1 /')
  await expect.poll(() => dialog.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  await dialog.getByRole('button', { name: 'Close', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: '← Previous' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('Classmap is lazy, computes a real route, searches a typo, and unloads', async ({ page }) => {
  const demoRequests: string[] = []
  page.on('request', request => { if (request.url().includes('/demos/classmap-map/')) demoRequests.push(request.url()) })
  await page.goto('/#/projects/classmap')
  await expect(page.getByRole('button', { name: 'Load the live map' })).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(0)
  expect(demoRequests).toEqual([])
  await page.getByRole('button', { name: 'Load the live map' }).click()
  const frame = page.frameLocator('iframe[title="Classmap web map of UC Santa Cruz"]')
  await expect(frame.getByText('Walking directions', { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(frame.getByText(/^\d+ min$/)).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'McHenry Library', exact: true }).click()
  await expect(frame.getByRole('heading', { name: 'McHenry Library', exact: true })).toBeVisible({ timeout: 30_000 })
  await frame.getByRole('combobox', { name: 'Search UCSC' }).fill('mchenery libr')
  await expect(frame.getByRole('listbox', { name: 'Search results' })).toContainText('McHenry Library')
  await frame.getByRole('combobox', { name: 'Search UCSC' }).press('Enter')
  await expect(frame.getByRole('heading', { name: 'McHenry Library', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Unload map', exact: true }).click()
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Load the live map' })).toBeVisible()
})

test('theme survives refresh and keyboard skip link reaches main content', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('link', { name: 'Skip to content' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
})

for (const width of [360,390,1280]) {
  test(`all pages fit a ${width}px viewport; expanded data stays in its own scroller`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    for (const route of routes) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await noHorizontalOverflow(page)
    }
    await page.goto('/#/projects/pacer')
    await page.getByText('Compare all workloads at a glance', { exact: true }).click()
    await page.getByText('Show all 16 cells as a table', { exact: true }).click()
    await noHorizontalOverflow(page)
    await page.getByRole('button', { name: 'Thinking', exact: true }).click()
    await expect(page.locator('.bar.hi .val')).toHaveText('34.97%')
  })
}

test('reduced motion disables transitions while section navigation still works', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/projects/pacer')
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--t').trim())).toMatch(/^0m?s$/)
  await page.getByRole('link', { name: 'Explore the results ↓' }).click()
  await expect(page.locator('#experiment')).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Make the comparison yourself.' })).toBeInViewport()
  expect(await page.locator('.fill').first().evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s')
})

test('without JavaScript the core projects and contact links remain available', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('http://localhost:4321/')
  await expect(page.getByRole('heading', { name: 'Joshua Bugarin', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pacer', exact: true })).toHaveAttribute('href', 'https://github.com/JMBugarin/pacer')
  await expect(page.getByRole('link', { name: 'Resume (PDF)' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Email', exact: true })).toHaveAttribute('href', `mailto:${email}`)
  await context.close()
})
