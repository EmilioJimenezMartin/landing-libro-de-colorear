// Catálogo del escaparate. Las imágenes salen de Cloudinary (cuenta del gestor de tareas).
// Para enlazar cada libro a Amazon, rellena `amazonUrl` con la URL de la ficha (amazon.es/dp/ASIN).

import extraPages from './pages.json'

const CLD = 'https://res.cloudinary.com/dfhnrdobs/image/upload'

/**
 * Modo artefacto (`npm run build:artifact`): las imágenes van dentro de la página, en `p/`,
 * porque un artefacto de Claude no puede cargar imágenes de Cloudinary. Lleva una selección
 * de láminas por colección (ver ARTIFACT_LIMIT).
 */
export const LOCAL = import.meta.env.VITE_LOCAL_ASSETS === '1'
export const ARTIFACT_LIMIT = { featured: 12, other: 8 }
const localFile = (path: string) => `./p/${path.split('/').pop()!.replace(/\.\w+$/, '')}.webp`

export const img = (path: string, w = 900, format: 'auto' | 'png' = 'auto') =>
  LOCAL ? localFile(path) : `${CLD}/${format === 'png' ? 'f_png' : 'f_auto,q_auto'},w_${w}/${path}`

export const download = (path: string, name: string) => (LOCAL ? localFile(path) : `${CLD}/fl_attachment:${name}/${path}`)

export type Page = { path: string; title: string }

export type Collection = {
  id: string
  title: string
  kicker: string
  blurb: string
  pages: Page[]
  palette: string[]
  bgTint: string
  cover: { from: string; to: string; foil: string; frame: 'arch' | 'circle' | 'diamond' | 'shield' }
  amazonUrl: string
  /** aparece en la estantería como libro; si no, solo en el estudio */
  featured?: boolean
}

const amazonSearch = (q: string) => `https://www.amazon.es/s?k=${encodeURIComponent(q)}&i=stripbooks`

