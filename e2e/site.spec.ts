import { expect, test } from '@playwright/test'

const expectView = (page: import('@playwright/test').Page, view: 'mat' | 'list') =>
  expect(page.locator('html')).toHaveAttribute('data-view', view)

test('opens on the drafting table with every project pinned', async ({ page }) => {
  await page.goto('/')
  await expectView(page, 'mat')
  await expect(page.locator('.index-card')).toHaveCount(5)
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Joshua Bugarin')
  const transform = await page.locator('.engineering-mat').evaluate((el) => getComputedStyle(el).transform)
  expect(transform).toContain('matrix3d')
})

test('clean list removes the tilt and survives a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Clean List' }).click()
  await expectView(page, 'list')
  await expect(page.getByRole('button', { name: 'Clean List' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.engineering-mat')).toHaveCSS('transform', 'none')

  await page.reload()
  await expectView(page, 'list')
  await page.getByRole('button', { name: 'Drafting Table' }).click()
  await expectView(page, 'mat')
})

test('a shared link can force the clean list', async ({ page }) => {
  await page.goto('/?view=list')
  await expectView(page, 'list')
  await expect(page.getByRole('link', { name: 'Résumé (PDF)' })).toBeVisible()
})

test('without scripts the page is the clean list', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.locator('.engineering-mat')).toHaveCSS('transform', 'none')
  await expect(page.locator('.index-card')).toHaveCount(5)
  await context.close()
})

test('a card lifts off the mat on hover', async ({ page }) => {
  await page.goto('/')
  const card = page.locator('.index-card').first()
  await card.scrollIntoViewIfNeeded()
  const resting = await card.evaluate((el) => getComputedStyle(el).transform)
  await card.hover()
  await expect.poll(() => card.evaluate((el) => getComputedStyle(el).transform)).not.toBe(resting)
})

test('polaroids drag around without opening their project', async ({ page }) => {
  await page.goto('/')
  const polaroid = page.locator('.polaroid.d-tilelens')
  const before = await polaroid.boundingBox()
  await page.mouse.move(before!.x + 60, before!.y + 60)
  await page.mouse.down()
  await page.mouse.move(before!.x + 160, before!.y + 120, { steps: 6 })
  await page.mouse.up()
  const after = await polaroid.boundingBox()
  expect(after!.x - before!.x).toBeGreaterThan(70)
  await expect(page).toHaveURL(/\/$/)
  await polaroid.click()
  await expect(page).toHaveURL(/\/projects\/tilelens\/$/)
})

test('section links land on their section in the tilted view', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Contact' }).click()
  await expect(page).toHaveURL(/#contact$/)
  await expect(page.getByRole('heading', { name: 'Contact' })).toBeInViewport()
})

test('project sheets explain why, show media and list next steps', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Pacer details' }).click()
  await expect(page).toHaveURL(/\/projects\/pacer\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pacer')
  for (const name of ['Why I built it', 'Demo', 'Results', 'Where I struggled', 'Where it goes next']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  }
  await expect(page.locator('video')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Interface', exact: true })).toHaveCount(0)
  const broken = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).length)
  expect(broken).toBe(0)
})

test('every project page has a problem, a fix and next steps', async ({ page }) => {
  for (const id of ['pacer', 'tilelens', 'classmap', 'classmap-transit', 'ethocal']) {
    await page.goto(`/projects/${id}/`)
    await expect(page.getByRole('heading', { name: 'The problem' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'How it fixes it' })).toBeVisible()
    expect(await page.locator('.next li').count()).toBeGreaterThanOrEqual(3)
  }
})
