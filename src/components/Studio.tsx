import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
  const history = useRef<({ kind: 'fill'; colors: Uint32Array } | { kind: 'brush'; data: ImageData })[]>([])
  const lines = useRef<HTMLImageElement | null>(null)
  const frame = useRef<HTMLDivElement>(null)
  const shelfRow = useRef<HTMLDivElement>(null)

  // Al entrar en pantalla, los lomos se asoman uno a uno para que se vea que se pueden sacar.
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const spines = shelfRow.current!.querySelectorAll('.spine:not(.on)')
      gsap.timeline({ scrollTrigger: { trigger: shelfRow.current, start: 'top 75%', once: true } })
        .from(shelfRow.current!.querySelectorAll('.spine'), { yPercent: 60, opacity: 0, stagger: 0.05, duration: 0.7, ease: 'back.out(1.6)', clearProps: 'transform,opacity' })
        .to(spines, { y: -12, stagger: 0.06, duration: 0.22, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform' }, '+=0.2')
    })
    return () => mm.revert()
  }, [])
  const inner = useRef<HTMLDivElement>(null)
  const view = useRef({ s: 1, x: 0, y: 0 })
  const [zoomed, setZoomed] = useState(false)
  const [tool, setTool] = useState<'fill' | 'brush'>('fill')
  const [size, setSize] = useState(2)
  const [touched, setTouched] = useState(false)
  const brush = useRef<HTMLCanvasElement>(null)
  const cursor = useRef<HTMLDivElement>(null)
  const stroke = useRef<{ id: number; last: { x: number; y: number }; snap: ImageData } | null>(null)
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
      const b = brush.current!
      b.width = s.w * 2
      b.height = s.h * 2
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [src])

  // Pinta la capa nueva en el canvas superior y la revela como tinta que se expande desde (x, y).
  const commit = useCallback((next: Uint32Array, x: number, y: number) => {
    const s = seg.current!
    history.current.push({ kind: 'fill', colors: colors.current })
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

  // ---- pincel: pinta por donde pasa el dedo o el cursor apretado ----
  const BRUSH_PX = [10, 22, 40]
  const toBrush = (clientX: number, clientY: number) => {
    const r = inner.current!.getBoundingClientRect()
    const b = brush.current!
    return { x: ((clientX - r.left) / r.width) * b.width, y: ((clientY - r.top) / r.height) * b.height }
  }
  const dab = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = brush.current!.getContext('2d')!
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.globalAlpha = 0.92
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = BRUSH_PX[size - 1] * 2
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  const startStroke = (e: React.PointerEvent) => {
    const b = brush.current!
    const ctx = b.getContext('2d')!
    const p = toBrush(e.clientX, e.clientY)
    stroke.current = { id: e.pointerId, last: p, snap: ctx.getImageData(0, 0, b.width, b.height) }
    dab(p, { x: p.x + 0.01, y: p.y })
  }
  const endStroke = (keep: boolean) => {
    const st = stroke.current
    if (!st) return
    stroke.current = null
    if (keep) {
      history.current.push({ kind: 'brush', data: st.snap })
      if (history.current.length > 40) history.current.shift()
      setCanUndo(true)
    } else {
      brush.current!.getContext('2d')!.putImageData(st.snap, 0, 0)
    }
  }
  const moveCursor = (e: React.PointerEvent) => {
    const c = cursor.current
    if (!c) return
    const r = frame.current!.getBoundingClientRect()
    const d = (BRUSH_PX[size - 1] / (seg.current?.w ?? 900)) * r.width * view.current.s
    c.style.transform = `translate(${e.clientX - r.left - d / 2}px, ${e.clientY - r.top - d / 2}px)`
    c.style.width = c.style.height = `${d}px`
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
    setTouched(true)
    if (pointers.current.size === 1 && tool === 'brush' && ready) {
      g.tap = null
      g.pan = null
      g.pinch = null
      startStroke(e)
      return
    }
    if (pointers.current.size === 1) {
      const p = local(e)
      g.tap = { x: p.x, y: p.y, t: performance.now(), moved: false }
      g.pan = { x, y, px: p.x, py: p.y }
      g.pinch = null
    } else if (pointers.current.size === 2) {
      endStroke(false) // dos dedos = zoom, se deshace el trazo que acababa de empezar
      g.tap = null
      g.pan = null
      const pi = pinchInfo()
      g.pinch = { d: pi.d, s, mx: pi.mx, my: pi.my, x, y }
    }
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tool === 'brush') moveCursor(e)
    if (!pointers.current.has(e.pointerId)) return
    const st = stroke.current
    if (st && st.id === e.pointerId) {
      const p = toBrush(e.clientX, e.clientY)
      dab(st.last, p)
      st.last = p
      return
    }
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
    if (stroke.current?.id === e.pointerId) {
      pointers.current.delete(e.pointerId)
      endStroke(true)
      return
    }
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
    if (prev.kind === 'fill') {
      colors.current = prev.colors
      paint(seg.current, prev.colors, base.current!.getContext('2d')!)
    } else {
      brush.current!.getContext('2d')!.putImageData(prev.data, 0, 0)
    }
    setCanUndo(history.current.length > 0)
  }

  const clear = () => {
    const s = seg.current
    if (!s) return
    const b = brush.current!
    const bctx = b.getContext('2d')!
    history.current.push({ kind: 'brush', data: bctx.getImageData(0, 0, b.width, b.height) })
    bctx.clearRect(0, 0, b.width, b.height)
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
    ctx.drawImage(brush.current!, 0, 0, W, H)
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

      <p className="shelf-hint">
        <span aria-hidden>↓</span> Saca un libro de la estantería para cambiar de colección
      </p>
      <div className="shelf-row" ref={shelfRow}>
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
            className={`studio-canvas ${ready ? 'is-ready' : ''} ${zoomed ? 'is-zoomed' : ''} tool-${tool}`}
            style={{ '--cur': color } as React.CSSProperties}
            onPointerLeave={() => cursor.current && (cursor.current.style.width = '0px')}
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
              <canvas ref={brush} className="layer layer-brush" />
              <img className="layer lines" src={src} alt="" crossOrigin="anonymous" draggable={false} />
            </div>
            {!ready && <div className="studio-loading">Preparando la lámina…</div>}
            {tool === 'brush' && <div className="brush-cursor" ref={cursor} aria-hidden />}
            {ready && !touched && (
              <div className="paint-hint" aria-hidden>
                <span className="paint-hint-dot" style={{ background: color }} />
                <span className="paint-hint-text">{tool === 'fill' ? 'Toca una zona para rellenarla' : 'Arrastra para pintar a mano'}</span>
              </div>
            )}
            <div className="zoom-ctrl" onPointerDown={(e) => e.stopPropagation()}>
              <button onClick={() => zoomAt(1 / 1.5)} disabled={!zoomed} aria-label="Alejar">−</button>
              <button onClick={() => zoomAt(1.5)} aria-label="Acercar">+</button>
              {zoomed && <button className="zoom-reset" onClick={() => applyView(1, 0, 0)}>Ver entera</button>}
            </div>
          </div>
          <p className="studio-hint">
            {tool === 'fill'
              ? 'Un toque rellena la zona. Pellizca con dos dedos para acercarte y, ampliada, arrastra para moverte.'
              : 'Arrastra el dedo o el ratón apretado para pintar. Con dos dedos haces zoom.'}
          </p>
          <p className="studio-caption">
            <span>{c.kicker} · {c.title}</span>
            <strong>{page.title}</strong>
          </p>
        </div>

        <aside className="studio-tools" aria-label="Herramientas">
          <div className="tool-switch" role="radiogroup" aria-label="Herramienta">
            <button role="radio" aria-checked={tool === 'fill'} className={tool === 'fill' ? 'on' : ''} onClick={() => setTool('fill')}>
              <svg viewBox="0 0 24 24" aria-hidden><path d="M5 11 12 4l7 7-7 7z" /><path d="M19 15c0 2 1.6 3 1.6 4.4a1.6 1.6 0 0 1-3.2 0C17.4 18 19 17 19 15z" /></svg>
              Rellenar
            </button>
            <button role="radio" aria-checked={tool === 'brush'} className={tool === 'brush' ? 'on' : ''} onClick={() => setTool('brush')}>
              <svg viewBox="0 0 24 24" aria-hidden><path d="M14 4 20 10 11 19 5 13z" /><path d="M5 13c-2 1-2 4-3 6 2-1 5-1 6-3" /></svg>
              Pintar a mano
            </button>
          </div>
          {tool === 'brush' && (
            <div className="brush-sizes" role="radiogroup" aria-label="Grosor del pincel">
              {[1, 2, 3].map((n) => (
                <button key={n} role="radio" aria-checked={size === n} className={size === n ? 'on' : ''} onClick={() => setSize(n)} aria-label={['Fino', 'Medio', 'Grueso'][n - 1]}>
                  <i style={{ width: 6 + n * 6, height: 6 + n * 6, background: color }} />
                </button>
              ))}
            </div>
          )}
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
