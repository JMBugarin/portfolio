// Reinitialize page behavior after Astro client navigation and release old listeners.
let cleanup: (() => void) | undefined
function initPage() {
  cleanup?.()
  const abort = new AbortController(), { signal } = abort
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('in'); observer.unobserve(entry.target)
    }
  }, { rootMargin: '0px 0px -7% 0px' })
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el => {
    if (reduced || el.getBoundingClientRect().top < innerHeight) el.classList.add('in')
    else observer.observe(el)
  })
  document.documentElement.classList.add('reveal')
  const chapters = [...document.querySelectorAll<HTMLAnchorElement>('.toc a')].flatMap(link => {
    const section = document.getElementById(link.hash.slice(1)); return section ? [{ link, section }] : []
  })
  let queued = 0
  function mark() {
    queued = 0
    let current = chapters[0]
    for (const chapter of chapters) if (chapter.section.getBoundingClientRect().top <= innerHeight * .34) current = chapter
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = chapters[chapters.length - 1]
    for (const chapter of chapters) {
      if (chapter === current) chapter.link.setAttribute('aria-current', 'true')
      else chapter.link.removeAttribute('aria-current')
    }
  }
  if (chapters.length) { addEventListener('scroll', () => { if (!queued) queued = requestAnimationFrame(mark) }, { signal, passive: true }); mark() }
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const out = document.getElementById(button.dataset.out ?? '')
    try { await navigator.clipboard.writeText(button.dataset.copy ?? ''); if (out) out.textContent = 'Email copied.' }
    catch { if (out) out.textContent = 'Copy unavailable. Select the address above.' }
  }, { signal }))
  cleanup = () => { abort.abort(); observer.disconnect(); cancelAnimationFrame(queued) }
}
document.addEventListener('astro:page-load', initPage)
document.addEventListener('astro:before-swap', () => cleanup?.())
initPage()
