// axe supplements the keyboard, fallback, and navigation checks in e2e/site.spec.ts.
import { chromium } from '@playwright/test'
import axe from 'axe-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const base = process.env.QA_BASE ?? 'http://localhost:4321'
const out = resolve(process.env.QA_OUT ?? '_shots')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const results = []
try {
  for (const mode of ['grid', 'scene', 'mobile']) {
    const context = await browser.newContext({ viewport: mode === 'mobile' ? {width:390,height:844} : {width:1440,height:1000} })
    await context.addInitScript(mode => {
      sessionStorage.setItem('tarot:view', mode === 'grid' ? 'grid' : 'scene')
      Object.defineProperty(navigator, 'hardwareConcurrency', {value:8})
    }, mode)
    const page = await context.newPage()
    for (const route of mode === 'grid' ? ['/', '/work/', '/projects/pacer/', '/projects/tilelens/', '/projects/classmap/', '/projects/ethocal/', '/about/'] : ['/']) {
      await page.goto(`${base}${route}`)
      await page.locator('h1').waitFor()
      if (mode === 'scene') await page.locator('[data-seat="Seat_01"]:visible').waitFor({timeout:30000})
      await page.evaluate(async () => { for (let y=0; y<document.documentElement.scrollHeight; y+=600) { scrollTo(0,y); await new Promise(r=>setTimeout(r,30)) } scrollTo(0,0); await document.fonts.ready })
      // Audit settled colors, after finite scroll-reveal transitions have finished.
      await page.evaluate(async () => {
        await new Promise(requestAnimationFrame)
        await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})))
      })
      await page.addScriptTag({ content: axe.source })
      const audit = await page.evaluate(async () => await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}}))
      const entry = {route,mode,violations:audit.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),manual_review:audit.incomplete.map(v=>v.id),passes:audit.passes.length}
      results.push(entry); console.log(`${mode} ${route}: ${entry.violations.length} violations`)
    }
    await context.close()
  }
} finally { await browser.close() }
writeFileSync(resolve(out,'accessibility.json'), JSON.stringify(results,null,2)+'\n')
if (results.some(r=>r.violations.length)) process.exitCode=1
