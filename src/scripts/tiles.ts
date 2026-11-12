// A rack of letter tiles: drag to reorder, shuffle, or let the "solver" put the word back.
const still = matchMedia('(prefers-reduced-motion: reduce)')

export function initRack(rack: HTMLElement) {
  const box = rack.querySelector<HTMLElement>('.tiles')
  const status = rack.querySelector<HTMLElement>('[data-rack-status]')
  const btn = rack.querySelector<HTMLButtonElement>('[data-rack-btn]')
  const target = rack.dataset.word ?? ''
  const solvedText = rack.dataset.solved ?? target
  if (!box) return
  const tiles = () => [...box.children] as HTMLElement[]
  const word = () => tiles().map((t) => t.dataset.l).join('')

  const show = () => {
    const solved = word() === target
    rack.classList.toggle('solved', solved)
    if (status) status.textContent = solved ? solvedText : `${word()} · not a word yet`
    if (btn) btn.textContent = solved ? 'Shuffle the rack' : 'Find the best play'
  }

  // Reorder the DOM, then slide each tile from where it was.
  const slide = (reorder: () => void) => {
    const before = new Map(tiles().map((t) => [t, t.getBoundingClientRect().left]))
    reorder()
    if (still.matches) return
    tiles().forEach((t, i) => {
      const dx = (before.get(t) ?? 0) - t.getBoundingClientRect().left
      t.animate([{ translate: `${dx}px 0` }, { translate: `${dx / 2}px -7px`, offset: 0.55 }, { translate: '0 0' }], { duration: 320 + i * 30, easing: 'cubic-bezier(.3, .8, .3, 1)' })
    })
  }

  btn?.addEventListener('click', () => {
    const order = tiles()
    if (word() === target) {
      do {
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[order[i], order[j]] = [order[j], order[i]]
        }
      } while (order.map((t) => t.dataset.l).join('') === target)
    } else order.sort((a, b) => Number(a.dataset.i) - Number(b.dataset.i))
    slide(() => order.forEach((t) => box.append(t)))
    show()
  })

  box.addEventListener('pointerdown', (e) => {
    const tile = (e.target as HTMLElement).closest<HTMLElement>('.tile')
    if (!tile || e.button !== 0) return
    const order = tiles()
    const from = order.indexOf(tile)
    const pitch = order.length > 1 ? order[1].offsetLeft - order[0].offsetLeft : tile.offsetWidth
    const x0 = e.clientX
    let to = from, moved = false
    tile.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0
      if (!moved && Math.abs(dx) < 4) return
      moved = true
      tile.classList.add('held')
      const x = Math.max(-from * pitch, Math.min((order.length - 1 - from) * pitch, dx))
      tile.style.translate = `${x}px -6px`
      to = Math.round(from + x / pitch)
      order.forEach((t, i) => {
        if (t === tile) return
        const shift = i > from && i <= to ? -pitch : i < from && i >= to ? pitch : 0
        t.style.translate = shift ? `${shift}px 0` : ''
      })
    }
    const drop = () => {
      tile.removeEventListener('pointermove', move)
      tile.removeEventListener('pointerup', drop)
      tile.removeEventListener('pointercancel', drop)
      if (!moved) {
        if (!still.matches) tile.animate([{ translate: '0 0' }, { translate: '0 -9px' }, { translate: '0 0' }], { duration: 260, easing: 'ease-out' })
        return
      }
      order.forEach((t) => { t.style.transition = 'none'; t.style.translate = '' })
      tile.classList.remove('held')
      if (to !== from) box.insertBefore(tile, to > from ? order[to].nextSibling : order[to])
      void box.offsetWidth
      order.forEach((t) => { t.style.transition = '' })
      show()
    }
    tile.addEventListener('pointermove', move)
    tile.addEventListener('pointerup', drop)
    tile.addEventListener('pointercancel', drop)
  })
}

document.querySelectorAll<HTMLElement>('[data-rack]').forEach(initRack)
