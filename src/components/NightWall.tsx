import { useLayoutEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { collections, img } from '../data'
import { ColoredPage } from './ColoredPage'

/**
 * Fondo de la cabecera: una pared de láminas en la oscuridad (trazo dorado tenue) y una
 * linterna que, allí donde apunta, deja ver la lámina pintada. En escritorio la linterna
 * sigue al ratón; en móvil se pasea sola.
 */
export function NightWall() {
  const root = useRef<HTMLDivElement>(null)

  const tiles = useMemo(() => {
    const out: { c: (typeof collections)[number]; p: (typeof collections)[number]['pages'][number] }[] = []
    for (let i = 0; out.length < 24; i++) {
      const c = collections[i % collections.length]
      const p = c.pages[1 + Math.floor(i / collections.length)]
      if (p) out.push({ c, p })
    }
    return out
  }, [])

  useLayoutEffect(() => {
    const el = root.current!
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fine = window.matchMedia('(pointer: fine)').matches
    const planes = el.querySelectorAll('.nw-plane')
    const lamp = { x: window.innerWidth * 0.66, y: window.innerHeight * 0.45 }
    const apply = () => {
      el.style.setProperty('--mx', `${lamp.x}px`)
      el.style.setProperty('--my', `${lamp.y}px`)
    }
    apply()
    if (reduce) return

    const drift = gsap.to(planes, { xPercent: 4, yPercent: -7, duration: 28, ease: 'sine.inOut', repeat: -1, yoyo: true })
    const toX = gsap.quickTo(lamp, 'x', { duration: 0.9, ease: 'power3', onUpdate: apply })
    const toY = gsap.quickTo(lamp, 'y', { duration: 0.9, ease: 'power3', onUpdate: apply })

    let wander: gsap.core.Tween | null = null
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      toX(e.clientX - r.left)
      toY(e.clientY - r.top)
    }
    if (fine) {
      window.addEventListener('pointermove', move)
    } else {
      const s = { t: 0 }
      wander = gsap.to(s, {
        t: Math.PI * 2,
        duration: 16,
        repeat: -1,
        ease: 'none',
        onUpdate: () => {
          lamp.x = window.innerWidth * (0.5 + 0.34 * Math.sin(s.t * 2))
          lamp.y = window.innerHeight * (0.62 + 0.2 * Math.sin(s.t * 3 + 1))
          apply()
        },
      })
    }
    return () => {
      drift.kill()
      wander?.kill()
      window.removeEventListener('pointermove', move)
    }
  }, [])

  return (
    <div className="night-wall" ref={root} aria-hidden>
      <div className="nw-layer nw-dim">
        <div className="nw-plane">
          {tiles.map(({ p }) => (
            <div className="nw-tile" key={p.path}>
              <img src={img(p.path, 400)} alt="" loading="eager" draggable={false} />
            </div>
          ))}
        </div>
      </div>
      <div className="nw-layer nw-lit">
        <div className="nw-plane">
          {tiles.map(({ c, p }, i) => (
            <div className="nw-tile" key={p.path}>
              <ColoredPage page={p} collection={c} seed={i + 5} size={320} />
            </div>
          ))}
        </div>
      </div>
      <div className="nw-veil" />
    </div>
  )
}
