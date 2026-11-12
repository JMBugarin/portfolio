// Sync verified facts and media from ../showcase (override with SHOWCASE).
// Images: cwebp, ffmpeg with libwebp, or an existing Python/Pillow installation.
// Videos: ffmpeg + ffprobe. No new browser/runtime dependency is introduced.
// Use --media-only when refreshing captures without replacing project facts or the map.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const showcase = resolve(root, process.env.SHOWCASE ?? '../showcase')
const out = join(root, 'public/media')
const data = join(root, 'src/data')
const mediaOnly = process.argv.includes('--media-only')
const run = (command, args) => execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const available = (command, args) => { try { run(command, args); return true } catch { return false } }
const probe = (path) => JSON.parse(run('ffprobe', ['-v', 'quiet', '-show_entries', 'stream=width,height,codec_name', '-show_entries', 'format=duration,size', '-of', 'json', path]))
const atomicJson = (path, value) => { const temporary = `${path}.tmp`; writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n'); renameSync(temporary, path) }

if (!available('ffprobe', ['-version']) || !available('ffmpeg', ['-version'])) throw new Error('Media sync requires ffmpeg and ffprobe on PATH.')
let encoder
const python = process.env.PYTHON ?? 'python3'
if (available('cwebp', ['-version'])) encoder = 'cwebp'
else if (/\blibwebp\b/.test(run('ffmpeg', ['-hide_banner', '-encoders']))) encoder = 'ffmpeg'
else if (available(python, ['-c', 'from PIL import Image; import PIL.features; assert PIL.features.check("webp")'])) encoder = 'pillow'
else throw new Error('No WebP encoder found. Install cwebp or ffmpeg with libwebp, or set PYTHON to an existing Python with Pillow/WebP support. No files were changed.')

const encode = (source, target, width, height) => {
  if (encoder === 'cwebp') run('cwebp', ['-quiet', '-q', '83', '-m', '6', '-resize', String(width), String(height), source, '-o', target])
  else if (encoder === 'ffmpeg') run('ffmpeg', ['-v', 'error', '-y', '-i', source, '-vf', `scale=${width}:${height}:flags=lanczos`, '-c:v', 'libwebp', '-quality', '83', '-compression_level', '6', target])
  else run(python, ['-c', 'from PIL import Image; import sys; im=Image.open(sys.argv[1]).convert("RGB"); im.resize((int(sys.argv[3]),int(sys.argv[4])),Image.Resampling.LANCZOS).save(sys.argv[2],"WEBP",quality=83,method=6)', source, target, String(width), String(height)])
}

mkdirSync(data, { recursive: true })
const keep = (m) => !m.path.includes('/linkedin/') && (m.path.endsWith('.mp4') || m.path.includes('/screenshots/'))
const sourceManifest = JSON.parse(readFileSync(join(showcase, 'media/manifest.json'), 'utf8')).filter(keep)
const staging = mkdtempSync(join(tmpdir(), 'portfolio-media-'))
const assets = []
const variants = {}
const superseded = []
try {
  for (const m of sourceManifest) {
    const source = join(showcase, m.path)
    if (!existsSync(source)) { console.warn(`Missing source, skipped: ${m.path}`); continue }
    const directory = join(staging, m.project)
    mkdirSync(directory, { recursive: true })
    const info = probe(source)
    const { width, height } = info.streams.find((stream) => stream.width && stream.height)
    const provenance = { source_path: m.path, source_format: `${width}x${height}`, source_bytes: statSync(source).size, source_sha256: createHash('sha256').update(readFileSync(source)).digest('hex') }
    const { path: originalPath, bytes: originalBytes, ...metadata } = m
    if (m.path.endsWith('.mp4')) {
      const name = basename(source)
      const target = join(directory, name)
      run('ffmpeg', ['-v', 'error', '-y', '-i', source, '-c', 'copy', '-movflags', '+faststart', target])
      const duration = Number(info.format.duration)
      assets.push({ ...metadata, ...provenance, kind: 'video', file: `media/${m.project}/${name}`, format: `${width}x${height}, ${Number(duration.toFixed(2))} s`, width, height, duration, bytes: statSync(target).size })
    } else {
      const stem = basename(source).replace(/\.[^.]+$/, '')
      const portrait = height > width
      const widths = [...new Set([Math.min(width, portrait ? 600 : 960), Math.min(width, portrait ? 900 : 1600)])].sort((a, b) => a - b)
      const generated = widths.map((w) => {
        const h = Math.round(height * w / width)
        const name = `${stem}-${w}.webp`
        encode(source, join(directory, name), w, h)
        return { file: `media/${m.project}/${name}`, width: w, height: h, bytes: statSync(join(directory, name)).size }
      })
      const small = generated[0]
      const large = generated.at(-1)
      const mapping = { src: large.file, small: small.file, width: large.width, height: large.height }
      const oldFile = `media/${m.project}/${stem}.jpg`
      variants[oldFile] = mapping
      for (const image of generated) variants[image.file] = mapping
      superseded.push(join(root, 'public', oldFile))
      assets.push({ ...metadata, ...provenance, kind: 'image', file: large.file, format: `${large.width}x${large.height}`, width: large.width, height: large.height, bytes: large.bytes, portrait })
    }
  }
  // Publish complete output and mappings before removing the superseded JPGs.
  mkdirSync(out, { recursive: true })
  cpSync(staging, out, { recursive: true })
  atomicJson(join(data, 'media-variants.json'), variants)
  atomicJson(join(data, 'manifest.json'), assets)
  for (const path of superseded) rmSync(path, { force: true })
} finally { rmSync(staging, { recursive: true, force: true }) }

if (!mediaOnly) {
  const projects = JSON.parse(readFileSync(join(showcase, 'content/projects.json'), 'utf8'))
  atomicJson(join(data, 'projects.json'), projects)

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
    if (cells.length === 16) atomicJson(join(data, 'pacer-results.json'), cells)
    else console.warn(`expected 16 Pacer cells, found ${cells.length}; kept the existing file`)
  }

  // The real Classmap web map, as built by its own repo. Keep the existing copy when unavailable.
  const dist = [join(showcase, '_work/classmap/web/dist'), resolve(root, '../ucsc-campus-router-v2/web/dist')].find(existsSync)
  const demo = join(root, 'public/demos/classmap-map')
  if (dist) { rmSync(demo, { recursive: true, force: true }); cpSync(dist, demo, { recursive: true }) }
  console.log(`Map demo ${dist ? 'copied' : 'not found (kept as is)'}`)

  // The demo word list from the TileLens repo, for the rack toy on the play page.
  const wordList = [join(showcase, '_work/tilelens/profiles/demo_words.txt'), resolve(root, '../tilelens/profiles/demo_words.txt')].find(existsSync)
  if (wordList) cpSync(wordList, join(data, 'demo-words.txt'))
}
console.log(`${assets.length} verified assets, ${Object.keys(variants).length} image aliases, WebP encoder: ${encoder}${mediaOnly ? '; facts and map unchanged' : ''}`)
