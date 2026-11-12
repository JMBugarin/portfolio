const root = document.documentElement
const still = matchMedia('(prefers-reduced-motion: reduce)')

const cord = document.querySelector<HTMLButtonElement>('#theme')
if (cord) {
  const sync = () => cord.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'))
  sync()
  const flip = () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
    const apply = () => {
      root.dataset.theme = next
      try { localStorage.setItem('theme', next) } catch {}
      sync()
    }
    if (still.matches || !document.startViewTransition) return apply()
    // The light spreads from the bead, or drains back into it.
    const bead = (cord.firstElementChild ?? cord).getBoundingClientRect()
    const x = bead.left + bead.width / 2, y = bead.top + bead.height / 2
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const dark = next === 'dark'
    root.classList.add('theme-swap')
    root.classList.toggle('to-dark', dark)
    const swap = document.startViewTransition(apply)
    swap.ready.then(() => {
      const circles = [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`]
      root.animate({ clipPath: dark ? circles.reverse() : circles }, { duration: 620, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'both', pseudoElement: dark ? '::view-transition-old(root)' : '::view-transition-new(root)' })
    }).catch(() => undefined)
    void swap.finished.finally(() => root.classList.remove('theme-swap', 'to-dark'))
  }
  let y0 = 0, far = 0, held = false
  cord.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    held = true
    y0 = e.clientY
    far = 0
    cord.classList.add('pulling')
    cord.setPointerCapture(e.pointerId)
  })
  cord.addEventListener('pointermove', (e) => {
    if (!held) return
    const pull = Math.max(0, Math.min(72, e.clientY - y0))
    far = Math.max(far, pull)
    cord.style.setProperty('--pull', `${pull}px`)
  })
  const release = () => {
    if (!held) return
    held = false
    cord.classList.remove('pulling')
    cord.style.setProperty('--pull', '0px')
    if (far > 34) flip()
  }
  cord.addEventListener('pointerup', release)
  cord.addEventListener('pointercancel', release)
  cord.addEventListener('click', (e) => {
    const pulled = far > 8
    far = 0
    if (e.detail === 0 || !pulled) flip()
  })
}

if (document.querySelector('.ruler')) {
  const read = () => {
    const max = root.scrollHeight - innerHeight
    root.style.setProperty('--read', max > 0 ? String(Math.min(1, scrollY / max)) : '0')
  }
  addEventListener('scroll', read, { passive: true })
  addEventListener('resize', read)
  read()
}

const arrivals = document.querySelectorAll('[data-reveal]')
if (arrivals.length) {
  const seen = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add('in')
      seen.unobserve(entry.target)
    }
  }, { rootMargin: '0px 0px -6% 0px' })
  arrivals.forEach((el) => seen.observe(el))
}

const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
document.querySelectorAll('[data-today]').forEach((el) => { el.textContent = today })

document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const out = document.getElementById(btn.dataset.out ?? '')
    try {
      await navigator.clipboard.writeText(btn.dataset.copy ?? '')
      if (out) out.textContent = 'Email copied.'
    } catch {
      if (out) out.textContent = 'Copy unavailable. Select the address above.'
    }
  })
})
