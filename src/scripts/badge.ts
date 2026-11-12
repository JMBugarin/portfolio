// The name badge hangs from a lanyard: it swings when brushed or dragged, and flips when pressed.
const rig = document.querySelector<HTMLElement>('[data-badge]')
const arm = rig?.querySelector<HTMLElement>('.swing')

if (rig && arm) {
  const badge = rig.querySelector<HTMLElement>('.badge')
  const flipper = document.querySelector<HTMLButtonElement>('[data-flip]')
  const still = matchMedia('(prefers-reduced-motion: reduce)')
  let angle = 0, speed = 0, last = 0, frame = 0, held = false, moved = false, x0 = 0

  const draw = () => arm.style.setProperty('--swing', `${angle.toFixed(2)}deg`)
  const tick = (now: number) => {
    const dt = Math.min(0.032, (now - last) / 1000 || 0.016)
    last = now
    if (!held) {
      speed += (-52 * angle - 1.5 * speed) * dt
      angle += speed * dt
      if (Math.abs(angle) < 0.04 && Math.abs(speed) < 0.4) {
        angle = 0
        frame = 0
        return draw()
      }
    }
    draw()
    frame = requestAnimationFrame(tick)
  }
  const wake = () => {
    if (frame || still.matches) return
    last = performance.now()
    frame = requestAnimationFrame(tick)
  }
  const nudge = (push: number) => {
    speed += push
    wake()
  }
  const flip = () => {
    const on = badge?.classList.toggle('flipped') ?? false
    flipper?.setAttribute('aria-pressed', String(on))
    nudge(on ? 60 : -60)
  }

  rig.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse' && !held) nudge(Math.max(-150, Math.min(150, e.movementX * 9)))
  })
  rig.addEventListener('pointerdown', (e) => {
    moved = false
    if (e.button !== 0 || still.matches) return
    held = true
    x0 = e.clientX
    rig.classList.add('held')
    rig.setPointerCapture(e.pointerId)
    wake()
  })
  rig.addEventListener('pointermove', (e) => {
    if (!held) return
    if (Math.abs(e.clientX - x0) > 4) moved = true
    if (!moved) return
    const box = rig.getBoundingClientRect()
    const to = -Math.atan2(e.clientX - (box.left + box.width / 2), Math.max(60, e.clientY - box.top)) * (180 / Math.PI)
    const next = Math.max(-55, Math.min(55, to))
    speed = (next - angle) * 30
    angle = next
  })
  const release = () => {
    if (!held) return
    held = false
    rig.classList.remove('held')
    wake()
  }
  rig.addEventListener('pointerup', release)
  rig.addEventListener('pointercancel', release)
  rig.addEventListener('click', () => { if (!moved) flip() })
  flipper?.addEventListener('click', flip)
  setTimeout(() => nudge(70), 500)
}
