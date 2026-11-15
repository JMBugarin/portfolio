const root = document.documentElement
let stack = 1

// Screen pixels per layout pixel at an element's spot on the tilted mat.
function localScale(el: HTMLElement) {
  const parent = (el.offsetParent as HTMLElement | null) ?? el.parentElement!
  const probe = document.createElement('div')
  probe.style.cssText = `position:absolute;left:${el.offsetLeft}px;top:${el.offsetTop}px;width:100px;height:100px;visibility:hidden;pointer-events:none`
  parent.append(probe)
  const rect = probe.getBoundingClientRect()
  probe.remove()
  return { x: rect.width / 100 || 1, y: rect.height / 100 || 1 }
}

function makeDraggable(el: HTMLElement) {
  let start: { x: number; y: number; dx: number; dy: number; sx: number; sy: number; id: number } | null = null
  let moved = false
  let swallowClick = false

  el.addEventListener('pointerdown', (event) => {
    if (root.dataset.view !== 'mat' || event.button !== 0 || event.pointerType === 'touch') return
    const scale = localScale(el)
    start = {
      x: event.clientX,
      y: event.clientY,
      dx: Number(el.dataset.dx ?? 0),
      dy: Number(el.dataset.dy ?? 0),
      sx: scale.x,
      sy: scale.y,
      id: event.pointerId,
    }
    moved = false
    el.setPointerCapture(event.pointerId)
    event.preventDefault()
  })

  el.addEventListener('pointermove', (event) => {
    if (!start || event.pointerId !== start.id) return
    const mx = event.clientX - start.x
    const my = event.clientY - start.y
    if (!moved) {
      if (Math.hypot(mx, my) < 4) return
      moved = true
      el.classList.add('dragging')
      el.style.setProperty('--z', `${1 + stack++ * 0.4}px`)
    }
    const x = start.dx + mx / start.sx
    const y = start.dy + my / start.sy
    el.dataset.dx = x.toFixed(1)
    el.dataset.dy = y.toFixed(1)
    el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`
  })

  const end = (event: PointerEvent) => {
    if (!start || event.pointerId !== start.id) return
    start = null
    el.classList.remove('dragging')
    if (moved) swallowClick = true
  }
  el.addEventListener('pointerup', end)
  el.addEventListener('pointercancel', end)
  el.addEventListener(
    'click',
    (event) => {
      if (!swallowClick) return
      swallowClick = false
      event.preventDefault()
      event.stopPropagation()
    },
    true,
  )
  el.addEventListener('dragstart', (event) => event.preventDefault())
}

document.querySelectorAll<HTMLElement>('[data-drag]').forEach(makeDraggable)

export {}