const base: Collection[] = [
  {
    id: 'puertas',
    featured: true,
    title: 'Puertas de Fantasía',
    kicker: 'Vol. I',
    blurb: 'Umbrales de roble, piedra y enredadera. Cada puerta guarda un mundo; tú decides de qué color es.',
    palette: ['#2f6f5e', '#7fb069', '#e6aa68', '#ca3c25', '#1d3461', '#8e5572', '#f2c14e', '#3e8989', '#b5651d', '#9bc1bc'],
    bgTint: '#efe4cf',
    cover: { from: '#16241f', to: '#0b1310', foil: '#d8b46a', frame: 'arch' },
    amazonUrl: amazonSearch('Puertas de Fantasía libro para colorear'),
    pages: [
      { path: 'v1782495861/emi-kdp-catalogs/6a3eaaeffbfe18f4f7bcebd4/dxyslbrswbxtxwh00uzb.png', title: 'La puerta del roble' },
      { path: 'v1786051038/emi-kdp-catalogs/6a74f8ffa0c6be01d56ddbcd/zfppfmiyeyhu8oqf28sz.png', title: 'El arco de cristal' },
      { path: 'v1779223173/emi-kdp-catalogs/6a0cc70e6be04e8032134088/niutw094ese3shulc5tt.jpg', title: 'Umbral de las setas' },
      { path: 'v1786096915/emi-kdp-catalogs/6a75abf9a0c6be01d56ddc59/luip0afwzbn8uqdpuhhi.png', title: 'La cancela del jardín' },
      { path: 'v1784641865/emi-kdp-catalogs/6a5f7872c72c7d48b0f2ba1f/vghz6pcnjkggy2colp5z.png', title: 'Portal del desierto' },
      { path: 'v1790320686/emi-kdp-catalogs/6ab6200f50d46b60519a5ebe/v29qeqpiuzd4bjyugay6.png', title: 'La gruta' },
      { path: 'v1782077873/emi-kdp-catalogs/6a38571a72dd3058161d3bfc/izy9xp9bsn8u5d9dc16l.png', title: 'Puerta de las flores' },
      { path: 'v1790320788/emi-kdp-catalogs/6ab6200f50d46b60519a5ec0/vzzitpvuquqxih7hn8vv.png', title: 'La casa del bosque' },
    ],
  },
  {
    id: 'bestiario',
    featured: true,
    title: 'Bestiario Salvaje',
    kicker: 'Vol. II',
    blurb: 'Lobos, linces, fénix y búhos tejidos con flores y filigrana. Animales que piden tinta.',
    palette: ['#c8553d', '#f28f3b', '#ffd5c2', '#588b8b', '#2d3047', '#93b7be', '#e0a458', '#6b2d5c', '#419d78', '#f6ae2d'],
    bgTint: '#f3e9dc',
    cover: { from: '#2a1414', to: '#120808', foil: '#e2a86b', frame: 'shield' },
    amazonUrl: amazonSearch('Bestiario Salvaje libro para colorear'),
    pages: [
      { path: 'v1784294376/emi-kdp-catalogs/6a5a2bd9c72c7d48b0f2b95e/gvjho67rkic7zh5lpv0n.png', title: 'Lobo de las flores' },
      { path: 'v1785879269/emi-kdp-catalogs/6a7258edff4b3772320ce1b6/jwo9hnidd2hbgqxaz0um.png', title: 'El zorro' },
      { path: 'v1790193726/emi-kdp-catalogs/6ab42f8e50d46b60519a5e0e/rvoojlj59xgawhubj9jf.png', title: 'Lince real' },
      { path: 'v1782470683/emi-kdp-catalogs/6a3e5806d099610823d68c90/rgykz9sueptnw8izitsa.png', title: 'Fénix' },
      { path: 'v1783072367/emi-kdp-catalogs/6a4785fa59cff758a1445b1f/hxlszfh48kllvq1b1vk6.png', title: 'Ave de fuego' },
      { path: 'v1786099930/emi-kdp-catalogs/6a75b86aa0c6be01d56ddc82/rfvllitk1ofojns35ekq.png', title: 'El búho lector' },
      { path: 'v1788382791/emi-kdp-catalogs/6a988e1fe6168d12560caea4/ysv18oddmxs0fj8f3dg9.png', title: 'Tortuga de mar' },
      { path: 'v1785881480/emi-kdp-catalogs/6a7262e703ac89c9cb0fd74c/puuubgrchkix8fadtngb.png', title: 'Pulpo' },
    ],
  },
  {
    id: 'mandalas',
    featured: true,
    title: 'Mandalas de Medianoche',
    kicker: 'Vol. III',
    blurb: 'Geometría que respira. Para colorear despacio, con la cabeza en otra parte.',
    palette: ['#5e548e', '#9f86c0', '#e0b1cb', '#231942', '#be95c4', '#f4a259', '#5b8e7d', '#f4e285', '#bc4b51', '#8cb369'],
    bgTint: '#f1ecf5',
    cover: { from: '#1b1530', to: '#0c0916', foil: '#c9b6f0', frame: 'circle' },
    amazonUrl: amazonSearch('Mandalas de Medianoche libro para colorear'),
    pages: [
      { path: 'v1781263420/emi-kdp-catalogs/6a2bea2cdd462cc3d763cdec/x36wutv1ng35m0b0vgmn.png', title: 'Loto' },
      { path: 'v1782397865/emi-kdp-catalogs/6a3d35d73ac98155062707ce/y7jsedqf5f6f7dd2dyta.png', title: 'Rosetón' },
      { path: 'v1781263322/emi-kdp-catalogs/6a2bea2cdd462cc3d763cdec/gcq3ejnvroxckaaivjii.png', title: 'Flor de seis' },
      { path: 'v1783072504/emi-kdp-catalogs/6a4785fa59cff758a1445b21/ktgemnuqwxhstrxqfql4.png', title: 'Kitsune' },
      { path: 'v1781261502/emi-kdp-catalogs/6a2be185dd462cc3d763cddc/bsas79lz1rgmlo3xeeyk.png', title: 'Estrella de loto' },
      { path: 'v1781263515/emi-kdp-catalogs/6a2bea2cdd462cc3d763cdec/lson6u56tbrsdj6lkmbd.png', title: 'Pétalos' },
      { path: 'v1781532063/emi-kdp-catalogs/6a300282b727d5bfd4eda1df/ulrqqux03aji02e4o4a8.png', title: 'Sol interior' },
      { path: 'v1781266938/emi-kdp-catalogs/6a2bf9f5a933d392a2c3945c/z7mx3ljxrxpgzzxwj1ow.png', title: 'Dragón circular' },
    ],
  },
  {
    id: 'dioses',
    featured: true,
    title: 'Máscaras y Dioses',
    kicker: 'Vol. IV',
    blurb: 'Rostros de civilizaciones perdidas y dioses antiguos. Para colorear con respeto y mucho detalle.',
    palette: ['#bf4342', '#e7d7c1', '#a78a7f', '#735751', '#d4a373', '#264653', '#2a9d8f', '#e9c46a', '#8c1c13', '#5f0f40'],
    bgTint: '#f2e6d8',
    cover: { from: '#2b2111', to: '#120d06', foil: '#e8c46d', frame: 'diamond' },
    amazonUrl: amazonSearch('Máscaras y Dioses libro para colorear'),
    pages: [
      { path: 'v1791409349/emi-kdp-catalogs/6ac6bc4776ac0119c38493ba/c1huw8zuawqsikf1bjss.png', title: 'Máscara del carnero' },
      { path: 'v1790800736/emi-kdp-catalogs/6abd72f450d46b60519a6310/llv2qkaykznf79x3vkha.png', title: 'Espíritu del bosque' },
      { path: 'v1790801054/emi-kdp-catalogs/6abd744250d46b60519a6316/zosd7xd1jx0tqjpttcju.png', title: 'Rostro tribal' },
      { path: 'v1785249643/emi-kdp-catalogs/6a68bab3a10f4872959e6e77/myrmxevjjlpac7ramwun.png', title: 'El guardián' },
      { path: 'v1783529123/emi-kdp-catalogs/6a4e7d7b73ab81bdadcee447/rgyuzdmfodqvm8my0b6p.png', title: 'Máscara de los ríos' },
      { path: 'v1787747579/emi-kdp-catalogs/6a8edcea3a914eb064b782f1/xi4glsyaqm9rfoulg5wd.png', title: 'Dios del trueno' },
      { path: 'v1785881251/emi-kdp-catalogs/6a72629003ac89c9cb0fd742/mqjwpjudrqlyncc5hfxh.png', title: 'Corona de sol' },
      { path: 'v1785853058/emi-kdp-catalogs/6a71f44dfaf9fd8dd19a88f9/tuexzxhwr82vexebsaoe.png', title: 'Señor del mar' },
      { path: 'v1791409332/emi-kdp-catalogs/6ac6bc4776ac0119c38493b9/iavhyfzdck55dng0efrr.png', title: 'Faraón' },
      { path: 'v1786302862/emi-kdp-catalogs/6a78d185358ab4d680a1ed29/kher3jsbclrgnqk0aoso.png', title: 'Samurái' },
    ],
  },
]

