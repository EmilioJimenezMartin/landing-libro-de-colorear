import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

/**
 * Pantallas táctiles: el libro y la estantería funcionan como un "mazo" de pasos.
 * - Mientras una sección está activa, la página no hace scroll: el dedo no mueve nada por sí mismo.
 * - Cada gesto avanza o retrocede un paso; si llega otro gesto en plena animación, la animación se
 *   reencadena hacia el nuevo destino (sin perder el gesto y sin saltos).
 * - Los cambios de sección los anima la propia web (scroll programado) con la página aún bloqueada.
 */

export type Deck = {
  /** activa la sección en el paso `i`, deslizando la página hasta ella */
  enter: (i: number, glide?: boolean) => void
  go: (i: number) => void
  /** `lateral`: los gestos laterales pasan pasos pero nunca cambian de sección */
  fire: (dir: 1 | -1, lateral?: boolean) => void
  isLocked: () => boolean
  kill: () => void
}

type Opts = {
  id: string
  el: HTMLElement
  count: () => number
  /** anima el paso `i` */
  show: (i: number) => void
  /** ¿sigue animándose el paso actual? */
  busy: () => boolean
  /** 'y': solo gestos verticales; 'both': también laterales */
  axis: 'y' | 'both'
  onNext?: () => void
  onPrev?: () => void
  /** engancharse sola al llegar con scroll libre (desde abajo: último paso) */
  autoEnter?: boolean
}

type D = Deck & { axis: Opts['axis']; el: HTMLElement }
const decks = new Map<string, D>()
let active: D | null = null
let moving = false
const lockPage = (on: boolean) => document.documentElement.classList.toggle('deck-lock', on)

export const isTouch = () => window.matchMedia('(pointer: coarse)').matches
export const getDeck = (id: string) => decks.get(id)

/** desplazamiento programado y suave de la página (sigue bloqueada al dedo mientras dura) */
export function glideTo(y: number, done?: () => void, duration = 1) {
  moving = true
  lockPage(true)
  // corta en seco la inercia nativa (iOS) antes de animar el desplazamiento
  const de = document.documentElement
  de.style.overflow = 'hidden'
  requestAnimationFrame(() => (de.style.overflow = ''))
  gsap.to(window, {
    scrollTo: { y, autoKill: false },
    duration,
    ease: 'power2.inOut',
    overwrite: true,
    onComplete: () => {
      moving = false
      ScrollTrigger.update()
      done?.()
    },
  })
}

/** navegar a una posición (menú, botones): suelta la sección activa y engancha la de destino */
export function navigate(y: number) {
  active = null
  glideTo(
    y,
    () => {
      for (const d of decks.values()) {
        if (Math.abs(d.el.getBoundingClientRect().top) < 4) return d.enter(0, false)
      }
      lockPage(false)
    },
    1.2,
  )
}

export function mobileDeck(o: Opts): Deck {
  let i = 0
  const top = () => o.el.getBoundingClientRect().top + window.scrollY
  const clamp = (n: number) => Math.max(0, Math.min(o.count() - 1, n))

  const deck: D = {
    axis: o.axis,
    el: o.el,
    enter(n, glide = true) {
      active = deck
      i = clamp(n)
      lockPage(true)
      o.show(i)
      const y = top()
      if (glide && Math.abs(window.scrollY - y) > 1) glideTo(y)
      else window.scrollTo(0, y)
    },
    go(n) {
      if (active !== deck) return deck.enter(n)
      i = clamp(n)
      o.show(i)
    },
    fire(dir, lateral = false) {
      if (moving || active !== deck) return
      const n = i + dir
      if ((n >= o.count() || n < 0) && lateral) return
      if (n >= o.count()) {
        if (!o.onNext || o.busy()) return
        active = null
        o.onNext()
      } else if (n < 0) {
        if (!o.onPrev || o.busy()) return
        active = null
        o.onPrev()
      } else {
        i = n
        o.show(i)
      }
    },
    isLocked: () => active === deck,
    kill() {
      if (active === deck) {
        active = null
        lockPage(false)
      }
      decks.delete(o.id)
      trig?.kill()
    },
  }

  const trig = o.autoEnter
    ? ScrollTrigger.create({
        trigger: o.el,
        start: 'top top',
        onLeaveBack: () => !moving && !active && deck.enter(o.count() - 1),
        onEnter: () => !moving && !active && deck.enter(0),
      })
    : null

  decks.set(o.id, deck)
  installGestures()
  return deck
}

// ---- gestos (una sola vez para toda la página) ----
let installed = false
function installGestures() {
  if (installed) return
  installed = true
  let sx = 0
  let sy = 0
  let on = false
  let fired = false
  window.addEventListener(
    'touchstart',
    (e) => {
      // seguro anti-atasco: si la sección activa no está en pantalla, se suelta la página
      if (active && !moving && Math.abs(active.el.getBoundingClientRect().top) > 40) {
        active = null
        lockPage(false)
      }
      on = e.touches.length === 1 && !(e.target as HTMLElement).closest?.('.lb')
      fired = false
      sx = e.touches[0].clientX
      sy = e.touches[0].clientY
    },
    { passive: true },
  )
  window.addEventListener(
    'touchmove',
    (e) => {
      if (!active && !moving) return
      if (e.cancelable) e.preventDefault()
      if (!on || fired || !active || e.touches.length !== 1) return
      const dx = e.touches[0].clientX - sx
      const dy = e.touches[0].clientY - sy
      const ax = Math.abs(dx)
      const ay = Math.abs(dy)
      if (Math.max(ax, ay) < 22) return
      fired = true
      if (ax > ay) {
        if (active.axis === 'both') active.fire(dx < 0 ? 1 : -1, true)
      } else active.fire(dy < 0 ? 1 : -1)
    },
    { passive: false },
  )
  const end = () => (on = false)
  window.addEventListener('touchend', end, { passive: true })
  window.addEventListener('touchcancel', end, { passive: true })
}
