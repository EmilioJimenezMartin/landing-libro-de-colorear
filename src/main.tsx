import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Solo en desarrollo: acceso desde la consola para depurar animaciones.
if (import.meta.env.DEV) Object.assign(window, { __gsap: gsap, __ST: ScrollTrigger })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
