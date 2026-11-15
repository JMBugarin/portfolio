import type { TarotProject } from '../lib/tarot'
import type { SceneHandle } from './tarot-webgl'
import { navigateThroughMist } from './transitions'

class TarotTable extends HTMLElement {
  private abort?: AbortController
  private scene?: SceneHandle
  private loadAbort?: AbortController
  private generation = 0
  private projects: TarotProject[] = []
  private mode = 'grid'
  private canUse3D = false

  connectedCallback() {
    if (this.abort) return
    this.abort = new AbortController()
    const { signal } = this.abort
    this.projects = JSON.parse(this.dataset.projects ?? '[]')
    const media = matchMedia('(min-width: 768px)')
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    const eligible = () => media.matches && (navigator.hardwareConcurrency || 8) > 4 && !motion.matches && !connection?.saveData
    const button = this.querySelector<HTMLButtonElement>('[data-view-toggle]')!
    const banner = this.querySelector<HTMLElement>('[data-fallback-banner]')!
    const updateEligibility = () => {
      this.canUse3D = eligible()
      button.hidden = !this.canUse3D
      banner.hidden = this.canUse3D || motion.matches || !!connection?.saveData || sessionStorage.getItem('tarot:banner') === 'dismissed'
      if (!this.canUse3D && this.mode !== 'grid') void this.setMode('grid')
    }
    button.addEventListener('click', () => {
      const next = this.mode === 'grid' ? 'scene' : 'grid'
      sessionStorage.setItem('tarot:view', next)
      void this.setMode(next)
    }, { signal })
    this.querySelector('[data-dismiss-banner]')!.addEventListener('click', () => {
      banner.hidden = true; sessionStorage.setItem('tarot:banner', 'dismissed')
    }, { signal })

    const dialog = this.querySelector<HTMLDialogElement>('[data-bio-dialog]')!
    this.querySelectorAll<HTMLButtonElement>('[data-bio-open]').forEach(b => {
      if (!b.hasAttribute('data-throne-badge')) b.hidden = false
      b.addEventListener('click', () => dialog.showModal(), { signal })
    })
    this.querySelector('[data-bio-close]')!.addEventListener('click', () => dialog.close(), { signal })
    dialog.addEventListener('click', e => { if (e.target === dialog) { const rect = dialog.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close() } }, { signal })
    this.querySelectorAll<HTMLButtonElement>('[data-seat]').forEach(b => {
      b.addEventListener('focus', () => this.scene?.hover(b.dataset.seat!), { signal })
      b.addEventListener('blur', () => this.scene?.hover(null), { signal })
      b.addEventListener('pointerenter', () => this.scene?.hover(b.dataset.seat!), { signal })
      b.addEventListener('pointerleave', () => this.scene?.hover(null), { signal })
      b.addEventListener('click', () => this.select(b.dataset.seat!), { signal })
    })
    media.addEventListener('change', updateEligibility, { signal })
    motion.addEventListener('change', updateEligibility, { signal })
    document.addEventListener('astro:before-swap', () => this.teardown(), { once: true, signal })
    updateEligibility()
    void this.setMode(this.canUse3D && sessionStorage.getItem('tarot:view') === 'scene' ? 'scene' : 'grid')
  }

  private status(message: string) { this.querySelector<HTMLElement>('[data-scene-status]')!.textContent = message }

  private async setMode(mode: string) {
    const generation = ++this.generation
    this.loadAbort?.abort()
    this.loadAbort = new AbortController()
    this.scene?.dispose(); this.scene = undefined
    this.mode = mode; this.dataset.view = mode
    const grid = this.querySelector<HTMLElement>('#tarot-grid')!
    const viewport = this.querySelector<HTMLElement>('#tarot-viewport')!
    const toggle = this.querySelector<HTMLButtonElement>('[data-view-toggle]')!
    grid.hidden = mode === 'scene'; viewport.hidden = mode !== 'scene'
    toggle.setAttribute('aria-pressed', String(mode === 'scene'))
    toggle.innerHTML = mode === 'scene' ? 'Back to project index <span aria-hidden="true">⊞</span>' : 'Enter the table <span aria-hidden="true">↗</span>'
    this.querySelector<HTMLElement>('[data-seat-preview]')!.hidden = true
    this.querySelectorAll<HTMLElement>('[data-seat], [data-throne-badge]').forEach(el => el.hidden = true)
    this.status(mode === 'scene' ? 'Drawing the table out of the fog…' : '')
    if (mode !== 'scene') return
    try {
      // No Three.js, GSAP, GLB, or Draco download for the mobile / 2D path.
      const { createTarotScene } = await import('./tarot-webgl')
      if (generation !== this.generation || !this.isConnected) return
      const scene = await createTarotScene(this.querySelector<HTMLElement>('[data-canvas]')!, this.projects, {
        model: this.dataset.model!, draco: this.dataset.draco!, signal: this.loadAbort.signal,
        hover: project => this.preview(project),
        select: name => this.select(name),
        bio: () => this.querySelector<HTMLDialogElement>('[data-bio-dialog]')!.showModal(),
        anchor: (name, x, y, visible) => {
          const el = name === 'Head_Throne' ? this.querySelector<HTMLElement>('[data-throne-badge]') : this.querySelector<HTMLElement>(`[data-seat="${name}"]`)
          if (el) { el.hidden = !visible; el.style.left = `${x}px`; el.style.top = `${y}px` }
        },
        failure: () => { if (generation === this.generation) this.fallback() },
      })
      if (generation !== this.generation || !this.isConnected) { scene.dispose(); return }
      this.scene = scene; this.status('')
    } catch (error) {
      if (generation !== this.generation) return
      console.warn('The table could not load; showing the project index.', error)
      this.fallback()
    }
  }

  private fallback() {
    void this.setMode('grid')
    this.status('The table is resting. All case studies are available below.')
  }

  private preview(project: TarotProject | null) {
    const el = this.querySelector<HTMLElement>('[data-seat-preview]')!
    el.hidden = !project
    if (!project) return
    el.querySelector('[data-preview-arcana]')!.textContent = `${project.romanNumeral} · ${project.arcana}`
    el.querySelector('[data-preview-title]')!.textContent = project.title
    el.querySelector('[data-preview-summary]')!.textContent = project.summary
    el.querySelector('[data-preview-stack]')!.replaceChildren(...project.stack.slice(0, 4).map(t => {
      const li = document.createElement('li'); li.textContent = t; return li
    }))
    el.querySelector('[data-preview-action]')!.textContent = project.reserved ? 'This seat is reserved for future work.' : 'Click the chair to read the case study ↗'
  }

  private select(name: string) {
    const project = this.projects.find(p => p.seatMeshName === name)
    if (!project?.href) { this.status('This seat is reserved for future work.'); return }
    void navigateThroughMist(project.href, this.scene ? () => this.scene!.travel(name) : undefined)
  }

  private teardown() {
    this.generation++
    this.loadAbort?.abort()
    this.scene?.dispose(); this.scene = undefined
    this.abort?.abort(); this.abort = undefined
    this.querySelector<HTMLDialogElement>('[data-bio-dialog]')?.close()
  }
  disconnectedCallback() { this.teardown() }
}

if (!customElements.get('tarot-table')) customElements.define('tarot-table', TarotTable)
