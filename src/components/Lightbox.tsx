import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { download, img, LOCAL, type Collection, type Page } from '../data'

export type ViewerItem = { c: Collection; p: Page }

type Props = {
  items: ViewerItem[]
  start: number
  onClose: () => void
  onColor: (item: ViewerItem) => void
}

/** Visor de láminas a pantalla completa, con cierre siempre visible, flechas y gesto de deslizar. */
export function Lightbox({ items, start, onClose, onColor }: Props) {
  const [i, setI] = useState(start)
  const root = useRef<HTMLDivElement>(null)
  const startX = useRef<number | null>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const { c, p } = items[i]
  const go = (d: number) => setI((v) => (v + d + items.length) % items.length)

  const close = () => {
    gsap.to(root.current, { opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: onClose })
  }

  useLayoutEffect(() => {
    gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: 0.3 })
    closeBtn.current?.focus()
  }, [])

  useLayoutEffect(() => {
    gsap.fromTo(root.current!.querySelector('.lb-figure'), { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'power3.out' })
  }, [i])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  return (
    <div
      className="lb"
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={`Lámina: ${p.title}`}
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current === null) return
        const dx = e.clientX - startX.current
        startX.current = null
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
      }}
    >
      <div className="lb-backdrop" onClick={close} />
      <header className="lb-top">
        <div className="lb-title">
          <span>{c.title}</span>
          <strong>{p.title}</strong>
        </div>
        <span className="lb-count">
          {String(i + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </span>
        <button className="lb-close" ref={closeBtn} onClick={close} aria-label="Cerrar visor">
          <span aria-hidden>✕</span> Cerrar
        </button>
      </header>

      <button className="lb-nav lb-prev" onClick={() => go(-1)} aria-label="Lámina anterior">←</button>
      <figure className="lb-figure">
        <img src={img(p.path, 1400)} alt={`Lámina para colorear: ${p.title}`} draggable={false} />
      </figure>
      <button className="lb-nav lb-next" onClick={() => go(1)} aria-label="Lámina siguiente">→</button>

      <footer className="lb-actions">
        <button className="btn btn-gold" onClick={() => onColor(items[i])}>
          Colorear esta lámina
        </button>
        {!LOCAL && (
          <a className="btn btn-ghost" href={download(p.path, `noctinta-${c.id}-${i + 1}`)}>
            Descargar
          </a>
        )}
        <button className="btn btn-ghost" onClick={close}>
          Volver a la web
        </button>
      </footer>
    </div>
  )
}
