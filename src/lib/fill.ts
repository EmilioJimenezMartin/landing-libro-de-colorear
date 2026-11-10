// Motor de coloreado: segmenta un dibujo de líneas en regiones y las rellena.
// La capa de color se pinta en un canvas; las líneas van encima con mix-blend-mode: multiply.

export type Seg = {
  w: number
  h: number
  labels: Int32Array // región de cada píxel (-1 = sin región)
  count: number
  sizes: Int32Array
  cy: Float32Array
  cx: Float32Array
  bg: number
}

const cache = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.decoding = 'async'
      im.onload = () => resolve(im)
      im.onerror = reject
      im.src = src
    })
    cache.set(src, p)
  }
  return p
}

export function segment(im: HTMLImageElement, size = 720, threshold = 170): Seg {
  const w = size
  const h = Math.round((size * im.naturalHeight) / im.naturalWidth)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(im, 0, 0, w, h)
  const d = ctx.getImageData(0, 0, w, h).data
  const n = w * h
  const open = new Uint8Array(n)
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const lum = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]
    open[i] = lum >= threshold ? 1 : 0
  }
  const labels = new Int32Array(n).fill(-1)
  const stack = new Int32Array(n)
  const sizes: number[] = []
  const sx: number[] = []
  const sy: number[] = []
  let count = 0
  for (let s = 0; s < n; s++) {
    if (!open[s] || labels[s] !== -1) continue
    let top = 0
    stack[top++] = s
    labels[s] = count
    let size = 0
    let ax = 0
    let ay = 0
    while (top) {
      const p = stack[--top]
      size++
      const x = p % w
      const y = (p - x) / w
      ax += x
      ay += y
      if (x > 0 && open[p - 1] && labels[p - 1] === -1) { labels[p - 1] = count; stack[top++] = p - 1 }
      if (x < w - 1 && open[p + 1] && labels[p + 1] === -1) { labels[p + 1] = count; stack[top++] = p + 1 }
      if (y > 0 && open[p - w] && labels[p - w] === -1) { labels[p - w] = count; stack[top++] = p - w }
      if (y < h - 1 && open[p + w] && labels[p + w] === -1) { labels[p + w] = count; stack[top++] = p + w }
    }
    sizes.push(size)
    sx.push(ax / size)
    sy.push(ay / size)
    count++
  }
  // Extiende las regiones por debajo de las líneas para que no queden halos blancos.
  for (let pass = 0; pass < 4; pass++) {
    const prev = labels.slice()
    for (let p = 0; p < n; p++) {
      if (prev[p] !== -1) continue
      const x = p % w
      let l = -1
      if (x > 0 && prev[p - 1] !== -1) l = prev[p - 1]
      else if (x < w - 1 && prev[p + 1] !== -1) l = prev[p + 1]
      else if (p >= w && prev[p - w] !== -1) l = prev[p - w]
      else if (p + w < n && prev[p + w] !== -1) l = prev[p + w]
      labels[p] = l
    }
  }
  let bg = labels[0]
  if (bg < 0) {
    let max = 0
    sizes.forEach((s, i) => { if (s > max) { max = s; bg = i } })
  }
  return { w, h, labels, count, sizes: Int32Array.from(sizes), cx: Float32Array.from(sx), cy: Float32Array.from(sy), bg }
}

export const hexToU32 = (hex: string) => {
  const v = parseInt(hex.slice(1), 16)
  const r = (v >> 16) & 255
  const g = (v >> 8) & 255
  const b = v & 255
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0
}

export function paint(seg: Seg, colors: Uint32Array, ctx: CanvasRenderingContext2D) {
  const out = ctx.createImageData(seg.w, seg.h)
  const px = new Uint32Array(out.data.buffer)
  const L = seg.labels
  for (let i = 0; i < px.length; i++) {
    const l = L[i]
    px[i] = l >= 0 ? colors[l] : 0
  }
  ctx.putImageData(out, 0, 0)
}

/** Colorea toda la página con una paleta, de forma determinista y armónica. */
export function autoColors(seg: Seg, palette: string[], bgTint: string | null, seed = 1): Uint32Array {
  const cols = new Uint32Array(seg.count)
  const pal = palette.map(hexToU32)
  const area = seg.w * seg.h
  for (let l = 0; l < seg.count; l++) {
    if (l === seg.bg) {
      cols[l] = bgTint ? hexToU32(bgTint) : 0
      continue
    }
    const band = Math.floor((seg.cy[l] / seg.h) * 4) * 3 + Math.floor((seg.cx[l] / seg.w) * 3)
    const small = seg.sizes[l] < area * 0.0006
    const idx = small ? (l * 7 + seed) % 3 : (band * 5 + l * 3 + seed) % pal.length
    cols[l] = pal[small ? (idx + pal.length - 3) % pal.length : idx]
  }
  return cols
}

export function labelAt(seg: Seg, x: number, y: number) {
  const ix = Math.max(0, Math.min(seg.w - 1, Math.floor(x)))
  const iy = Math.max(0, Math.min(seg.h - 1, Math.floor(y)))
  return seg.labels[iy * seg.w + ix]
}
