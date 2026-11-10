import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { collections, download, img, LOCAL } from '../data'
import { autoColors, hexToU32, labelAt, loadImage, paint, segment, type Seg } from '../lib/fill'

const NEUTRALS = ['#16141a', '#4a4550', '#9a93a0', '#ffffff', '#f3ead8', '#c9a27a']

export type StudioTarget = { c: number; p: number; nonce: number }

export function Studio({ target }: { target: StudioTarget }) {
  const [ci, setCi] = useState(target.c)
  const [pi, setPi] = useState(target.p)
  const [color, setColor] = useState(collections[target.c].palette[0])
  const [ready, setReady] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const base = useRef<HTMLCanvasElement>(null)
  const top = useRef<HTMLCanvasElement>(null)
  const seg = useRef<Seg | null>(null)
  const colors = useRef<Uint32Array>(new Uint32Array(0))
  const history = useRef<Uint32Array[]>([])
  const lines = useRef<HTMLImageElement | null>(null)

  const c = collections[ci]
  const page = c.pages[pi]
  const src = img(page.path, 1200, 'png')

  useEffect(() => {
    setCi(target.c)
    setPi(target.p)
    setColor(collections[target.c].palette[0])
  }, [target])

  useEffect(() => {
    let alive = true
    setReady(false)
    loadImage(src).then((im) => {
      if (!alive) return
      lines.current = im
      const s = segment(im, 900)
      seg.current = s
      colors.current = new Uint32Array(s.count)
      history.current = []
      setCanUndo(false)
      for (const cv of [base.current!, top.current!]) {
        cv.width = s.w
        cv.height = s.h
      }
      paint(s, colors.current, base.current!.getContext('2d')!)
      top.current!.getContext('2d')!.clearRect(0, 0, s.w, s.h)
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [src])

  // Pinta la capa nueva en el canvas superior y la revela como tinta que se expande desde (x, y).
  const commit = useCallback((next: Uint32Array, x: number, y: number) => {
    const s = seg.current!
    history.current.push(colors.current)
    if (history.current.length > 40) history.current.shift()
    setCanUndo(true)
    colors.current = next
    const t = top.current!
    paint(s, next, t.getContext('2d')!)
    gsap.killTweensOf(t)
    gsap.fromTo(
      t,
      { '--x': `${(x / s.w) * 100}%`, '--y': `${(y / s.h) * 100}%`, '--r': '0%' },
      {
        '--r': '150%',
        duration: 0.7,
        ease: 'power2.out',
        onComplete: () => {
          paint(s, next, base.current!.getContext('2d')!)
          t.getContext('2d')!.clearRect(0, 0, s.w, s.h)
          gsap.set(t, { '--r': '0%' })
        },
      },
    )
  }, [])

  const onPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = seg.current
    if (!s || !ready) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * s.w
    const y = ((e.clientY - r.top) / r.height) * s.h
    const l = labelAt(s, x, y)
    if (l < 0) return
    const v = hexToU32(color)
    if (colors.current[l] === v) return
    const next = colors.current.slice()
    next[l] = v
    commit(next, x, y)
  }

  const magic = () => {
    const s = seg.current
    if (!s) return
    commit(autoColors(s, c.palette, c.bgTint, Math.floor(Math.random() * 97)), s.w / 2, s.h / 2)
  }

  const undo = () => {
    const prev = history.current.pop()
    if (!prev || !seg.current) return
    colors.current = prev
    paint(seg.current, prev, base.current!.getContext('2d')!)
    setCanUndo(history.current.length > 0)
  }

  const clear = () => {
    const s = seg.current
    if (!s) return
    commit(new Uint32Array(s.count), s.w / 2, s.h / 2)
  }

  const save = () => {
    const s = seg.current
    const im = lines.current
    if (!s || !im) return
    const W = 1800
    const H = Math.round((W * s.h) / s.w)
    const out = document.createElement('canvas')
    out.width = W
    out.height = H
    const ctx = out.getContext('2d')!
    ctx.fillStyle = '#fbf7ef'
    ctx.fillRect(0, 0, W, H)
    ctx.drawImage(base.current!, 0, 0, W, H)
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(im, 0, 0, W, H)
    out.toBlob((b) => {
      if (!b) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = `noctinta-${c.id}-${pi + 1}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    })
  }

  const swatches = [...c.palette, ...NEUTRALS]

  return (
    <section className="studio" id="estudio" aria-label="Estudio para colorear">
      <header className="studio-head">
        <p className="eyebrow">El estudio · gratis, sin registro</p>
        <h2 className="display">
          Toca una zona. <em>Mira cómo se llena.</em>
        </h2>
      </header>

      <div className="studio-grid">
        <aside className="studio-pages" aria-label="Elige una lámina">
          <div className="studio-tabs" role="tablist">
            {collections.map((col, i) => (
              <button key={col.id} role="tab" aria-selected={i === ci} className={i === ci ? 'on' : ''} onClick={() => { setCi(i); setPi(0); setColor(col.palette[0]) }}>
                <span>{col.title}</span>
                <small>{col.pages.length}</small>
              </button>
            ))}
          </div>
          <p className="studio-count">{c.pages.length} láminas · {c.blurb}</p>
          <div className="studio-thumbs" key={c.id}>
            {c.pages.map((p, i) => (
              <button key={p.path} className={i === pi ? 'on' : ''} onClick={() => setPi(i)} aria-label={p.title}>
                <img src={img(p.path, 200)} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        </aside>

        <div className="studio-canvas-wrap">
          <div className={`studio-canvas ${ready ? 'is-ready' : ''}`} onPointerDown={onPointer} role="img" aria-label={`Lámina para colorear: ${page.title}`}>
            <canvas ref={base} className="layer" />
            <canvas ref={top} className="layer layer-top" />
            <img className="layer lines" src={src} alt="" crossOrigin="anonymous" draggable={false} />
            {!ready && <div className="studio-loading">Preparando la lámina…</div>}
          </div>
          <p className="studio-caption">
            <span>{c.kicker} · {c.title}</span>
            <strong>{page.title}</strong>
          </p>
        </div>

        <aside className="studio-tools" aria-label="Herramientas">
          <div className="swatches">
            {swatches.map((s) => (
              <button key={s} className={`sw ${s === color ? 'on' : ''}`} style={{ background: s }} onClick={() => setColor(s)} aria-label={`Color ${s}`} />
            ))}
            <label className="sw sw-custom" aria-label="Color personalizado">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </label>
          </div>
          <div className="current" style={{ '--cur': color } as React.CSSProperties}>
            <i /> <span>{color.toUpperCase()}</span>
          </div>
          <div className="tool-btns">
            <button className="btn btn-gold" onClick={magic}>✦ Colorear por mí</button>
            <button className="btn btn-ghost" onClick={undo} disabled={!canUndo}>Deshacer</button>
            <button className="btn btn-ghost" onClick={clear}>Empezar de nuevo</button>
            {!LOCAL && <button className="btn btn-ghost" onClick={save}>Descargar PNG</button>}
            {!LOCAL && <a className="btn btn-ghost" href={download(page.path, `noctinta-${c.id}-${pi + 1}-para-imprimir`)}>Imprimir en papel</a>}
          </div>
          <a className="studio-amazon" href={c.amazonUrl} target="_blank" rel="noopener">
            ¿Te ha gustado? El libro completo de <b>{c.title}</b> está en Amazon ↗
          </a>
        </aside>
      </div>
    </section>
  )
}
