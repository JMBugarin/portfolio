// The home desk: pick things up, stamp them, watch the rulers follow the pointer.
const desk = document.querySelector<HTMLElement>('[data-desk]')
const mat = desk?.querySelector<HTMLElement>('.mat')

if (desk && mat) {
  const wide = matchMedia('(min-width: 960px) and (min-height: 620px)')
  const still = matchMedia('(prefers-reduced-motion: reduce)')
  const items = [...desk.querySelectorAll<HTMLElement>('[data-drag]')]
  const papers = [...desk.querySelectorAll<HTMLElement>('[data-paper]')]
  const tidy = desk.querySelector<HTMLButtonElement>('.tidy')
  const said = desk.querySelector<HTMLElement>('#desk-status')
  const key = 'desk'
  const where = new Map<HTMLElement, { x: number; y: number }>()
  let top = 10

  const layer = (host: HTMLElement) => {
    const el = document.createElement('span')
    el.className = 'ink-layer'
    el.setAttribute('aria-hidden', 'true')
    host.append(el)
    return el
  }
  const ink = new Map(papers.map((p) => [p, layer(p)]))
  const matInk = layer(mat)

  const place = (el: HTMLElement, x: number, y: number) => {
    where.set(el, { x, y })
    el.style.setProperty('--dx', `${x}px`)
    el.style.setProperty('--dy', `${y}px`)
  }
  const save = () => {
    const out: Record<string, [number, number, string]> = {}
    for (const [el, p] of where) if (p.x || p.y) out[el.dataset.drag ?? ''] = [p.x, p.y, el.style.zIndex]
    try { sessionStorage.setItem(key, JSON.stringify(out)) } catch {}
  }
  const messy = () => [...where.values()].some((p) => p.x || p.y) || desk.querySelector('.ink-mark') !== null
  const offerTidy = () => { if (tidy) tidy.hidden = !messy() }

  const restore = () => {
    for (const el of items) {
      el.style.removeProperty('--dx')
      el.style.removeProperty('--dy')
      el.style.zIndex = ''
    }
    where.clear()
    if (!wide.matches) return offerTidy()
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? '{}') as Record<string, [number, number, string]>
      for (const el of items) {
        const at = saved[el.dataset.drag ?? '']
        if (!at) continue
        place(el, at[0], at[1])
        el.style.zIndex = at[2]
        top = Math.max(top, Number(at[2]) || 0)
      }
    } catch {}
    offerTidy()
  }
  restore()
  wide.addEventListener('change', restore)

  const stampWords = ['Checked', 'Re-run', 'Measured']
  let stamped = 0
  const stampAt = (x: number, y: number, skip?: HTMLElement) => {
    const under = document.elementsFromPoint(x, y).map((el) => el.closest<HTMLElement>('[data-paper]')).find((p) => p && p !== skip)
    const host = under ?? mat
    const box = host.getBoundingClientRect()
    const turn = parseFloat(getComputedStyle(host).rotate) || 0
    const a = (-turn * Math.PI) / 180
    const dx = x - (box.left + box.width / 2), dy = y - (box.top + box.height / 2)
    const mark = document.createElement('span')
    mark.className = 'ink-mark'
    mark.textContent = stampWords[stamped++ % stampWords.length]
    mark.style.left = `${host.offsetWidth / 2 + dx * Math.cos(a) - dy * Math.sin(a)}px`
    mark.style.top = `${host.offsetHeight / 2 + dx * Math.sin(a) + dy * Math.cos(a)}px`
    mark.style.rotate = `${Math.round(Math.random() * 30 - 15 - turn)}deg`
    ;(under ? ink.get(under) ?? matInk : matInk).append(mark)
    const marks = desk.querySelectorAll('.ink-mark')
    if (marks.length > 12) marks[0].remove()
    if (said) said.textContent = `Stamped: ${mark.textContent}.`
    offerTidy()
  }

  for (const el of items) {
    el.addEventListener('dragstart', (e) => e.preventDefault())
    el.addEventListener('pointerdown', (e) => {
      if (!wide.matches || e.button !== 0 || (e.target as Element).closest('[data-nodrag]')) return
      const from = where.get(el) ?? { x: 0, y: 0 }
      const box = el.getBoundingClientRect()
      const room = desk.getBoundingClientRect()
      const cx = box.left + box.width / 2 - from.x, cy = box.top + box.height / 2 - from.y
      const x0 = e.clientX, y0 = e.clientY
      let moved = false
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - x0, dy = ev.clientY - y0
        if (!moved && Math.hypot(dx, dy) < 6) return
        if (!moved) {
          moved = true
          getSelection()?.removeAllRanges()
          document.documentElement.classList.add('grabbing')
          el.classList.add('dragging', 'used')
          el.style.zIndex = String(++top)
        }
        const x = Math.max(room.left + 30 - cx, Math.min(room.right - 30 - cx, from.x + dx))
        const y = Math.max(room.top + 30 - cy, Math.min(room.bottom - 30 - cy, from.y + dy))
        place(el, x, y)
      }
      const drop = (ev: PointerEvent) => {
        removeEventListener('pointermove', move)
        removeEventListener('pointerup', drop)
        removeEventListener('pointercancel', drop)
        if (!moved) return
        document.documentElement.classList.remove('grabbing')
        el.classList.remove('dragging')
        // A drag is not a click: swallow the one that follows.
        const swallow = (c: Event) => { c.preventDefault(); c.stopImmediatePropagation() }
        el.addEventListener('click', swallow, { capture: true, once: true })
        setTimeout(() => el.removeEventListener('click', swallow, true), 0)
        if (el.hasAttribute('data-stamp') && ev.type === 'pointerup') press(el, ev.clientX, ev.clientY)
        save()
        offerTidy()
      }
      addEventListener('pointermove', move)
      addEventListener('pointerup', drop)
      addEventListener('pointercancel', drop)
    })
  }

  const press = (tool: HTMLElement, x: number, y: number) => {
    tool.classList.remove('press')
    void tool.offsetWidth
    tool.classList.add('press')
    const foot = tool.querySelector('.rubber')?.getBoundingClientRect()
    stampAt(foot ? foot.left + foot.width / 2 : x, foot ? foot.top + foot.height / 2 : y, tool)
  }
  const stamper = desk.querySelector<HTMLElement>('[data-stamp]')
  const sheet = desk.querySelector<HTMLElement>('.sheet')
  stamper?.addEventListener('click', () => {
    stamper.classList.remove('press')
    void stamper.offsetWidth
    stamper.classList.add('press', 'used')
    // Pressed rather than dropped: on the desk it marks the sheet, in the stack it marks whatever is beside it.
    const box = (wide.matches && sheet ? sheet : stamper).getBoundingClientRect()
    if (wide.matches && sheet) stampAt(box.left + box.width * (0.72 + Math.random() * 0.14), box.top + box.height * (0.33 + Math.random() * 0.07), stamper)
    else stampAt(box.left + box.width / 2 + Math.random() * 120 - 60, box.top - 40 - Math.random() * 40, stamper)
  })

  tidy?.addEventListener('click', () => {
    mat.classList.add('tidying')
    for (const el of items) place(el, 0, 0)
    desk.querySelectorAll('.ink-mark').forEach((m) => {
      m.classList.add('fade')
      setTimeout(() => m.remove(), still.matches ? 0 : 300)
    })
    try { sessionStorage.removeItem(key) } catch {}
    tidy.hidden = true
    if (said) said.textContent = 'Desk tidied.'
    setTimeout(() => {
      mat.classList.remove('tidying')
      for (const el of items) el.style.zIndex = ''
    }, 650)
  })

  // Rulers: two pins and a readout follow a mouse across the mat.
  const pinX = mat.querySelector<HTMLElement>('.mat-pin.x')
  const pinY = mat.querySelector<HTMLElement>('.mat-pin.y')
  let frame = 0
  desk.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !wide.matches || frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      const box = mat.getBoundingClientRect()
      const x = Math.round(e.clientX - box.left - 15), y = Math.round(e.clientY - box.top - 15)
      const inside = x >= 0 && y >= 0 && x <= box.width - 30 && y <= box.height - 30
      mat.classList.toggle('measuring', inside)
      if (!inside) return
      mat.style.setProperty('--px', `${x + 15}px`)
      mat.style.setProperty('--py', `${y + 15}px`)
      if (pinX) pinX.dataset.v = String(x)
      if (pinY) pinY.dataset.v = String(y)
    })
  })
  desk.addEventListener('pointerleave', () => mat.classList.remove('measuring'))
}
