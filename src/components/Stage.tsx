import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { GrainGradient } from '@paper-design/shaders-react'
import { collections, ritualPages } from '../data'
import { ColoredPage } from './ColoredPage'
import { BookCover } from './BookCover'

gsap.registerPlugin(ScrollTrigger)

const WORDS = ['Cada línea', 'espera', 'su color', 'Ahora, tú.']
const totalPages = collections.reduce((n, c) => n + c.pages.length, 0)

function Ficha({ k }: { k: number }) {
  const { c, p } = ritualPages[k]
  return (
    <div className="ficha">
      <span className="ficha-num">{String(k + 1).padStart(2, '0')}</span>
      <div className="ficha-body">
        <span className="ficha-kicker">
          {c.kicker} · {c.title}
        </span>
        <strong>{p.title}</strong>
        <p>{k === ritualPages.length - 1 ? 'Y la siguiente página la pintas tú.' : 'Mira la página de al lado. Se está coloreando sola mientras bajas.'}</p>
      </div>
      <div className="ficha-swatches">
        {c.palette.slice(0, 6).map((col) => (
          <i key={col} style={{ background: col }} />
        ))}
      </div>
    </div>
  )
}

export function Stage({ onCta }: { onCta: (id: string) => void }) {
  const root = useRef<HTMLElement>(null)
  const tilt = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const mm = gsap.matchMedia()
    mm.add(
      { desk: '(min-width: 860px)', mob: '(max-width: 859px)', reduce: '(prefers-reduced-motion: reduce)' },
      (ctx) => {
        const { desk, reduce } = ctx.conditions as { desk: boolean; reduce: boolean }
        const q = gsap.utils.selector(el)
        const pos = q('.book-pos')[0]
        const leaves = q('.leaf')
        const papers = q('.leaf .face.front .paper')
        const words = q('.stage-word')
        const bw = () => (el.querySelector('.book') as HTMLElement).offsetWidth

        gsap.set(leaves, { rotationY: 0, transformOrigin: 'left center' })
        gsap.set(papers, { '--p': 0 })
        gsap.set(words, { opacity: 0, yPercent: 30 })

        if (reduce) {
          gsap.set(pos, { x: () => bw() / 2, y: 0, rotationX: 0, rotationY: 0, rotationZ: 0, scale: 1 })
          gsap.set(leaves[0], { rotationY: -180 })
          gsap.set(papers[0], { '--p': 1 })
          return
        }

        gsap.set(pos, {
          x: desk ? '22vw' : 0,
          y: desk ? '3vh' : '19svh',
          rotationX: 24,
          rotationY: -34,
          rotationZ: 7,
          scale: desk ? 1 : 0.82,
        })

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: () => `+=${window.innerHeight * 9}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        })

        tl.to(q('.hero-copy'), { opacity: 0, y: -140, duration: 1 }, 0)
          .to(q('.hero-meta'), { opacity: 0, duration: 0.5 }, 0)
          .to(pos, { x: 0, y: 0, rotationX: 10, rotationY: -14, rotationZ: 0, scale: 1, duration: 1.4, ease: 'power2.inOut' }, 0)
          .to(pos, { x: () => bw() / 2, rotationX: 0, rotationY: 0, duration: 1.2, ease: 'power2.inOut' }, 1.4)
          .to(leaves[0], { rotationY: -180, duration: 1.2, ease: 'power2.inOut' }, 1.4)
          .to(words[0], { opacity: 1, yPercent: 0, duration: 0.6 }, 1.5)

        let t = 2.6
        ritualPages.forEach((_, k) => {
          tl.to(papers[k], { '--p': 1, duration: 1.6 }, t)
          if (k < ritualPages.length - 1) {
            tl.to(leaves[k + 1], { rotationY: -180, duration: 1, ease: 'power2.inOut' }, t + 1.8)
            tl.to(words[k], { opacity: 0, yPercent: -30, duration: 0.4 }, t + 1.8)
            tl.to(words[k + 1], { opacity: 1, yPercent: 0, duration: 0.5 }, t + 2.2)
            t += 2.9
          } else {
            t += 1.8
          }
        })
        tl.to(pos, { scale: 1.05, duration: 1 }, t).to(q('.stage-end'), { opacity: 1, y: 0, duration: 0.6 }, t + 0.2)
      },
    )

    // Inclinación con el ratón (solo punteros finos)
    const fine = window.matchMedia('(pointer: fine)').matches
    const rx = gsap.quickTo(tilt.current!, 'rotationX', { duration: 0.8, ease: 'power3' })
    const ry = gsap.quickTo(tilt.current!, 'rotationY', { duration: 0.8, ease: 'power3' })
    const move = (e: PointerEvent) => {
      rx(((e.clientY / window.innerHeight) - 0.5) * -8)
      ry(((e.clientX / window.innerWidth) - 0.5) * 10)
    }
    if (fine) window.addEventListener('pointermove', move)
    return () => {
      window.removeEventListener('pointermove', move)
      mm.revert()
    }
  }, [])

  const leaves = [
    { front: <BookCover c={collections[0]} />, back: <div className="endpaper"><Ficha k={0} /></div> },
    ...ritualPages.map((rp, k) => ({
      front: <ColoredPage page={rp.p} collection={rp.c} seed={k + 2} className="ritual-paper" />,
      back: k < ritualPages.length - 1 ? <div className="leftpage"><Ficha k={k + 1} /></div> : <div className="leftpage" />,
    })),
  ]

  return (
    <section className="stage" id="libro" ref={root} aria-label="El libro">
      <div className="stage-bg" aria-hidden>
        <GrainGradient
          style={{ width: '100%', height: '100%' }}
          colorBack="#07060a"
          colors={['#2b1846', '#0d2b2a', '#3a1d10', '#151026']}
          softness={0.85}
          intensity={0.22}
          noise={0.28}
          shape="blob"
          speed={0.35}
        />
        <div className="stage-vignette" />
      </div>

      <div className="stage-words" aria-hidden>
        {WORDS.map((w) => (
          <span className="stage-word" key={w}>
            {w}
          </span>
        ))}
      </div>

      <div className="hero-copy">
        <p className="eyebrow">Libros para colorear · Edición nocturna</p>
        <h1 className="brand-title">
          <span>Noc</span>
          <em>tinta</em>
        </h1>
        <p className="hero-lead">Láminas que cobran vida en la oscuridad. Hojea el libro, mira cómo se pinta solo y colorea las páginas gratis desde aquí.</p>
        <div className="hero-ctas">
          <button className="btn btn-gold" onClick={() => onCta('#colecciones')}>
            Ver colecciones
          </button>
          <button className="btn btn-ghost" onClick={() => onCta('#estudio')}>
            Colorear ahora
          </button>
        </div>
      </div>

      <div className="hero-meta" aria-hidden>
        <span>{collections.length} colecciones</span>
        <span>{totalPages} láminas</span>
        <span className="scroll-cue">Baja para abrir el libro</span>
      </div>

      <div className="scene">
        <div className="book-pos">
          <div className="book-tilt" ref={tilt}>
            <div className="book-float">
              <div className="book">
                <div className="back-cover" />
                <div className="page-block" />
                {leaves.map((l, i) => (
                  <div className="leaf" key={i} style={{ zIndex: leaves.length - i }}>
                    <div className="leaf-inner" style={{ transform: `translateZ(${(leaves.length - i) * 0.8}px)` }}>
                      <div className="face front">{l.front}</div>
                      <div className="face back">{l.back}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="stage-end">
        <button className="btn btn-gold" onClick={() => onCta('#estudio')}>
          Pintar una página
        </button>
      </div>
    </section>
  )
}
