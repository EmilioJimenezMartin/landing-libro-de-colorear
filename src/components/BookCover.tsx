import { img, type Collection } from '../data'

/** Portada de tela oscura con estampado en oro y la lámina invertida dentro de un marco. */
export function BookCover({ c, compact = false }: { c: Collection; compact?: boolean }) {
  const hero = c.pages[0]
  return (
    <div
      className={`cover-art frame-${c.cover.frame} ${compact ? 'is-compact' : ''}`}
      style={{ '--c-from': c.cover.from, '--c-to': c.cover.to, '--foil': c.cover.foil } as React.CSSProperties}
    >
      <div className="cover-border" />
      <span className="cover-brand">NOCTINTA</span>
      <div className="cover-frame">
        <img src={img(hero.path, 600)} alt="" loading="lazy" draggable={false} />
      </div>
      <div className="cover-title">
        <span className="cover-kicker">{c.kicker}</span>
        <strong>{c.title}</strong>
        <span className="cover-sub">Libro para colorear</span>
      </div>
    </div>
  )
}