const extra: Omit<Collection, 'pages'>[] = [
  {
    id: 'japon',
    title: 'Jardín de Kioto',
    kicker: 'Estudio',
    blurb: 'Pagodas, bonsáis, abanicos y samuráis.',
    palette: ['#bc4749', '#f2e8cf', '#386641', '#6a994e', '#a7c957', '#1d3557', '#e63946', '#f4a261', '#264653', '#e9c46a'],
    bgTint: '#f4ede0',
    cover: { from: '#2a1517', to: '#120909', foil: '#e8b4a0', frame: 'circle' },
    amazonUrl: amazonSearch('libro para colorear Japón adultos'),
  },
  {
    id: 'jardines',
    title: 'Jardines Secretos',
    kicker: 'Estudio',
    blurb: 'Fuentes, pérgolas, girasoles y senderos entre flores.',
    palette: ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#264653', '#90be6d', '#f9c74f', '#f94144', '#577590', '#43aa8b'],
    bgTint: '#f3f1e4',
    cover: { from: '#16241a', to: '#0a120c', foil: '#cfe0a0', frame: 'arch' },
    amazonUrl: amazonSearch('libro para colorear jardines adultos'),
  },
  {
    id: 'paisajes',
    title: 'Paisajes Lejanos',
    kicker: 'Estudio',
    blurb: 'Montañas, bosques, cabañas y ruinas al final del camino.',
    palette: ['#355070', '#6d597a', '#b56576', '#e56b6f', '#eaac8b', '#588157', '#a3b18a', '#3a5a40', '#dda15e', '#bc6c25'],
    bgTint: '#eef2f3',
    cover: { from: '#121c26', to: '#080d12', foil: '#a8c6df', frame: 'arch' },
    amazonUrl: amazonSearch('libro para colorear paisajes adultos'),
  },
  {
    id: 'engranajes',
    title: 'Engranajes y Estrellas',
    kicker: 'Estudio',
    blurb: 'Relojes, máquinas imposibles, robots y astronautas.',
    palette: ['#b08968', '#7f5539', '#ddb892', '#495057', '#adb5bd', '#3a86ff', '#ffbe0b', '#fb5607', '#8338ec', '#06d6a0'],
    bgTint: '#f0ece6',
    cover: { from: '#1e1a14', to: '#0d0b08', foil: '#d9a35f', frame: 'circle' },
    amazonUrl: amazonSearch('libro para colorear steampunk'),
  },
  {
    id: 'tatuajes',
    title: 'Flash de Tatuaje',
    kicker: 'Estudio',
    blurb: 'Calaveras, dagas, corazones y golondrinas de la vieja escuela.',
    palette: ['#d00000', '#1b4332', '#ffba08', '#03071e', '#3f88c5', '#f48c06', '#9d0208', '#2d6a4f', '#e85d04', '#370617'],
    bgTint: '#f5ecd9',
    cover: { from: '#2a0d0d', to: '#110505', foil: '#e9c46a', frame: 'shield' },
    amazonUrl: amazonSearch('libro para colorear tatuajes'),
  },
  {
    id: 'fantasia',
    title: 'Héroes y Hechiceras',
    kicker: 'Estudio',
    blurb: 'Brujas, caballeros, gnomos y guerreros de anime.',
    palette: ['#7209b7', '#3a0ca3', '#4361ee', '#4cc9f0', '#f72585', '#b5179e', '#ffd166', '#06d6a0', '#ef476f', '#118ab2'],
    bgTint: '#f1edf6',
    cover: { from: '#1c1030', to: '#0b0614', foil: '#d4b6ff', frame: 'diamond' },
    amazonUrl: amazonSearch('libro para colorear fantasía'),
  },
  {
    id: 'peques',
    title: 'Pequeños Artistas',
    kicker: 'Estudio · niños',
    blurb: 'Granja, animales y dibujos sencillos de trazo grueso para los más pequeños.',
    palette: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c', '#52a675', '#4267ac', '#f15bb5', '#00bbf9'],
    bgTint: '#fdf6e3',
    cover: { from: '#10243a', to: '#07121e', foil: '#ffd166', frame: 'circle' },
    amazonUrl: amazonSearch('libro para colorear niños'),
  },
]

const json = extraPages as Record<string, string[]>

function withExtras(c: Omit<Collection, 'pages'> & { pages?: Page[] }): Collection {
  const own = c.pages ?? []
  const seen = new Set(own.map((p) => p.path))
  const more = (json[c.id] ?? []).filter((path) => !seen.has(path))
  const pages = [...own, ...more.map((path, i) => ({ path, title: `Lámina ${String(own.length + i + 1).padStart(2, '0')}` }))]
  return {
    ...c,
    pages: LOCAL ? pages.slice(0, c.featured ? ARTIFACT_LIMIT.featured : ARTIFACT_LIMIT.other) : pages,
  }
}

export const collections: Collection[] = [...base, ...extra].map(withExtras)

// Páginas que se colorean solas dentro del libro del ritual (una de cada colección).
export const ritualPages: { c: Collection; p: Page }[] = [
  { c: collections[0], p: collections[0].pages[0] },
  { c: collections[1], p: collections[1].pages[0] },
  { c: collections[2], p: collections[2].pages[3] },
  { c: collections[3], p: collections[3].pages[1] },
]
