// Automated accessibility checks supplement (not replace) keyboard and visual review.
import { chromium } from '@playwright/test'
import axe from 'axe-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const base = process.env.BASE ?? 'http://localhost:4321'
const out = resolve(process.env.QA_OUT ?? '_shots')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const results = []
try {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
    await context.addInitScript(t => localStorage.setItem('theme', t), theme)
    const page = await context.newPage()
    for (const route of ['/', '/projects/pacer', '/projects/tilelens', '/projects/classmap', '/projects/ethocal']) {
      await page.goto(`${base}/#${route}`)
      await page.locator('h1').waitFor()
      await page.locator('text=Loading the interactive view…').waitFor({ state: 'hidden' })
      await page.evaluate(() => document.fonts.ready)
      await page.addScriptTag({ content: axe.source })
      const audit = await page.evaluate(async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','best-practice'] } }))
      const entry = { route, theme, violations: audit.violations.map(v => ({ id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})) })), incomplete: audit.incomplete.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})), passes:audit.passes.length }
      results.push(entry)
      console.log(`${theme} ${route}: ${entry.violations.length} violations, ${entry.incomplete.length} manual-review rules`)
    }
    await context.close()
  }
} finally { await browser.close() }
writeFileSync(resolve(out,'accessibility.json'),JSON.stringify(results,null,2)+'\n')
if(results.some(r=>r.violations.length)) process.exitCode=1
