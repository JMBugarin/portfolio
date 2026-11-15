type View = 'mat' | 'list'

const root = document.documentElement
const container = document.querySelector<HTMLElement>('.drafting-container')!
const mat = document.querySelector<HTMLElement>('.engineering-mat')!
const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-set-view]')]
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const hover = matchMedia('(hover: hover) and (pointer: fine)')

const NAV = 96
const MAX_TILT = 1.4

const view = (): View => (root.dataset.view === 'mat' ? 'mat' : 'list')

function layoutTop(el: HTMLElement) {
  let y = 0
  for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) y += node.offsetTop
  return y
}

// Keeps the fold line of the tilt under the middle of the viewport, so the mat
// slides beneath a fixed camera instead of swinging toward it as the page scrolls.
let matTop = 0
let containerTop = 0
function measure() {
  matTop = layoutTop(mat)
  containerTop = layoutTop(container)
}
function place() {
  if (view() !== 'mat') return
  const mid = scrollY + innerHeight / 2
  container.style.perspectiveOrigin = `50% ${mid - containerTop}px`
  mat.style.transformOrigin = `50% ${mid - matTop}px`
}

let placing = 0
function schedulePlace() {
  if (placing) return
  placing = requestAnimationFrame(() => {
    placing = 0
    place()
  })
}

const tilt = { x: 0, y: 0, goalX: 0, goalY: 0, frame: 0 }
function stepTilt() {
  tilt.x += (tilt.goalX - tilt.x) * 0.08
  tilt.y += (tilt.goalY - tilt.y) * 0.08
  mat.style.setProperty('--tilt-x', `${tilt.x.toFixed(3)}deg`)
  mat.style.setProperty('--tilt-y', `${tilt.y.toFixed(3)}deg`)
  const settled = Math.abs(tilt.goalX - tilt.x) < 0.004 && Math.abs(tilt.goalY - tilt.y) < 0.004
  tilt.frame = settled ? 0 : requestAnimationFrame(stepTilt)
}
function onPointer(event: PointerEvent) {
  if (view() !== 'mat' || reduced.matches || !hover.matches || event.pointerType !== 'mouse') return
  tilt.goalY = (event.clientX / innerWidth - 0.5) * 2 * MAX_TILT
  tilt.goalX = (0.5 - event.clientY / innerHeight) * 2 * MAX_TILT
  if (!tilt.frame) tilt.frame = requestAnimationFrame(stepTilt)
}

function scrollToLayout(target: HTMLElement, offset = NAV) {
  const top = target.id === 'top' ? 0 : Math.max(0, layoutTop(target) - offset)
  scrollTo({ top, behavior: reduced.matches ? 'auto' : 'smooth' })
}

function hashTarget(hash: string) {
  if (hash.length < 2) return null
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)))
  } catch {
    return null
  }
}

// The browser aims at the projected box, which lands far from the layout box on a tilted plane.
function onClick(event: MouseEvent) {
  if (view() !== 'mat' || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey) return
  const link = (event.target as Element).closest<HTMLAnchorElement>('a[href*="#"]')
  if (!link || link.origin !== location.origin || link.pathname !== location.pathname) return
  const target = hashTarget(link.hash)
  if (!target) return
  event.preventDefault()
  history.pushState(null, '', link.hash)
  scrollToLayout(target)
  target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
}

function onFocus(event: FocusEvent) {
  const el = event.target as HTMLElement
  if (view() !== 'mat' || !mat.contains(el) || !el.matches(':focus-visible')) return
  const y = layoutTop(el)
  if (y < scrollY + NAV || y > scrollY + innerHeight - 160) scrollTo({ top: Math.max(0, y - innerHeight / 2) })
}

function currentSection() {
  const sections = [...mat.querySelectorAll<HTMLElement>('section[id]')]
  let hit: HTMLElement | null = null
  for (const section of sections) if (section.getBoundingClientRect().top < innerHeight * 0.45) hit = section
  return scrollY < 40 ? null : hit
}

function sync() {
  const now = view()
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.setView === now))
  if (now === 'mat') {
    measure()
    place()
  } else {
    container.style.perspectiveOrigin = ''
    mat.style.transformOrigin = ''
    mat.style.removeProperty('--tilt-x')
    mat.style.removeProperty('--tilt-y')
    tilt.x = tilt.y = tilt.goalX = tilt.goalY = 0
  }
}

function setView(next: View) {
  if (next === view()) return
  const anchor = currentSection()
  const apply = () => {
    root.dataset.view = next
    sync()
    scrollTo({ top: anchor ? Math.max(0, layoutTop(anchor) - NAV) : 0, behavior: 'instant' })
    place()
    document.dispatchEvent(new CustomEvent('viewchange', { detail: next }))
  }
  try {
    localStorage.setItem('view', next)
  } catch {}
  if (document.startViewTransition && !reduced.matches) document.startViewTransition(apply)
  else apply()
}

for (const button of buttons) button.addEventListener('click', () => setView(button.dataset.setView as View))
addEventListener('scroll', schedulePlace, { passive: true })
addEventListener('resize', () => {
  measure()
  schedulePlace()
})
addEventListener('pointermove', onPointer, { passive: true })
document.addEventListener('click', onClick)
document.addEventListener('focusin', onFocus)
new ResizeObserver(() => {
  measure()
  schedulePlace()
}).observe(mat)

sync()
if (view() === 'mat') {
  const target = hashTarget(location.hash)
  if (target) scrollTo({ top: target.id === 'top' ? 0 : Math.max(0, layoutTop(target) - NAV) })
}

export {}
