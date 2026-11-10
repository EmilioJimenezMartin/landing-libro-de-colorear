import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { collections, download, img, LOCAL } from '../data'
import { autoColors, hexToU32, labelAt, loadImage, paint, segment, type Seg } from '../lib/fill'

const SPINE_H = [0, 14, 6, 20, 10, 2, 16, 8, 22, 4, 12]
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
  const frame = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const view = useRef({ s: 1, x: 0, y: 0 })
  const [zoomed, setZoomed] = useState(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{
    tap: { x: number; y: number; t: number; moved: boolean } | null
    pan: { x: number; y: number; px: number; py: number } | null
    pinch: { d: number; s: number; mx: number; my: number; x: number; y: number } | null
  }>({ tap: null, pan: null, pinch: null })

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

  // ---- zoom y desplazamiento (pellizco, arrastre, botones, rueda con Ctrl) ----
  const applyView = useCallback((s: number, x: number, y: number) => {
    const f = frame.current!
    const W = f.clientWidth
    const H = f.clientHeight
    s = Math.min(6, Math.max(1, s))
    x = Math.min(0, Math.max(W * (1 - s), x))
    y = Math.min(0, Math.max(H * (1 - s), y))
    view.current = { s, x, y }
    inner.current!.style.transform = `translate(${x}px, ${y}px) scale(${s})`
    setZoomed(s > 1.01)
  }, [])

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const f = frame.current!
      const { s, x, y } = view.current
      const px = cx ?? f.clientWidth / 2
      const py = cy ?? f.clientHeight / 2
      const ns = Math.min(6, Math.max(1, s * factor))
      applyView(ns, px - ((px - x) / s) * ns, py - ((py - y) / s) * ns)
    },
    [applyView],
  )

  useEffect(() => {
    applyView(1, 0, 0)
  }, [src, applyView])

  useEffect(() => {
    const f = frame.current!
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const r = f.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top)
    }
    f.addEventListener('wheel', wheel, { passive: false })
    return () => f.removeEventListener('wheel', wheel)
  }, [zoomAt])

  const paintAt = (clientX: number, clientY: number) => {
    const s = seg.current
    if (!s || !ready) return
    const r = inner.current!.getBoundingClientRect()
    const x = ((clientX - r.left) / r.width) * s.w
    const y = ((clientY - r.top) / r.height) * s.h
    const l = labelAt(s, x, y)
    if (l < 0) return
    const v = hexToU32(color)
    if (colors.current[l] === v) return
    const next = colors.current.slice()
    next[l] = v
    commit(next, x, y)
  }

  const local = (e: React.PointerEvent) => {
    const r = frame.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const pinchInfo = () => {
    const [a, b] = [...pointers.current.values()]
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
  }

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* puntero sintético o ya liberado */
    }
    pointers.current.set(e.pointerId, local(e))
    const g = gesture.current
    const { s, x, y } = view.current
    if (pointers.current.size === 1) {
      const p = local(e)
      g.tap = { x: p.x, y: p.y, t: performance.now(), moved: false }
      g.pan = { x, y, px: p.x, py: p.y }
      g.pinch = null
    } else if (pointers.current.size === 2) {
      g.tap = null
      g.pan = null
      const pi = pinchInfo()
      g.pinch = { d: pi.d, s, mx: pi.mx, my: pi.my, x, y }
    }
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    const p = local(e)
    pointers.current.set(e.pointerId, p)
    const g = gesture.current
    if (g.pinch && pointers.current.size >= 2) {
      const pi = pinchInfo()
      const ns = Math.min(6, Math.max(1, (g.pinch.s * pi.d) / g.pinch.d))
      const cx = (g.pinch.mx - g.pinch.x) / g.pinch.s
      const cy = (g.pinch.my - g.pinch.y) / g.pinch.s
      applyView(ns, pi.mx - cx * ns, pi.my - cy * ns)
      return
    }
    if (g.tap && Math.hypot(p.x - g.tap.x, p.y - g.tap.y) > 8) g.tap.moved = true
    if (g.pan && view.current.s > 1.01 && g.tap?.moved) {
      applyView(view.current.s, g.pan.x + p.x - g.pan.px, g.pan.y + p.y - g.pan.py)
    }
  }

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    const wasTap = g.tap && !g.tap.moved && pointers.current.size === 1 && performance.now() - g.tap.t < 600
    pointers.current.delete(e.pointerId)
    if (wasTap && e.type === 'pointerup') paintAt(e.clientX, e.clientY)
    if (pointers.current.size === 1) {
      // queda un dedo tras el pellizco: sigue arrastrando sin saltos y sin pintar
      const [rest] = [...pointers.current.values()]
      g.pinch = null
      g.tap = null
      g.pan = { x: view.current.x, y: view.current.y, px: rest.x, py: rest.y }
    } else if (pointers.current.size === 0) {
      g.tap = null
      g.pan = null
      g.pinch = null
    }
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

      <div className="shelf-row">
        <div className="shelf" role="tablist" aria-label="Colecciones">
          {collections.map((col, i) => (
            <button
              key={col.id}
              role="tab"
              aria-selected={i === ci}
              className={`spine ${i === ci ? 'on' : ''}`}
              style={{ '--c-from': col.cover.from, '--c-to': col.cover.to, '--foil': col.cover.foil, '--h': SPINE_H[i % SPINE_H.length] } as React.CSSProperties}
              onClick={() => { setCi(i); setPi(0); setColor(col.palette[0]) }}
            >
              <span className="spine-title">{col.title}</span>
              <small>{col.pages.length}</small>
            </button>
          ))}
        </div>
        <div className="shelf-label" aria-live="polite">
          <span>{c.kicker} · {c.pages.length} láminas</span>
          <strong>{c.title}</strong>
          <p>{c.blurb}</p>
        </div>
      </div>

      <div className="studio-grid">
        <aside className="studio-pages" aria-label="Elige una lámina">
          <div className="studio-thumbs" key={c.id}>
            {c.pages.map((p, i) => (
              <button key={p.path} className={i === pi ? 'on' : ''} onClick={() => setPi(i)} aria-label={p.title}>
                <img src={img(p.path, 200)} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        </aside>

        <div className="studio-canvas-wrap">
          <div
            ref={frame}
            className={`studio-canvas ${ready ? 'is-ready' : ''} ${zoomed ? 'is-zoomed' : ''}`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            role="img"
            aria-label={`Lámina para colorear: ${page.title}`}
          >
            <div className="studio-zoom" ref={inner}>
              <canvas ref={base} className="layer" />
              <canvas ref={top} className="layer layer-top" />
              <img className="layer lines" src={src} alt="" crossOrigin="anonymous" draggable={false} />
            </div>
            {!ready && <div className="studio-loading">Preparando la lámina…</div>}
            <div className="zoom-ctrl" onPointerDown={(e) => e.stopPropagation()}>
              <button onClick={() => zoomAt(1 / 1.5)} disabled={!zoomed} aria-label="Alejar">−</button>
              <button onClick={() => zoomAt(1.5)} aria-label="Acercar">+</button>
              {zoomed && <button className="zoom-reset" onClick={() => applyView(1, 0, 0)}>Ver entera</button>}
            </div>
          </div>
          <p className="studio-hint">Pellizca con dos dedos para acercarte; con la lámina ampliada, arrastra para moverte. Un toque pinta.</p>
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
