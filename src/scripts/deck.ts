// The deck on the home page. Four states, always in this order:
// stacked -> shuffling -> dealing -> open, and back to stacked when it is collected.
// The cards and their links are in the page already; this only decides when they show.
type State = 'stacked' | 'shuffling' | 'dealing' | 'open'

const SHUFFLE = 150
const SETTLE = 400
const RETURN = 240
const GRACE = 450

const table = document.querySelector<HTMLElement>('[data-deck]')
const toggle = table?.querySelector<HTMLButtonElement>('.deck-toggle')
const zone = table?.querySelector<HTMLElement>('.deck-slot')
const label = table?.querySelector<HTMLElement>('[data-deck-label]')

if (table && toggle && zone && label) {
  const cards = [...table.querySelectorAll<HTMLAnchorElement>('.card a')]
  const still = matchMedia('(prefers-reduced-motion: reduce)')
  let state: State = 'stacked'
  let pinned = false
  let hovering = false
  let step = 0
  let grace = 0
  let returning = 0
  let then: (() => void) | undefined

  const set = (next: State) => {
    state = next
    table.dataset.state = next
    const open = next !== 'stacked'
    toggle.setAttribute('aria-expanded', String(open))
    label.textContent = open ? 'Collect the deck' : 'Deal the projects'
    if (next === 'dealing' || next === 'open') {
      then?.()
      then = undefined
    }
  }

  const open = (pin: boolean, after?: () => void) => {
    clearTimeout(grace)
    if (pin) pinned = true
    if (state === 'dealing' || state === 'open') return after?.()
    then = after
    if (state === 'shuffling') return
    clearTimeout(step)
    if (still.matches) return set('open')
    const deal = () => {
      set('dealing')
      step = window.setTimeout(() => set('open'), SETTLE)
    }
    // Cards still on their way back are dealt again from where they are, without a second shuffle.
    if (performance.now() < returning) return deal()
    set('shuffling')
    step = window.setTimeout(deal, SHUFFLE)
  }

  const collect = () => {
    clearTimeout(step)
    clearTimeout(grace)
    pinned = false
    then = undefined
    if (state === 'stacked') return
    // A card that has focus is never hidden: focus goes back to the deck first.
    if (cards.includes(document.activeElement as HTMLAnchorElement)) toggle.focus()
    if (state !== 'shuffling') returning = performance.now() + RETURN
    set('stacked')
  }

  // A spread that opened by itself closes by itself, once the pointer and focus have both gone.
  const leave = () => {
    clearTimeout(grace)
    if (pinned || state === 'stacked') return
    grace = window.setTimeout(() => {
      if (!pinned && !hovering && !table.contains(document.activeElement)) collect()
    }, GRACE)
  }

  const mouse = (e: PointerEvent) => e.pointerType !== 'touch'
  zone.addEventListener('pointerenter', (e) => {
    if (mouse(e)) open(false)
  })
  table.addEventListener('pointerenter', (e) => {
    if (!mouse(e)) return
    hovering = true
    clearTimeout(grace)
  })
  table.addEventListener('pointerleave', (e) => {
    if (!mouse(e)) return
    hovering = false
    leave()
  })
  table.addEventListener('focusin', () => clearTimeout(grace))
  table.addEventListener('focusout', (e) => {
    if (!table.contains(e.relatedTarget as Node | null)) leave()
  })

  // A press always toggles, except while the deck is still opening: then it keeps it open.
  toggle.addEventListener('click', () => {
    if (state === 'stacked') open(true)
    else if (state === 'open') collect()
    else pinned = true
  })
  table.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || state === 'stacked') return
    toggle.focus()
    collect()
  })

  const browse = () => {
    open(true, () => cards[0]?.focus({ preventScroll: true }))
    // On a narrow screen the cards are dealt below the deck, so the deck goes to the top.
    const wide = matchMedia('(min-width: 1240px)').matches
    table.scrollIntoView({ block: wide ? 'nearest' : 'start', behavior: still.matches ? 'auto' : 'smooth' })
  }
  document.querySelectorAll<HTMLAnchorElement>('[data-deck-open]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      browse()
    })
  })
  if (location.hash === `#${table.id}`) open(true)
}
