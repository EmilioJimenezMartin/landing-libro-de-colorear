import { useEffect, useRef } from 'react'
import { autoColors, loadImage, paint, segment } from '../lib/fill'
import { img, type Collection, type Page } from '../data'

type Props = {
  page: Page
  collection: Collection
  /** colorea la página entera automáticamente (para el libro y las tarjetas) */
  auto?: boolean
  seed?: number
  className?: string
  size?: number
}

/** Página de papel: capa de color en canvas + líneas encima en modo multiplicar. */
export function ColoredPage({ page, collection, auto = true, seed = 1, className = '', size = 640 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const src = img(page.path, 900, 'png')

  useEffect(() => {
    if (!auto) return
    let alive = true
    loadImage(src)
      .then((im) => {
        if (!alive || !canvas.current) return
        const seg = segment(im, size)
        const c = canvas.current
        c.width = seg.w
        c.height = seg.h
        paint(seg, autoColors(seg, collection.palette, collection.bgTint, seed), c.getContext('2d')!)
        c.dataset.ready = '1'
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [src, auto, collection, seed, size])

  return (
    <div className={`paper ${className}`}>
      <canvas ref={canvas} className="paper-color" aria-hidden />
      <img className="paper-lines" src={src} alt={`Página para colorear: ${page.title}`} crossOrigin="anonymous" loading="lazy" draggable={false} />
    </div>
  )
}
