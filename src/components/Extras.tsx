import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { collections, img, ritualPages } from '../data'
import type { ViewerItem } from './Lightbox'
import { loadImage } from '../lib/fill'

/** Pantalla de carga: el libro se dibuja con un trazo y el contador sube con las láminas. */
export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const srcs = ritualPages.map((r) => img(r.p.path, 900, 'png'))
    let loaded = 0
    const counter = { v: 0 }
    const minTime = new Promise((r) => setTimeout(r, 1500))
    const tick = gsap.to(counter, { v: 85, duration: 2.4, ease: 'power1.out', onUpdate: () => setPct(Math.round(Math.max(counter.v, (loaded / srcs.length) * 100))) })
    const all = Promise.all([
      ...srcs.map((s) => loadImage(s).catch(() => null).then(() => { loaded++ })),
      document.fonts?.ready,
    ])
    const fail = new Promise((r) => setTimeout(r, 6000))
    Promise.race([Promise.all([all, minTime]), fail]).then(() => {
      tick.kill()
      gsap.to(counter, {
        v: 100,
        duration: 0.4,
        onUpdate: () => setPct(Math.round(counter.v)),
        onComplete: () => {
          gsap.to(root.current, {
            clipPath: 'inset(0 0 100% 0)',
            duration: 1,
            ease: 'expo.inOut',
            delay: 0.15,
            onComplete: onDone,
          })
        },
      })
    })
    return () => { tick.kill() }
  }, [onDone])

  return (
    <div className="preloader" ref={root} role="status" aria-label={`Cargando ${pct}%`}>
      <svg className="pre-book" viewBox="0 0 120 90" aria-hidden>
        <path d="M60 18 C44 8 22 8 8 14 V80 C22 74 44 74 60 84 C76 74 98 74 112 80 V14 C98 8 76 8 60 18 Z" />
        <path d="M60 18 V84" />
        <path d="M20 30 C30 27 42 27 50 31 M20 42 C30 39 42 39 50 43 M70 31 C78 27 90 27 100 30 M70 43 C78 39 90 39 100 42" />
      </svg>
      <span className="pre-brand">NOCTINTA</span>
      <span className="pre-pct">{String(pct).padStart(3, '0')}</span>
    </div>
  )
}

/** HUD fijo de esquinas: marca, navegación, hora local y progreso. */
export function Hud({ go }: { go: (id: string) => void }) {
  const [time, setTime] = useState('')
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const f = () => setTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    f()
    const id = setInterval(f, 1000)
    const st = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => gsap.set(bar.current, { scaleX: s.progress }) })
    return () => { clearInterval(id); st.kill() }
  }, [])
  const links: [string, string][] = [['#libro', 'Libro'], ['#colecciones', 'Colecciones'], ['#estudio', 'Estudio'], ['#gratis', 'Gratis']]
  return (
    <>
      <header className="hud-top">
        <button className="hud-mark" onClick={() => go('#libro')} aria-label="Inicio">
          N<span>·</span>
        </button>
        <nav className="hud-nav" aria-label="Secciones">
          {links.map(([h, t], i) => (
            <button key={h} onClick={() => go(h)}>
              <small>0{i + 1}</small> {t}
            </button>
          ))}
        </nav>
        <button className="btn btn-small" onClick={() => go('#colecciones')}>Libros</button>
      </header>
      <div className="hud-bottom" aria-hidden>
        <span>MAD · {time}</span>
        <div className="hud-progress"><div ref={bar} /></div>
      </div>
    </>
  )
}

export function FreePages({ onOpen }: { onOpen: (items: ViewerItem[], i: number) => void }) {
  const root = useRef<HTMLElement>(null)
  const picks = collections.filter((c) => c.featured).flatMap((c) => c.pages.slice(4, 6).map((p) => ({ c, p })))
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.free-card', { y: 80, opacity: 0, rotate: () => gsap.utils.random(-6, 6), stagger: 0.08, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: root.current, start: 'top 70%' } })
    })
    return () => mm.revert()
  }, [])
  return (
    <section className="free" id="gratis" ref={root} aria-label="Láminas gratis">
      <div className="free-head">
        <p className="eyebrow">Imprime gratis</p>
        <h2 className="display">
          Ocho láminas.
          <br />
          <em>Para esta noche.</em>
        </h2>
        <p className="muted">Descárgalas en alta resolución e imprímelas en casa. Si te enganchan, el libro entero te espera en Amazon.</p>
      </div>
      <div className="free-grid">
        {picks.map(({ c, p }, i) => (
          <button key={p.path} className="free-card" onClick={() => onOpen(picks, i)} style={{ '--tilt': `${(i % 2 ? 1 : -1) * (1 + (i % 3))}deg` } as React.CSSProperties}>
            <img src={img(p.path, 500)} alt={`Lámina gratis para colorear: ${p.title}`} loading="lazy" />
            <span>
              <b>{p.title}</b>
              <small>{c.kicker} · Ver lámina</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

export function Footer({ go }: { go: (id: string) => void }) {
  return (
    <footer className="foot">
      <div className="foot-cta">
        <p className="eyebrow">Fin del primer capítulo</p>
        <button className="btn btn-gold" onClick={() => go('#colecciones')}>Elegir mi libro</button>
      </div>
      <div className="foot-giant" aria-hidden>NOCTINTA</div>
      <div className="foot-row">
        <span>© {new Date().getFullYear()} Noctinta · Libros para colorear para adultos</span>
        <span>Láminas creadas con ayuda de IA y revisadas a mano</span>
        <a href="https://www.amazon.es/s?k=noctinta+libro+colorear" target="_blank" rel="noopener">Amazon ↗</a>
      </div>
    </footer>
  )
}
