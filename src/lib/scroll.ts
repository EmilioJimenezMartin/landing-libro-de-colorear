import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Utilidades de scroll compartidas: desplazamiento suave (lo atiende Lenis en App) y gesto de deslizar.

export const SCROLL_EVENT = 'noctinta:scrollto'

/** Pide un desplazamiento suave hasta `y` (px). App lo resuelve con Lenis o con scrollTo nativo. */
export function scrollToY(y: number, duration = 1.1) {
  window.dispatchEvent(new CustomEvent(SCROLL_EVENT, { detail: { y, duration } }))
}

/**
 * Detecta un deslizamiento horizontal sobre `el`: con eventos táctiles reales en el móvil
 * (los de puntero no son fiables en Safari/iOS) y con el ratón arrastrado en el ordenador.
 * Devuelve la función para quitar los listeners.
 */
export function onSwipe(el: HTMLElement, cb: (dir: 1 | -1) => void, min = 45) {
  let sx = 0
  let sy = 0
  let active = false
  const skip = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.('a, button, input, label')
  const finish = (x: number, y: number) => {
    if (!active) return
    active = false
    const dx = x - sx
    const dy = y - sy
    if (Math.abs(dx) > min && Math.abs(dx) > Math.abs(dy) * 1.2) cb(dx < 0 ? 1 : -1)
  }
  const tStart = (e: TouchEvent) => {
    if (e.touches.length !== 1 || skip(e.target)) return (active = false)
    active = true
    sx = e.touches[0].clientX
    sy = e.touches[0].clientY
  }
  const tEnd = (e: TouchEvent) => finish(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
  const mDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || skip(e.target)) return
    active = true
    sx = e.clientX
    sy = e.clientY
  }
  const mUp = (e: PointerEvent) => e.pointerType === 'mouse' && finish(e.clientX, e.clientY)
  el.addEventListener('touchstart', tStart, { passive: true })
  el.addEventListener('touchend', tEnd, { passive: true })
  el.addEventListener('pointerdown', mDown)
  window.addEventListener('pointerup', mUp)
  return () => {
    el.removeEventListener('touchstart', tStart)
    el.removeEventListener('touchend', tEnd)
    el.removeEventListener('pointerdown', mDown)
    window.removeEventListener('pointerup', mUp)
  }
}

// ---- paradas: el scroll siempre se asienta en un estado completo (una página, un libro) ----

let busyUntil = 0
const markBusy = (duration: number) => (busyUntil = performance.now() + duration * 1000 + 300)

/**
 * Controla las paradas de una sección fijada. `stops` devuelve progresos (0..1) ordenados.
 * - Al dejar de hacer scroll, se asienta en la parada siguiente en la dirección del gesto.
 * - `step(1|-1)` avanza o retrocede una parada (para deslizar o flechas).
 */
export function stopsController(st: ScrollTrigger, stops: () => number[], duration = 0.9) {
  const go = (p: number) => {
    markBusy(duration)
    scrollToY(st.start + p * (st.end - st.start), duration)
  }
  const step = (dir: 1 | -1) => {
    const pts = stops()
    const p = st.progress
    const next = dir === 1 ? pts.find((v) => v > p + 0.005) : [...pts].reverse().find((v) => v < p - 0.005)
    if (next !== undefined) go(next)
  }
  const settle = () => {
    if (performance.now() < busyUntil || !st.isActive) return
    const pts = stops()
    const p = st.progress
    if (pts.some((v) => Math.abs(v - p) < 0.004)) return
    const next = st.direction === 1 ? pts.find((v) => v > p) : [...pts].reverse().find((v) => v < p)
    if (next !== undefined) go(next)
  }
  ScrollTrigger.addEventListener('scrollEnd', settle)
  return { step, kill: () => ScrollTrigger.removeEventListener('scrollEnd', settle) }
}

/**
 * Paginado táctil para una sección fijada: mientras la sección ocupa la pantalla, cada gesto
 * del dedo (vertical u horizontal) avanza o retrocede exactamente una parada, sin inercia que
 * se salte páginas. En la última parada, seguir hacia delante suelta la sección.
 */
export function touchPager(
  st: ScrollTrigger,
  step: (dir: 1 | -1) => void,
  isLast: () => boolean,
  isFirst: () => boolean,
  /** a dónde ir al salir hacia delante / hacia atrás (por defecto, justo fuera de la sección) */
  exits: { next?: () => number; prev?: () => number } = {},
) {
  let sx = 0
  let sy = 0
  let on = false
  const inside = () => window.scrollY >= st.start - 4 && window.scrollY <= st.end + 4
  const start = (e: TouchEvent) => {
    on = e.touches.length === 1 && inside() && !(e.target as HTMLElement).closest?.('.lb')
    if (!on) return
    sx = e.touches[0].clientX
    sy = e.touches[0].clientY
  }
  const move = (e: TouchEvent) => {
    if (on && e.cancelable) e.preventDefault()
  }
  const end = (e: TouchEvent) => {
    if (!on) return
    on = false
    const dx = e.changedTouches[0].clientX - sx
    const dy = e.changedTouches[0].clientY - sy
    const big = Math.max(Math.abs(dx), Math.abs(dy))
    if (big < 28) return
    const dir: 1 | -1 = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : -1) : dy < 0 ? 1 : -1
    if (dir === 1 && isLast()) {
      markBusy(1)
      scrollToY(exits.next ? exits.next() : st.end + 8, 1)
      return
    }
    if (dir === -1 && isFirst()) {
      if (st.start > 4) {
        markBusy(1)
        scrollToY(exits.prev ? exits.prev() : st.start - 8, 1)
      }
      return
    }
    step(dir)
  }
  window.addEventListener('touchstart', start, { passive: true })
  window.addEventListener('touchmove', move, { passive: false })
  window.addEventListener('touchend', end, { passive: true })
  return () => {
    window.removeEventListener('touchstart', start)
    window.removeEventListener('touchmove', move)
    window.removeEventListener('touchend', end)
  }
}
