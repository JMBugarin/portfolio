import { expect, test } from '@playwright/test'

const paths = ['/', '/work/', '/projects/pacer/', '/projects/tilelens/', '/projects/classmap/', '/projects/ethocal/', '/work/pacer/', '/about/']
const grid = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => sessionStorage.setItem('tarot:view', 'grid'))
  await page.goto('/')
}

test('every case study and existing URL loads with one h1 and no client errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => sessionStorage.setItem('tarot:view', 'grid'))
  for (const path of paths) {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('the static project index has four real links and two reserved seats, without downloading 3D', async ({ page }) => {
  const requests: string[] = []; page.on('request', r => requests.push(r.url()))
  await grid(page)
  await expect(page.locator('.archive-card')).toHaveCount(6)
  await expect(page.locator('.archive-card h2 a')).toHaveCount(4)
  await expect(page.locator('.archive-card.is-reserved')).toHaveCount(2)
  await expect(page.locator('[data-canvas] canvas')).toHaveCount(0)
  expect(requests.some(u => /tarot-webgl|tarot-table\.glb|\/draco\//.test(u))).toBe(false)
})

test('an eligible desktop starts with the project index and downloads no 3D until requested', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 }))
  const requests: string[] = []; page.on('request', r => requests.push(r.url()))
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Enter the table' })).toBeVisible()
  await expect(page.locator('tarot-table')).toHaveAttribute('data-view', 'grid')
  await expect(page.locator('#tarot-grid')).toBeVisible()
  await expect(page.locator('.archive-card h2 a')).toHaveCount(4)
  await expect(page.locator('[data-canvas] canvas')).toHaveCount(0)
  expect(requests.some(u => /tarot-webgl|tarot-table\.glb|\/draco\//.test(u))).toBe(false)
})

test('project identities agree across the archive, canonical pages and legacy URLs', async ({ page }) => {
  const entries = [
    { id: 'pacer', title: 'Pacer', label: 'I · The Magician' },
    { id: 'tilelens', title: 'TileLens', label: 'II · The High Priestess' },
    { id: 'classmap', title: 'Classmap', label: 'III · The Empress' },
    { id: 'ethocal', title: 'Ethocal', label: 'IV · The Emperor' },
  ]
  await page.goto('/work/')
  for (const entry of entries) {
    const row = page.locator('.spread-row').filter({ has: page.getByRole('heading', { name: entry.title, exact: true }) })
    await expect(row.locator('.label')).toHaveText(entry.label)
  }
  for (const entry of entries) {
    let canonicalLabel = ''
    for (const prefix of ['projects', 'work']) {
      await page.goto(`/${prefix}/${entry.id}/`)
      await expect(page.locator('h1')).toHaveText(entry.title)
      const label = page.locator('.case-head .label')
      await expect(label).toContainText(entry.label)
      if (prefix === 'projects') canonicalLabel = (await label.textContent())!.trim()
      else await expect(label).toHaveText(canonicalLabel)
    }
  }
})

test('grid links reveal a case study through the mist and back navigation keeps the index usable', async ({ page }) => {
  await grid(page)
  await page.locator('.archive-card h2 a').filter({ hasText: 'Pacer' }).click()
  await expect(page).toHaveURL(/\/projects\/pacer\/$/)
  await expect(page.locator('h1')).toHaveText('Pacer')
  await expect(page.locator('html')).not.toHaveAttribute('data-mist', /departing|arriving/)
  await page.goBack()
  await expect(page.locator('.archive-card')).toHaveCount(6)
  await expect(page.locator('#tarot-grid')).toBeVisible()
  await page.getByRole('button', { name: 'Meet the maker' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('the maker slide-over traps focus, closes, and restores focus to its trigger', async ({ page }) => {
  await grid(page)
  const trigger = page.getByRole('button', { name: 'Meet the maker' })
  await trigger.click()
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Download resume' })).toHaveAttribute('download', '')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused()
})

test('3D loads from local assets, exposes all chairs, previews and navigates by keyboard', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 }))
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter the table' }).click()
  await expect(page.locator('[data-canvas] canvas')).toBeVisible()
  const first = page.locator('[data-seat="Seat_01"]')
  await expect(first).toBeVisible({ timeout: 30000 })
  await expect(page.locator('[data-seat]:visible')).toHaveCount(6)
  await first.focus()
  await expect(page.locator('[data-seat-preview]')).toBeVisible()
  await expect(page.locator('[data-preview-title]')).toHaveText('Pacer')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/projects\/pacer\/$/)
  await expect(page.locator('[data-canvas] canvas')).toHaveCount(0)
  await page.goBack()
  await expect(page.locator('[data-seat="Seat_01"]')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('[data-canvas] canvas')).toHaveCount(1)
  await page.getByRole('button', { name: 'Back to project index' }).click()
  await expect(page.locator('#tarot-grid')).toBeVisible()
  await expect(page.locator('[data-canvas] canvas')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('a failed model request falls back to working project links', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 }))
  await page.route('**/models/tarot-table.glb', route => route.abort())
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter the table' }).click()
  await expect(page.locator('#tarot-grid')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('[data-scene-status]')).toContainText('All case studies are available')
  await expect(page.locator('.archive-card h2 a')).toHaveCount(4)
  await expect(page.locator('[data-canvas] canvas')).toHaveCount(0)
})

