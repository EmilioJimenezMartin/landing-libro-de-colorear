import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { Stage } from './components/Stage'
import { Collections } from './components/Collections'
import { Studio, type StudioTarget } from './components/Studio'
import { Footer, FreePages, Hud, Preloader } from './components/Extras'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<StudioTarget>({ c: 0, p: 0, nonce: 0 })
  const lenis = useRef<Lenis | null>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const l = new Lenis({ lerp: 0.09 })
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
    document.documentElement.classList.toggle('is-loading', loading)
    if (loading) lenis.current?.stop()
    else {
      lenis.current?.start()
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

  return (
    <>
      {loading && <Preloader onDone={done} />}
      <Hud go={go} />
      <main>
        <Stage onCta={go} />
        <Collections onColor={colorPage} />
        <Studio target={target} />
        <FreePages />
      </main>
      <Footer go={go} />
    </>
  )
}
