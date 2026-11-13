import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { scrollToY } from './scroll'

/**
 * "Mazo" para pantallas táctiles: mientras una sección está activa, la página NO hace scroll.
 * Cada gesto del dedo (arriba/abajo o izquierda/derecha) reproduce una animación completa hasta
 * el paso siguiente o el anterior. Así no hay inercia nativa que pelee con la animación ni
 * saltos de varias páginas de golpe. En el último paso, seguir hacia delante suelta la página.
 */

export type Deck = {
  /** activa la sección en el paso `i` (desplazando la página hasta ella si hace falta) */
  enter: (i: number, scroll?: boolean) => void
  release: () => void
  /** salta a un paso concreto (puntos de navegación) */
  go: (i: number) => void
  fire: (dir: 1 | -1) => void
  isLocked: () => boolean
  kill: () => void
}

const decks = new Map<string, Deck>()
let active: Deck | null = null
/** durante desplazamientos programados, las secciones no se enganchan solas */
let quietUntil = 0
const quiet = (s: number) => (quietUntil = Math.max(quietUntil, performance.now() + s * 1000))

export const getDeck = (id: string) => decks.get(id)
/** suelta cualquier sección activa (p. ej. antes de navegar con el menú) */
export const releaseDecks = (s = 2) => {
  quiet(s)
  active?.release()
}
/** tras una navegación, activa la sección en cuyo inicio ha quedado la página */
export const settleDecks = () => {
  quietUntil = 0
  for (const [id, d] of decks) {
    const el = document.getElementById(id)
    if (el && Math.abs(el.getBoundingClientRect().top) < 24) return d.enter(0, true)
  }
}

export function mobileDeck(opts: {
  id: string
  el: HTMLElement
  count: () => number
  /** anima hasta el paso `i`; devuelve cuánto tarda (s) */
  show: (i: number, instant?: boolean) => number
  /** al pasar del último paso */
  onNext: () => void
  /** al retroceder desde el primero */
  onPrev: () => void
  onStep?: (i: number) => void
  /** engancharse sola al llegar con el dedo (desde arriba: paso 0; desde abajo: último) */
  autoEnter?: boolean
}): Deck {
  const { el } = opts
  let i = 0
  let locked = false
  let busyUntil = 0
  const html = document.documentElement
  const top = () => el.getBoundingClientRect().top + window.scrollY

  const set = (n: number, instant = false) => {
    i = n
    opts.onStep?.(i)
    const d = opts.show(i, instant)
    busyUntil = performance.now() + d * 1000 * 0.82
  }

  const lockNow = () => {
    locked = true
    active = deck
    window.scrollTo(0, top())
    html.classList.add('deck-lock')
  }

  const deck: Deck = {
    enter(n, scroll = false) {
      n = Math.max(0, Math.min(opts.count() - 1, n))
      if (active && active !== deck) active.release()
      const y = top()
      if (scroll && Math.abs(window.scrollY - y) > 2) {
        busyUntil = performance.now() + 1100
        scrollToY(y, 0.9)
        setTimeout(() => {
          lockNow()
          set(n)
        }, 950)
        return
      }
      lockNow()
      set(n)
    },
    release() {
      locked = false
      if (active === deck) active = null
      html.classList.remove('deck-lock')
    },
    fire(dir) {
      if (performance.now() < busyUntil) return
      if (!locked) {
        if (Math.abs(el.getBoundingClientRect().top) > 24) return
        lockNow()
      }
      const n = i + dir
      if (n >= opts.count()) {
        busyUntil = performance.now() + 900
        quiet(1.3)
        deck.release()
        opts.onNext()
      } else if (n < 0) {
        busyUntil = performance.now() + 900
        quiet(1.3)
        deck.release()
        opts.onPrev()
      } else set(n)
    },
    go(n) {
      if (!locked) return deck.enter(n, true)
      set(Math.max(0, Math.min(opts.count() - 1, n)))
    },
    isLocked: () => locked,
    kill() {
      deck.release()
      decks.delete(opts.id)
      trig?.kill()
      window.removeEventListener('touchstart', start)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
      window.removeEventListener('touchcancel', end)
    },
  }

  // ---- gestos: un gesto = un paso; la dirección se decide en cuanto está clara ----
  let sx = 0
  let sy = 0
  let on = false
  let fired = false
  const start = (e: TouchEvent) => {
    on = locked && e.touches.length === 1 && !(e.target as HTMLElement).closest?.('.lb')
    fired = false
    if (!on) return
    sx = e.touches[0].clientX
    sy = e.touches[0].clientY
  }
  const move = (e: TouchEvent) => {
    if (!locked) return
    if (e.cancelable) e.preventDefault()
    if (!on || fired || e.touches.length !== 1) return
    const dx = e.touches[0].clientX - sx
    const dy = e.touches[0].clientY - sy
    const ax = Math.abs(dx)
    const ay = Math.abs(dy)
    if (Math.max(ax, ay) < 28) return
    fired = true
    deck.fire(ax > ay ? (dx < 0 ? 1 : -1) : dy < 0 ? 1 : -1)
  }
  const end = () => (on = false)
  window.addEventListener('touchstart', start, { passive: true })
  window.addEventListener('touchmove', move, { passive: false })
  window.addEventListener('touchend', end, { passive: true })
  window.addEventListener('touchcancel', end, { passive: true })

  const trig = opts.autoEnter
    ? ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        onEnter: () => performance.now() > quietUntil && !locked && deck.enter(0),
        onLeaveBack: () => performance.now() > quietUntil && !locked && deck.enter(opts.count() - 1),
      })
    : null

  decks.set(opts.id, deck)
  return deck
}

export const isTouch = () => window.matchMedia('(pointer: coarse)').matches
