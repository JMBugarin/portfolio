import { navigate } from 'astro:transitions/client'

let navigating = false
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export async function navigateThroughMist(href: string, departure?: () => Promise<void>) {
  if (navigating) return
  navigating = true
  document.documentElement.dataset.mist = 'departing'
  const cover = document.querySelector<HTMLElement>('[data-mist-cover]')
  cover?.setAttribute('aria-hidden', 'false')
  try {
    await Promise.all([reduced() ? Promise.resolve() : pause(850), departure?.()])
    await navigate(href)
  } catch {
    // A full navigation is also valid when the client router cannot fetch a page.
    location.assign(href)
  }
}

document.addEventListener('click', event => {
  if (!(event instanceof MouseEvent) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const a = (event.target as Element).closest<HTMLAnchorElement>('a[data-mist-link]')
  if (!a || a.target || a.hasAttribute('download')) return
  event.preventDefault()
  void navigateThroughMist(a.href)
})

document.addEventListener('astro:before-swap', event => {
  if (!navigating) return
  const next = (event as Event & { newDocument: Document }).newDocument
  next.documentElement.dataset.mist = 'arriving'
})

document.addEventListener('astro:page-load', () => {
  if (document.documentElement.dataset.mist === 'arriving') {
    // Two frames keep the opaque arrival cover painted before its reveal.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.documentElement.dataset.mist = 'revealing'
      setTimeout(() => { delete document.documentElement.dataset.mist }, reduced() ? 0 : 520)
    }))
  } else delete document.documentElement.dataset.mist
  navigating = false
})
