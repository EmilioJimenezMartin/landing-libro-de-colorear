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
  // Solo en pantallas táctiles: con la rueda suavizada de Lenis en el ordenador, asentar al
  // parar peleaba con el scroll y provocaba parpadeos.
  const touch = window.matchMedia('(pointer: coarse)').matches
  if (touch) ScrollTrigger.addEventListener('scrollEnd', settle)
  return { step, kill: () => touch && ScrollTrigger.removeEventListener('scrollEnd', settle) }
}

/**
 * Paginado para una sección fijada (dedo y arrastre con ratón; la rueda va libre): mientras la sección ocupa la pantalla, cada gesto
 * del dedo (vertical u horizontal) avanza o retrocede exactamente una parada, sin inercia que
 * se salte páginas. En la última parada, seguir hacia delante suelta la sección.
 */
export function touchPager(
  st: ScrollTrigger,
  step: (dir: 1 | -1) => void,
  isLast: () => boolean,
  isFirst: () => boolean,
  /** a dónde ir al salir hacia delante / hacia atrás (por defecto, justo fuera de la sección) */
  exits: {
    next?: () => number
    prev?: () => number
    /** capa con scroll horizontal nativo que recoge el deslizamiento lateral en móviles/apps */
    catcher?: HTMLElement | null
    /** botones de respaldo para pasar página */
    prevBtn?: HTMLElement | null
    nextBtn?: HTMLElement | null
  } = {},
) {
  let sx = 0
  let sy = 0
  let on = false
  let fired = false
  const inside = () => window.scrollY >= st.start - 4 && window.scrollY <= st.end + 4
  const fire = (dx: number, dy: number) => {
    fired = true
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
  // El paso se dispara en cuanto el gesto tiene dirección clara, sin esperar a soltar el dedo:
  // así funciona aunque la app que muestra la web (p. ej. el visor de artefactos) cancele el toque.
  const decide = (x: number, y: number, final: boolean) => {
    if (!on || fired) return
    const dx = x - sx
    const dy = y - sy
    const h = Math.abs(dx) > Math.abs(dy)
    if ((h && Math.abs(dx) > 26) || (!h && Math.abs(dy) > 34) || (final && Math.max(Math.abs(dx), Math.abs(dy)) > 14)) fire(dx, dy)
  }
  let lx = 0
  let ly = 0
  const start = (e: TouchEvent) => {
    on = e.touches.length === 1 && inside() && !(e.target as HTMLElement).closest?.('.lb, button, a')
    fired = false
    nativeH = false
    if (!on) return
    sx = lx = e.touches[0].clientX
    sy = ly = e.touches[0].clientY
  }
  let nativeH = false
  const move = (e: TouchEvent) => {
    if (!on) return
    lx = e.touches[0].clientX
    ly = e.touches[0].clientY
    const dx = lx - sx
    const dy = ly - sy
    // Deslizamiento lateral sobre la capa nativa: lo gestiona su propio scroll (más fiable dentro
    // de apps como el visor de artefactos, que se quedan los gestos laterales de la página).
    if (!nativeH && catcher && catcher.contains(e.target as Node) && Math.abs(dx) >= Math.abs(dy)) nativeH = true
    if (nativeH) return
    if (e.cancelable) e.preventDefault()
    decide(lx, ly, false)
  }
  const end = (e: TouchEvent) => {
    if (!on) return
    if (nativeH) return void (on = false)
    const t = e.changedTouches[0]
    decide(t ? t.clientX : lx, t ? t.clientY : ly, true)
    on = false
  }
  const cancel = () => {
    if (!on) return
    if (nativeH) return void (on = false)
    decide(lx, ly, true)
    on = false
  }
  // ---- arrastre con ratón: la página pasa a mitad del arrastre, sin esperar a soltar ----
  let mx = 0
  let my = 0
  let dragging = false
  const mDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !inside()) return
    if ((e.target as HTMLElement).closest?.('a, button, input, label, .lb')) return
    dragging = true
    fired = false
    mx = e.clientX
    my = e.clientY
  }
  const mMove = (e: PointerEvent) => {
    if (!dragging || fired) return
    const dx = e.clientX - mx
    const dy = e.clientY - my
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) fire(dx, 0)
  }
  const mUp = () => (dragging = false)

  // ---- capa nativa de deslizamiento lateral ----
  const catcher = exits.catcher ?? null
  let cLock = 0
  const mid = () => (catcher ? (catcher.scrollWidth - catcher.clientWidth) / 2 : 0)
  const recenter = () => {
    if (!catcher) return
    catcher.style.overflowX = 'hidden' // corta la inercia
    catcher.scrollLeft = mid()
    setTimeout(() => (catcher.style.overflowX = 'auto'), 60)
  }
  const onCatch = () => {
    if (!catcher || performance.now() < cLock) return
    const d = catcher.scrollLeft - mid()
    if (Math.abs(d) < 30) return
    cLock = performance.now() + 750
    fire(-d, 0)
    setTimeout(recenter, 380)
  }
  if (catcher) {
    recenter()
    catcher.addEventListener('scroll', onCatch, { passive: true })
    window.addEventListener('resize', recenter)
  }
  const prev = () => fire(1, 0)
  const next = () => fire(-1, 0)
  exits.prevBtn?.addEventListener('click', prev)
  exits.nextBtn?.addEventListener('click', next)

  window.addEventListener('touchstart', start, { passive: true })
  window.addEventListener('touchmove', move, { passive: false })
  window.addEventListener('touchend', end, { passive: true })
  window.addEventListener('touchcancel', cancel, { passive: true })
  window.addEventListener('pointerdown', mDown)
  window.addEventListener('pointermove', mMove)
  window.addEventListener('pointerup', mUp)
  return () => {
    catcher?.removeEventListener('scroll', onCatch)
    window.removeEventListener('resize', recenter)
    exits.prevBtn?.removeEventListener('click', prev)
    exits.nextBtn?.removeEventListener('click', next)
    window.removeEventListener('touchstart', start)
    window.removeEventListener('touchmove', move)
    window.removeEventListener('touchend', end)
    window.removeEventListener('touchcancel', cancel)
    window.removeEventListener('pointerdown', mDown)
    window.removeEventListener('pointermove', mMove)
    window.removeEventListener('pointerup', mUp)
  }
}
