// Copies facts and media from ../showcase into this site. Run after the showcase changes: npm run sync
// Needs macOS `sips` for image resizing. Safe to re-run; skips what the showcase no longer has.
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const showcase = resolve(root, process.env.SHOWCASE ?? '../showcase')
const out = join(root, 'public/media')
const data = join(root, 'src/data')
mkdirSync(data, { recursive: true })

const projects = JSON.parse(readFileSync(join(showcase, 'content/projects.json'), 'utf8'))
writeFileSync(join(data, 'projects.json'), JSON.stringify(projects, null, 2) + '\n')

const keep = (m) => !m.path.includes('/linkedin/') && (m.path.endsWith('.mp4') || m.path.includes('/screenshots/'))
const manifest = JSON.parse(readFileSync(join(showcase, 'media/manifest.json'), 'utf8')).filter(keep)
rmSync(out, { recursive: true, force: true })
const assets = []
for (const m of manifest) {
  const src = join(showcase, m.path)
  if (!existsSync(src)) continue
  const dir = join(out, m.project)
  mkdirSync(dir, { recursive: true })
  if (m.path.endsWith('.mp4')) {
    cpSync(src, join(dir, basename(src)))
    assets.push({ ...m, kind: 'video', file: `media/${m.project}/${basename(src)}` })
  } else {
    const name = basename(src).replace(/\.png$/, '.jpg')
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-Z', '1800', src, '--out', join(dir, name)], { stdio: 'ignore' })
    const [w, h] = m.format.split('x').map(Number)
    assets.push({ ...m, kind: 'image', file: `media/${m.project}/${name}`, portrait: h > w })
  }
}
writeFileSync(join(data, 'manifest.json'), JSON.stringify(assets.map(({ bytes, path, ...a }) => a), null, 2) + '\n')

// Pacer's 16 result cells, from the table its own report tool writes into the README.
const readme = [join(showcase, '_work/pacer/README.md'), resolve(root, '../pacer/README.md')].find(existsSync)
if (readme) {
  const rows = readFileSync(readme, 'utf8').split('\n').filter((l) => /^\| (To-C chat|To-B API|Coder|Thinking) \|/.test(l))
  const cells = rows.map((l) => {
    const c = l.split('|').map((x) => x.trim()).slice(1, -1)
    const [, best, bestName] = c[3].match(/^([\d.]+) \((.+)\)$/)
    const [, delta, lo, hi] = c[6].match(/^([+-][\d.]+) \[([+-][\d.]+), ([+-][\d.]+)\]$/)
    return { trace: c[0], cache: c[1], lru: +c[2], best: +best, bestName, atc: +c[4], pacer: +c[5].replace(/\*/g, ''), delta: +delta, lo: +lo, hi: +hi, belady: +c[7] }
  })
  if (cells.length === 16) writeFileSync(join(data, 'pacer-results.json'), JSON.stringify(cells, null, 2) + '\n')
  else console.warn(`expected 16 Pacer cells, found ${cells.length}; kept the existing file`)
}

// The real Classmap web map, as built by its own repo (npm run build in web/).
const dist = [join(showcase, '_work/classmap/web/dist'), resolve(root, '../ucsc-campus-router-v2/web/dist')].find(existsSync)
const demo = join(root, 'public/demos/classmap-map')
if (dist) { rmSync(demo, { recursive: true, force: true }); cpSync(dist, demo, { recursive: true }) }
console.log(`${assets.length} assets, map demo ${dist ? 'copied' : 'not found (kept as is)'}`)
