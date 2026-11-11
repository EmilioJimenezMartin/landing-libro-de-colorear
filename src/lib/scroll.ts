import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Utilidades de scroll compartidas: desplazamiento suave (lo atiende Lenis en App) y gesto de deslizar.

export const SCROLL_EVENT = 'noctinta:scrollto'

/** Pide un desplazamiento suave hasta `y` (px). App lo resuelve con Lenis o con scrollTo nativo. */
export function scrollToY(y: number, duration = 1.1) {
  window.dispatchEvent(new CustomEvent(SCROLL_EVENT, { detail: { y, duration } }))
}

/**
 * Detecta un deslizamiento horizontal (dedo o ratón arrastrado) sobre `el`.
 * Devuelve la función para quitar los listeners.
 */
export function onSwipe(el: HTMLElement, cb: (dir: 1 | -1) => void, min = 50) {
  let sx = 0
  let sy = 0
  let id: number | null = null
  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest('a, button, input, label')) return
    id = e.pointerId
    sx = e.clientX
    sy = e.clientY
  }
  const up = (e: PointerEvent) => {
    if (id !== e.pointerId) return
    id = null
    const dx = e.clientX - sx
    const dy = e.clientY - sy
    if (Math.abs(dx) > min && Math.abs(dx) > Math.abs(dy) * 1.3) cb(dx < 0 ? 1 : -1)
  }
  const cancel = () => (id = null)
  el.addEventListener('pointerdown', down)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', cancel)
  return () => {
    el.removeEventListener('pointerdown', down)
    el.removeEventListener('pointerup', up)
    el.removeEventListener('pointercancel', cancel)
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