test('low-core hardware avoids all WebGL downloads even at desktop width', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { value: 4 }))
  const urls: string[] = []; page.on('request', r => urls.push(r.url()))
  await page.goto('/')
  await expect(page.locator('[data-fallback-banner]')).toBeVisible()
  await expect(page.locator('#tarot-grid')).toBeVisible()
  expect(urls.some(u => /tarot-webgl|tarot-table\.glb|\/draco\//.test(u))).toBe(false)
})

test('switching to grid during a model download immediately releases the canvas', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 }))
  let abortRequest: (() => Promise<void>) | undefined
  await page.route('**/models/tarot-table.glb', route => { abortRequest = () => route.abort() })
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter the table' }).click()
  await expect(page.locator('[data-canvas] canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Back to project index' }).click()
  await expect(page.locator('[data-canvas] canvas')).toHaveCount(0)
  await expect(page.locator('#tarot-grid')).toBeVisible()
  await abortRequest?.()
})

test('a lost GPU context falls back to the project index', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter the table' }).click()
  await expect(page.locator('[data-seat="Seat_01"]')).toBeVisible({ timeout: 30000 })
  await page.locator('[data-canvas] canvas').evaluate(canvas => {
    const context = (canvas as HTMLCanvasElement).getContext('webgl2')!
    context.getExtension('WEBGL_lose_context')!.loseContext()
  })
  await expect(page.locator('#tarot-grid')).toBeVisible()
  await expect(page.locator('[data-canvas] canvas')).toHaveCount(0)
})

test('case-study galleries still work after client-side navigation', async ({ page }) => {
  await grid(page)
  await page.locator('.archive-card h2 a').filter({ hasText: 'TileLens' }).click()
  const gallery = page.getByRole('region', { name: 'TileLens captures' })
  await gallery.scrollIntoViewIfNeeded()
  await gallery.getByRole('link', { name: /Open capture 1 of/ }).click()
  await expect(gallery.locator('dialog')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(gallery.locator('dialog figcaption')).toContainText('2 /')
  await page.keyboard.press('Escape')
  await expect(gallery.locator('dialog')).toBeHidden()
})

test('the local Draco payload and resume are served with the expected types', async ({ request }) => {
  for (const file of ['draco_decoder.js', 'draco_wasm_wrapper.js', 'draco_decoder.wasm']) expect((await request.get(`/draco/${file}`)).status()).toBe(200)
  const model = await request.get('/models/tarot-table.glb')
  expect(model.status()).toBe(200); expect((await model.body()).byteLength).toBeLessThan(6000000)
  const resume = await request.get('/resume/Joshua-Bugarin-Resume.pdf')
  expect(resume.status()).toBe(200); expect(resume.headers()['content-type']).toContain('pdf')
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })
  test('2D is automatic, its notice dismisses, and all pages fit at 390 and 320px', async ({ page }) => {
    const urls: string[] = []; page.on('request', r => urls.push(r.url()))
    await page.goto('/')
    await expect(page.locator('[data-fallback-banner]')).toBeVisible()
    await page.getByRole('button', { name: 'Dismiss desktop experience notice' }).click()
    await expect(page.locator('[data-fallback-banner]')).toBeHidden()
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 })
      for (const path of paths) {
        await page.goto(path)
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${path} at ${width}`).toBeLessThanOrEqual(0)
      }
    }
    expect(urls.some(u => /tarot-webgl|tarot-table\.glb|\/draco\//.test(u))).toBe(false)
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('defaults to static cards and navigation remains available', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#tarot-grid')).toBeVisible()
    await expect(page.locator('[data-canvas] canvas')).toHaveCount(0)
    await page.locator('.archive-card h2 a').first().click()
    await expect(page).toHaveURL(/\/projects\/pacer\/$/)
    await expect(page.locator('html')).not.toHaveAttribute('data-mist', /departing|arriving/)
  })
})

test('without JavaScript the static cards and case studies are readable', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.locator('.archive-card h2 a')).toHaveCount(4)
  await page.locator('.archive-card h2 a').first().click()
  await expect(page.locator('h1')).toHaveText('Pacer')
  await expect(page.getByRole('heading', { name: 'The problem', exact: true })).toBeVisible()
  await context.close()
})
