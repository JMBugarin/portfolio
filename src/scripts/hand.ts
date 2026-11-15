// The hand on the home page. At rest it is a squared packet with one card showing.
// A pointer or the keyboard spreads it slowly into a fan; when both have gone it gathers again.
// A press on the packet pins it open, so it can be spread without a pointer to hold it there.
type State = 'rest' | 'opening' | 'open' | 'closing'

const hand = document.querySelector<HTMLElement>('[data-hand]')
if (hand) {
  const fan = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 60rem) and (min-height: 36rem)')
  const still = matchMedia('(prefers-reduced-motion: reduce)')
  const count = hand.querySelectorAll('.card').length
  const SPREAD = 1250 + (count - 1) * 85
  const GATHER = 720 + (count - 1) * 55
  let state: State = 'rest'
  let pinned = false
  let inside = false
  let step = 0
  let grace = 0

  const set = (next: State) => {
    state = next
    hand.dataset.state = next
  }
  const open = () => {
    clearTimeout(grace)
    if (state === 'open' || state === 'opening') return
    clearTimeout(step)
    if (still.matches) return set('open')
    set('opening')
    step = window.setTimeout(() => set('open'), SPREAD)
  }
  const close = () => {
    if (state === 'rest' || state === 'closing') return
    clearTimeout(step)
    if (still.matches) return set('rest')
    set('closing')
    step = window.setTimeout(() => set('rest'), GATHER)
  }
  const settle = () => {
    clearTimeout(grace)
    grace = window.setTimeout(() => {
      if (!pinned && !inside && !hand.contains(document.activeElement)) close()
    }, 160)
  }

  hand.addEventListener('pointerover', () => {
    if (!fan.matches) return
    inside = true
    open()
  })
  hand.addEventListener('pointerout', (e) => {
    if (hand.contains(e.relatedTarget as Node | null)) return
    inside = false
    settle()
  })
  hand.addEventListener('focusin', () => {
    if (fan.matches) open()
  })
  hand.addEventListener('focusout', (e) => {
    if (!hand.contains(e.relatedTarget as Node | null)) settle()
  })
  // A card is only followed once the hand is spread. Before that a press spreads it and keeps it spread.
  hand.addEventListener('click', (e) => {
    if (!fan.matches || state === 'open') return
    e.preventDefault()
    pinned = true
    open()
  })
  document.addEventListener('pointerdown', (e) => {
    if (hand.contains(e.target as Node)) return
    pinned = false
    settle()
  })
  hand.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || state === 'rest') return
    pinned = false
    ;(document.activeElement as HTMLElement | null)?.blur()
    close()
  })
  fan.addEventListener('change', () => {
    clearTimeout(step)
    pinned = false
    set('rest')
  })
}
