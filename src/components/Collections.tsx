import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { collections } from '../data'
import { BookCover } from './BookCover'
import { ColoredPage } from './ColoredPage'

export function Collections({ onColor }: { onColor: (c: number, p: number) => void }) {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(min-width: 860px) and (prefers-reduced-motion: no-preference)', () => {
      const t = track.current!
      const dist = () => t.scrollWidth - window.innerWidth
      const tween = gsap.to(t, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
      })
      gsap.utils.toArray<HTMLElement>('.col-book', t).forEach((b) => {
        gsap.fromTo(
          b,
          { rotationY: -38, rotationX: 8 },
          { rotationY: 18, rotationX: -4, ease: 'none', scrollTrigger: { trigger: b, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } },
        )
      })
    })
    return () => mm.revert()
  }, [])

  return (
    <section className="collections" id="colecciones" ref={root} aria-label="Colecciones">
      <div className="col-track" ref={track}>
        <div className="col-intro">
          <p className="eyebrow">La estantería</p>
          <h2 className="display">
            Cuatro libros.
            <br />
            <em>Una noche entera</em> para cada uno.
          </h2>
          <p className="muted">Formato 21,6 × 27,9 cm, una lámina por hoja para que el rotulador no traspase. En tapa blanda, en Amazon.</p>
        </div>
        {collections.filter((c) => c.featured).map((c) => {
          const ci = collections.indexOf(c)
          return (
          <article className="col-panel" key={c.id}>
            <div className="col-book-wrap">
              <div className="col-book">
                <div className="col-book-front">
                  <BookCover c={c} />
                </div>
                <div className="col-book-spine" style={{ background: c.cover.to, color: c.cover.foil }}>
                  <span>{c.title}</span>
                </div>
              </div>
            </div>
            <div className="col-info">
              <span className="col-kicker">{c.kicker}</span>
              <h3>{c.title}</h3>
              <p>{c.blurb}</p>
              <ul className="col-facts">
                <li>
                  <b>{c.pages.length}</b> láminas de muestra
                </li>
                <li>
                  <b>1</b> por hoja
                </li>
                <li>
                  <b>A4+</b> imprimible
                </li>
              </ul>
              <div className="col-strip">
                {c.pages.slice(1, 4).map((p, pi) => (
                  <button key={p.path} className="col-thumb" onClick={() => onColor(ci, pi + 1)} aria-label={`Colorear ${p.title}`}>
                    <ColoredPage page={p} collection={c} seed={pi + 3} size={360} />
                  </button>
                ))}
              </div>
              <div className="col-ctas">
                <a className="btn btn-gold" href={c.amazonUrl} target="_blank" rel="noopener">
                  Conseguir en Amazon ↗
                </a>
                <button className="btn btn-ghost" onClick={() => onColor(ci, 0)}>
                  Colorear gratis
                </button>
              </div>
            </div>
          </article>
          )
        })}
        <div className="col-outro" aria-hidden>
          <span>Más</span>
          <span>pronto</span>
        </div>
      </div>
    </section>
  )
}
