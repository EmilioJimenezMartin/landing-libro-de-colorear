import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { Stage } from './components/Stage'
import { Collections } from './components/Collections'
import { Studio, type StudioTarget } from './components/Studio'
import { Footer, FreePages, Hud, Preloader } from './components/Extras'
import { Lightbox, type ViewerItem } from './components/Lightbox'
import { collections } from './data'
import { SCROLL_EVENT } from './lib/scroll'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<StudioTarget>({ c: 0, p: 0, nonce: 0 })
  const lenis = useRef<Lenis | null>(null)
  const [viewer, setViewer] = useState<{ items: ViewerItem[]; i: number } | null>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const l = new Lenis({ lerp: 0.08 })
    lenis.current = l
    l.on('scroll', ScrollTrigger.update)
    const raf = (t: number) => l.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(raf)
      l.destroy()
    }
  }, [])

  useEffect(() => {
    const to = (e: Event) => {
      const { y, duration } = (e as CustomEvent<{ y: number; duration: number }>).detail
      if (lenis.current) lenis.current.scrollTo(y, { duration, easing: (t: number) => 1 - Math.pow(1 - t, 3) })
      else window.scrollTo({ top: y, behavior: 'smooth' })
    }
    window.addEventListener(SCROLL_EVENT, to)
    return () => window.removeEventListener(SCROLL_EVENT, to)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('is-loading', loading)
    if (loading) lenis.current?.stop()
    else {
      lenis.current?.start()
      ScrollTrigger.sort()
      ScrollTrigger.refresh()
    }
  }, [loading])

  const go = useCallback((id: string) => {
    const el = document.querySelector(id) as HTMLElement | null
    if (!el) return
    if (lenis.current) lenis.current.scrollTo(el, { duration: 1.6 })
    else el.scrollIntoView()
  }, [])

  const colorPage = useCallback(
    (c: number, p: number) => {
      setTarget((t) => ({ c, p, nonce: t.nonce + 1 }))
      go('#estudio')
    },
    [go],
  )

  const done = useCallback(() => setLoading(false), [])

  useEffect(() => {
    if (loading) return
    document.documentElement.classList.toggle('is-loading', !!viewer)
    if (viewer) lenis.current?.stop()
    else lenis.current?.start()
  }, [viewer, loading])

  const colorFromViewer = useCallback(
    (it: ViewerItem) => {
      setViewer(null)
      colorPage(collections.indexOf(it.c), it.c.pages.indexOf(it.p))
    },
    [colorPage],
  )

  return (
    <>
      {loading && <Preloader onDone={done} />}
      <Hud go={go} />
      <main>
        <Stage onCta={go} />
        <Collections onColor={colorPage} />
        <Studio target={target} />
        <FreePages onOpen={(items, i) => setViewer({ items, i })} />
      </main>
      <Footer go={go} />
      {viewer && <Lightbox items={viewer.items} start={viewer.i} onClose={() => setViewer(null)} onColor={colorFromViewer} />}
    </>
  )
}
